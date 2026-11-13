// Existing follow documents store the target in their ID and the source in
// their account path. Keep old relationships usable without rewriting them.
export function connectionIds(paths: string[], profileId: string) {
  const followers = new Set<string>();
  const following = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/");
    if (
      parts.length !== 4 ||
      parts[0] !== "accounts" ||
      parts[2] !== "following"
    )
      continue;
    const [, source, , target] = parts;
    if (source === target) continue;
    if (source === profileId) following.add(target);
    if (target === profileId) followers.add(source);
  }
  return { followers: [...followers].sort(), following: [...following].sort() };
}
