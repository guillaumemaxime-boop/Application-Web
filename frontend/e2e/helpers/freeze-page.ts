import { Page } from '@playwright/test';

const IMAGE_WAIT_TIMEOUT_MS = 3000;

/**
 * Stabilise la page avant un screenshot visuel :
 *  - coupe animations, transitions et caret (curseur clignotant),
 *  - attend que les polices web soient prêtes,
 *  - attend que toutes les images aient terminé leur chargement
 *    (succès ou échec — peu importe, on veut juste un état stable).
 *
 * L'attente des images est plafonnée à 3 s : si une image n'émet ni `load` ni
 * `error` (CORS détaché, image orpheline…), on n'attend pas indéfiniment —
 * mieux vaut capturer dans l'état stable atteint que faire timeout le test.
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
  await page.evaluate(timeoutMs =>
    Promise.race([
      Promise.all(
        Array.from(document.images).map(img =>
          img.complete
            ? null
            : new Promise<void>(res => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
              })
        )
      ),
      new Promise<void>(res => setTimeout(res, timeoutMs)),
    ]),
    IMAGE_WAIT_TIMEOUT_MS
  );
}
