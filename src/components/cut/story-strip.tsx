import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, C, Icon, Txt } from "./ui";
import { useSocial } from "@/context/social";
import { useStories } from "@/context/stories";
import { useCreator } from "@/hooks/use-creator";
import type { StoryGroup } from "@/lib/stories";

function StoryBubble({ group }: { group: StoryGroup }) {
  const { creator } = useCreator(group.creatorId);
  const { seenStories } = useSocial();
  const seen = group.stories.every((story) => seenStories.includes(story.id));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver historias de ${creator?.name || "este creador"}`}
      onPress={() =>
        router.push({ pathname: "/story", params: { id: group.creatorId } })
      }
      style={styles.item}
    >
      <View style={[styles.frame, { borderColor: seen ? C.line : C.green }]}>
        <Avatar creator={creator} size={52} />
      </View>
      <Txt numberOfLines={1} style={styles.name}>
        {creator?.handle || "Historia"}
      </Txt>
    </Pressable>
  );
}

export function StoryStrip() {
  const { accountId, retry } = useSocial();
  const { groups, error } = useStories();
  const mine = groups.find((group) => group.creatorId === accountId);
  const create = () =>
    router.push({ pathname: "/compose", params: { type: "story" } });
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        <View style={styles.item}>
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mine ? "Ver mi historia" : "Crear historia"}
              onPress={() =>
                mine
                  ? router.push({
                      pathname: "/story",
                      params: { id: accountId },
                    })
                  : create()
              }
              style={[
                styles.frame,
                {
                  borderStyle: mine ? "solid" : "dashed",
                  borderColor: mine ? C.green : C.line,
                },
              ]}
            >
              <Avatar me size={52} />
            </Pressable>
            {mine && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Añadir historia"
                onPress={create}
                style={styles.plus}
              >
                <Icon name="plus" size={14} color={C.black} />
              </Pressable>
            )}
            {!mine && (
              <View pointerEvents="none" style={styles.plus}>
                <Icon name="plus" size={14} color={C.black} />
              </View>
            )}
          </View>
          <Txt
            display
            numberOfLines={1}
            style={{ fontSize: 12, color: C.mint }}
          >
            TU HISTORIA
          </Txt>
        </View>
        {groups
          .filter((group) => group.creatorId !== accountId)
          .map((group) => (
            <StoryBubble key={group.creatorId} group={group} />
          ))}
      </ScrollView>
      {!!error && (
        <View style={{ paddingHorizontal: 18, gap: 8, paddingBottom: 12 }}>
          <Txt
            accessibilityRole="alert"
            style={{ color: "#ffbd9d", fontSize: 14 }}
          >
            {error}
          </Txt>
          <Button secondary onPress={retry}>
            REINTENTAR HISTORIAS
          </Button>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  strip: { paddingHorizontal: 18, paddingVertical: 18, gap: 14 },
  item: { width: 78, gap: 9, alignItems: "center" },
  frame: { borderWidth: 2, padding: 3, backgroundColor: C.panel },
  name: { color: C.muted, fontSize: 13, textAlign: "center", width: "100%" },
  plus: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: C.green,
    padding: 3,
    borderWidth: 2,
    borderColor: C.bg,
  },
});
