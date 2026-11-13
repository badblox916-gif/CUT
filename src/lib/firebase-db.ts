import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { firebaseApp } from "./firebase";

export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseStorage =
  firebaseApp && firebaseApp.options.storageBucket
    ? getStorage(firebaseApp)
    : null;

// Opt-in for local browser/emulator tests. Leave empty to connect to the cloud.
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
const registry = globalThis as typeof globalThis & {
  __cutDataEmulators?: WeakSet<object>;
};
if (emulatorHost && firebaseDb) {
  registry.__cutDataEmulators ??= new WeakSet();
  if (!registry.__cutDataEmulators.has(firebaseDb)) {
    connectFirestoreEmulator(firebaseDb, emulatorHost, 8080);
    registry.__cutDataEmulators.add(firebaseDb);
  }
  if (firebaseStorage && !registry.__cutDataEmulators.has(firebaseStorage)) {
    connectStorageEmulator(firebaseStorage, emulatorHost, 9199);
    registry.__cutDataEmulators.add(firebaseStorage);
  }
}
