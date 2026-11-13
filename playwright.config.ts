import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    baseURL: "http://localhost:8082",
    screenshot: "on",
    trace: "retain-on-failure",
    launchOptions: {
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: "npm run test:serve",
    url: "http://localhost:8082",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      EXPO_OFFLINE: "1",
      EXPO_PUBLIC_FIREBASE_API_KEY: "test-api-key",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-cut.firebaseapp.com",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "demo-cut",
      EXPO_PUBLIC_FIREBASE_APP_ID: "test-app-id",
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-cut.appspot.com",
      EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: "127.0.0.1",
      EXPO_PUBLIC_MEDIA_PROVIDER:
        process.env.CUT_TEST_CLOUDINARY === "1" ? "cloudinary" : "firebase",
      EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "cut-test-cloud",
      EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: "cut-test-preset",
    },
  },
});
