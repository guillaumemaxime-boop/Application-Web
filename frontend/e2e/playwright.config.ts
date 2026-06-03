import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: '__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Note : `outputDir` et `outputFolder` du reporter HTML ne sont pas configurés
  // ici car la résolution des chemins est ambigue entre config-relative et
  // cwd-relative selon les versions Playwright. Les dossiers `test-results/` et
  // `playwright-report/` sont ignorés via `frontend/.gitignore` peu importe où
  // Playwright les place.
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
