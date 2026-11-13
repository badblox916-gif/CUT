import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, View } from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  Empty,
  Page,
  Txt,
} from "@/components/cut/ui";
import { useSocial } from "@/context/social";
import { useStories } from "@/context/stories";
import { useCreator } from "@/hooks/use-creator";
import { ContentOptions } from "@/components/cut/content-options";

function StoryVideo({ uri, paused }: { uri: string; paused: boolean }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = true;
  });
  useFocusEffect(
    useCallback(() => {
      if (!paused) player.play();
      else player.pause();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active" && !paused) player.play();
        else player.pause();
      });
      return () => {
        subscription.remove();
        player.pause();
      };
    }, [player, paused]),
  );
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      nativeControls
      contentFit="contain"
      playsInline
      surfaceType="textureView"
    />
  );
}

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accountId, seeStory } = useSocial();
  const { groups, loading, error, deleteStory } = useStories();
  const authorId = id ?? accountId;
  const { creator } = useCreator(authorId);
  const items =
    groups.find((group) => group.creatorId === authorId)?.stories ?? [];
  const [selected, setSelected] = useState("");
  const [optionsStoryId, setOptionsStoryId] = useState("");
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === selected),
  );
  const current = items[index];
  useEffect(() => {
    if (current) seeStory(current.id);
  }, [current, seeStory]);
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  return (
    <Page header={false}>
      <BackHeader title="HISTORIAS" />
      {loading && !current ? (
        <ActivityIndicator
          accessibilityLabel="Cargando historias"
          color={C.green}
          style={{ flex: 1 }}
        />
      ) : !current ? (
        <View style={{ flex: 1 }}>
          <Empty
            title="SIN HISTORIAS"
            text={
              error ||
              "No hay historias vigentes de esta cuenta. Solo puedes ver las tuyas y las de personas que sigues durante 24 horas."
            }
          />
          {authorId === accountId && (
            <Button
              onPress={() =>
                router.push({ pathname: "/compose", params: { type: "story" } })
              }
            >
              CREAR HISTORIA
            </Button>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {items.map((item, itemIndex) => (
              <View
                key={item.id}
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: itemIndex <= index ? C.green : C.line,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar creator={creator} me={authorId === accountId} size={36} />
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1}>{creator?.name || "Tu historia"}</Txt>
              <Txt style={{ fontSize: 12, color: C.muted }}>
                {new Date(current.createdAt).toLocaleString("es-MX")} ·{" "}
                {index + 1}/{items.length}
              </Txt>
            </View>
            {authorId === accountId && (
              <ContentOptions
                key={current.id}
                kind="historia"
                onOpenChange={(open) =>
                  setOptionsStoryId(open ? current.id : "")
                }
                onDelete={async () => {
                  const next = items[index + 1] ?? items[index - 1];
                  await deleteStory(current.id);
                  setSelected(next?.id ?? "");
                }}
              />
            )}
          </View>
          <View
            style={{
              flex: 1,
              minHeight: 160,
              backgroundColor: C.black,
              overflow: "hidden",
            }}
          >
            {current.videoUri ? (
              <StoryVideo
                key={current.id}
                uri={current.videoUri}
                paused={optionsStoryId === current.id}
              />
            ) : (
              <Image
                accessibilityLabel="Imagen de la historia"
                source={{ uri: current.imageUri }}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
              />
            )}
          </View>
          {!!current.text && (
            <Txt style={{ fontSize: 16, lineHeight: 23 }}>{current.text}</Txt>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              secondary
              disabled={index === 0}
              onPress={() => setSelected(items[index - 1].id)}
              style={{ flex: 1 }}
            >
              ANTERIOR
            </Button>
            <Button
              onPress={() =>
                index + 1 < items.length
                  ? setSelected(items[index + 1].id)
                  : close()
              }
              style={{ flex: 1 }}
            >
              {index + 1 < items.length ? "SIGUIENTE" : "LISTO"}
            </Button>
          </View>
        </View>
      )}
    </Page>
  );
}
