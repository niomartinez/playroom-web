import { defineConfig } from "@playwright/test";

/**
 * Admin-panel e2e. Requires a running target (local dev or staging) plus
 * credentials:
 *   BASE_URL          — default http://localhost:3100
 *   ADMIN_E2E_USER    — admin identifier (username or email)
 *   ADMIN_E2E_PASS    — password
 * Example:
 *   BASE_URL=https://staging-app.playroomgaming.ph \
 *   ADMIN_E2E_USER=SuperAdmin ADMIN_E2E_PASS=... npx playwright test
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3100",
    screenshot: "only-on-failure",
  },
});
