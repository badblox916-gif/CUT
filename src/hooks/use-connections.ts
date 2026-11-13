import { collectionGroup, onSnapshot } from "firebase/firestore";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { firebaseDb } from "@/lib/firebase-db";
import { connectionIds } from "@/lib/connections";
import { socialError } from "@/lib/social-errors";
import { useSocial } from "@/context/social";

export function useConnections(profileId: string) {
  const { accountId, revision } = useSocial();
  const key = `${accountId}:${profileId}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    followers: string[];
    following: string[];
    error: string;
  }>();
  useFocusEffect(
    useCallback(() => {
      if (!firebaseDb || !profileId || profileId.includes("/")) return;
      let active = true;
      // This school's small graph still uses the original path-only follow
      // schema. Listen only while a profile/list is focused, and fetch profiles
      // separately for the rows on screen. Saved items never enter this query.
      const stop = onSnapshot(
        collectionGroup(firebaseDb, "following"),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!active || snapshot.metadata.fromCache) return;
          setState({
            key,
            ...connectionIds(
              snapshot.docs.map((item) => item.ref.path),
              profileId,
            ),
            error: "",
          });
        },
        (cause) => {
          if (active)
            setState({
              key,
              followers: [],
              following: [],
              error: socialError(cause),
            });
        },
      );
      return () => {
        active = false;
        stop();
      };
    }, [key, profileId]),
  );
  const current = state?.key === key ? state : undefined;
  return {
    followers: current?.followers ?? [],
    following: current?.following ?? [],
    loading: !current,
    error: current?.error ?? "",
  };
}
