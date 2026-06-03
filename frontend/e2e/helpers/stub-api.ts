import { Page, Route } from '@playwright/test';
import { PLACEHOLDER_PNG } from './placeholder-image';

import homeFixture from '../fixtures/home.json';
import siteContentFixture from '../fixtures/site-content.json';
// Au fil des tasks suivantes, ajouter ici les imports + un objet dans STUBS :
//   import furnitureListFixture from '../fixtures/furniture-list.json';
//   import furnitureDetailFixture from '../fixtures/furniture-detail.json';
//   import exhibitionsListFixture from '../fixtures/exhibitions-list.json';
//   import exhibitionDetailFixture from '../fixtures/exhibition-detail.json';
//   import profileFixture from '../fixtures/profile.json';

/**
 * Remplace récursivement toute occurrence de "__PLACEHOLDER__" dans un objet
 * par la data URI d'image placeholder. Le sentinel est destiné aux champs
 * `cover` / image des fixtures (toujours typés `string`) — l'utiliser sur
 * un champ non-string casserait le typage attendu côté Angular.
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
 * Table déclarative des stubs API. Une entrée = une route Playwright.
 * Étendre cette table quand une nouvelle page de test a besoin d'un endpoint.
 * Les entrées sont enregistrées en ordre inverse (dernière = première testée)
 * pour que le catch-all 404 ci-dessous reste le filet de sécurité ultime.
 */
const STUBS: ReadonlyArray<{ readonly glob: string; readonly fixture: unknown }> = [
  { glob: '**/api/home', fixture: homeFixture },
  { glob: '**/api/content', fixture: siteContentFixture },
  // { glob: '**/api/furniture', fixture: furnitureListFixture },
  // { glob: '**/api/furniture/featured', fixture: furnitureListFixture },
  // { glob: '**/api/furniture/categories', fixture: ['Tabourets', 'Tables'] },
  // { glob: '**/api/furniture/tabouret-aurore', fixture: furnitureDetailFixture },
  // { glob: '**/api/exhibitions', fixture: exhibitionsListFixture },
  // { glob: '**/api/exhibitions/featured', fixture: exhibitionsListFixture },
  // { glob: '**/api/exhibitions/lumen-2025', fixture: exhibitionDetailFixture },
  // { glob: '**/api/profile', fixture: profileFixture },
];

/**
 * Stub toutes les requêtes /api/** appelées par le front pour rendre les
 * tests visuels déterministes (pas de back, pas de DB).
 *
 * Toute route /api/** non explicitement stubée renvoie 404 — ça révèle
 * immédiatement un endpoint oublié plutôt que de laisser un appel pendre
 * (ou attraper le fallback SPA d'http-server qui retournerait index.html).
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
  for (const { glob, fixture } of STUBS) {
    await page.route(glob, fulfillJson(fixture));
  }
}
