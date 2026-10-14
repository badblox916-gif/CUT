import type { ImagePickerAsset } from "expo-image-picker";
const objectUrls = new Map<string, string>();
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cut-media", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function persistMedia(asset: ImagePickerAsset): Promise<string> {
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("No se pudo leer el archivo.");
  const blob = await response.blob();
  const id =
    "cut-media:" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("files", "readwrite");
    transaction.objectStore("files").put(blob, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
  objectUrls.set(id, URL.createObjectURL(blob));
  return id;
}
export async function resolveMedia(uri: string): Promise<string> {
  if (!uri.startsWith("cut-media:")) return uri;
  const cached = objectUrls.get(uri);
  if (cached) return cached;
  const database = await openDatabase();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database
      .transaction("files", "readonly")
      .objectStore("files")
      .get(uri);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
  if (!blob) throw new Error("El archivo guardado ya no está disponible.");
  const url = URL.createObjectURL(blob);
  objectUrls.set(uri, url);
  return url;
}
