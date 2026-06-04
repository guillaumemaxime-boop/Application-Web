import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('catalog (/mobilier) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/mobilier');
  await page.waitForSelector('.grid .card', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('catalog.png', { fullPage: true });
});
