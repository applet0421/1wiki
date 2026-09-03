import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:55432/onewiki_test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
      AUTH_SESSION_SECRET: "e2e-only-session-secret-at-least-32-characters",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_ADSENSE_ENABLED: "false",
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "",
      ADSENSE_PUBLISHER_ID: "",
    },
  },
});
