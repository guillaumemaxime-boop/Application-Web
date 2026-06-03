import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  // Garder test-results/ et playwright-report/ dans e2e/ (couverts par
  // e2e/.gitignore). Sinon ils sont créés à la racine de frontend/.
  outputDir: './e2e/test-results',
  snapshotPathTemplate: '__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: './e2e/playwright-report' }]]
    : 'list',
  webServer: {
    command: 'npx http-server ../dist/portfolio-frontend/browser -p 4300 -a 127.0.0.1 --proxy "http://127.0.0.1:4300?"',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4300',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
