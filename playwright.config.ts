import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const e2eDatabasePath = "data/e2e-investment-system.sqlite";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command: `rm -f ${e2eDatabasePath} ${e2eDatabasePath}-shm ${e2eDatabasePath}-wal && INVESTMENT_DB_PATH=${e2eDatabasePath} npm run dev -- --hostname 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
