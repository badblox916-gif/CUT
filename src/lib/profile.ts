export type Profile = {
  name: string;
  handle: string;
  bio: string;
  avatarUri?: string;
  coverUri?: string;
};

export function profileError(profile: Pick<Profile, "name" | "handle">) {
  if (!profile.name.trim()) return "Tu nombre no puede estar vacío.";
  if (!/^[a-zA-Z0-9_.]{3,24}$/.test(profile.handle))
    return "El usuario debe tener entre 3 y 24 letras, números, puntos o guiones bajos.";
  return "";
}
