import "firebase/auth";
import type { Persistence, ReactNativeAsyncStorage } from "firebase/auth";

// Firebase 13's public types omit this documented React Native-only export.
// Its runtime implementation is resolved by Metro's react-native condition.
declare module "firebase/auth" {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
