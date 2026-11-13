import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { PostCard } from "@/components/cut/post-card";
import { useSocial } from "@/context/social";
import { trends } from "@/data/social";
import { StoryStrip } from "@/components/cut/story-strip";
import { ProfileSearchResults } from "@/components/cut/profile-search-results";
import { useVisiblePosts } from "@/hooks/use-visible-posts";

export default function FeedScreen() {
  const social = useSocial();
  const visibility = useVisiblePosts();
  const creators = social.creators.filter(
    (creator) => creator.id !== social.accountId,
  );
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [search, setSearch] = useState({ tag, query: tag ?? "" });
  if (search.tag !== tag) setSearch({ tag, query: tag ?? "" });
  const query = search.tag === tag ? search.query : (tag ?? "");
  const setQuery = (value: string) => setSearch({ tag, query: value });
  const [following, setFollowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<"all" | "photos" | "polls">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchRefresh, setSearchRefresh] = useState(0);
  const postsById = new Map(social.posts.map((post) => [post.id, post]));
  const posts = social.posts.filter((post) => {
    const content = postsById.get(post.originalPostId ?? post.id) ?? post;
    return (
      !post.reel &&
      (following || social.feedIds.includes(post.id)) &&
      (!following ||
        social.following.includes(post.creatorId) ||
        post.creatorId === social.accountId) &&
      (filter !== "photos" || content.image || content.imageUri) &&
      (filter !== "polls" || content.poll) &&
      `${content.text} ${content.tag} ${post.creatorId === social.accountId ? social.profile.name : (creators.find((c) => c.id === post.creatorId)?.name ?? "")} ${creators.find((c) => c.id === post.creatorId)?.handle ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  return (
    <Page>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <PostCard post={item} videoActive={visibility.visible.has(item.id)} />
        )}
        onViewableItemsChanged={visibility.onViewableItemsChanged}
        viewabilityConfig={visibility.viewabilityConfig}
        extraData={visibility.visible}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
        ListFooterComponent={
          social.hasMore || following ? (
            <Button secondary onPress={social.loadMore}>
              CARGAR MÁS CORTES
            </Button>
          ) : undefined
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setSearchRefresh((count) => count + 1);
          setTimeout(() => setRefreshing(false), 650);
        }}
        ListEmptyComponent={
          <Empty
            title={query ? "SIN PUBLICACIONES" : "AÚN NO HAY CORTES"}
            text={
              query || filter !== "all"
                ? "No hay publicaciones que coincidan con tu búsqueda o filtros."
                : following
                  ? "Las publicaciones de las personas que sigas aparecerán aquí."
                  : "Las publicaciones que crees aparecerán aquí."
            }
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.searchWrap}>
              <Icon name="search" size={18} color={C.muted} />
              <TextInput
                accessibilityLabel="Buscar cortes"
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar personas, @usuarios o hashtags…"
                placeholderTextColor={C.muted}
                style={styles.search}
              />
              {query ? (
                <IconButton
                  name="x"
                  label="Limpiar búsqueda"
                  onPress={() => {
                    setQuery("");
                    router.setParams({ tag: "" });
                  }}
                  style={styles.searchButton}
                />
              ) : (
                <IconButton
                  name="sliders"
                  label="Filtrar publicaciones"
                  active={filtersOpen}
                  onPress={() => setFiltersOpen(!filtersOpen)}
                  style={styles.searchButton}
                />
              )}
            </View>
            <ProfileSearchResults query={query} refresh={searchRefresh} />
            {filtersOpen && (
              <View style={styles.filters}>
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "photos", label: "Fotos" },
                    { id: "polls", label: "Encuestas" },
                  ] as const
                ).map((item) => (
                  <Button
                    key={item.id}
                    secondary={filter !== item.id}
                    onPress={() => setFilter(item.id)}
                    style={{ flex: 1 }}
                  >
                    {item.label}
                  </Button>
                ))}
              </View>
            )}
            <View style={styles.tabs}>
              <Button
                icon="zap"
                secondary={following}
                onPress={() => setFollowing(false)}
                style={{ flex: 1, transform: [{ rotate: "-1deg" }] }}
              >
                PARA TI
              </Button>
              <Button
                icon="users"
                secondary={!following}
                onPress={() => setFollowing(true)}
                style={{ flex: 1, transform: [{ rotate: "1deg" }] }}
              >
                SIGUIENDO
              </Button>
            </View>
            <StoryStrip />
            <Pressable
              accessibilityLabel="Crear publicación"
              onPress={() => router.push("/compose")}
              style={styles.compose}
            >
              <View style={styles.tape}>
                <Txt
                  display
                  style={{ fontSize: 12, letterSpacing: 1.5, color: C.black }}
                >
                  NUEVO CORTE
                </Txt>
              </View>
              <Avatar me size={34} />
              <Txt style={{ flex: 1, color: C.muted, fontSize: 15 }}>
                ¿Qué vas a cortar hoy?
              </Txt>
              <View style={{ backgroundColor: C.green, padding: 9 }}>
                <Icon name="edit-3" size={17} color={C.black} />
              </View>
            </Pressable>
            <View style={styles.trendBox}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpanded(!expanded)}
                style={styles.trendHeading}
              >
                <Icon name="trending-up" size={17} color={C.green} />
                <Txt
                  display
                  style={{ fontSize: 16, letterSpacing: 0.6, flex: 1 }}
                >
                  EN EL RADAR
                </Txt>
                {trends.length > 0 && (
                  <View style={styles.live}>
                    <View
                      style={{ width: 4, height: 4, backgroundColor: C.black }}
                    />
                    <Txt
                      display
                      style={{ fontSize: 12, color: C.black, letterSpacing: 1 }}
                    >
                      AHORA
                    </Txt>
                  </View>
                )}
                <Icon
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={17}
                  color={C.muted}
                />
              </Pressable>
              {trends.length === 0 ? (
                <Txt
                  style={{
                    color: C.muted,
                    fontSize: 14,
                    padding: 14,
                    paddingTop: 0,
                  }}
                >
                  Las tendencias aparecerán aquí.
                </Txt>
              ) : expanded ? (
                trends.map((trend) => (
                  <Pressable
                    key={trend.tag}
                    onPress={() => setQuery(trend.tag)}
                    style={styles.trend}
                  >
                    <View>
                      <Txt
                        style={{
                          fontSize: 12,
                          letterSpacing: 1,
                          color: C.muted,
                        }}
                      >
                        {trend.category}
                      </Txt>
                      <Txt
                        display
                        style={{
                          fontSize: 22,
                          color: C.green,
                          marginVertical: 3,
                        }}
                      >
                        {trend.tag}
                      </Txt>
                      <Txt style={{ fontSize: 13, color: C.muted }}>
                        {trend.count}
                      </Txt>
                    </View>
                    <Icon name="arrow-up-right" size={18} />
                  </Pressable>
                ))
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: 9,
                    paddingHorizontal: 12,
                    paddingBottom: 12,
                  }}
                >
                  {trends.map((trend) => (
                    <Pressable
                      key={trend.tag}
                      onPress={() => setQuery(trend.tag)}
                      style={styles.tag}
                    >
                      <Txt style={{ color: C.mint, fontSize: 13 }}>
                        {trend.tag}
                      </Txt>
                      <Icon name="arrow-up-right" size={11} color={C.green} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
            <View style={styles.feedTitle}>
              <Txt display style={{ fontSize: 14, letterSpacing: 1.4 }}>
                {query
                  ? "RESULTADOS"
                  : following
                    ? "TU COMUNIDAD"
                    : "CORTES FRESCOS"}
              </Txt>
              <View style={{ height: 1, backgroundColor: C.line, flex: 1 }} />
              <Txt style={{ color: C.muted, fontSize: 12 }}>
                {posts.length} CORTES
              </Txt>
            </View>
          </>
        }
      />
    </Page>
  );
}
const styles = StyleSheet.create({
  searchWrap: {
    marginHorizontal: 18,
    marginTop: 17,
    paddingLeft: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    boxShadow: "3px 3px 0 #070908",
  },
  search: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 9,
    color: C.text,
    fontFamily: "Space",
    fontSize: 14,
    outlineWidth: 0,
  },
  searchButton: { borderWidth: 0, width: 38, height: 38 },
  tabs: { flexDirection: "row", gap: 12, marginHorizontal: 18, marginTop: 15 },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 12,
  },
  compose: {
    marginHorizontal: 18,
    marginTop: 7,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.panel,
    boxShadow: "3px 3px 0 #070908",
  },
  tape: {
    position: "absolute",
    top: -9,
    left: 16,
    backgroundColor: C.mint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: "-3deg" }],
  },
  trendBox: {
    marginHorizontal: 18,
    marginTop: 20,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
  },
  trendHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
  },
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.green,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  tag: {
    backgroundColor: C.bg,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  trend: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.black,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 18,
    marginTop: 23,
    marginBottom: 12,
  },
});
