export type UploadProgress = {
  phase: "sending" | "processing" | "saving";
  sent?: number;
  total?: number;
};
export type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (value: UploadProgress) => void;
};

export function checkUploadCanceled(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new Error("La subida se canceló. Tu borrador sigue aquí.");
}

export function sendUpload(
  url: string,
  body: FormData,
  options: UploadOptions = {},
): Promise<{ ok: boolean; data: { secure_url?: string } }> {
  checkUploadCanceled(options.signal);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const finish = () => options.signal?.removeEventListener("abort", abort);
    request.open("POST", url);
    request.timeout = 5 * 60 * 1000;
    request.upload.onprogress = (event) =>
      options.onProgress?.({
        phase: "sending",
        sent: event.loaded,
        total: event.lengthComputable ? event.total : undefined,
      });
    request.upload.onload = () => options.onProgress?.({ phase: "processing" });
    request.onload = () => {
      finish();
      let data = {};
      try {
        const parsed = JSON.parse(request.responseText);
        if (parsed && typeof parsed === "object") data = parsed;
      } catch {
        /* Invalid responses are rejected by the upload service. */
      }
      resolve({ ok: request.status >= 200 && request.status < 300, data });
    };
    request.onerror = () => {
      finish();
      reject(
        new Error(
          "No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.",
        ),
      );
    };
    request.ontimeout = () => {
      finish();
      reject(
        new Error(
          "La subida tardó demasiado. Revisa tu conexión e inténtalo de nuevo.",
        ),
      );
    };
    request.onabort = () => {
      finish();
      reject(new Error("La subida se canceló. Tu borrador sigue aquí."));
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) {
      finish();
      reject(new Error("La subida se canceló. Tu borrador sigue aquí."));
      return;
    }
    options.onProgress?.({ phase: "sending", sent: 0 });
    try {
      request.send(body);
    } catch (error) {
      finish();
      reject(error);
    }
  });
}
