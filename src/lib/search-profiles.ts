import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  type Firestore,
} from "firebase/firestore";
import type { Creator } from "../data/social";
import { publicProfile } from "./social-store";

export function normalizeSearch(value: string) {
  return value
    .trim()
    .replace(/^@/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// An on-demand paginated scan supports existing profiles without reindexing or
// migrating their names. Appropriate for this small, free school project.
export async function searchProfilesPage(
  db: Firestore,
  text: string,
  after?: string,
  signal?: AbortSignal,
) {
  const term = normalizeSearch(text);
  const profiles: Creator[] = [];
  let cursor = after;
  let done = false;
  if (!term || text.trim().startsWith("#"))
    return { profiles, cursor, done: true };
  while (!done && profiles.length < 20) {
    if (signal?.aborted) throw new Error("Búsqueda cancelada.");
    const constraints = [
      orderBy(documentId()),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(50),
    ];
    const snapshot = await getDocs(
      query(collection(db, "profiles"), ...constraints),
    );
    if (signal?.aborted) throw new Error("Búsqueda cancelada.");
    for (const item of snapshot.docs) {
      const profile = publicProfile(item.data());
      if (
        profile.name &&
        profile.handle &&
        (normalizeSearch(profile.name).includes(term) ||
          normalizeSearch(profile.handle).includes(term))
      )
        profiles.push({
          ...profile,
          id: item.id,
          icon: "user",
          color: "#80d9a0",
        });
    }
    cursor = snapshot.docs[snapshot.docs.length - 1]?.id ?? cursor;
    done = snapshot.size < 50;
  }
  return { profiles, cursor, done };
}
