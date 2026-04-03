import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "qa-admin-test.spec.ts",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    screenshot: "off",
    viewport: { width: 1280, height: 800 },
  },
  reporter: "list",
  workers: 1,  // Run sequentially
});
