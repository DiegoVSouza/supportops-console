import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: process.env.CONSOLE_URL ?? "http://localhost:48080",
    channel: "chrome",
    ignoreHTTPSErrors: true,
    trace: "off",
  },
});
