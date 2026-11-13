import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  Empty,
  Icon,
  Page,
  Txt,
  type IconName,
} from "@/components/cut/ui";
import { useNotifications } from "@/context/notifications";
import { useSocial } from "@/context/social";
import { useCreator } from "@/hooks/use-creator";
import type {
  ActivityNotification,
  NotificationKind,
} from "@/lib/notifications";

const messages: Record<NotificationKind, string> = {
  follow: "comenzó a seguirte",
  like: "le dio me gusta a tu publicación",
  comment: "comentó tu publicación",
  repost: "reposteó tu publicación",
};
const icons: Record<NotificationKind, IconName> = {
  follow: "user-plus",
  like: "heart",
  comment: "message-square",
  repost: "repeat",
};
function NotificationRow({
  item,
  unread,
}: {
  item: ActivityNotification;
  unread: boolean;
}) {
  const { creator } = useCreator(item.actorId);
  const message = `${creator?.name || "Una persona"} ${messages[item.type]}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={message}
      onPress={() =>
        item.type === "follow"
          ? router.push({
              pathname: "/creator/[id]",
              params: { id: item.actorId },
            })
          : router.push({ pathname: "/post/[id]", params: { id: item.postId } })
      }
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderBottomWidth: 1,
        borderColor: C.line,
        backgroundColor: unread ? "#253b2e" : C.panel,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Avatar creator={creator} size={42} />
      <View style={{ flex: 1, gap: 6 }}>
        <Txt style={{ fontSize: 16, lineHeight: 23 }}>{message}</Txt>
        <Txt style={{ fontSize: 12, color: C.muted }}>
          {new Date(item.createdAt).toLocaleString("es-MX", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Txt>
      </View>
      <Icon name={icons[item.type]} size={18} color={C.green} />
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const notifications = useNotifications();
  const { retry } = useSocial();
  const { loading, unreadCount, markRead } = notifications;
  const [readError, setReadError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!loading && unreadCount > 0)
        void markRead().catch((error) => {
          if (active) setReadError(error.message);
        });
      return () => {
        active = false;
      };
    }, [loading, unreadCount, markRead]),
  );
  const error = notifications.error || readError;
  return (
    <Page header={false}>
      <BackHeader title="NOTIFICACIONES" />
      {!!error && (
        <View style={{ padding: 16, gap: 12 }}>
          <Txt accessibilityRole="alert" style={{ color: "#ffbd9d" }}>
            {error}
          </Txt>
          <Button
            secondary
            onPress={() => {
              setReadError("");
              retry();
            }}
          >
            REINTENTAR
          </Button>
        </View>
      )}
      {loading && notifications.items.length === 0 ? (
        <ActivityIndicator
          accessibilityLabel="Cargando notificaciones"
          color={C.green}
          style={{ flex: 1 }}
        />
      ) : (
        <FlatList
          data={notifications.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              unread={item.createdAt > notifications.readThrough}
            />
          )}
          contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
          ListEmptyComponent={
            !error ? (
              <Empty
                title="SIN NOTIFICACIONES"
                text="Cuando alguien te siga o interactúe con tus publicaciones, aparecerá aquí."
              />
            ) : undefined
          }
          ListFooterComponent={
            notifications.hasMore ? (
              <Button secondary onPress={notifications.loadMore}>
                CARGAR MÁS NOTIFICACIONES
              </Button>
            ) : undefined
          }
        />
      )}
    </Page>
  );
}
