import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

// Pattern à reproduire dans les autres specs publiques :
// 1) attendre un selecteur de contenu (= les data API sont rendues),
// 2) attendre `app-splash` detache du DOM (= le splash a fini sa duree
//    minimum d'affichage : LoadingService.MIN_VISIBLE_MS = 400 ms).
// Sans (2), la capture intervient pendant le delai residuel du splash
// (z-index 9999) qui couvre encore le viewport.
// Sur /login et /admin, le splash est exclu : un seul wait sur le
// formulaire suffit.
test('home — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/');
  await page.waitForSelector('.feed .grid .card', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});
