import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3100", viewport: { width: 1280, height: 900 }, trace: "retain-on-failure" },
  reporter: "list",
});
