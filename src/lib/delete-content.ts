import { doc, runTransaction, type Firestore } from "firebase/firestore";

// Verify ownership on the current server document, never on a cached UI object.
export async function deleteCloudContent(
  db: Firestore,
  accountId: string,
  collection: "posts" | "stories",
  id: string,
) {
  const target = doc(db, collection, id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(target);
    if (!snapshot.exists()) return;
    if (snapshot.data().creatorId !== accountId)
      throw new Error("Solo puedes eliminar tu propio contenido.");
    const originalId =
      collection === "posts" ? snapshot.data().originalPostId : undefined;
    if (originalId) {
      const original = await transaction.get(doc(db, "posts", originalId));
      const reactionRef = doc(db, "reactions", `${originalId}_${accountId}`);
      const reaction = await transaction.get(reactionRef);
      if (original.exists() && reaction.exists() && reaction.data().reposted)
        transaction.set(reactionRef, { ...reaction.data(), reposted: false });
    }
    transaction.delete(target);
  });
}
