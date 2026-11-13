import { connectAuthEmulator, type Auth } from "firebase/auth";

// Keep Fast Refresh from connecting the same SDK instance twice.
const registry = globalThis as typeof globalThis & {
  __cutAuthEmulators?: WeakSet<Auth>;
};
export function configureAuthEmulator(auth: Auth | null) {
  const host = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (!auth || !host) return;
  registry.__cutAuthEmulators ??= new WeakSet();
  if (registry.__cutAuthEmulators.has(auth)) return;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  registry.__cutAuthEmulators.add(auth);
}
