import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('expositions-list (/expositions) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/expositions');
  await page.waitForSelector('.group .grid', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('expositions-list.png', { fullPage: true });
});
