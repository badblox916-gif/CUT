import { Image } from "expo-image";
import { StyleSheet, View, type ViewProps } from "react-native";
import { C } from "./ui";
import { useMedia } from "@/hooks/use-media";

export function ProfileCover({
  uri,
  children,
  style,
  ...props
}: ViewProps & { uri?: string }) {
  const photo = useMedia(uri);
  return (
    <View {...props} style={[styles.cover, style]}>
      {photo && (
        <Image
          accessibilityLabel="Portada del perfil"
          source={{ uri: photo }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 210, backgroundColor: C.raised, overflow: "hidden" },
});
