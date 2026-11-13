import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Comment, Creator, Post } from "@/data/social";
import { firebaseDb } from "@/lib/firebase-db";
import type { Profile } from "@/lib/profile";
import { socialError } from "@/lib/social-errors";
import { checkUploadCanceled, type UploadOptions } from "@/lib/upload-request";
import { deleteCloudContent } from "@/lib/delete-content";
import {
  changeReaction,
  createCloudComment,
  createCloudPost,
  ensureCloudRepost,
  publicProfile,
  readPost,
  saveCloudProfile,
  toggleCloudItem,
  type NewPost,
  type Reaction,
} from "@/lib/social-store";
import {
  discardUploads,
  uploadMedia,
  type UploadedMedia,
} from "@/lib/upload-media";

const emptyProfile: Profile = { name: "", handle: "", bio: "" };
type Activity = { reactions: Reaction[]; comments: Comment[] };
type SocialContext = {
  accountId: string;
  profile: Profile;
  creators: Creator[];
  posts: Post[];
  postCount: number;
  feedIds: string[];
  ready: boolean;
  loadError: string;
  syncError: string;
  revision: number;
  retry: () => void;
  loadMore: () => void;
  hasMore: boolean;
  liked: string[];
  saved: string[];
  reposted: string[];
  following: string[];
  votes: Record<string, number>;
  seenStories: string[];
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  toggleRepost: (id: string) => void;
  toggleFollow: (id: string) => void;
  vote: (id: string, option: number) => void;
  addComment: (id: string, text: string) => Promise<void>;
  publish: (post: NewPost, options?: UploadOptions) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;
  seeStory: (id: string) => void;
  watchPost: (id: string) => Unsubscribe;
  isPostLoaded: (id: string) => boolean;
  watchAuthor: (id: string) => Unsubscribe;
};
const Context = createContext<SocialContext | null>(null);
export function SocialProvider({
  children,
  accountId,
}: {
  children: ReactNode;
  accountId: string;
}) {
  const [profile, setProfile] = useState(emptyProfile);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const [postLimit, setPostLimit] = useState(20);
  const [sources, setSources] = useState<Record<string, Post[]>>({});
  const [postCount, setPostCount] = useState(0);
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  const [saved, setSaved] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [myReactions, setMyReactions] = useState<Reaction[]>([]);
  const [seenStories, setSeenStories] = useState<string[]>([]);
  const seeStory = useCallback(
    (id: string) =>
      setSeenStories((current) =>
        current.includes(id) ? current : [...current, id],
      ),
    [],
  );
  const pending = useRef(new Set<string>());
  const report = useCallback((source: string, error?: unknown) => {
    setErrors((current) => {
      if (!error && !current[source]) return current;
      const next = { ...current };
      if (error) next[source] = socialError(error);
      else delete next[source];
      return next;
    });
  }, []);
  const retry = useCallback(() => {
    setErrors({});
    setLoadError("");
    setAttempt((n) => n + 1);
  }, []);
  const db = firebaseDb;
  const ownPosts = sources.mine;

  useEffect(() => {
    if (!db || !ready) return;
    let active = true;
    void getCountFromServer(
      query(collection(db, "posts"), where("creatorId", "==", accountId)),
    )
      .then((snapshot) => {
        if (active) {
          setPostCount(snapshot.data().count);
          report("post-count");
        }
      })
      .catch((error) => {
        if (active) report("post-count", error);
      });
    return () => {
      active = false;
    };
  }, [db, ready, accountId, ownPosts, attempt, report]);

  useEffect(() => {
    if (!db) return;
    let received = false;
    const timer = setTimeout(() => {
      if (!received)
        setLoadError(
          "No pudimos cargar tu perfil. Revisa tu conexión e inténtalo de nuevo.",
        );
    }, 12000);
    const stop = onSnapshot(
      doc(db, "profiles", accountId),
      { includeMetadataChanges: true },
      (snapshot) => {
        // Never send an existing account to onboarding based on a missing cache entry.
        if (snapshot.metadata.fromCache) return;
        received = true;
        clearTimeout(timer);
        setProfile(
          snapshot.exists() ? publicProfile(snapshot.data()) : emptyProfile,
        );
        setReady(true);
        setLoadError("");
      },
      (error) => {
        clearTimeout(timer);
        setLoadError(socialError(error));
      },
    );
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [accountId, attempt, db]);

  const listenPosts = useCallback(
    (key: string, target: Query) => {
      const stop = onSnapshot(
        target,
        { includeMetadataChanges: true },
        (snapshot) => {
          setSources((current) => ({
            ...current,
            // Child listeners must wait until the parent exists on the server.
            // Otherwise comment security checks can reject a pending new post.
            [key]: snapshot.docs
              .filter((item) => !item.metadata.hasPendingWrites)
              .map((item) => readPost(item.id, item.data())),
          }));
          report(key);
        },
        (error) => report(key, error),
      );
      return () => {
        stop();
        setSources((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        report(key);
      };
    },
    [report],
  );

  useEffect(() => {
    if (!db || !ready) return;
    const stops = [
      listenPosts(
        "feed",
        query(
          collection(db, "posts"),
          orderBy("createdAt", "desc"),
          limit(postLimit),
        ),
      ),
      listenPosts(
        "mine",
        query(
          collection(db, "posts"),
          where("creatorId", "==", accountId),
          orderBy("createdAt", "desc"),
          limit(postLimit),
        ),
      ),
      onSnapshot(
        query(
          collection(db, "profiles"),
          orderBy("updatedAt", "desc"),
          limit(100),
        ),
        (snapshot) => {
          setCreators(
            snapshot.docs.map((item) => ({
              ...publicProfile(item.data()),
              id: item.id,
              icon: "user",
              color: "#80d9a0",
            })),
          );
          report("profiles");
        },
        (error) => report("profiles", error),
      ),
      onSnapshot(
        collection(db, "accounts", accountId, "saved"),
        (snapshot) => {
          setSaved(snapshot.docs.map((item) => item.id));
          report("saved");
        },
        (error) => report("saved", error),
      ),
      onSnapshot(
        collection(db, "accounts", accountId, "following"),
        (snapshot) => {
          setFollowing(snapshot.docs.map((item) => item.id));
          report("following");
        },
        (error) => report("following", error),
      ),
      onSnapshot(
        query(collection(db, "reactions"), where("userId", "==", accountId)),
        (snapshot) => {
          setMyReactions(snapshot.docs.map((item) => item.data() as Reaction));
          report("my-reactions");
        },
        (error) => report("my-reactions", error),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [db, ready, accountId, postLimit, attempt, listenPosts, report]);

  const reposted = useMemo(
    () => myReactions.filter((r) => r.reposted).map((r) => r.postId),
    [myReactions],
  );
  const selectedIds = JSON.stringify(
    [...new Set([...saved, ...reposted])].sort(),
  );
  const repostKey = JSON.stringify(reposted.slice().sort());
  const checkedReposts = useRef(new Set<string>());
  useEffect(() => {
    if (!db || !ready) return;
    let active = true;
    const ids: string[] = JSON.parse(repostKey);
    void (async () => {
      for (const id of ids) {
        if (!active) return;
        if (checkedReposts.current.has(id)) continue;
        await ensureCloudRepost(db, accountId, id);
        checkedReposts.current.add(id);
      }
      if (active) report("repost-upgrade");
    })().catch((error) => {
      if (active) report("repost-upgrade", error);
    });
    return () => {
      active = false;
    };
  }, [db, ready, accountId, repostKey, attempt, report]);
  useEffect(() => {
    if (!db || !ready) return;
    const ids: string[] = JSON.parse(selectedIds);
    const stops: Unsubscribe[] = [];
    for (let i = 0; i < ids.length; i += 30)
      stops.push(
        listenPosts(
          `selected:${i}`,
          query(
            collection(db, "posts"),
            where(documentId(), "in", ids.slice(i, i + 30)),
          ),
        ),
      );
    return () => stops.forEach((stop) => stop());
  }, [db, ready, selectedIds, attempt, listenPosts]);

  // Include followed authors even when their latest post is outside the global page.
  const followedIds = JSON.stringify(following.slice().sort());
  useEffect(() => {
    if (!db || !ready) return;
    const ids: string[] = JSON.parse(followedIds);
    const stops = ids.map((id) =>
      listenPosts(
        `following:${id}`,
        query(
          collection(db, "posts"),
          where("creatorId", "==", id),
          orderBy("createdAt", "desc"),
          limit(postLimit),
        ),
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [db, ready, followedIds, postLimit, attempt, listenPosts]);

  const basePosts = useMemo(() => {
    const merged = new Map<string, Post>();
    Object.values(sources)
      .flat()
      .forEach((post) => merged.set(post.id, post));
    return [...merged.values()].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
  }, [sources]);
  const quotedIds = JSON.stringify(
    [
      ...new Set(
        basePosts.flatMap((post) =>
          post.originalPostId ? [post.originalPostId] : [],
        ),
      ),
    ].sort(),
  );
  useEffect(() => {
    if (!db || !ready) return;
    const ids: string[] = JSON.parse(quotedIds);
    const stops: Unsubscribe[] = [];
    for (let i = 0; i < ids.length; i += 30)
      stops.push(
        listenPosts(
          `quoted:${i}`,
          query(
            collection(db, "posts"),
            where(documentId(), "in", ids.slice(i, i + 30)),
          ),
        ),
      );
    return () => stops.forEach((stop) => stop());
  }, [db, ready, quotedIds, attempt, listenPosts]);
  const postIds = JSON.stringify(basePosts.map((post) => post.id).sort());
  const activitySubscriptions = useRef(new Map<string, Unsubscribe>());
  useEffect(() => {
    if (!db) return;
    const ids: string[] = JSON.parse(postIds);
    const subscriptions = activitySubscriptions.current;
    for (const [id, stop] of subscriptions)
      if (!ids.includes(id)) {
        stop();
        subscriptions.delete(id);
      }
    for (const id of ids) {
      if (subscriptions.has(id)) continue;
      const reactionsStop = onSnapshot(
        query(collection(db, "reactions"), where("postId", "==", id)),
        (snapshot) => {
          setActivity((current) => ({
            ...current,
            [id]: {
              comments: current[id]?.comments ?? [],
              reactions: snapshot.docs.map((item) => item.data() as Reaction),
            },
          }));
          report(`reactions:${id}`);
        },
        (error) => report(`reactions:${id}`, error),
      );
      const commentsStop = onSnapshot(
        query(
          collection(db, "posts", id, "comments"),
          orderBy("createdAt", "asc"),
        ),
        (snapshot) => {
          setActivity((current) => ({
            ...current,
            [id]: {
              reactions: current[id]?.reactions ?? [],
              comments: snapshot.docs.map((item) => ({
                id: item.id,
                text: item.data().text,
                author: item.data().author,
                authorId: item.data().authorId,
              })),
            },
          }));
          report(`comments:${id}`);
        },
        (error) => report(`comments:${id}`, error),
      );
      subscriptions.set(id, () => {
        reactionsStop();
        commentsStop();
        report(`reactions:${id}`);
        report(`comments:${id}`);
      });
    }
  }, [db, postIds, report, attempt]);
  useEffect(() => {
    const subscriptions = activitySubscriptions.current;
    return () => {
      subscriptions.forEach((stop) => stop());
      subscriptions.clear();
    };
  }, [attempt]);

  const posts = useMemo(
    () =>
      basePosts.map((post) => {
        const data = activity[post.id];
        const reactions = data?.reactions ?? [];
        return {
          ...post,
          comments: data?.comments ?? [],
          likes: reactions.filter((r) => r.liked).length,
          reposts: reactions.filter((r) => r.reposted).length,
          poll: post.poll
            ? {
                ...post.poll,
                votes: post.poll.options.map(
                  (_, index) =>
                    reactions.filter((r) => r.vote === index).length,
                ),
              }
            : undefined,
        };
      }),
    [basePosts, activity],
  );

  const postWatchers = useRef(new Map<string, number>());
  const watchPost = useCallback(
    (id: string) => {
      if (!db || !id || id.includes("/")) return () => {};
      const key = `post:${id}:${attempt}`;
      postWatchers.current.set(key, (postWatchers.current.get(key) ?? 0) + 1);
      const stop = onSnapshot(
        doc(db, "posts", id),
        (snapshot) => {
          setSources((current) => ({
            ...current,
            [key]: snapshot.exists()
              ? [readPost(snapshot.id, snapshot.data())]
              : [],
          }));
          report(key);
        },
        (error) => report(key, error),
      );
      return () => {
        stop();
        const remaining = (postWatchers.current.get(key) ?? 1) - 1;
        if (remaining > 0) {
          postWatchers.current.set(key, remaining);
          return;
        }
        postWatchers.current.delete(key);
        setSources((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        report(key);
      };
    },
    [db, report, attempt],
  );
  const watchAuthor = useCallback(
    (id: string) => {
      if (!db || !id || id.includes("/")) return () => {};
      return listenPosts(
        `author:${id}:${attempt}`,
        query(
          collection(db, "posts"),
          where("creatorId", "==", id),
          orderBy("createdAt", "desc"),
          limit(postLimit),
        ),
      );
    },
    [db, listenPosts, postLimit, attempt],
  );

  const runToggle = (key: string, action: () => Promise<unknown>) => {
    if (pending.current.has(key)) return;
    pending.current.add(key);
    void action()
      .then(() => report("action"))
      .catch((error) => report("action", error))
      .finally(() => pending.current.delete(key));
  };
  const requireDb = () => {
    if (!db)
      throw new Error(
        "CUT todavía no está disponible. Inténtalo de nuevo más tarde.",
      );
    return db;
  };
  return (
    <Context.Provider
      value={{
        accountId,
        postCount,
        profile,
        creators,
        posts,
        feedIds: (sources.feed ?? []).map((post) => post.id),
        ready,
        loadError: db
          ? loadError
          : "CUT todavía no está disponible. Inténtalo de nuevo más tarde.",
        syncError: Object.values(errors)[0] ?? "",
        retry,
        revision: attempt,
        loadMore: () => setPostLimit((count) => count + 20),
        hasMore: (sources.feed?.length ?? 0) >= postLimit,
        liked: myReactions.filter((r) => r.liked).map((r) => r.postId),
        saved,
        reposted,
        following,
        votes: Object.fromEntries(
          myReactions
            .filter((r) => r.vote !== -1)
            .map((r) => [r.postId, r.vote]),
        ),
        seenStories,
        seeStory,
        toggleLike: (id) =>
          runToggle(`like:${id}`, () =>
            changeReaction(requireDb(), accountId, id, "liked"),
          ),
        toggleRepost: (id) =>
          runToggle(`repost:${id}`, () =>
            changeReaction(requireDb(), accountId, id, "reposted"),
          ),
        vote: (id, option) =>
          runToggle(`vote:${id}`, () =>
            changeReaction(requireDb(), accountId, id, "vote", option),
          ),
        toggleSave: (id) =>
          runToggle(`save:${id}`, () =>
            toggleCloudItem(requireDb(), accountId, "saved", id),
          ),
        toggleFollow: (id) =>
          runToggle(`follow:${id}`, () =>
            toggleCloudItem(requireDb(), accountId, "following", id),
          ),
        addComment: async (id, text) => {
          try {
            await createCloudComment(
              requireDb(),
              accountId,
              id,
              profile.handle,
              text,
            );
          } catch (error) {
            throw new Error(socialError(error));
          }
        },
        deletePost: async (id) => {
          try {
            await deleteCloudContent(requireDb(), accountId, "posts", id);
            setSources((current) =>
              Object.fromEntries(
                Object.entries(current).map(([key, items]) => [
                  key,
                  items.filter((item) => item.id !== id),
                ]),
              ),
            );
          } catch (error) {
            throw new Error(socialError(error));
          }
        },
        publish: async (post, options) => {
          const uploads: (UploadedMedia | undefined)[] = [];
          try {
            const database = requireDb();
            const image = await uploadMedia(
              post.imageUri,
              accountId,
              "image",
              options,
            );
            uploads.push(image);
            const video = await uploadMedia(
              post.videoUri,
              accountId,
              "video",
              options,
            );
            uploads.push(video);
            checkUploadCanceled(options?.signal);
            options?.onProgress?.({ phase: "saving" });
            await createCloudPost(database, accountId, {
              ...post,
              imageUri: image?.url,
              videoUri: video?.url,
            });
          } catch (error) {
            await discardUploads(uploads);
            throw new Error(socialError(error));
          }
        },
        updateProfile: async (input) => {
          const uploads: (UploadedMedia | undefined)[] = [];
          try {
            const database = requireDb();
            const avatar = await uploadMedia(
              input.avatarUri,
              accountId,
              "image",
            );
            uploads.push(avatar);
            const cover = await uploadMedia(input.coverUri, accountId, "image");
            uploads.push(cover);
            const next = await saveCloudProfile(database, accountId, {
              ...input,
              avatarUri: avatar?.url,
              coverUri: cover?.url,
            });
            setProfile(next);
          } catch (error) {
            await discardUploads(uploads);
            throw new Error(socialError(error));
          }
        },
        watchPost,
        watchAuthor,
        isPostLoaded: (id) => Boolean(sources[`post:${id}:${attempt}`]),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSocial() {
  const context = useContext(Context);
  if (!context) throw new Error("SocialProvider is required");
  return context;
}
