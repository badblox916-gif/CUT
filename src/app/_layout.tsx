import Feather from "@expo/vector-icons/Feather";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SocialProvider } from "@/context/social";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Anton: require("@/assets/fonts/Anton.ttf"),
    Space: require("@/assets/fonts/SpaceGrotesk.ttf"),
    ...Feather.font,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <SocialProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: "#0b0e0c" }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#0b0e0c" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="compose" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="edit-profile"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="post/[id]"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </View>
      </SocialProvider>
    </SafeAreaProvider>
  );
}
