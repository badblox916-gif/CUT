import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/auth";
import { SocialProvider, useSocial } from "@/context/social";
import { StoriesProvider } from "@/context/stories";
import { NotificationsProvider } from "@/context/notifications";
import { profileError } from "@/lib/profile";
import { Button, Txt, C } from "@/components/cut/ui";

function PrivateNavigator() {
  const { ready, profile, loadError, retry } = useSocial();
  const { signOut } = useAuth();
  if (loadError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
          justifyContent: "center",
          padding: 24,
          gap: 20,
        }}
      >
        <Txt accessibilityRole="alert">{loadError}</Txt>
        <Button onPress={retry}>REINTENTAR</Button>
        <Button secondary onPress={() => void signOut().catch(() => {})}>
          CERRAR SESIÓN
        </Button>
      </View>
    );
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#141716",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator
          accessibilityLabel="Cargando tu perfil"
          color="#80d9a0"
        />
      </View>
    );
  const complete = !profileError(profile);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0b0e0c" },
      }}
    >
      <Stack.Protected guard={!complete} redirectTo="/">
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
      <Stack.Protected guard={complete} redirectTo="/complete-profile">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="compose" options={{ presentation: "modal" }} />
        <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="post/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="creator/[id]" />
        <Stack.Screen name="connections" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="story" />
      </Stack.Protected>
    </Stack>
  );
}

export default function PrivateLayout() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <SocialProvider key={session.user.id} accountId={session.user.id}>
      <StoriesProvider>
        <NotificationsProvider>
          <PrivateNavigator />
        </NotificationsProvider>
      </StoriesProvider>
    </SocialProvider>
  );
}
