import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseError } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { firebaseApp } from "./firebase";
import { configureAuthEmulator } from "./firebase-emulators";

function createAuth() {
  if (!firebaseApp) return null;
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Fast Refresh reuses the already initialized Auth instance and persistence.
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
