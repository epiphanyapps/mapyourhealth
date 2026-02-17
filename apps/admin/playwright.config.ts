import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * This config supports testing:
 * 1. Admin Portal (Next.js app at localhost:3000)
 * 2. Mobile Web (Expo web at localhost:8081)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Admin Portal Tests - Desktop Chrome
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /e2e\/admin\/.*.spec.ts/,
    },

    // Mobile Web Tests - Desktop Chrome
    {
      name: "mobile-web-chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /mobile-web\/.*.spec.ts/,
    },

    // Mobile Web Tests - Mobile viewport (iPhone 14)
    {
      name: "mobile-web-mobile",
      use: { ...devices["iPhone 14"] },
      testMatch: /mobile-web\/.*.spec.ts/,
    },
  ],

  // Web servers to start before tests
  // In CI with admin-only tests, skip the Expo mobile web server
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      cwd: ".",
      timeout: 120000,
    },
    ...(process.env.SKIP_MOBILE_SERVER
      ? []
      : [
          {
            command: "npm run web",
            url: "http://localhost:8081",
            reuseExistingServer: !process.env.CI,
            cwd: "../mobile",
            timeout: 120000,
          },
        ]),
  ],
});
