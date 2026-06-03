import { Page, Route } from '@playwright/test';
import { PLACEHOLDER_PNG } from './placeholder-image';

import homeFixture from '../fixtures/home.json';
import siteContentFixture from '../fixtures/site-content.json';
// Ajouter ici un import par fixture créée au fil des tasks suivantes
// (profile, furniture-list, exhibitions-list, etc.).

/**
 * Remplace récursivement toute occurrence de "__PLACEHOLDER__" dans un objet
 * par la data URI d'image placeholder. Permet de garder les fixtures JSON
 * lisibles sans coller le base64 partout.
 */
function expandPlaceholders<T>(value: T): T {
  if (typeof value === 'string') {
    return (value === '__PLACEHOLDER__' ? PLACEHOLDER_PNG : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(expandPlaceholders) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = expandPlaceholders(v);
    }
    return result as T;
  }
  return value;
}

function fulfillJson(body: unknown) {
  return (route: Route) => route.fulfill({ json: expandPlaceholders(body) });
}

/**
 * Stub toutes les requêtes /api/** appelées par le front pour rendre les
 * tests visuels déterministes (pas de back, pas de DB).
 *
 * Toute route /api/** non explicitement stubée renvoie 404 — ça révèle
 * immédiatement un endpoint oublié plutôt que de laisser un appel pendre
 * ou d'attraper le fallback SPA (index.html servi pour /api/* sinon).
 */
export async function stubApi(page: Page): Promise<void> {
  // Date figée pour tout le contexte de test (affichages de date, footer ©, etc.)
  await page.addInitScript(() => {
    const fixedNow = new Date('2026-01-15T10:00:00Z').getTime();
    const RealDate = Date;
    class FrozenDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(fixedNow);
        } else {
          // @ts-expect-error pass-through to the real Date constructor
          super(...args);
        }
      }
      static override now(): number {
        return fixedNow;
      }
    }
    // @ts-expect-error patch global Date for determinism
    globalThis.Date = FrozenDate;
  });

  // IMPORTANT : Playwright applique les routes en LIFO (la derniere enregistree
  // est essayee en premier). On enregistre donc le catch-all 404 EN PREMIER pour
  // qu'il soit teste EN DERNIER — sinon il masquerait toutes les routes
  // specifiques ci-dessous.
  await page.route('**/api/**', route =>
    route.fulfill({ status: 404, body: 'unstubbed' })
  );

  // Routes specifiques (enregistrees apres = testees avant le catch-all).
  await page.route('**/api/home', fulfillJson(homeFixture));
  await page.route('**/api/content', fulfillJson(siteContentFixture));
  // Ajouter au fil des tasks d'autres endpoints si necessaires.
}
