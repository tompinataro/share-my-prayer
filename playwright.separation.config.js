import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./integration",
  testMatch: "*.spec.js",
  use: { headless: true },
  webServer: {
    command: "python3 -m http.server 4175 --bind 127.0.0.1 --directory ../..",
    port: 4175,
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "webkit-mobile",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
