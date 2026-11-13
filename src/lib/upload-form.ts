import { File } from "expo-file-system";

export async function prepareUploadForm(uri: string, kind: "image" | "video") {
  const file = new File(uri);
  if (!file.exists)
    throw new Error("El archivo seleccionado ya no está disponible.");
  const body = new FormData();
  const contentType =
    file.type || (kind === "video" ? "video/mp4" : "image/jpeg");
  // React Native's networking streams URI parts without copying the file into JS.
  body.append("file", {
    uri: file.uri,
    name: file.name,
    type: contentType,
  } as unknown as Blob);
  return {
    body,
    size: file.size,
    contentType,
  };
}
