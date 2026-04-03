import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "qa-resid.spec.ts",
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    screenshot: "off",
    video: "off",
    actionTimeout: 10000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 8080,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
