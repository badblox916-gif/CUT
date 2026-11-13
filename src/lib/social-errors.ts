export function socialError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  if (code.includes("permission-denied"))
    return "No pudimos acceder a estos datos. Vuelve a iniciar sesión e inténtalo de nuevo.";
  if (code.includes("failed-precondition"))
    return "El contenido todavía no está disponible. Inténtalo de nuevo en unos momentos.";
  if (code.includes("unavailable") || code.includes("network-request-failed"))
    return "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.";
  if (code.startsWith("storage/"))
    return "No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.";
  return error instanceof Error
    ? error.message
    : "No pudimos guardar los cambios. Inténtalo de nuevo.";
}
