import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 30_000,
  fullyParallel: false,  // Firestore writes are stateful; serialize
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    headless: true,
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
