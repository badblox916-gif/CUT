import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type DocumentData,
} from "firebase/firestore";
import type { Post } from "../data/social";
import { profileError, type Profile } from "./profile";
import { eventNotification } from "./notifications";

export type NewPost = Pick<
  Post,
  "text" | "imageUri" | "videoUri" | "reel" | "poll"
>;
export type Reaction = {
  postId: string;
  userId: string;
  liked: boolean;
  reposted: boolean;
  vote: number;
};

export function publicProfile(data: DocumentData): Profile {
  return {
    name: data.name ?? "",
    handle: data.handle ?? "",
    bio: data.bio ?? "",
    avatarUri: data.avatarUri || undefined,
    coverUri: data.coverUri || undefined,
  };
}

export function readPost(id: string, data: DocumentData): Post {
  const createdAt = data.createdAt?.toMillis?.() ?? 0;
  return {
    id,
    creatorId: data.creatorId,
    originalPostId: data.originalPostId,
    text: data.text,
    tag: data.tag ?? "",
    imageUri: data.imageUri || undefined,
    videoUri: data.videoUri || undefined,
    reel: Boolean(data.reel),
    createdAt,
    time: createdAt
      ? new Date(createdAt).toLocaleString("es-MX", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Enviando…",
    likes: 0,
    reposts: 0,
    comments: [],
    poll: data.poll ? { options: data.poll.options, votes: [0, 0] } : undefined,
  };
}

export async function saveCloudProfile(
  db: Firestore,
  userId: string,
  input: Profile,
) {
  const profile = {
    ...input,
    name: input.name.trim(),
    handle: input.handle.trim().toLowerCase(),
    bio: input.bio.trim(),
  };
  const validation = profileError(profile);
  if (validation) throw new Error(validation);
  if (profile.name.length > 40 || profile.bio.length > 180)
    throw new Error("Tu perfil supera el límite de caracteres.");
  const profileRef = doc(db, "profiles", userId);
  const handleRef = doc(db, "handles", profile.handle);
  await runTransaction(db, async (transaction) => {
    const previous = await transaction.get(profileRef);
    const reservation = await transaction.get(handleRef);
    if (reservation.exists() && reservation.data().userId !== userId)
      throw new Error("Ese usuario ya está ocupado. Elige otro.");
    transaction.set(handleRef, { userId });
    const oldHandle = previous.data()?.handle;
    if (oldHandle && oldHandle !== profile.handle)
      transaction.delete(doc(db, "handles", oldHandle));
    transaction.set(profileRef, {
      name: profile.name,
      handle: profile.handle,
      bio: profile.bio,
      avatarUri: profile.avatarUri ?? "",
      coverUri: profile.coverUri ?? "",
      createdAt: previous.data()?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return profile;
}

export async function createCloudPost(
  db: Firestore,
  userId: string,
  post: NewPost,
) {
  const text = post.text.trim();
  if ((!text && !post.imageUri && !post.videoUri) || text.length > 500)
    throw new Error("Escribe hasta 500 caracteres o añade un archivo.");
  if (post.reel && !post.videoUri)
    throw new Error("Selecciona un video para el reel.");
  const options = post.poll?.options.map((option) => option.trim());
  if (
    options &&
    (options.length !== 2 ||
      options.some((option) => !option || option.length > 80) ||
      options[0].toLowerCase() === options[1].toLowerCase())
  )
    throw new Error(
      "La encuesta necesita dos opciones diferentes de hasta 80 caracteres.",
    );
  const result = await addDoc(collection(db, "posts"), {
    creatorId: userId,
    text,
    tag: text.match(/#[\p{L}\p{N}_]+/u)?.[0] ?? "",
    imageUri: post.imageUri ?? "",
    videoUri: post.videoUri ?? "",
    reel: Boolean(post.reel),
    poll: options ? { options } : null,
    createdAt: serverTimestamp(),
  });
  return result.id;
}

export async function changeReaction(
  db: Firestore,
  userId: string,
  postId: string,
  field: "liked" | "reposted" | "vote",
  value?: number,
) {
  await runTransaction(db, async (transaction) => {
    let source = await transaction.get(doc(db, "posts", postId));
    let sourceId = postId;
    if (field === "reposted" && source.data()?.originalPostId) {
      sourceId = source.data()!.originalPostId;
      source = await transaction.get(doc(db, "posts", sourceId));
    }
    if (!source.exists())
      throw new Error("Esta publicación ya no está disponible.");
    const target = doc(db, "reactions", `${sourceId}_${userId}`);
    const snapshot = await transaction.get(target);
    const repostRef = doc(db, "posts", repostId(sourceId, userId));
    const repost =
      field === "reposted" ? await transaction.get(repostRef) : undefined;
    const current: Reaction = snapshot.exists()
      ? (snapshot.data() as Reaction)
      : { postId: sourceId, userId, liked: false, reposted: false, vote: -1 };
    if (field === "vote") {
      if (current.vote !== -1) return;
      if (value !== 0 && value !== 1)
        throw new Error("Opción de encuesta inválida.");
      transaction.set(target, { ...current, vote: value });
    } else {
      transaction.set(target, { ...current, [field]: !current[field] });
      if (field === "reposted") {
        if (current.reposted) {
          if (repost?.exists()) transaction.delete(repostRef);
        } else if (!repost?.exists()) {
          transaction.set(repostRef, repostData(sourceId, userId));
        }
      }
      if (!current[field]) {
        const notification = eventNotification(
          db,
          source.data().creatorId,
          userId,
          field === "liked" ? "like" : "repost",
          sourceId,
        );
        if (notification) transaction.set(notification.ref, notification.data);
      }
    }
  });
}

export function repostId(postId: string, userId: string) {
  return `repost_${postId}_${userId}`;
}

function repostData(originalPostId: string, creatorId: string) {
  return {
    creatorId,
    originalPostId,
    text: "",
    tag: "",
    imageUri: "",
    videoUri: "",
    reel: false,
    poll: null,
    createdAt: serverTimestamp(),
  };
}

// Older reactions had no feed entry or repost date. Upgrade only this user's
// active reposts, once they sign in, without sending another notification.
export async function ensureCloudRepost(
  db: Firestore,
  userId: string,
  postId: string,
) {
  const target = doc(db, "posts", repostId(postId, userId));
  await runTransaction(db, async (transaction) => {
    const repost = await transaction.get(target);
    if (repost.exists()) return;
    const reaction = await transaction.get(
      doc(db, "reactions", `${postId}_${userId}`),
    );
    const original = await transaction.get(doc(db, "posts", postId));
    if (
      !reaction.data()?.reposted ||
      !original.exists() ||
      original.data().originalPostId
    )
      return;
    transaction.set(target, repostData(postId, userId));
  });
}

export async function toggleCloudItem(
  db: Firestore,
  userId: string,
  group: "saved" | "following",
  id: string,
) {
  const target = doc(db, "accounts", userId, group, id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(target);
    if (snapshot.exists()) transaction.delete(target);
    else {
      transaction.set(target, { createdAt: serverTimestamp() });
      if (group === "following") {
        const notification = eventNotification(db, id, userId, "follow");
        if (notification) transaction.set(notification.ref, notification.data);
      }
    }
  });
}

export async function createCloudComment(
  db: Firestore,
  userId: string,
  postId: string,
  author: string,
  text: string,
) {
  if (!text.trim() || text.trim().length > 500)
    throw new Error("Escribe un comentario de hasta 500 caracteres.");
  const post = await getDoc(doc(db, "posts", postId));
  if (!post.exists())
    throw new Error("Esta publicación ya no está disponible.");
  const target = doc(collection(db, "posts", postId, "comments"));
  const batch = writeBatch(db);
  batch.set(target, {
    authorId: userId,
    author,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  const notification = eventNotification(
    db,
    post.data().creatorId,
    userId,
    "comment",
    postId,
    target.id,
  );
  if (notification) batch.set(notification.ref, notification.data);
  await batch.commit();
}
