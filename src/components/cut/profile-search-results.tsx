import { router } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Avatar, Button, C, Txt } from "./ui";
import { useSocial } from "@/context/social";
import { useProfileSearch } from "@/hooks/use-profile-search";

export function ProfileSearchResults({
  query,
  refresh,
}: {
  query: string;
  refresh: number;
}) {
  const search = useProfileSearch(query, refresh);
  const { accountId, following, toggleFollow } = useSocial();
  if (!search.active) return null;
  return (
    <View
      style={{
        marginHorizontal: 18,
        marginTop: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.panel,
        gap: 12,
      }}
    >
      <Txt display style={{ fontSize: 18 }}>
        PERSONAS
      </Txt>
      {search.profiles.map((creator) => (
        <View
          key={creator.id}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de ${creator.name}`}
            onPress={() =>
              creator.id === accountId
                ? router.navigate("/profile")
                : router.push({
                    pathname: "/creator/[id]",
                    params: { id: creator.id },
                  })
            }
            style={{
              flexDirection: "row",
              flex: 1,
              minWidth: 0,
              alignItems: "center",
              gap: 10,
              minHeight: 52,
            }}
          >
            <Avatar creator={creator} size={40} />
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1} style={{ fontSize: 16 }}>
                {creator.name}
              </Txt>
              <Txt numberOfLines={1} style={{ fontSize: 13, color: C.green }}>
                @{creator.handle}
              </Txt>
            </View>
          </Pressable>
          {creator.id !== accountId && (
            <Button
              secondary={following.includes(creator.id)}
              onPress={() => toggleFollow(creator.id)}
              style={{ paddingHorizontal: 10 }}
            >
              {following.includes(creator.id) ? "SIGUIENDO" : "SEGUIR"}
            </Button>
          )}
        </View>
      ))}
      {search.loading && (
        <ActivityIndicator
          accessibilityLabel="Buscando personas"
          color={C.green}
        />
      )}
      {!search.loading && !search.error && search.profiles.length === 0 && (
        <Txt style={{ color: C.muted, fontSize: 15 }}>
          No encontramos usuarios con ese nombre o @usuario.
        </Txt>
      )}
      {!!search.error && (
        <>
          <Txt
            accessibilityRole="alert"
            style={{ color: "#ffbd9d", fontSize: 14 }}
          >
            {search.error}
          </Txt>
          <Button secondary onPress={search.retry}>
            REINTENTAR BÚSQUEDA
          </Button>
        </>
      )}
      {!search.done && !search.loading && !search.error && (
        <Button secondary onPress={() => void search.loadMore()}>
          MÁS PERSONAS
        </Button>
      )}
    </View>
  );
}
