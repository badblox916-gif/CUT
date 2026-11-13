import { useCallback, useState, type ComponentProps } from "react";
import type { FlatList } from "react-native";
import type { Post } from "@/data/social";

const viewabilityConfig = {
  itemVisiblePercentThreshold: 15,
  minimumViewTime: 100,
};
export function useVisiblePosts() {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useCallback<
    NonNullable<ComponentProps<typeof FlatList<Post>>["onViewableItemsChanged"]>
  >(({ viewableItems }) => {
    setVisible(
      new Set(
        viewableItems
          .filter((item) => item.isViewable)
          .map((item) => item.item.id),
      ),
    );
  }, []);
  return { visible, onViewableItemsChanged, viewabilityConfig };
}
