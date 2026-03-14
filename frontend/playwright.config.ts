import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const frontendDir = __dirname;
const backendDir = path.resolve(frontendDir, "../backend");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  reporter: "line",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge"
      }
    }
  ],
  webServer: [
    {
      command: "python -m uvicorn app.main:app --host localhost --port 8000",
      cwd: backendDir,
      url: "http://localhost:8000/api/v1/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        STOCK_PRICE_SYNC_ENABLED: "false",
        FRONTEND_ORIGIN: "http://localhost:3000"
      }
    },
    {
      command: "pnpm dev",
      cwd: frontendDir,
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:8000"
      }
    }
  ]
});
