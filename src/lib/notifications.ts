import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";

export type NotificationKind = "follow" | "like" | "comment" | "repost";
export type ActivityNotification = {
  id: string;
  actorId: string;
  type: NotificationKind;
  postId: string;
  commentId: string;
  createdAt: number;
  timestamp: Timestamp;
};

export function eventNotification(
  db: Firestore,
  recipientId: string,
  actorId: string,
  type: NotificationKind,
  postId = "",
  commentId = "",
) {
  if (recipientId === actorId) return undefined;
  const id =
    type === "follow"
      ? `follow_${actorId}`
      : type === "comment"
        ? `comment_${commentId}`
        : `${type}_${postId}_${actorId}`;
  return {
    ref: doc(db, "accounts", recipientId, "notifications", id),
    data: { actorId, type, postId, commentId, createdAt: serverTimestamp() },
  };
}

export function readNotification(
  id: string,
  data: DocumentData,
): ActivityNotification | null {
  if (
    !(data.createdAt instanceof Timestamp) ||
    !["follow", "like", "comment", "repost"].includes(data.type)
  )
    return null;
  return {
    id,
    actorId: data.actorId,
    type: data.type,
    postId: data.postId,
    commentId: data.commentId,
    createdAt: data.createdAt.toMillis(),
    timestamp: data.createdAt,
  };
}

export async function markNotificationsRead(
  db: Firestore,
  accountId: string,
  timestamp: Timestamp,
) {
  const target = doc(db, "accounts", accountId, "preferences", "notifications");
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(target);
    const previous = snapshot.data()?.readThrough;
    if (
      previous instanceof Timestamp &&
      previous.toMillis() >= timestamp.toMillis()
    )
      return;
    transaction.set(target, { readThrough: timestamp });
  });
}
