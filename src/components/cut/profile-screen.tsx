import {
  collection,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  Empty,
  Icon,
  IconButton,
  Page,
  Txt,
} from "./ui";
import { PostCard } from "./post-card";
import { ProfileCover } from "./profile-cover";
import { useSocial } from "@/context/social";
import { useCreator } from "@/hooks/use-creator";
import { useConnections } from "@/hooks/use-connections";
import { useVisiblePosts } from "@/hooks/use-visible-posts";
import { firebaseDb } from "@/lib/firebase-db";
import { socialError } from "@/lib/social-errors";

type Tab = "posts" | "saved" | "reposts" | "reels";
export function ProfileScreen({ id }: { id: string }) {
  const social = useSocial();
  const visibility = useVisiblePosts();
  const me = id === social.accountId;
  const { creator, loading, error } = useCreator(id);
  const profileAvailable = Boolean(creator);
  const connections = useConnections(id);
  const [tab, setTab] = useState<Tab>("posts");
  const { watchAuthor, revision, postCount } = social;
  useFocusEffect(
    useCallback(
      () => (me ? undefined : watchAuthor(id)),
      [me, id, watchAuthor],
    ),
  );
  const authorPosts = social.posts.filter((post) => post.creatorId === id);
  const contentKey = JSON.stringify(authorPosts.map((post) => post.id).sort());
  const [count, setCount] = useState<{
    id: string;
    total: number;
    error: string;
  }>();
  useEffect(() => {
    if (!firebaseDb || me || !profileAvailable || !id || id.includes("/"))
      return;
    let active = true;
    void getCountFromServer(
      query(collection(firebaseDb, "posts"), where("creatorId", "==", id)),
    )
      .then((result) => {
        if (active) setCount({ id, total: result.data().count, error: "" });
      })
      .catch((cause) => {
        if (active) setCount({ id, total: 0, error: socialError(cause) });
      });
    return () => {
      active = false;
    };
  }, [me, id, profileAvailable, contentKey, revision]);
  const countError = count?.id === id ? count.error : "";
  const failure = connections.error || countError;
  if (loading)
    return (
      <Page header={false}>
        <BackHeader title="PERFIL" />
        <ActivityIndicator
          color={C.green}
          accessibilityLabel="Cargando creador"
        />
      </Page>
    );
  if (!creator)
    return (
      <Page header={false}>
        <BackHeader title="PERFIL" />
        <Empty
          title="PERFIL NO ENCONTRADO"
          text={error || "Este perfil no está disponible."}
        />
      </Page>
    );
  const posts =
    tab === "saved" && me
      ? social.posts.filter((post) => social.saved.includes(post.id))
      : authorPosts.filter((post) =>
          tab === "reposts"
            ? Boolean(post.originalPostId)
            : tab === "reels"
              ? Boolean(post.reel)
              : true,
        );
  const tabs: { id: Tab; label: string }[] = [
    { id: "posts", label: me ? "MIS CORTES" : "CORTES" },
    me ? { id: "saved", label: "GUARDADOS" } : { id: "reels", label: "REELS" },
    { id: "reposts", label: "REPOSTS" },
  ];
  const total = me
    ? postCount
    : count?.id === id && !count.error
      ? count.total
      : "…";
  const openConnections = (type: "followers" | "following") =>
    router.push({ pathname: "/connections", params: { id, type } });
  return (
    <Page header={me}>
      {!me && <BackHeader title="PERFIL" />}
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) =>
          item.reel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver reel ${item.text || "sin descripción"}`}
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
            <PostCard
              post={item}
              videoActive={visibility.visible.has(item.id)}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 30 }}
        onViewableItemsChanged={visibility.onViewableItemsChanged}
        viewabilityConfig={visibility.viewabilityConfig}
        extraData={visibility.visible}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <Button secondary onPress={social.loadMore}>
            CARGAR MÁS CORTES
          </Button>
        }
        ListHeaderComponent={
          <>
            <ProfileCover uri={creator.coverUri}>
              {!creator.coverUri && (
                <Txt display style={styles.coverText}>
                  HAZ TU{"\n"}PROPIO CORTE.
                </Txt>
              )}
              <View style={styles.tape}>
                <Txt
                  display
                  style={{ color: C.black, fontSize: 13, letterSpacing: 1 }}
                >
                  {me
                    ? "100% ORIGINAL / 100% TÚ"
                    : "100% ORIGINAL / COMUNIDAD CUT"}
                </Txt>
              </View>
              {me && (
                <IconButton
                  name="settings"
                  label="Ajustes"
                  onPress={() => router.push("/settings")}
                  style={{ position: "absolute", top: 14, right: 14 }}
                />
              )}
            </ProfileCover>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Avatar creator={creator} me={me} size={78} />
              </View>
              {me ? (
                <Button
                  secondary
                  icon="edit-3"
                  onPress={() => router.push("/edit-profile")}
                  style={{ alignSelf: "flex-end" }}
                >
                  EDITAR PERFIL
                </Button>
              ) : (
                <Button
                  secondary={social.following.includes(id)}
                  icon={social.following.includes(id) ? "check" : "plus"}
                  onPress={() => social.toggleFollow(id)}
                  style={{ alignSelf: "flex-end" }}
                >
                  {social.following.includes(id) ? "SIGUIENDO" : "SEGUIR"}
                </Button>
              )}
              <Txt display style={{ fontSize: 32, marginTop: 16 }}>
                {creator.name}
              </Txt>
              <Txt style={{ color: C.green, fontSize: 15, marginTop: 5 }}>
                @{creator.handle}
              </Txt>
              {!!creator.bio && (
                <Txt
                  style={{
                    fontSize: 16,
                    lineHeight: 25,
                    marginTop: 15,
                    color: C.muted,
                  }}
                >
                  {creator.bio}
                </Txt>
              )}
              <View style={styles.stats}>
                <View testID="profile-posts-count" style={styles.stat}>
                  <Txt display style={{ fontSize: 28 }}>
                    {total}
                  </Txt>
                  <Txt style={styles.statLabel}>CORTES</Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver seguidos de ${creator.name}`}
                  testID="profile-following-count"
                  onPress={() => openConnections("following")}
                  style={styles.stat}
                >
                  <Txt display style={{ fontSize: 28 }}>
                    {connections.loading || connections.error
                      ? "…"
                      : connections.following.length}
                  </Txt>
                  <Txt style={styles.statLabel}>SIGUIENDO</Txt>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver seguidores de ${creator.name}`}
                  testID="profile-followers-count"
                  onPress={() => openConnections("followers")}
                  style={styles.stat}
                >
                  <Txt display style={{ fontSize: 28 }}>
                    {connections.loading || connections.error
                      ? "…"
                      : connections.followers.length}
                  </Txt>
                  <Txt style={styles.statLabel}>SEGUIDORES</Txt>
                </Pressable>
              </View>
              {!!failure && (
                <View style={{ gap: 12, marginBottom: 15 }}>
                  <Txt accessibilityRole="alert" style={{ color: "#ffbd9d" }}>
                    {failure}
                  </Txt>
                  <Button secondary onPress={social.retry}>
                    REINTENTAR PERFIL
                  </Button>
                </View>
              )}
            </View>
            <View style={styles.tabs}>
              {tabs.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: tab === item.id }}
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
                tab === "saved"
                  ? "TUS INSPIRACIONES, A MANO"
                  : tab === "reposts"
                    ? "DALE VOZ A OTROS CORTES"
                    : tab === "reels"
                      ? "AÚN NO HAY REELS"
                      : me
                        ? "TU HISTORIA EMPIEZA AQUÍ"
                        : "EN MOVIMIENTO"
              }
              text={
                tab === "saved"
                  ? "Toca el marcador en cualquier publicación para guardarla aquí."
                  : tab === "reposts"
                    ? me
                      ? "Los cortes que repostees aparecerán aquí."
                      : "Esta persona todavía no ha reposteado cortes."
                    : tab === "reels"
                      ? "Los videos de esta cuenta aparecerán aquí."
                      : me
                        ? "Comparte una idea, una foto o tu próximo drop con la comunidad."
                        : "Esta persona todavía no tiene publicaciones."
              }
            />
            {me && tab === "posts" && (
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
  stat: {
    flex: 1,
    alignItems: "center",
    minHeight: 60,
    justifyContent: "center",
  },
  statLabel: { fontSize: 12, color: C.muted, letterSpacing: 1, marginTop: 4 },
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
