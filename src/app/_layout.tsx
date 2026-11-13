import Feather from "@expo/vector-icons/Feather";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/context/auth";

SplashScreen.preventAutoHideAsync().catch(console.warn);

function AppNavigator() {
  const { session, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(console.warn);
  }, [isLoading]);

  if (isLoading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#141716",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator
          accessibilityLabel="Comprobando sesión"
          color="#80d9a0"
        />
      </View>
    );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#141716" },
      }}
    >
      <Stack.Protected guard={!session} redirectTo="/">
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)} redirectTo="/sign-in">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Anton: require("@/assets/fonts/Anton.ttf"),
    Space: require("@/assets/fonts/SpaceGrotesk.ttf"),
    ...Feather.font,
  });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: "#0b0e0c" }}>
          <AppNavigator />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
