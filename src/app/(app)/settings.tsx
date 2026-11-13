import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  Icon,
  Page,
  Txt,
} from "@/components/cut/ui";
import { useSocial } from "@/context/social";
import { useAuth } from "@/context/auth";
export default function SettingsScreen() {
  const social = useSocial();
  const creators = social.creators.filter((creator) =>
    social.following.includes(creator.id),
  );
  const { signOut } = useAuth();
  return (
    <Page header={false}>
      <BackHeader title="TU ESPACIO" />
      <ScrollView
        contentContainerStyle={{ padding: 22, gap: 20, paddingBottom: 40 }}
      >
        <Txt display style={{ fontSize: 33 }}>
          A TU MANERA.
        </Txt>
        <Button
          secondary
          icon="edit-3"
          onPress={() => router.push("/edit-profile")}
        >
          EDITAR MI PERFIL
        </Button>
        <Button
          secondary
          icon="log-out"
          onPress={() => {
            void signOut().catch(console.warn);
          }}
        >
          CERRAR SESIÓN
        </Button>
        <Txt display style={{ fontSize: 16, letterSpacing: 1, marginTop: 12 }}>
          CREADORES QUE SIGUES ({social.following.length})
        </Txt>
        {creators.map((creator) => (
          <View
            key={creator.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderBottomWidth: 1,
              borderColor: C.line,
              paddingBottom: 15,
            }}
          >
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/creator/[id]",
                  params: { id: creator.id },
                })
              }
              style={{
                flexDirection: "row",
                flex: 1,
                alignItems: "center",
                gap: 10,
              }}
            >
              <Avatar creator={creator} size={36} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 15 }}>{creator.name}</Txt>
                <Txt style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  @{creator.handle}
                </Txt>
              </View>
            </Pressable>
            <Button
              secondary={social.following.includes(creator.id)}
              onPress={() => social.toggleFollow(creator.id)}
              style={{ minHeight: 36, paddingHorizontal: 9 }}
            >
              {social.following.includes(creator.id) ? "SIGUIENDO" : "SEGUIR"}
            </Button>
          </View>
        ))}
        {social.following.length === 0 && (
          <Txt style={{ color: C.muted, lineHeight: 24 }}>
            Aún no sigues a nadie.
          </Txt>
        )}
        <View
          style={{
            padding: 18,
            backgroundColor: C.panel,
            borderWidth: 1,
            borderColor: C.line,
            gap: 12,
            marginTop: 10,
          }}
        >
          <Icon name="scissors" color={C.green} />
          <Txt display style={{ fontSize: 22 }}>
            CUT / VERSIÓN 1.0
          </Txt>
          <Txt style={{ color: C.muted, lineHeight: 25, fontSize: 15 }}>
            Un espacio para compartir cultura, encontrar inspiración y crear tu
            propio corte.
          </Txt>
          <Txt style={{ fontSize: 14, color: C.mint, lineHeight: 24 }}>
            Tu perfil y tus publicaciones se sincronizan con la comunidad. Tus
            guardados son privados.
          </Txt>
        </View>
      </ScrollView>
    </Page>
  );
}
