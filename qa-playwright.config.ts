import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "qa-test.spec.ts",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    screenshot: "off",
  },
  reporter: "line",
});
