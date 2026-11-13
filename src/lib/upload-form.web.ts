import { readUpload } from "./upload-source.web";

export async function prepareUploadForm(uri: string, kind: "image" | "video") {
  const source = await readUpload(uri, kind);
  const body = new FormData();
  body.append(
    "file",
    source.data,
    kind === "video" ? "cut-video.mp4" : "cut-image.jpg",
  );
  return { body, size: source.size, contentType: source.contentType };
}
