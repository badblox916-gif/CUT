import { useEffect, useState } from "react";
import { resolveMedia } from "@/lib/media";
export function useMedia(uri?: string) {
  const [resolved, setResolved] = useState<{ uri: string; value: string }>();
  useEffect(() => {
    let active = true;
    if (!uri?.startsWith("cut-media:")) return;
    resolveMedia(uri)
      .then((value) => {
        if (active) setResolved({ uri, value });
      })
      .catch(() => {
        if (active) setResolved(undefined);
      });
    return () => {
      active = false;
    };
  }, [uri]);
  return uri?.startsWith("cut-media:")
    ? resolved?.uri === uri
      ? resolved.value
      : undefined
    : uri;
}
