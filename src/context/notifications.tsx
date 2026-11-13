import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSocial } from "./social";
import { firebaseDb } from "@/lib/firebase-db";
import {
  markNotificationsRead,
  readNotification,
  type ActivityNotification,
} from "@/lib/notifications";
import { socialError } from "@/lib/social-errors";

type NotificationsContext = {
  items: ActivityNotification[];
  loading: boolean;
  error: string;
  unreadCount: number;
  readThrough: number;
  hasMore: boolean;
  loadMore: () => void;
  markRead: () => Promise<void>;
};
const Context = createContext<NotificationsContext | null>(null);
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { accountId, ready, revision } = useSocial();
  const [items, setItems] = useState<ActivityNotification[]>([]);
  const [readThrough, setReadThrough] = useState(0);
  const [loaded, setLoaded] = useState({ list: false, preferences: false });
  const [errors, setErrors] = useState({ list: "", preferences: "" });
  const [count, setCount] = useState(30);
  useEffect(() => {
    if (!firebaseDb || !ready) return;
    let active = true;
    const listStop = onSnapshot(
      query(
        collection(firebaseDb, "accounts", accountId, "notifications"),
        orderBy("createdAt", "desc"),
        limit(count),
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active || snapshot.metadata.fromCache) return;
        setItems(
          snapshot.docs
            .map((item) => readNotification(item.id, item.data()))
            .filter((item): item is ActivityNotification => Boolean(item)),
        );
        setLoaded((current) => ({ ...current, list: true }));
        setErrors((current) => ({ ...current, list: "" }));
      },
      (error) => {
        if (active) {
          setLoaded((current) => ({ ...current, list: true }));
          setErrors((current) => ({ ...current, list: socialError(error) }));
        }
      },
    );
    const preferencesStop = onSnapshot(
      doc(firebaseDb, "accounts", accountId, "preferences", "notifications"),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active || snapshot.metadata.fromCache) return;
        const value = snapshot.data()?.readThrough;
        setReadThrough(value instanceof Timestamp ? value.toMillis() : 0);
        setLoaded((current) => ({ ...current, preferences: true }));
        setErrors((current) => ({ ...current, preferences: "" }));
      },
      (error) => {
        if (active) {
          setLoaded((current) => ({ ...current, preferences: true }));
          setErrors((current) => ({
            ...current,
            preferences: socialError(error),
          }));
        }
      },
    );
    return () => {
      active = false;
      listStop();
      preferencesStop();
    };
  }, [accountId, ready, revision, count]);
  const newest = items[0]?.timestamp;
  const markRead = useCallback(async () => {
    if (!firebaseDb || !newest) return;
    try {
      await markNotificationsRead(firebaseDb, accountId, newest);
    } catch (error) {
      throw new Error(socialError(error));
    }
  }, [accountId, newest]);
  return (
    <Context.Provider
      value={{
        items,
        readThrough,
        loading: !ready || !loaded.list || !loaded.preferences,
        error: errors.list || errors.preferences,
        unreadCount: items.filter((item) => item.createdAt > readThrough)
          .length,
        hasMore: items.length >= count,
        loadMore: () => setCount((current) => current + 30),
        markRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotifications() {
  const context = useContext(Context);
  if (!context) throw new Error("NotificationsProvider is required");
  return context;
}
