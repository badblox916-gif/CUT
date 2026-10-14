import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initialPosts, type Post } from "@/data/demo";

type Profile = {
  name: string;
  handle: string;
  bio: string;
  avatarUri?: string;
};
type State = {
  posts: Post[];
  liked: string[];
  saved: string[];
  reposted: string[];
  following: string[];
  votes: Record<string, number>;
  profile: Profile;
  notificationsRead: boolean;
  seenStories: string[];
};
const initial: State = {
  posts: initialPosts,
  liked: [],
  saved: [],
  reposted: [],
  following: ["vale", "nico"],
  votes: {},
  profile: {
    name: "Alex Morgan",
    handle: "alex.crea",
    bio: "Ideas en bruto. Cultura en movimiento.\nHaciendo mi propio corte desde CDMX. ✂️",
  },
  notificationsRead: false,
  seenStories: [],
};
const KEY = "cut-social-v1";
function toggle(items: string[], id: string) {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id];
}
type SocialContext = State & {
  ready: boolean;
  storageError: boolean;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  toggleRepost: (id: string) => void;
  toggleFollow: (id: string) => void;
  vote: (id: string, option: number) => void;
  addComment: (id: string, text: string) => void;
  publish: (
    post: Pick<Post, "text" | "imageUri" | "videoUri" | "reel" | "poll">,
  ) => void;
  updateProfile: (profile: Profile) => void;
  readNotifications: () => void;
  seeStory: (id: string) => void;
};
const Context = createContext<SocialContext | null>(null);
export function SocialProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const writeQueue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw && active) {
          const stored = JSON.parse(raw);
          if (Array.isArray(stored.posts) && stored.profile)
            setState({
              ...initial,
              ...stored,
              posts: stored.posts.map((post: Post) => ({
                ...post,
                image:
                  initialPosts.find((seed) => seed.id === post.id)?.image ??
                  post.image,
              })),
            });
        }
      })
      .catch(() => {
        if (active) setStorageError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    writeQueue.current = writeQueue.current
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(state)))
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  }, [state, ready]);
  const toggleField = (
    field: "liked" | "saved" | "reposted" | "following" | "seenStories",
    id: string,
  ) =>
    setState((current) => ({
      ...current,
      [field]: toggle(current[field], id),
    }));
  return (
    <Context.Provider
      value={{
        ...state,
        ready,
        storageError,
        toggleLike: (id) => toggleField("liked", id),
        toggleSave: (id) => toggleField("saved", id),
        toggleRepost: (id) => toggleField("reposted", id),
        toggleFollow: (id) => toggleField("following", id),
        seeStory: (id) =>
          setState((current) => ({
            ...current,
            seenStories: [...new Set([...current.seenStories, id])],
          })),
        vote: (id, option) =>
          setState((current) =>
            current.votes[id] !== undefined
              ? current
              : { ...current, votes: { ...current.votes, [id]: option } },
          ),
        addComment: (id, text) => {
          if (!text.trim()) return;
          setState((current) => ({
            ...current,
            posts: current.posts.map((post) =>
              post.id === id
                ? {
                    ...post,
                    comments: [
                      ...post.comments,
                      {
                        id: `${Date.now()}-${Math.random()}`,
                        text: text.trim(),
                        author: current.profile.handle,
                      },
                    ],
                  }
                : post,
            ),
          }));
        },
        publish: (post) =>
          setState((current) => ({
            ...current,
            posts: [
              {
                ...post,
                id: `post-${Date.now()}`,
                creatorId: "me",
                tag: post.text.match(/#[\p{L}\p{N}_]+/u)?.[0] ?? "#MiCorte",
                time: "Ahora",
                likes: 0,
                reposts: 0,
                comments: [],
              },
              ...current.posts,
            ],
          })),
        updateProfile: (profile) =>
          setState((current) => ({ ...current, profile })),
        readNotifications: () =>
          setState((current) => ({ ...current, notificationsRead: true })),
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
