import { useEvent } from "expo";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
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
import { compact } from "@/components/cut/post-card";
import { ContentOptions } from "@/components/cut/content-options";
import { useSocial } from "@/context/social";
import type { Post } from "@/data/social";
import { useMedia } from "@/hooks/use-media";
import { useCreator } from "@/hooks/use-creator";

function Reel({
  post,
  height,
  active,
}: {
  post: Post;
  height: number;
  active: boolean;
}) {
  const social = useSocial();
  const { creator } = useCreator(post.creatorId);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const videoUri = useMedia(post.videoUri);
  const player = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  const timeEvent = useEvent(player, "timeUpdate");
  const currentTime = timeEvent?.currentTime ?? 0;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (active && !paused && foreground && !optionsOpen) player.play();
    else player.pause();
  }, [active, paused, player, foreground, status, optionsOpen]);
  useEffect(() => {
    // Expo Video exposes mutable playback properties on its imperative player.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [muted, player]);
  const following = social.following.includes(post.creatorId);
  const me = post.creatorId === social.accountId;
  return (
    <View style={{ height, overflow: "hidden", backgroundColor: C.black }}>
      {post.image && (
        <Image
          source={post.image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        playsInline
        surfaceType="textureView"
      />
      <Pressable
        accessibilityLabel={
          paused ? "Tocar para reproducir" : "Tocar para pausar"
        }
        onPress={() => setPaused(!paused)}
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.shade} />
        {paused && (
          <View style={styles.pause}>
            <Icon name="play" size={36} color={C.green} />
          </View>
        )}
        {status === "loading" && (
          <ActivityIndicator
            size="large"
            color={C.green}
            style={{ marginTop: height / 2 }}
          />
        )}
        {status === "error" && (
          <View style={styles.error}>
            <Txt style={{ textAlign: "center" }}>
              No se pudo cargar el video.
            </Txt>
            <Button
              onPress={() => {
                if (!videoUri) return;
                player.replaceAsync(videoUri).catch(() => {});
                setPaused(false);
              }}
            >
              REINTENTAR
            </Button>
          </View>
        )}
      </Pressable>
      <IconButton
        name={paused ? "play" : "pause"}
        label={paused ? "Reproducir reel" : "Pausar reel"}
        onPress={() => setPaused(!paused)}
        style={{
          position: "absolute",
          right: 15,
          top: 18,
          backgroundColor: "#0b0e0ccc",
          borderColor: "#b7dec777",
          zIndex: 2,
        }}
      />
      <ContentOptions
        kind="reel"
        onDelete={me ? () => social.deletePost(post.id) : undefined}
        saved={{
          active: social.saved.includes(post.id),
          toggle: () => social.toggleSave(post.id),
        }}
        shareMessage={`${post.text} ${post.tag} — CUT`}
        onOpenChange={setOptionsOpen}
        style={{
          position: "absolute",
          left: 15,
          top: 18,
          backgroundColor: "#0b0e0ccc",
          zIndex: 2,
        }}
      />
      <View style={styles.bottom}>
        <View style={{ flex: 1, gap: 9 }}>
          <Pressable
            onPress={() =>
              me
                ? router.navigate("/profile")
                : router.push({
                    pathname: "/creator/[id]",
                    params: { id: post.creatorId },
                  })
            }
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Avatar creator={creator} me={me} size={36} />
            <Txt
              numberOfLines={1}
              style={{ fontWeight: "700", fontSize: 16, flexShrink: 1 }}
            >
              {(me ? social.profile.handle : creator?.handle)
                ? `@${me ? social.profile.handle : creator?.handle}`
                : "Tú"}
            </Txt>
          </Pressable>
          {!me && (
            <Button
              secondary={following}
              onPress={() => social.toggleFollow(post.creatorId)}
              style={{ alignSelf: "flex-start", minHeight: 44 }}
            >
              {following ? "SIGUIENDO ✓" : "+ SEGUIR"}
            </Button>
          )}
          <Txt
            numberOfLines={expanded ? 4 : 2}
            style={{ fontSize: 15, lineHeight: 23 }}
          >
            {post.text}
          </Txt>
          <Pressable onPress={() => setExpanded(!expanded)}>
            <Txt display style={{ fontSize: 13, color: C.green }}>
              {expanded ? "MENOS" : "MÁS"}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/", params: { tag: post.tag } })
            }
          >
            <Txt style={{ color: C.green, fontSize: 15 }}>{post.tag}</Txt>
          </Pressable>
          {(height >= 500 || expanded) && (
            <View style={styles.audio}>
              <Icon name="music" size={12} />
              <Txt
                numberOfLines={1}
                style={{ fontSize: 13, color: C.mint, flexShrink: 1 }}
              >
                Sonido original · {creator?.name ?? "Tu corte"}
              </Txt>
            </View>
          )}
        </View>
        <View style={styles.dock}>
          <View style={styles.dockItem}>
            <IconButton
              name="heart"
              label="Me gusta"
              active={social.liked.includes(post.id)}
              onPress={() => social.toggleLike(post.id)}
              style={styles.dockButton}
            />
            <Txt style={styles.count}>{compact(post.likes)}</Txt>
          </View>
          <View style={styles.dockItem}>
            <IconButton
              name="message-square"
              label="Comentarios"
              onPress={() =>
                router.push({ pathname: "/post/[id]", params: { id: post.id } })
              }
              style={styles.dockButton}
            />
            <Txt style={styles.count}>{post.comments.length}</Txt>
          </View>
          <IconButton
            name="send"
            label="Compartir reel"
            onPress={() =>
              Share.share({
                message: post.text + " " + post.tag + " — CUT",
              }).catch(() => {})
            }
            style={styles.dockButton}
          />
          <IconButton
            name="bookmark"
            label="Guardar reel"
            active={social.saved.includes(post.id)}
            onPress={() => social.toggleSave(post.id)}
            style={styles.dockButton}
          />
          <IconButton
            name={muted ? "volume-x" : "volume-2"}
            label={muted ? "Activar sonido" : "Silenciar"}
            onPress={() => setMuted(!muted)}
            style={styles.dockButton}
          />
        </View>
      </View>
      <View style={styles.progress}>
        <View
          style={{
            height: 3,
            width: (Math.min(
              100,
              player.duration ? (currentTime / player.duration) * 100 : 0,
            ) + "%") as "100%",
            backgroundColor: C.green,
          }}
        />
      </View>
    </View>
  );
}
export default function ReelsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    posts,
    following: followed,
    accountId,
    loadMore,
    watchPost,
  } = useSocial();
  useEffect(() => (id ? watchPost(id) : undefined), [id, watchPost]);
  const [following, setFollowing] = useState(false);
  const [height, setHeight] = useState(600);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      posts.filter((post) => post.reel).findIndex((post) => post.id === id),
    ),
  );
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const reels = posts.filter(
    (post) =>
      post.reel &&
      post.videoUri &&
      (!following ||
        followed.includes(post.creatorId) ||
        post.creatorId === accountId),
  );
  const requestedIndex = Math.max(
    0,
    reels.findIndex((reel) => reel.id === id),
  );
  const selectionKey = (id ?? "") + String(following) + reels.length;
  const [selection, setSelection] = useState(selectionKey);
  if (selection !== selectionKey) {
    setSelection(selectionKey);
    setIndex(requestedIndex);
  }
  return (
    <Page>
      <View style={styles.switcher}>
        <Button
          secondary={following}
          onPress={() => {
            setFollowing(false);
            setIndex(0);
            router.setParams({ id: "" });
          }}
          style={{ flex: 1 }}
        >
          PARA TI
        </Button>
        <Button
          secondary={!following}
          onPress={() => {
            setFollowing(true);
            setIndex(0);
            router.setParams({ id: "" });
          }}
          style={{ flex: 1 }}
        >
          SIGUIENDO
        </Button>
        <IconButton
          name="video"
          label="Crear reel"
          onPress={() =>
            router.push({ pathname: "/compose", params: { type: "reel" } })
          }
        />
      </View>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        <FlatList
          key={selectionKey + height}
          data={reels}
          keyExtractor={(post) => post.id}
          pagingEnabled
          ListFooterComponent={
            <Button secondary onPress={loadMore}>
              CARGAR MÁS REELS
            </Button>
          }
          initialScrollIndex={reels.length ? requestedIndex : undefined}
          getItemLayout={(_, itemIndex) => ({
            length: height,
            offset: height * itemIndex,
            index: itemIndex,
          })}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.y / height))
          }
          renderItem={({ item, index: itemIndex }) => (
            <Reel
              post={item}
              height={height}
              active={focused && itemIndex === index}
            />
          )}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          ListEmptyComponent={
            <Empty
              title="AÚN NO HAY REELS"
              text={
                following
                  ? "Los reels de las personas que sigas aparecerán aquí."
                  : "Los videos que compartas aparecerán aquí."
              }
            />
          }
        />
      </View>
    </Page>
  );
}
const styles = StyleSheet.create({
  switcher: {
    flexDirection: "row",
    gap: 9,
    padding: 15,
    backgroundColor: C.bg,
  },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: "#0004" },
  pause: {
    position: "absolute",
    top: "42%",
    alignSelf: "center",
    backgroundColor: "#0009",
    padding: 20,
    borderWidth: 1,
    borderColor: C.green,
  },
  bottom: {
    position: "absolute",
    left: 20,
    right: 15,
    bottom: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 22,
  },
  audio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#141716cc",
    alignSelf: "flex-start",
    padding: 8,
    borderWidth: 1,
    borderColor: C.line,
  },
  dock: { gap: 12, alignItems: "center" },
  dockItem: { alignItems: "center", gap: 4 },
  dockButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#0b0e0ccc",
    borderColor: "#b7dec777",
  },
  count: { fontSize: 13, fontWeight: "700" },
  progress: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#fff3",
  },
  error: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    gap: 12,
    padding: 20,
    backgroundColor: C.bg,
  },
});
