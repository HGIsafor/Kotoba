import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:8085', browserName: 'chromium' },
  webServer: {
    command: 'npx expo start --web --port 8085 --offline',
    url: 'http://localhost:8085',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
