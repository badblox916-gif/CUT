import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
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
import { useConnections } from "@/hooks/use-connections";
import { useCreator } from "@/hooks/use-creator";

function PersonRow({ id }: { id: string }) {
  const { creator, loading, error } = useCreator(id);
  const { accountId, following, toggleFollow, retry } = useSocial();
  if (loading)
    return (
      <ActivityIndicator
        color={C.green}
        accessibilityLabel="Cargando persona"
        style={{ padding: 20 }}
      />
    );
  if (!creator)
    return error ? (
      <View style={{ padding: 16, gap: 10 }}>
        <Txt accessibilityRole="alert">{error}</Txt>
        <Button secondary onPress={retry}>
          REINTENTAR PERSONA
        </Button>
      </View>
    ) : (
      <Txt style={{ padding: 16, color: C.muted }}>Perfil no disponible.</Txt>
    );
  const me = accountId === id;
  return (
    <View
      testID={`connection-${id}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 14,
        borderBottomWidth: 1,
        borderColor: C.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${creator.name}`}
        onPress={() =>
          me
            ? router.navigate("/profile")
            : router.push({ pathname: "/creator/[id]", params: { id } })
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          flex: 1,
          minWidth: 0,
          minHeight: 52,
        }}
      >
        <Avatar creator={creator} me={me} size={42} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt numberOfLines={1} style={{ fontSize: 16 }}>
            {creator.name}
          </Txt>
          <Txt numberOfLines={1} style={{ fontSize: 13, color: C.green }}>
            @{creator.handle}
          </Txt>
        </View>
      </Pressable>
      {me ? (
        <Txt style={{ color: C.muted, fontSize: 13 }}>TÚ</Txt>
      ) : (
        <Button
          secondary={following.includes(id)}
          onPress={() => toggleFollow(id)}
          style={{ paddingHorizontal: 10 }}
        >
          {following.includes(id) ? "SIGUIENDO" : "SEGUIR"}
        </Button>
      )}
    </View>
  );
}

export default function ConnectionsScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const followers = type !== "following";
  const connections = useConnections(id);
  const {
    creator,
    loading: profileLoading,
    error: profileError,
  } = useCreator(id);
  const { retry } = useSocial();
  const key = `${id}:${followers}`;
  const [page, setPage] = useState({ key, count: 20 });
  const count = page.key === key ? page.count : 20;
  const ids = followers ? connections.followers : connections.following;
  const failure = connections.error || profileError;
  if (!id || id.includes("/"))
    return (
      <Page header={false}>
        <BackHeader title="COMUNIDAD" />
        <Empty
          title="PERFIL NO ENCONTRADO"
          text="Este perfil no está disponible."
        />
      </Page>
    );
  return (
    <Page header={false}>
      <BackHeader title={followers ? "SEGUIDORES" : "SIGUIENDO"} />
      <View style={{ padding: 18, gap: 15 }}>
        <Txt style={{ color: C.green, fontSize: 16 }}>
          {creator ? `@${creator.handle}` : "COMUNIDAD CUT"}
        </Txt>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            secondary={!followers}
            onPress={() => router.setParams({ type: "followers" })}
            style={{ flex: 1 }}
          >
            SEGUIDORES
          </Button>
          <Button
            secondary={followers}
            onPress={() => router.setParams({ type: "following" })}
            style={{ flex: 1 }}
          >
            SIGUIENDO
          </Button>
        </View>
      </View>
      {!!failure && (
        <View style={{ padding: 18, gap: 12 }}>
          <Txt accessibilityRole="alert" style={{ color: "#ffbd9d" }}>
            {failure}
          </Txt>
          <Button secondary onPress={retry}>
            REINTENTAR LISTA
          </Button>
        </View>
      )}
      {profileLoading || connections.loading ? (
        <ActivityIndicator
          accessibilityLabel="Cargando conexiones"
          color={C.green}
          style={{ flex: 1 }}
        />
      ) : !creator ? (
        <Empty
          title="PERFIL NO ENCONTRADO"
          text="Este perfil no está disponible."
        />
      ) : (
        <FlatList
          data={ids.slice(0, count)}
          keyExtractor={(item) => item}
          renderItem={({ item }) => <PersonRow id={item} />}
          initialNumToRender={12}
          windowSize={5}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }}
          ListEmptyComponent={
            !failure ? (
              <Empty
                title={followers ? "SIN SEGUIDORES" : "NO SIGUE A NADIE"}
                text={
                  followers
                    ? "Cuando alguien siga esta cuenta, aparecerá aquí."
                    : "Las personas que siga esta cuenta aparecerán aquí."
                }
              />
            ) : undefined
          }
          ListFooterComponent={
            ids.length > count ? (
              <Button
                secondary
                onPress={() => setPage({ key, count: count + 20 })}
              >
                CARGAR MÁS PERSONAS
              </Button>
            ) : undefined
          }
        />
      )}
    </Page>
  );
}
