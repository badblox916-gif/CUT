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
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { EXPO_OFFLINE: "1" },
  },
});
