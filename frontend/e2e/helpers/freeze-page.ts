import { Page } from '@playwright/test';

/**
 * Stabilise la page avant un screenshot visuel :
 *  - coupe animations, transitions et caret (curseur clignotant),
 *  - attend que les polices web soient prêtes,
 *  - attend que toutes les images aient terminé leur chargement
 *    (succès ou échec — peu importe, on veut juste un état stable).
 */
export async function freezeForVisual(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map(img =>
        img.complete
          ? null
          : new Promise<void>(res => {
              img.addEventListener('load', () => res(), { once: true });
              img.addEventListener('error', () => res(), { once: true });
            })
      )
    )
  );
}
