import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useSocial } from "@/context/social";
import type { Creator } from "@/data/social";
import { firebaseDb } from "@/lib/firebase-db";
import { publicProfile } from "@/lib/social-store";
import { socialError } from "@/lib/social-errors";

export function useCreator(id: string) {
  const { creators, profile, accountId, revision } = useSocial();
  const known =
    id === accountId
      ? { ...profile, id, icon: "user" as const, color: "#80d9a0" }
      : creators.find((creator) => creator.id === id);
  const [remote, setRemote] = useState<{
    id: string;
    creator?: Creator;
    loaded: boolean;
    error?: string;
  }>();
  useEffect(() => {
    if (!firebaseDb || !id || id.includes("/") || id === accountId) return;
    return onSnapshot(
      doc(firebaseDb, "profiles", id),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata.fromCache && !snapshot.exists()) return;
        setRemote({
          id,
          loaded: true,
          creator: snapshot.exists()
            ? {
                ...publicProfile(snapshot.data()),
                id,
                icon: "user",
                color: "#80d9a0",
              }
            : undefined,
        });
      },
      (error) => setRemote({ id, loaded: true, error: socialError(error) }),
    );
  }, [id, accountId, revision]);
  const current = remote?.id === id ? remote : undefined;
  return {
    creator: current?.loaded ? current.creator : known,
    loading: !known && !current?.loaded,
    error: current?.error,
  };
}
