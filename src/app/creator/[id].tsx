import { useLocalSearchParams, router } from "expo-router";
import { FlatList, View } from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  creatorFor,
  Empty,
  Page,
  Txt,
} from "@/components/cut/ui";
import { PostCard } from "@/components/cut/post-card";
import { useSocial } from "@/context/social";
export default function CreatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const social = useSocial();
  const creator = creatorFor(id);
  if (!creator)
    return (
      <Page header={false}>
        <BackHeader title="CREADOR" />
        <Empty
          title="PERFIL NO ENCONTRADO"
          text="Este perfil no está disponible."
        />
      </Page>
    );
  const posts = social.posts.filter(
    (post) => post.creatorId === id && !post.reel,
  );
  return (
    <Page header={false}>
      <BackHeader title="LA COMUNIDAD" />
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={{ padding: 25, gap: 14, alignItems: "center" }}>
            <Avatar creator={creator} size={82} />
            <Txt display style={{ fontSize: 33 }}>
              {creator.name}
            </Txt>
            <Txt style={{ color: C.green }}>@{creator.handle}</Txt>
            <Txt
              style={{ textAlign: "center", color: C.muted, lineHeight: 27 }}
            >
              {creator.bio}
            </Txt>
            <Button
              secondary={social.following.includes(id)}
              icon={social.following.includes(id) ? "check" : "plus"}
              onPress={() => social.toggleFollow(id)}
            >
              {social.following.includes(id) ? "SIGUIENDO" : "SEGUIR"}
            </Button>
            {social.posts.some((p) => p.reel && p.creatorId === id) && (
              <Button
                secondary
                icon="film"
                onPress={() => router.navigate("/reels")}
              >
                VER REELS
              </Button>
            )}
            <View
              style={{
                height: 1,
                alignSelf: "stretch",
                backgroundColor: C.line,
                marginVertical: 12,
              }}
            />
            <Txt display style={{ fontSize: 16, letterSpacing: 2 }}>
              CORTES DEL CREADOR
            </Txt>
          </View>
        }
        ListEmptyComponent={
          <Empty
            title="EN MOVIMIENTO"
            text="Este creador todavía no tiene publicaciones en el feed."
          />
        }
      />
    </Page>
  );
}
