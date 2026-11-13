import { Image } from "expo-image";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSocial } from "@/context/social";
import type { Post } from "@/data/social";
import { useMedia } from "@/hooks/use-media";
import { useCreator } from "@/hooks/use-creator";
import { Avatar, C, Icon, Txt, type IconName } from "./ui";
import { ContentOptions } from "./content-options";
import { EmbeddedPost } from "./embedded-post";
import { MediaVideo } from "./media-video";

export function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}
export const PostCard = memo(function PostCard({
  post,
  videoActive = true,
}: {
  post: Post;
  videoActive?: boolean;
}) {
  const social = useSocial();
  const imageUri = useMedia(post.imageUri);
  const { creator } = useCreator(post.creatorId);
  const me = post.creatorId === social.accountId;
  const voted = social.votes[post.id];
  const repostTarget = post.originalPostId ?? post.id;
  const original = post.originalPostId
    ? social.posts.find((item) => item.id === post.originalPostId)
    : undefined;
  const openComments = () =>
    router.push({ pathname: "/post/[id]", params: { id: post.id } });
  const actions: {
    icon: IconName;
    label: string;
    value?: string;
    active: boolean;
    onPress: () => void;
  }[] = [
    {
      icon: "heart",
      label: "Me gusta",
      value: compact(post.likes),
      active: social.liked.includes(post.id),
      onPress: () => social.toggleLike(post.id),
    },
    {
      icon: "message-square",
      label: "Comentarios",
      value: compact(post.comments.length),
      active: false,
      onPress: openComments,
    },
    {
      icon: "repeat",
      label: "Repostear",
      value: compact(original?.reposts ?? post.reposts),
      active: social.reposted.includes(repostTarget),
      onPress: () => social.toggleRepost(repostTarget),
    },
    {
      icon: "bookmark",
      label: social.saved.includes(post.id) ? "Quitar de guardados" : "Guardar",
      active: social.saved.includes(post.id),
      onPress: () => social.toggleSave(post.id),
    },
  ];
  return (
    <View testID={`post-${post.id}`} style={styles.card}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver perfil de ${creator?.name || social.profile.name || "Tu perfil"}`}
          onPress={() =>
            me
              ? router.navigate("/profile")
              : router.push({
                  pathname: "/creator/[id]",
                  params: { id: post.creatorId },
                })
          }
          style={styles.author}
        >
          <Avatar creator={creator} me={me} />
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
            >
              <Txt
                numberOfLines={1}
                style={{ fontSize: 17, fontWeight: "700", flexShrink: 1 }}
              >
                {me
                  ? social.profile.name || "Tú"
                  : creator?.name || "Perfil de la comunidad"}
              </Txt>
            </View>
            <Txt
              numberOfLines={1}
              style={{ color: C.muted, fontSize: 13, marginTop: 4 }}
            >
              {(me ? social.profile.handle : creator?.handle)
                ? `@${me ? social.profile.handle : creator?.handle} · `
                : ""}
              {post.time}
            </Txt>
          </View>
        </Pressable>
        <ContentOptions
          kind={
            post.originalPostId ? "repost" : post.reel ? "reel" : "publicación"
          }
          onDelete={me ? () => social.deletePost(post.id) : undefined}
          saved={{
            active: social.saved.includes(post.id),
            toggle: () => social.toggleSave(post.id),
          }}
          shareMessage={`${original?.text ?? post.text}\n${original?.tag ?? post.tag} — Descubierto en CUT`}
          style={{ backgroundColor: "transparent", borderWidth: 0, width: 32 }}
        />
      </View>
      {post.originalPostId && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name="repeat" size={14} color={C.green} />
          <Txt style={{ color: C.green, fontSize: 13 }}>REPOSTEÓ UN CORTE</Txt>
        </View>
      )}
      {!!post.text && <Txt style={styles.caption}>{post.text}</Txt>}
      {post.originalPostId && <EmbeddedPost id={post.originalPostId} />}
      {!!post.videoUri && !post.reel && (
        <View style={styles.media}>
          <MediaVideo
            key={post.videoUri}
            uri={post.videoUri}
            active={videoActive}
            height={315}
          />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: "/", params: { tag: post.tag } })
        }
      >
        <Txt style={{ color: C.green, fontSize: 15, marginBottom: 12 }}>
          {post.tag}
        </Txt>
      </Pressable>
      {(post.image || post.imageUri) && (
        <Pressable
          accessibilityLabel="Ver publicación y comentarios"
          onPress={openComments}
          style={styles.media}
        >
          <Image
            source={imageUri ? { uri: imageUri } : post.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={post.id === "street" ? "top" : "center"}
            transition={200}
          />
          <View style={styles.mediaNumber}>
            <Txt display style={{ fontSize: 13, color: C.black }}>
              CUT / {post.id === "street" ? "001" : "003"}
            </Txt>
          </View>
          {post.id === "street" && (
            <View style={styles.mediaLabel}>
              <Txt
                display
                style={{ fontSize: 41, lineHeight: 49, color: C.black }}
              >
                LA CALLE
              </Txt>
              <Txt
                display
                style={{ fontSize: 41, lineHeight: 49, color: C.black }}
              >
                ES TUYA.
              </Txt>
              <Txt style={{ fontSize: 12, color: C.black, letterSpacing: 1.3 }}>
                NO SIGAS EL GUIÓN. HAZ EL CORTE.
              </Txt>
            </View>
          )}
          <View style={styles.mediaTag}>
            <Icon name="scissors" size={12} color={C.black} />
            <Txt
              display
              style={{ color: C.black, fontSize: 14, letterSpacing: 1 }}
            >
              ORIGINAL CUT
            </Txt>
          </View>
        </Pressable>
      )}
      {post.poll && (
        <View style={styles.poll}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Txt
              display
              style={{ fontSize: 13, letterSpacing: 1, color: C.mint }}
            >
              TU VOZ CUENTA
            </Txt>
            <Txt style={{ fontSize: 13, color: C.green }}>
              {voted === undefined ? "ELIGE TU CORTE" : "VOTO REGISTRADO ✓"}
            </Txt>
          </View>
          {post.poll.options.map((option, index) => {
            const votes = post.poll!.votes;
            const percent = Math.round(
              (votes[index] / (votes.reduce((a, b) => a + b, 0) || 1)) * 100,
            );
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Votar por ${option}`}
                disabled={voted !== undefined}
                key={option}
                onPress={() => social.vote(post.id, index)}
                style={[
                  styles.pollOption,
                  voted === index && { borderColor: C.green },
                ]}
              >
                {voted !== undefined && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        width: `${percent}%`,
                        backgroundColor:
                          voted === index ? "#355e42" : "#303a34",
                      },
                    ]}
                  />
                )}
                <Txt
                  display
                  style={{ fontSize: 14, letterSpacing: 0.5, flex: 1 }}
                >
                  {option}
                </Txt>
                {voted !== undefined && (
                  <Txt display style={{ color: C.green, marginLeft: 8 }}>
                    {percent}%
                  </Txt>
                )}
              </Pressable>
            );
          })}
          <Txt style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
            {post.poll.votes.reduce((a, b) => a + b, 0)} votos · Encuesta de la
            comunidad
          </Txt>
        </View>
      )}
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.icon}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ selected: action.active }}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.action,
              action.active && {
                borderColor: C.green,
                backgroundColor: "#253b2e",
              },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Icon
              name={action.icon}
              size={17}
              color={action.active ? C.green : C.mint}
            />
            {action.value !== undefined && (
              <Txt
                style={{
                  fontSize: 14,
                  color: action.active ? C.green : C.mint,
                }}
              >
                {action.value}
              </Txt>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 14,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    boxShadow: "4px 4px 0 #070908",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  caption: { fontSize: 16, lineHeight: 25, marginBottom: 5 },
  media: {
    height: 315,
    backgroundColor: C.raised,
    borderWidth: 2,
    borderColor: C.black,
    overflow: "hidden",
  },
  mediaNumber: {
    position: "absolute",
    left: 10,
    top: 10,
    backgroundColor: C.text,
    paddingHorizontal: 7,
    paddingVertical: 4,
    transform: [{ rotate: "-3deg" }],
  },
  mediaLabel: {
    position: "absolute",
    left: 12,
    right: 12,
    maxWidth: 280,
    bottom: 30,
    backgroundColor: C.green,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
    transform: [{ rotate: "-4deg" }],
    boxShadow: "3px 3px 0 #070908",
  },
  mediaTag: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 5,
    backgroundColor: C.text,
  },
  actions: { flexDirection: "row", gap: 7, marginTop: 13 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    gap: 6,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.black,
  },
  poll: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.black,
    padding: 12,
  },
  pollOption: {
    minHeight: 52,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
});
