import { File, Paths } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";
export async function persistMedia(asset: ImagePickerAsset): Promise<string> {
  const extension =
    asset.fileName
      ?.split(".")
      .pop()
      ?.replace(/[^a-zA-Z0-9]/g, "") ||
    (asset.type === "video" ? "mp4" : "jpg");
  const target = new File(
    Paths.document,
    "cut-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2) +
      "." +
      extension,
  );
  new File(asset.uri).copy(target);
  return target.uri;
}
export async function resolveMedia(uri: string) {
  return uri;
}
