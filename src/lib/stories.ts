import {
  addDoc,
  collection,
  serverTimestamp,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";

export const STORY_LIFETIME = 24 * 60 * 60 * 1000;
export type Story = {
  id: string;
  creatorId: string;
  text: string;
  imageUri?: string;
  videoUri?: string;
  createdAt: number;
};
export type StoryGroup = { creatorId: string; stories: Story[] };

export function readStory(id: string, data: DocumentData): Story {
  return {
    id,
    creatorId: data.creatorId,
    text: data.text ?? "",
    imageUri: data.imageUri || undefined,
    videoUri: data.videoUri || undefined,
    createdAt: data.createdAt?.toMillis?.() ?? 0,
  };
}

export function activeStoryGroups(
  stories: Story[],
  following: string[],
  accountId: string,
  now: number,
): StoryGroup[] {
  const allowed = new Set([accountId, ...following]);
  const groups = new Map<string, Story[]>();
  for (const story of stories) {
    if (
      !allowed.has(story.creatorId) ||
      story.createdAt <= 0 ||
      story.createdAt > now ||
      now - story.createdAt >= STORY_LIFETIME
    )
      continue;
    const group = groups.get(story.creatorId) ?? [];
    group.push(story);
    groups.set(story.creatorId, group);
  }
  return [...groups]
    .map(([creatorId, items]) => ({
      creatorId,
      stories: items.sort((a, b) => a.createdAt - b.createdAt),
    }))
    .sort(
      (a, b) =>
        b.stories[b.stories.length - 1].createdAt -
        a.stories[a.stories.length - 1].createdAt,
    );
}

export async function createCloudStory(
  db: Firestore,
  userId: string,
  story: Pick<Story, "text" | "imageUri" | "videoUri">,
) {
  if (Boolean(story.imageUri) === Boolean(story.videoUri))
    throw new Error("Selecciona una foto o un video para tu historia.");
  if (story.text.trim().length > 180)
    throw new Error("La historia admite hasta 180 caracteres.");
  const result = await addDoc(collection(db, "stories"), {
    creatorId: userId,
    text: story.text.trim(),
    imageUri: story.imageUri ?? "",
    videoUri: story.videoUri ?? "",
    createdAt: serverTimestamp(),
  });
  return result.id;
}
