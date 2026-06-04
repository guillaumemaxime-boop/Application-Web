import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

// Pattern à reproduire dans les autres specs publiques :
// 1) attendre un selecteur de contenu (= data API rendues),
// 2) attendre le composant Angular `app-splash` detache (= LoadingService
//    a quitte son delai minimum MIN_VISIBLE_MS = 400 ms),
// 3) attendre le div HTML `#app-splash` detache (= LoadingService.hideHtmlSplash
//    a fini sa transition opacity 320 ms + el.remove()).
// Sans (2) ou (3), la capture peut intervenir pendant que le splash
// (z-index 9999) couvre encore le viewport.
// Sur /login et /admin, le splash est exclu : un seul wait sur un selecteur
// de formulaire suffit (les waits app-splash/#app-splash resolvent quand meme,
// immediatement, car le splash n'apparait jamais).
test('home — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/');
  await page.waitForSelector('.feed .grid .card', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});
