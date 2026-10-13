import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: { AUTH_SECRET: process.env.AUTH_SECRET ?? "eduparque-e2e-secret-with-at-least-32-characters" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
