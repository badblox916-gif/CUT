import { File } from "expo-file-system";

export async function readUpload(uri: string, kind: "image" | "video") {
  const file = new File(uri);
  const maximum = (kind === "video" ? 50 : 10) * 1024 * 1024;
  if (!file.exists || !file.size || file.size > maximum)
    throw new Error(
      kind === "video"
        ? "El video debe existir y pesar hasta 50 MB."
        : "La imagen debe existir y pesar hasta 10 MB.",
    );
  return {
    data: await file.bytes(),
    size: file.size,
    contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
  };
}
