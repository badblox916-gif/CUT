import type { ImagePickerAsset } from "expo-image-picker";

export type CaptureKind = "photo" | "video";
type CameraApi = Pick<
  typeof import("expo-image-picker"),
  | "requestCameraPermissionsAsync"
  | "launchCameraAsync"
  | "CameraType"
  | "UIImagePickerControllerQualityType"
>;
export const RECORDING_SECONDS = 60;

export class CameraPermissionError extends Error {
  constructor(public canOpenSettings: boolean) {
    super(
      canOpenSettings
        ? "La cámara está bloqueada. Activa su permiso en los ajustes del dispositivo."
        : "Necesitamos tu permiso para abrir la cámara. Puedes intentarlo de nuevo o elegir un archivo de la galería.",
    );
  }
}

export async function captureMedia(
  api: CameraApi,
  kind: CaptureKind,
  web: boolean,
) {
  // Web capture must be launched directly from the button's user activation.
  if (!web) {
    const permission = await api.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new CameraPermissionError(!permission.canAskAgain);
  }
  return api.launchCameraAsync({
    mediaTypes: [kind === "video" ? "videos" : "images"],
    cameraType: api.CameraType.back,
    allowsEditing: false,
    quality: 0.8,
    videoQuality: api.UIImagePickerControllerQualityType.Medium,
    videoMaxDuration: RECORDING_SECONDS,
  });
}

export function checkedMedia(
  asset: ImagePickerAsset,
  videoOnly: boolean,
  capture?: CaptureKind,
): ImagePickerAsset {
  if (!asset.uri)
    throw new Error("No recibimos el archivo. Vuelve a intentarlo.");
  const video =
    asset.type === "video" ||
    asset.mimeType?.startsWith("video/") ||
    (!asset.type &&
      /[.](mp4|mov|m4v|webm)(?:$|[?])/i.test(asset.fileName || asset.uri));
  if (videoOnly && !video)
    throw new Error("Para un reel necesitas seleccionar o grabar un video.");
  if (capture && (capture === "video") !== Boolean(video))
    throw new Error(
      capture === "video"
        ? "No recibimos un video. Intenta grabarlo de nuevo."
        : "No recibimos una foto. Intenta tomarla de nuevo.",
    );
  if (asset.fileSize && asset.fileSize > (video ? 50 : 10) * 1024 * 1024)
    throw new Error(
      video
        ? "El video debe pesar hasta 50 MB."
        : "La imagen debe pesar hasta 10 MB.",
    );
  if (
    capture === "video" &&
    asset.duration &&
    asset.duration > (RECORDING_SECONDS + 1) * 1000
  )
    throw new Error(`Graba un video de hasta ${RECORDING_SECONDS} segundos.`);
  return { ...asset, type: video ? "video" : "image" };
}
