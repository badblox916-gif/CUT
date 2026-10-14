import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  C,
  Empty,
  Icon,
  IconButton,
  Page,
  Txt,
} from "@/components/cut/ui";
import { PostCard } from "@/components/cut/post-card";
import { useSocial } from "@/context/social";
export default function ProfileScreen() {
  const social = useSocial();
  const [tab, setTab] = useState<"posts" | "saved" | "reposts">("posts");
  const posts = social.posts.filter((post) =>
    tab === "posts"
      ? post.creatorId === "me"
      : tab === "saved"
        ? social.saved.includes(post.id)
        : social.reposted.includes(post.id),
  );
  return (
    <Page>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) =>
          item.reel ? (
            <Pressable
              onPress={() =>
                router.navigate({ pathname: "/reels", params: { id: item.id } })
              }
              style={styles.reelCard}
            >
              <Icon name="film" color={C.green} />
              <Txt style={{ flex: 1 }}>{item.text}</Txt>
              <Icon name="arrow-up-right" />
            </Pressable>
          ) : (
            <PostCard post={item} />
          )
        }
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.cover}>
              <Image
                source={require("@/assets/media/city.jpg")}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: "#0007" }]}
              />
              <Txt display style={styles.coverText}>
                HAZ TU{"\n"}PROPIO CORTE.
              </Txt>
              <View style={styles.tape}>
                <Txt
                  display
                  style={{ color: C.black, fontSize: 13, letterSpacing: 1 }}
                >
                  100% ORIGINAL / 100% TÚ
                </Txt>
              </View>
              <IconButton
                name="settings"
                label="Ajustes"
                onPress={() => router.push("/settings")}
                style={{ position: "absolute", top: 14, right: 14 }}
              />
            </View>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Avatar me size={78} />
              </View>
              <Button
                secondary
                icon="edit-3"
                onPress={() => router.push("/edit-profile")}
                style={{ alignSelf: "flex-end" }}
              >
                EDITAR PERFIL
              </Button>
              <Txt display style={{ fontSize: 32, marginTop: 16 }}>
                {social.profile.name}
              </Txt>
              <Txt style={{ color: C.green, fontSize: 15, marginTop: 5 }}>
                @{social.profile.handle}
              </Txt>
              <Txt style={{ fontSize: 16, lineHeight: 25, marginTop: 15 }}>
                {social.profile.bio}
              </Txt>
              <View
                style={{
                  flexDirection: "row",
                  gap: 5,
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <Icon name="map-pin" size={12} color={C.muted} />
                <Txt style={{ color: C.muted, fontSize: 13 }}>
                  Ciudad de México · En CUT desde octubre
                </Txt>
              </View>
              <View style={styles.stats}>
                {[
                  {
                    n: social.posts.filter((p) => p.creatorId === "me").length,
                    label: "CORTES",
                  },
                  { n: social.following.length, label: "SIGUIENDO" },
                  { n: social.saved.length, label: "GUARDADOS" },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{ flex: 1, alignItems: "center" }}
                  >
                    <Txt display style={{ fontSize: 28 }}>
                      {stat.n}
                    </Txt>
                    <Txt
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        letterSpacing: 1.3,
                        marginTop: 4,
                      }}
                    >
                      {stat.label}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.tabs}>
              {(
                [
                  { id: "posts", label: "MIS CORTES" },
                  { id: "saved", label: "GUARDADOS" },
                  { id: "reposts", label: "REPOSTS" },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setTab(item.id)}
                  style={[
                    styles.tab,
                    tab === item.id && { borderBottomColor: C.green },
                  ]}
                >
                  <Txt
                    display
                    style={{
                      color: tab === item.id ? C.green : C.muted,
                      fontSize: 14,
                      letterSpacing: 1,
                    }}
                  >
                    {item.label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View>
            <Empty
              title={
                tab === "posts"
                  ? "TU HISTORIA EMPIEZA AQUÍ"
                  : tab === "saved"
                    ? "TUS INSPIRACIONES, A MANO"
                    : "DALE VOZ A OTROS CORTES"
              }
              text={
                tab === "posts"
                  ? "Comparte una idea, una foto o tu próximo drop con la comunidad."
                  : tab === "saved"
                    ? "Toca el marcador en cualquier publicación para guardarla aquí."
                    : "Los cortes que repostees aparecerán aquí."
              }
            />
            {tab === "posts" && (
              <Button
                icon="scissors"
                onPress={() => router.push("/compose")}
                style={{ alignSelf: "center" }}
              >
                CREAR MI PRIMER CORTE
              </Button>
            )}
          </View>
        }
      />
    </Page>
  );
}
const styles = StyleSheet.create({
  cover: { height: 210, backgroundColor: C.raised, overflow: "hidden" },
  coverText: {
    position: "absolute",
    left: 22,
    top: 20,
    fontSize: 36,
    lineHeight: 45,
    letterSpacing: 1,
  },
  tape: {
    position: "absolute",
    right: 18,
    bottom: 18,
    padding: 6,
    backgroundColor: C.green,
    transform: [{ rotate: "-4deg" }],
  },
  identity: { paddingHorizontal: 20, paddingTop: 16 },
  avatar: {
    position: "absolute",
    top: -30,
    left: 20,
    borderWidth: 4,
    borderColor: C.bg,
    transform: [{ rotate: "-3deg" }],
  },
  stats: {
    flexDirection: "row",
    paddingVertical: 24,
    marginTop: 18,
    borderTopWidth: 1,
    borderColor: C.line,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  reelCard: {
    margin: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    gap: 15,
    alignItems: "center",
    backgroundColor: C.panel,
  },
});
