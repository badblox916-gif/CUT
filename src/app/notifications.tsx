import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Avatar, BackHeader, C, Icon, Page, Txt } from "@/components/cut/ui";
import { creators } from "@/data/demo";
import { useSocial } from "@/context/social";
const activities = [
  {
    creator: 0,
    text: "publicó un nuevo corte.",
    time: "Hace 24 min",
    post: "street",
    icon: "image" as const,
  },
  {
    creator: 2,
    text: "quiere conocer tu opinión. Vota en su nuevo fanzine.",
    time: "Hace 1 h",
    post: "poll",
    icon: "bar-chart-2" as const,
  },
  {
    creator: 3,
    text: "estrenó City Sessions. Descubre el ritmo de la ciudad.",
    time: "Hoy",
    post: "rain",
    icon: "film" as const,
  },
];
export default function NotificationsScreen() {
  const social = useSocial();
  useEffect(() => {
    if (!social.notificationsRead) social.readNotifications();
  }, [social]);
  return (
    <Page header={false}>
      <BackHeader title="EN TU RADAR" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Txt display style={{ fontSize: 35, marginVertical: 16 }}>
          ALGO SE MUEVE.
        </Txt>
        <Txt style={{ color: C.muted, fontSize: 15, marginBottom: 25 }}>
          Novedades de la comunidad CUT
        </Txt>
        {activities.map((activity) => (
          <Pressable
            key={activity.post}
            onPress={() =>
              activity.post === "rain"
                ? router.navigate("/reels")
                : router.push({
                    pathname: "/post/[id]",
                    params: { id: activity.post },
                  })
            }
            style={{
              flexDirection: "row",
              gap: 12,
              paddingVertical: 20,
              borderBottomWidth: 1,
              borderColor: C.line,
            }}
          >
            <Avatar creator={creators[activity.creator]} />
            <View style={{ flex: 1, gap: 7 }}>
              <Txt style={{ lineHeight: 25, fontSize: 16 }}>
                <Txt style={{ color: C.green }}>
                  {creators[activity.creator].name}
                </Txt>{" "}
                {activity.text}
              </Txt>
              <Txt style={{ fontSize: 13, color: C.muted }}>
                {activity.time}
              </Txt>
            </View>
            <Icon name={activity.icon} size={18} color={C.green} />
          </Pressable>
        ))}
      </ScrollView>
    </Page>
  );
}
