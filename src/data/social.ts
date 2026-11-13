export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar?: number;
  avatarUri?: string;
  coverUri?: string;
  icon: "user" | "edit-3" | "music" | "zap";
  color: string;
  bio: string;
};
export type Comment = {
  id: string;
  text: string;
  author: string;
  authorId?: string;
};
export type Post = {
  id: string;
  creatorId: string;
  originalPostId?: string;
  text: string;
  tag: string;
  time: string;
  createdAt?: number;
  image?: number;
  imageUri?: string;
  videoUri?: string;
  reel?: boolean;
  likes: number;
  reposts: number;
  comments: Comment[];
  poll?: { options: string[]; votes: number[] };
};
// Editorial trends can be connected separately from community posts.
export const trends: { category: string; tag: string; count: string }[] = [];
