import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, Icon, Txt, type IconName } from "@/components/cut/ui";
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#0b0e0c" },
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.line,
          height: 76 + insets.bottom,
          paddingBottom: 9 + insets.bottom,
          paddingTop: 10,
          maxWidth: 560,
          width: "100%",
          alignSelf: "center",
        },
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarLabel: ({ children, color }) => (
          <Txt display style={{ fontSize: 13, letterSpacing: 1, color }}>
            {children.toUpperCase()}
          </Txt>
        ),
      }}
    >
      {(
        [
          { name: "index", title: "Inicio", icon: "home" },
          { name: "reels", title: "Reels", icon: "film" },
          { name: "profile", title: "Perfil", icon: "user" },
        ] as { name: string; title: string; icon: IconName }[]
      ).map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 26,
                    height: 3,
                    backgroundColor: focused ? C.green : "transparent",
                  }}
                />
                <Icon name={tab.icon} size={21} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
