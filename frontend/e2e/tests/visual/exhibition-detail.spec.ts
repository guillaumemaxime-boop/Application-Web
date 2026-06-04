import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('exhibition-detail (/expositions/lumen-2025) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/expositions/lumen-2025');
  await page.waitForSelector('article.fade-in', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('exhibition-detail.png', { fullPage: true });
});
