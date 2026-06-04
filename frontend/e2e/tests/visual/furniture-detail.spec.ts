import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('furniture-detail (/mobilier/tabouret-aurore) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/mobilier/tabouret-aurore');
  await page.waitForSelector('article.fade-in', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('furniture-detail.png', { fullPage: true });
});
