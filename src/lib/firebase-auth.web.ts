import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
} from "firebase/auth";
import { firebaseApp } from "./firebase";
import { configureAuthEmulator } from "./firebase-emulators";

function createAuth() {
  if (!firebaseApp) return null;
  try {
    return initializeAuth(firebaseApp, {
      persistence:
        typeof window === "undefined"
          ? inMemoryPersistence
          : browserLocalPersistence,
    });
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === "auth/already-initialized"
    )
      return getAuth(firebaseApp);
    throw error;
  }
}

export const firebaseAuth = createAuth();
configureAuthEmulator(firebaseAuth);
