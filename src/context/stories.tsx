import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useSocial } from "./social";
import { firebaseDb } from "@/lib/firebase-db";
import {
  activeStoryGroups,
  createCloudStory,
  readStory,
  STORY_LIFETIME,
  type Story,
  type StoryGroup,
} from "@/lib/stories";
import { socialError } from "@/lib/social-errors";
import { checkUploadCanceled, type UploadOptions } from "@/lib/upload-request";
import { deleteCloudContent } from "@/lib/delete-content";
import {
  discardUploads,
  uploadMedia,
  type UploadedMedia,
} from "@/lib/upload-media";

type StoriesContext = {
  groups: StoryGroup[];
  loading: boolean;
  error: string;
  deleteStory: (id: string) => Promise<void>;
  publishStory: (
    input: Pick<Story, "text" | "imageUri" | "videoUri">,
    options?: UploadOptions,
  ) => Promise<void>;
};
const Context = createContext<StoriesContext | null>(null);

export function StoriesProvider({ children }: { children: ReactNode }) {
  const { accountId, following, ready, revision } = useSocial();
  const [sources, setSources] = useState<Record<string, Story[]>>({});
  const [received, setReceived] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());
  const authorKey = JSON.stringify(
    [...new Set([accountId, ...following])].sort(),
  );

  useEffect(() => {
    const db = firebaseDb;
    if (!db || !ready) return;
    let active = true;
    const authors: string[] = JSON.parse(authorKey);
    const cutoff = Timestamp.fromMillis(Date.now() - STORY_LIFETIME);
    const stops = authors.map((creatorId) =>
      onSnapshot(
        query(
          collection(db, "stories"),
          where("creatorId", "==", creatorId),
          where("createdAt", ">", cutoff),
          orderBy("createdAt", "desc"),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (!active || snapshot.metadata.fromCache) return;
          setSources((current) => ({
            ...current,
            [creatorId]: snapshot.docs.map((item) =>
              readStory(item.id, item.data()),
            ),
          }));
          setReceived((current) => ({ ...current, [creatorId]: true }));
          setErrors((current) => ({ ...current, [creatorId]: "" }));
          setNow(Date.now());
        },
        (error) => {
          if (!active) return;
          setErrors((current) => ({
            ...current,
            [creatorId]: socialError(error),
          }));
          setReceived((current) => ({ ...current, [creatorId]: true }));
        },
      ),
    );
    return () => {
      active = false;
      stops.forEach((stop) => stop());
    };
  }, [accountId, authorKey, ready, revision]);

  const raw = useMemo(() => Object.values(sources).flat(), [sources]);
  // Expire on screen without waiting for another write or an app restart.
  useEffect(() => {
    const nextExpiry = Math.min(
      ...raw
        .map((story) => story.createdAt + STORY_LIFETIME)
        .filter((time) => time > now),
    );
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(1, Math.min(60000, nextExpiry - now + 1)),
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [raw, now]);

  const groups = useMemo(
    () => activeStoryGroups(raw, following, accountId, now),
    [raw, following, accountId, now],
  );
  const authors: string[] = JSON.parse(authorKey);
  return (
    <Context.Provider
      value={{
        groups,
        loading: !ready || authors.some((id) => !received[id]),
        error: authors.map((id) => errors[id]).find(Boolean) ?? "",
        deleteStory: async (id) => {
          try {
            if (!firebaseDb)
              throw new Error("No pudimos conectar. Inténtalo de nuevo.");
            await deleteCloudContent(firebaseDb, accountId, "stories", id);
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
        publishStory: async (input, options) => {
          const uploads: (UploadedMedia | undefined)[] = [];
          try {
            if (!firebaseDb)
              throw new Error("No pudimos conectar. Inténtalo de nuevo.");
            const image = await uploadMedia(
              input.imageUri,
              accountId,
              "image",
              options,
            );
            uploads.push(image);
            const video = await uploadMedia(
              input.videoUri,
              accountId,
              "video",
              options,
            );
            uploads.push(video);
            checkUploadCanceled(options?.signal);
            options?.onProgress?.({ phase: "saving" });
            await createCloudStory(firebaseDb, accountId, {
              text: input.text,
              imageUri: image?.url,
              videoUri: video?.url,
            });
          } catch (error) {
            await discardUploads(uploads);
            throw new Error(socialError(error));
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useStories() {
  const context = useContext(Context);
  if (!context) throw new Error("StoriesProvider is required");
  return context;
}
