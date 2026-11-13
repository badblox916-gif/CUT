import { useEffect, useRef, useState } from "react";
import type { Creator } from "@/data/social";
import { firebaseDb } from "@/lib/firebase-db";
import { searchProfilesPage } from "@/lib/search-profiles";
import { socialError } from "@/lib/social-errors";

type Result = {
  term: string;
  profiles: Creator[];
  cursor?: string;
  done: boolean;
  loading: boolean;
  error: string;
};
const initial: Result = {
  term: "",
  profiles: [],
  done: true,
  loading: false,
  error: "",
};
export function useProfileSearch(text: string, refresh = 0) {
  const term = text.trim();
  const active = Boolean(term && !term.startsWith("#"));
  const [result, setResult] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const loadingMore = useRef(false);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    const timer = setTimeout(async () => {
      if (!active) return;
      setResult({ ...initial, term, loading: true });
      try {
        if (!firebaseDb)
          throw new Error("No pudimos conectar. Inténtalo de nuevo.");
        const response = await searchProfilesPage(
          firebaseDb,
          term,
          undefined,
          current.signal,
        );
        if (!current.signal.aborted)
          setResult({ ...response, term, loading: false, error: "" });
      } catch (error) {
        if (!current.signal.aborted)
          setResult({ ...initial, term, error: socialError(error) });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      current.abort();
    };
  }, [term, active, refresh, attempt]);
  const visible =
    active && result.term === term
      ? result
      : { ...initial, term, loading: active };
  const retry = () => setAttempt((count) => count + 1);
  return {
    ...visible,
    active,
    retry,
    loadMore: async () => {
      const current = controller.current;
      if (
        !firebaseDb ||
        !current ||
        current.signal.aborted ||
        loadingMore.current ||
        visible.done
      )
        return;
      loadingMore.current = true;
      setResult((previous) => ({ ...previous, loading: true }));
      try {
        const response = await searchProfilesPage(
          firebaseDb,
          term,
          visible.cursor,
          current.signal,
        );
        if (!current.signal.aborted)
          setResult((previous) => ({
            ...response,
            term,
            profiles: [...previous.profiles, ...response.profiles],
            loading: false,
            error: "",
          }));
      } catch (error) {
        if (!current.signal.aborted)
          setResult((previous) => ({
            ...previous,
            loading: false,
            error: socialError(error),
          }));
      } finally {
        loadingMore.current = false;
      }
    },
  };
}
