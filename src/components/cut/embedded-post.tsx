import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSocial } from "@/context/social";
import { useCreator } from "@/hooks/use-creator";
import { useMedia } from "@/hooks/use-media";
import { Avatar, C, Icon, Txt } from "./ui";

export function EmbeddedPost({ id }: { id: string }) {
  const { posts, accountId, profile, watchPost, isPostLoaded, syncError } =
    useSocial();
  useEffect(() => watchPost(id), [id, watchPost]);
  const post = posts.find((item) => item.id === id);
  const { creator } = useCreator(post?.creatorId ?? "");
  const imageUri = useMedia(post?.imageUri);
  const me = post?.creatorId === accountId;
  return (
    <View
      testID={`embedded-${id}`}
      style={{
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.bg,
        padding: 12,
        gap: 12,
        marginTop: 8,
      }}
    >
      {!post ? (
        <Txt style={{ color: C.muted, lineHeight: 23 }}>
          {isPostLoaded(id)
            ? "La publicación original ya no está disponible."
            : syncError
              ? "No se pudo cargar la publicación original."
              : "Cargando publicación original…"}
        </Txt>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver autor original ${me ? profile.name : creator?.name || "de la publicación"}`}
            onPress={() =>
              me
                ? router.navigate("/profile")
                : router.push({
                    pathname: "/creator/[id]",
                    params: { id: post.creatorId },
                  })
            }
            style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
          >
            <Avatar creator={creator} me={me} size={34} />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt
                numberOfLines={1}
                style={{ fontWeight: "700", fontSize: 15 }}
              >
                {me ? profile.name : creator?.name || "Perfil de la comunidad"}
              </Txt>
              <Txt numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
                {(me ? profile.handle : creator?.handle)
                  ? `@${me ? profile.handle : creator?.handle} · `
                  : ""}
                {post.time}
              </Txt>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              post.reel ? "Ver reel original" : "Abrir publicación original"
            }
            onPress={() =>
              post.reel
                ? router.push({ pathname: "/reels", params: { id } })
                : router.push({ pathname: "/post/[id]", params: { id } })
            }
            style={{ gap: 12 }}
          >
            {!!post.text && (
              <Txt style={{ fontSize: 16, lineHeight: 24 }}>{post.text}</Txt>
            )}
            {(post.image || imageUri) && (
              <Image
                source={imageUri ? { uri: imageUri } : post.image}
                style={{ width: "100%", height: 220 }}
                contentFit="cover"
              />
            )}
            {post.videoUri && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 14,
                  backgroundColor: C.raised,
                }}
              >
                <Icon name="film" color={C.green} />
                <Txt style={{ color: C.green }}>
                  {post.reel ? "VER REEL ORIGINAL" : "VER VIDEO ORIGINAL"}
                </Txt>
                <Icon name="arrow-up-right" />
              </View>
            )}
            {post.poll && (
              <View style={{ gap: 8 }}>
                {post.poll.options.map((option) => (
                  <Txt
                    key={option}
                    style={{ borderWidth: 1, borderColor: C.line, padding: 10 }}
                  >
                    {option}
                  </Txt>
                ))}
              </View>
            )}
            <Txt style={{ color: C.green, fontSize: 12 }}>
              PUBLICACIÓN ORIGINAL ↗
            </Txt>
          </Pressable>
        </>
      )}
    </View>
  );
}
