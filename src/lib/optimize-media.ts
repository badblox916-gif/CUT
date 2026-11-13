import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import type { ImagePickerAsset } from "expo-image-picker";

// Photos are prepared once after selection, so editing and upload retries do
// not repeatedly decode a full-resolution camera image.
export async function optimizePickedMedia(
  asset: ImagePickerAsset,
): Promise<ImagePickerAsset> {
  if (asset.type === "video" || asset.mimeType === "image/gif") return asset;
  const maximum = 1920;
  const longest = Math.max(asset.width, asset.height);
  if (longest <= maximum && asset.fileSize && asset.fileSize <= 512 * 1024)
    return asset;
  const context = ImageManipulator.manipulate(asset.uri, {
    maxWidth: maximum,
    maxHeight: maximum,
  });
  let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
  try {
    if (longest > maximum) {
      const scale = maximum / longest;
      context.resize({
        width: Math.max(1, Math.round(asset.width * scale)),
        height: Math.max(1, Math.round(asset.height * scale)),
      });
    }
    rendered = await context.renderAsync();
    const png =
      asset.mimeType === "image/png" ||
      asset.mimeType === "image/webp" ||
      /\.(png|webp)$/i.test(asset.fileName ?? "");
    const result = await rendered.saveAsync({
      format: png ? SaveFormat.PNG : SaveFormat.JPEG,
      compress: 0.72,
    });
    const size =
      Platform.OS === "web"
        ? (await (await fetch(result.uri)).blob()).size
        : new File(result.uri).size;
    if (asset.fileSize && size >= asset.fileSize) return asset;
    return {
      ...asset,
      uri: result.uri,
      width: result.width,
      height: result.height,
      mimeType: png ? "image/png" : "image/jpeg",
      fileName: png ? "cut-photo.png" : "cut-photo.jpg",
      fileSize: size,
      file: undefined,
    };
  } catch {
    // A codec unsupported by the optimizer can still be uploaded normally.
    return asset;
  } finally {
    rendered?.release();
    context.release();
  }
}
