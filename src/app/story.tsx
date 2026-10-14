import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar, Button, C, IconButton, Page, Txt } from "@/components/cut/ui";
import { useSocial } from "@/context/social";
import { creators } from "@/data/demo";
export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const social = useSocial();
  const [index, setIndex] = useState(
    Math.max(
      0,
      creators.findIndex((c) => c.id === id),
    ),
  );
  const creator = creators[index];
  const post = social.posts.find((p) => p.creatorId === creator.id && !p.reel);
  const { seeStory, seenStories } = social;
  useEffect(() => {
    if (!seenStories.includes(creator.id)) seeStory(creator.id);
  }, [creator.id, seeStory, seenStories]);
  return (
    <Page header={false}>
      <View style={{ flex: 1, backgroundColor: C.raised }}>
        <Image
          source={post?.image ?? require("@/assets/media/city.jpg")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0005" }]} />
        <View style={styles.top}>
          <View style={styles.progress}>
            {creators.map((c, i) => (
              <View
                key={c.id}
                style={{
                  height: 3,
                  flex: 1,
                  backgroundColor: i <= index ? C.green : "#fff5",
                }}
              />
            ))}
          </View>
          <View style={styles.author}>
            <Avatar creator={creator} size={36} />
            <Txt style={{ flex: 1, fontWeight: "700" }}>@{creator.handle}</Txt>
            <IconButton
              name="x"
              label="Cerrar corte"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            />
          </View>
        </View>
        <View style={styles.navigation}>
          <Pressable
            accessibilityLabel="Corte anterior"
            onPress={() => setIndex(Math.max(0, index - 1))}
            style={{ flex: 1 }}
          />
          <Pressable
            accessibilityLabel="Siguiente corte"
            onPress={() =>
              index < creators.length - 1 ? setIndex(index + 1) : router.back()
            }
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.caption}>
          <Txt display style={{ fontSize: 44, lineHeight: 52 }}>
            SIN FILTRO.{"\n"}CON ACTITUD.
          </Txt>
          <Txt style={{ fontSize: 17, lineHeight: 27, marginTop: 15 }}>
            {post?.text ?? creator.bio}
          </Txt>
          <Button
            onPress={() =>
              router.replace({
                pathname: "/creator/[id]",
                params: { id: creator.id },
              })
            }
            icon="arrow-up-right"
            style={{ marginTop: 20, alignSelf: "flex-start" }}
          >
            VER CREADOR
          </Button>
        </View>
      </View>
    </Page>
  );
}
const styles = StyleSheet.create({
  top: { position: "absolute", top: 16, left: 16, right: 16, zIndex: 2 },
  progress: { flexDirection: "row", gap: 5, marginBottom: 15 },
  author: { flexDirection: "row", alignItems: "center", gap: 10 },
  navigation: { ...StyleSheet.absoluteFill, flexDirection: "row" },
  caption: { position: "absolute", bottom: 50, left: 25, right: 25 },
});
