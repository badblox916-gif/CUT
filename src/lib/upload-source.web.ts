import { resolveMedia } from "./media";

export async function readUpload(uri: string, kind: "image" | "video") {
  const response = await fetch(await resolveMedia(uri));
  if (!response.ok) throw new Error("No se pudo leer el archivo seleccionado.");
  const data = await response.blob();
  return {
    data,
    size: data.size,
    contentType: data.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
  };
}
