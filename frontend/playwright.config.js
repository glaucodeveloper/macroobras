import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/playwright-report" }],
    ["json", { outputFile: "output/playwright-results/results.json" }],
    ["junit", { outputFile: "output/playwright-results/junit.xml" }],
  ],
  outputDir: "output/playwright-results",
  use: {
    baseURL: "http://127.0.0.1:4183",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && python3 -m http.server 4183 --directory dist",
    url: "http://127.0.0.1:4183",
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    {
      name: "desktop-admin-installer",
      testMatch: [/.*(admin|installer)\.spec\.js/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-twa",
      testMatch: /.*mobile\.spec\.js/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});
