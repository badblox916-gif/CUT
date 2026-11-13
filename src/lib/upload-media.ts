import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { firebaseStorage } from "./firebase-db";
import { readUpload } from "./upload-source";
import { prepareUploadForm } from "./upload-form";
import {
  checkUploadCanceled,
  sendUpload,
  type UploadOptions,
} from "./upload-request";

export type UploadedMedia = { url: string; path?: string };

export async function uploadMedia(
  uri: string | undefined,
  accountId: string,
  kind: "image" | "video",
  options: UploadOptions = {},
): Promise<UploadedMedia | undefined> {
  checkUploadCanceled(options.signal);
  if (!uri) return undefined;
  // Existing cloud assets can be reused when editing a profile.
  if (uri.startsWith("https://firebasestorage.googleapis.com/"))
    return { url: uri };
  if (
    /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/(image|video)\/upload\//.test(
      uri,
    )
  )
    return { url: uri };
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (emulatorHost && uri.startsWith(`http://${emulatorHost}:9199/`))
    return { url: uri };
  // Free media hosting is the default; Firebase Storage remains optional.
  if (process.env.EXPO_PUBLIC_MEDIA_PROVIDER !== "firebase") {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !/^[a-zA-Z0-9_-]+$/.test(cloudName) || !preset)
      throw new Error(
        "Las fotos y los videos todavía no están disponibles. Puedes publicar texto mientras tanto.",
      );
    const source = await prepareUploadForm(uri, kind);
    validateUpload(source.size, source.contentType, kind);
    source.body.append("upload_preset", preset);
    source.body.append(
      "public_id",
      `cut/${accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const response = await sendUpload(
      `https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`,
      source.body,
      options,
    );
    const result = response.data;
    const expected = `https://res.cloudinary.com/${cloudName}/${kind}/upload/`;
    if (
      !response.ok ||
      typeof result.secure_url !== "string" ||
      !result.secure_url.startsWith(expected)
    )
      throw new Error(
        "No se pudo subir el archivo. Intenta con un archivo más pequeño o inténtalo de nuevo más tarde.",
      );
    return { url: result.secure_url };
  }
  if (!firebaseStorage)
    throw new Error(
      "Las fotos y los videos todavía no están disponibles. Puedes publicar texto mientras tanto.",
    );
  const source = await readUpload(uri, kind);
  validateUpload(source.size, source.contentType, kind);
  const path = `users/${accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const target = ref(firebaseStorage, path);
  const task = uploadBytesResumable(target, source.data, {
    contentType: source.contentType,
  });
  const abort = () => {
    task.cancel();
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) task.cancel();
  const stop = task.on(
    "state_changed",
    (snapshot) =>
      options.onProgress?.({
        phase: "sending",
        sent: snapshot.bytesTransferred,
        total: snapshot.totalBytes,
      }),
    () => {}, // The awaited task below handles upload failures.
  );
  try {
    await task;
  } finally {
    stop();
    options.signal?.removeEventListener("abort", abort);
  }
  try {
    checkUploadCanceled(options.signal);
    return { url: await getDownloadURL(target), path };
  } catch (error) {
    await deleteObject(target).catch(() => {});
    throw error;
  }
}

function validateUpload(
  size: number,
  contentType: string,
  kind: "image" | "video",
) {
  if (!size || size > (kind === "video" ? 50 : 10) * 1024 * 1024)
    throw new Error(
      kind === "video"
        ? "El video debe pesar hasta 50 MB."
        : "La imagen debe pesar hasta 10 MB.",
    );
  if (!contentType.startsWith(`${kind}/`))
    throw new Error("El formato del archivo no es compatible.");
}

export async function discardUploads(uploads: (UploadedMedia | undefined)[]) {
  if (!firebaseStorage) return;
  await Promise.all(
    uploads.map((upload) =>
      upload?.path
        ? deleteObject(ref(firebaseStorage!, upload.path)).catch(() => {})
        : Promise.resolve(),
    ),
  );
}
