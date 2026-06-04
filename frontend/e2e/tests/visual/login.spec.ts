import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('login (/login) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/login');
  await page.waitForSelector('section.wrap', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });
});
