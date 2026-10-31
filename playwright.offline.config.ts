import { defineConfig } from "@playwright/test";

// Real Chrome against `vite preview` of the production build, with the API and identity server mocked.
// It proves layout, contrast and the cross-origin API path without the Docker stack.
export default defineConfig({
  testDir: "e2e-offline",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  webServer: {
    command: "npm run build && npx vite preview --port 44175 --strictPort",
    url: "http://localhost:44175",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: { baseURL: "http://localhost:44175", channel: "chrome", trace: "off" },
});
