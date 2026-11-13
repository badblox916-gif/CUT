import { useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useState } from "react";
import { AppState, View } from "react-native";
import { C, Icon } from "./ui";

function ActiveVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });
  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener("change", (state) => {
        if (state !== "active") player.pause();
      });
      return () => {
        subscription.remove();
        player.pause();
      };
    }, [player]),
  );
  return (
    <VideoView
      player={player}
      nativeControls
      playsInline
      contentFit="contain"
      surfaceType="textureView"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

// Offscreen cards retain their media space but release their video player.
export function MediaVideo({
  uri,
  active = true,
  height = 280,
}: {
  uri: string;
  active?: boolean;
  height?: number;
}) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return (
    <View
      testID="inline-video"
      style={{
        height,
        backgroundColor: C.black,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {focused && active ? (
        <ActiveVideo uri={uri} />
      ) : (
        <Icon name="play-circle" size={38} color={C.green} />
      )}
    </View>
  );
}
