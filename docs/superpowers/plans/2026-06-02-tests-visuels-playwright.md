# Tests visuels Playwright — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place une chaîne de tests de régression visuelle Playwright sur les 7 pages publiques du portfolio, avec génération de baselines dans un conteneur Docker pour parité avec le CI, intégrée au workflow GitHub Actions existant comme job bloquant.

**Architecture:** Dossier `frontend/e2e/` isolé (n'interfère pas avec Karma). Playwright sert l'app via http-server sur le build statique, mocke 100% des appels `/api/**` via `page.route()` (backend non démarré), capture en Chromium desktop + mobile. Baselines `.png` versionnées dans le repo. Régénération uniquement via conteneur officiel `mcr.microsoft.com/playwright` (rendu identique au CI).

**Tech Stack:** `@playwright/test`, `http-server` (npm package), Docker (Rancher Desktop local), GitHub Actions container job, Angular 21 dev build statique.

**Référence:** spec validée → [docs/superpowers/specs/2026-06-02-tests-visuels-playwright-design.md](../specs/2026-06-02-tests-visuels-playwright-design.md)

**Note d'écart spec → plan :** la spec mentionnait `frontend/Dockerfile.e2e`. Il n'est pas créé : les scripts npm utilisent directement l'image officielle `mcr.microsoft.com/playwright:vX.Y.Z-noble` via `docker run`, ce qui est plus simple et évite un Dockerfile redondant.

---

## File Structure

| Fichier | Rôle |
|---|---|
| `frontend/package.json` | Ajoute `@playwright/test`, `http-server`, et les scripts `test:visual*`. |
| `frontend/e2e/playwright.config.ts` | Config unique : 2 projets (desktop/mobile), `webServer` http-server, `snapshotPathTemplate`, tolérance. |
| `frontend/e2e/.gitignore` | Ignore `test-results/`, `playwright-report/`, `node_modules/` éventuels. |
| `frontend/e2e/helpers/freeze-page.ts` | Helper réutilisable : désactive animations, attend fonts + images. |
| `frontend/e2e/helpers/stub-api.ts` | Installe toutes les routes mock + fige `Date`. Une seule fonction `stubApi(page)`, étendue à chaque spec ajoutée. |
| `frontend/e2e/helpers/placeholder-image.ts` | Exporte une constante `PLACEHOLDER_PNG` (data: URI) utilisée dans toutes les fixtures pour les `cover`. |
| `frontend/e2e/fixtures/*.json` | Une fixture par endpoint mocké. Forme stricte = celle de l'API réelle. |
| `frontend/e2e/tests/visual/*.spec.ts` | Un fichier par page testée (7 fichiers). Chaque spec : `stubApi → goto → freezeForVisual → toHaveScreenshot`. |
| `frontend/e2e/__screenshots__/` | Baselines `.png` générées par Playwright, **versionnées**. |
| `frontend/e2e/README.md` | Mode d'emploi : lancer, regen baselines, ajouter une page. |
| `.github/workflows/frontend-tests.yml` | Nouveau job `visual` parallèle de `test`, image container officielle Playwright, bloquant, upload diff artifacts en cas d'échec. |

---

## Task 1 : Installer Playwright et créer la config foundation

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/e2e/playwright.config.ts`
- Create: `frontend/e2e/.gitignore`

- [ ] **Step 1 : Installer les dépendances**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm install -D @playwright/test http-server
```

Note la version exacte de Playwright installée (visible dans `package.json` après l'install, ex. `"@playwright/test": "^1.50.0"`). Cette version sera utilisée à 3 endroits dans la suite du plan : `playwright.config.ts` (implicite), `package.json` scripts (le tag de l'image docker), et le job CI. Remplacer `<PLAYWRIGHT_VERSION>` ci-dessous par cette version (ex. `1.50.0`).

- [ ] **Step 2 : Créer le `.gitignore` du dossier e2e**

```powershell
mkdir frontend/e2e -ErrorAction SilentlyContinue
```

Créer `frontend/e2e/.gitignore` :

```gitignore
test-results/
playwright-report/
playwright/.cache/
```

- [ ] **Step 3 : Créer la config Playwright**

Créer `frontend/e2e/playwright.config.ts` :

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: '__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  webServer: {
    command: 'npx http-server ../dist/portfolio-frontend/browser -p 4300 -a 127.0.0.1 --proxy "http://127.0.0.1:4300?"',
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4300',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
```

- [ ] **Step 4 : Ajouter les scripts npm**

Modifier `frontend/package.json`, ajouter dans `"scripts"` (remplacer `<PLAYWRIGHT_VERSION>` par la version notée en Step 1) :

```json
"e2e:install": "playwright install --with-deps chromium",
"test:visual": "playwright test --config=e2e/playwright.config.ts",
"test:visual:update": "playwright test --config=e2e/playwright.config.ts --update-snapshots",
"test:visual:docker": "docker run --rm -v \"%cd%:/work\" -w /work mcr.microsoft.com/playwright:v<PLAYWRIGHT_VERSION>-noble sh -c \"npm ci && npm run build && npx playwright test --config=e2e/playwright.config.ts\"",
"test:visual:docker:update": "docker run --rm -v \"%cd%:/work\" -w /work mcr.microsoft.com/playwright:v<PLAYWRIGHT_VERSION>-noble sh -c \"npm ci && npm run build && npx playwright test --config=e2e/playwright.config.ts --update-snapshots\""
```

- [ ] **Step 5 : Vérifier que la config charge**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npx playwright test --config=e2e/playwright.config.ts --list
```

Attendu : sortie qui dit `Total: 0 tests in 0 files` (aucun test pour l'instant, mais la config se charge sans erreur).

- [ ] **Step 6 : Commit**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/e2e/.gitignore frontend/e2e/playwright.config.ts
git commit -m "chore(e2e): installer Playwright et bootstrap config tests visuels"
```

---

## Task 2 : Créer les helpers + la première spec (home)

C'est la tâche la plus longue : on pose toute la mécanique (stub API, freeze, placeholder image, première fixture, première baseline). Les tâches suivantes ne feront que la répéter.

**Files:**
- Create: `frontend/e2e/helpers/freeze-page.ts`
- Create: `frontend/e2e/helpers/stub-api.ts`
- Create: `frontend/e2e/helpers/placeholder-image.ts`
- Create: `frontend/e2e/fixtures/home.json`
- Create: `frontend/e2e/fixtures/site-content.json`
- Create: `frontend/e2e/fixtures/furniture-list.json` *(si home l'appelle)*
- Create: `frontend/e2e/fixtures/exhibitions-list.json` *(si home l'appelle)*
- Create: `frontend/e2e/fixtures/profile.json` *(si home l'appelle)*
- Create: `frontend/e2e/tests/visual/home.spec.ts`
- Create (générées) : `frontend/e2e/__screenshots__/tests/visual/home.spec.ts/home.png-chromium-desktop.png` et `…-chromium-mobile.png`

- [ ] **Step 1 : Créer le helper `placeholder-image.ts`**

Créer `frontend/e2e/helpers/placeholder-image.ts` :

```ts
// 1x1 PNG transparent en data: URI. Les fixtures l'utilisent pour tous les
// champs cover/image afin que le rendu soit déterministe (pas de
// chargement réseau) sans casser le layout (les dimensions sont fixées par
// le CSS de l'app).
export const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
```

- [ ] **Step 2 : Créer le helper `freeze-page.ts`**

Créer `frontend/e2e/helpers/freeze-page.ts` :

```ts
import { Page } from '@playwright/test';

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
```

- [ ] **Step 3 : Identifier les endpoints appelés par la page home**

```powershell
grep -n "this.portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/home/home.component.ts"
```

Lister chaque appel (ex. `getHome()`, `getContent()`, …). Croiser avec [frontend/src/app/services/portfolio.service.ts](../../../frontend/src/app/services/portfolio.service.ts) pour identifier l'URL réelle (`getHome` → `/api/home`, `getContent` → `/api/content`, etc.).

- [ ] **Step 4 : Créer les fixtures**

Pour chaque endpoint identifié au Step 3, créer un fichier JSON dans `frontend/e2e/fixtures/` qui respecte la forme du modèle TypeScript correspondant (`frontend/src/app/models/*.model.ts`). Tous les champs `cover` / image utilisent la chaîne `PLACEHOLDER_PNG` (sera substituée dynamiquement dans `stubApi`, voir Step 5 — donc dans le JSON on met le sentinel littéral `"__PLACEHOLDER__"`).

Exemple `frontend/e2e/fixtures/home.json` (à adapter selon les modèles réels — `HomePageData` dans [home.model.ts](../../../frontend/src/app/models/home.model.ts)) :

```json
{
  "categories": [
    {
      "category": "Tabourets",
      "slug": "tabourets",
      "cover": "__PLACEHOLDER__",
      "itemSlugs": ["tabouret-aurore", "tabouret-onyx"]
    },
    {
      "category": "Tables",
      "slug": "tables",
      "cover": "__PLACEHOLDER__",
      "itemSlugs": ["table-lumen"]
    }
  ],
  "exhibitions": [
    {
      "title": "Lumen",
      "slug": "lumen-2025",
      "cover": "__PLACEHOLDER__",
      "venue": "Galerie Test",
      "period": "Mars 2025"
    }
  ],
  "feed": [
    {
      "kind": "furniture",
      "slug": "tabouret-aurore",
      "title": "Tabouret Aurore",
      "cover": "__PLACEHOLDER__",
      "subtitle": "Frêne brûlé",
      "description": "Pièce unique en frêne brûlé selon la technique shou sugi ban."
    },
    {
      "kind": "exhibition",
      "slug": "lumen-2025",
      "title": "Lumen — exposition",
      "cover": "__PLACEHOLDER__",
      "subtitle": "Galerie Test · Mars 2025"
    }
  ]
}
```

Exemple `frontend/e2e/fixtures/site-content.json` (adapter à `SiteContent` dans `site-content.model.ts`) — ce fichier servira aussi pour la page contact ; remplir tous les champs textuels utilisés par la home **et** la page contact.

Créer les autres fixtures identifiées au Step 3 sur le même modèle.

- [ ] **Step 5 : Créer le helper `stub-api.ts`**

Créer `frontend/e2e/helpers/stub-api.ts` :

```ts
import { Page, Route } from '@playwright/test';
import { PLACEHOLDER_PNG } from './placeholder-image';

import homeFixture from '../fixtures/home.json';
import siteContentFixture from '../fixtures/site-content.json';
// Ajouter ici un import par fixture créée. Pas d'erreur si les fichiers
// suivants n'existent pas encore — les ajouter au fil des tasks.
// import furnitureListFixture from '../fixtures/furniture-list.json';
// import exhibitionsListFixture from '../fixtures/exhibitions-list.json';
// import profileFixture from '../fixtures/profile.json';

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
    for (const [k, v] of Object.entries(value)) result[k] = expandPlaceholders(v);
    return result as T;
  }
  return value;
}

function fulfillJson(body: unknown) {
  return (route: Route) => route.fulfill({ json: expandPlaceholders(body) });
}

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
          // @ts-expect-error pass-through
          super(...args);
        }
      }
      static now(): number {
        return fixedNow;
      }
    }
    // @ts-expect-error patch global
    globalThis.Date = FrozenDate;
  });

  await page.route('**/api/home', fulfillJson(homeFixture));
  await page.route('**/api/content', fulfillJson(siteContentFixture));
  // Ajouter au fil des tasks :
  // await page.route('**/api/furniture', fulfillJson(furnitureListFixture));
  // await page.route('**/api/furniture/featured', fulfillJson(furnitureListFixture));
  // await page.route('**/api/exhibitions', fulfillJson(exhibitionsListFixture));
  // await page.route('**/api/exhibitions/featured', fulfillJson(exhibitionsListFixture));
  // await page.route('**/api/profile', fulfillJson(profileFixture));

  // Fallback : tout autre /api/** non explicitement stub renvoie 404 (révèle
  // un endpoint oublié, plutôt que de laisser un appel pendre).
  await page.route('**/api/**', route => route.fulfill({ status: 404, body: 'unstubbed' }));
}
```

Activer les `page.route` qui correspondent aux endpoints réellement appelés par home (identifiés au Step 3).

- [ ] **Step 6 : Modifier `frontend/tsconfig.spec.json` pour ignorer e2e**

Vérifier d'abord :

```powershell
cat "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/tsconfig.spec.json"
```

Si `"include"` couvre `src/**/*.spec.ts` (cas standard), pas d'action. Sinon, ajouter une exclusion explicite de `e2e/**`.

Créer aussi `frontend/e2e/tsconfig.json` pour donner un contexte TS isolé au dossier e2e :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 7 : Créer la spec home**

Créer `frontend/e2e/tests/visual/home.spec.ts` :

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('home — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});
```

- [ ] **Step 8 : Builder l'app et lancer le test (devrait échouer — pas de baseline)**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm run build
npm run test:visual:docker
```

Attendu : échec avec un message du type `A snapshot doesn't exist at __screenshots__/.../home.png-chromium-desktop.png, writing actual.` (selon la version de Playwright, certaines créent automatiquement la baseline au premier run, auquel cas le test passe — dans ce cas continuer directement au Step 10).

- [ ] **Step 9 : Générer les baselines via le conteneur**

```powershell
npm run test:visual:docker:update
```

Attendu : crée 2 fichiers PNG dans `frontend/e2e/__screenshots__/tests/visual/home.spec.ts/` (un par projet Playwright). Inspecter visuellement les deux PNG pour vérifier que la page home s'affiche correctement (header, hero, grille, footer — pas de FOUT, pas d'images cassées sauf placeholders).

- [ ] **Step 10 : Relancer le test (devrait passer)**

```powershell
npm run test:visual:docker
```

Attendu : `2 passed (Xs)`.

- [ ] **Step 11 : Commit (code + baselines)**

```powershell
git add frontend/e2e/ frontend/tsconfig.spec.json
git commit -m "test(visual): premier spec home + helpers Playwright (stub-api, freeze-page)"
```

---

## Task 3 : Spec catalog (`/mobilier`) + furniture-detail (`/mobilier/:slug`)

**Files:**
- Create: `frontend/e2e/fixtures/furniture-list.json`
- Create: `frontend/e2e/fixtures/furniture-detail.json`
- Modify: `frontend/e2e/helpers/stub-api.ts`
- Create: `frontend/e2e/tests/visual/catalog.spec.ts`
- Create: `frontend/e2e/tests/visual/furniture-detail.spec.ts`

- [ ] **Step 1 : Identifier les endpoints des 2 pages**

```powershell
grep -n "portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/catalog/catalog.component.ts"
grep -n "portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/furniture-detail/furniture-detail.component.ts"
```

Identifier les URLs (typiquement `/api/furniture`, `/api/furniture/categories`, `/api/furniture/:slug`, éventuellement slides).

- [ ] **Step 2 : Créer la fixture `furniture-list.json`**

Adapter à `Furniture[]` ([frontend/src/app/models/furniture.model.ts](../../../frontend/src/app/models/furniture.model.ts)) :

```json
[
  {
    "slug": "tabouret-aurore",
    "name": "Tabouret Aurore",
    "category": "Tabourets",
    "shortDescription": "Frêne brûlé",
    "description": "Pièce unique réalisée selon la technique shou sugi ban.",
    "coverImage": "__PLACEHOLDER__",
    "year": 2025,
    "materials": "Frêne, finition naturelle"
  },
  {
    "slug": "table-lumen",
    "name": "Table Lumen",
    "category": "Tables",
    "shortDescription": "Chêne massif",
    "description": "Table basse en chêne massif aux lignes sculpturales.",
    "coverImage": "__PLACEHOLDER__",
    "year": 2024,
    "materials": "Chêne massif"
  }
]
```

Vérifier la forme exacte attendue dans `furniture.model.ts` et compléter tous les champs requis. Le slug `tabouret-aurore` est aussi celui utilisé par la spec furniture-detail (cohérence).

- [ ] **Step 3 : Créer la fixture `furniture-detail.json`**

Une seule fixture pour le slug `tabouret-aurore` (forme = `Furniture` complet). Reprendre l'objet `tabouret-aurore` de `furniture-list.json` en l'enrichissant si le modèle a des champs optionnels (slides, gallery, etc.).

- [ ] **Step 4 : Étendre `stub-api.ts`**

Ajouter au début du fichier :

```ts
import furnitureListFixture from '../fixtures/furniture-list.json';
import furnitureDetailFixture from '../fixtures/furniture-detail.json';
```

Dans la fonction `stubApi`, avant le fallback 404, ajouter :

```ts
await page.route('**/api/furniture', fulfillJson(furnitureListFixture));
await page.route('**/api/furniture/featured', fulfillJson(furnitureListFixture));
await page.route('**/api/furniture/categories', fulfillJson(['Tabourets', 'Tables']));
await page.route('**/api/furniture/tabouret-aurore', fulfillJson(furnitureDetailFixture));
```

Si les pages catalog ou furniture-detail appellent aussi `/api/admin/slides/furniture/:id` ou un endpoint slides public, ajouter le stub correspondant en retournant un tableau vide `[]`.

- [ ] **Step 5 : Créer `catalog.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('catalog (/mobilier) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/mobilier');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('catalog.png', { fullPage: true });
});
```

- [ ] **Step 6 : Créer `furniture-detail.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('furniture-detail (/mobilier/tabouret-aurore) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/mobilier/tabouret-aurore');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('furniture-detail.png', { fullPage: true });
});
```

- [ ] **Step 7 : Générer les baselines et vérifier**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm run build
npm run test:visual:docker:update
npm run test:visual:docker
```

Attendu sur le 2e run : `6 passed` (home × 2 + catalog × 2 + furniture-detail × 2). Inspecter visuellement les 4 nouveaux PNG (`__screenshots__/tests/visual/catalog.spec.ts/` et `__screenshots__/tests/visual/furniture-detail.spec.ts/`).

- [ ] **Step 8 : Commit**

```powershell
git add frontend/e2e/
git commit -m "test(visual): spec catalog et furniture-detail"
```

---

## Task 4 : Spec expositions-list (`/expositions`) + exhibition-detail (`/expositions/:slug`)

**Files:**
- Create: `frontend/e2e/fixtures/exhibitions-list.json`
- Create: `frontend/e2e/fixtures/exhibition-detail.json`
- Modify: `frontend/e2e/helpers/stub-api.ts`
- Create: `frontend/e2e/tests/visual/expositions-list.spec.ts`
- Create: `frontend/e2e/tests/visual/exhibition-detail.spec.ts`

- [ ] **Step 1 : Identifier les endpoints**

```powershell
grep -n "portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/expositions-list/expositions-list.component.ts"
grep -n "portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts"
```

- [ ] **Step 2 : Créer la fixture `exhibitions-list.json`**

Adapter à `Exhibition[]` ([frontend/src/app/models/exhibition.model.ts](../../../frontend/src/app/models/exhibition.model.ts)) :

```json
[
  {
    "slug": "lumen-2025",
    "title": "Lumen",
    "venue": "Galerie Test",
    "period": "Mars 2025",
    "description": "Exposition collective autour de la matière brûlée.",
    "coverImage": "__PLACEHOLDER__",
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }
]
```

Vérifier les champs requis dans le modèle et compléter.

- [ ] **Step 3 : Créer la fixture `exhibition-detail.json`**

Une seule fixture pour le slug `lumen-2025` (forme `Exhibition` complète).

- [ ] **Step 4 : Étendre `stub-api.ts`**

Ajouter les imports en haut :

```ts
import exhibitionsListFixture from '../fixtures/exhibitions-list.json';
import exhibitionDetailFixture from '../fixtures/exhibition-detail.json';
```

Dans `stubApi`, avant le fallback 404 :

```ts
await page.route('**/api/exhibitions', fulfillJson(exhibitionsListFixture));
await page.route('**/api/exhibitions/featured', fulfillJson(exhibitionsListFixture));
await page.route('**/api/exhibitions/lumen-2025', fulfillJson(exhibitionDetailFixture));
```

Si la page detail appelle un endpoint slides, ajouter `await page.route('**/api/admin/slides/exhibition/**', fulfillJson([]));`.

- [ ] **Step 5 : Créer `expositions-list.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('expositions-list (/expositions) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/expositions');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('expositions-list.png', { fullPage: true });
});
```

- [ ] **Step 6 : Créer `exhibition-detail.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('exhibition-detail (/expositions/lumen-2025) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/expositions/lumen-2025');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('exhibition-detail.png', { fullPage: true });
});
```

- [ ] **Step 7 : Générer et vérifier**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm run build
npm run test:visual:docker:update
npm run test:visual:docker
```

Attendu : `10 passed`.

- [ ] **Step 8 : Commit**

```powershell
git add frontend/e2e/
git commit -m "test(visual): spec expositions-list et exhibition-detail"
```

---

## Task 5 : Spec contact (`/contact`) + login (`/login`)

**Files:**
- Modify: `frontend/e2e/helpers/stub-api.ts` *(si contact appelle un endpoint pas encore stub)*
- Create: `frontend/e2e/tests/visual/contact.spec.ts`
- Create: `frontend/e2e/tests/visual/login.spec.ts`

- [ ] **Step 1 : Identifier les endpoints (souvent aucun pour login)**

```powershell
grep -n "portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/contact/contact.component.ts"
grep -n "portfolio\.\|portfolioService\." "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend/src/app/pages/login/login.component.ts"
```

Login appelle `auth.service.ts` (login POST sur soumission de form) — pas d'appel au load, donc aucun stub nécessaire pour la spec visuelle. Contact lit probablement `/api/content` (déjà stub via Task 2) ; vérifier qu'il n'y a pas d'autre endpoint au load.

- [ ] **Step 2 : Étendre `stub-api.ts` si nécessaire**

Si la page contact appelle un endpoint pas encore stub (par exemple `/api/profile` pour afficher des infos studio), l'ajouter en suivant le même pattern que les tasks précédentes.

- [ ] **Step 3 : Créer `contact.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('contact (/contact) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/contact');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('contact.png', { fullPage: true });
});
```

- [ ] **Step 4 : Créer `login.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('login (/login) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/login');
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('login.png', { fullPage: true });
});
```

- [ ] **Step 5 : Générer et vérifier**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm run build
npm run test:visual:docker:update
npm run test:visual:docker
```

Attendu : `14 passed` (7 specs × 2 viewports).

- [ ] **Step 6 : Commit**

```powershell
git add frontend/e2e/
git commit -m "test(visual): spec contact et login"
```

---

## Task 6 : Intégration CI (`frontend-tests.yml`)

**Files:**
- Modify: `.github/workflows/frontend-tests.yml`

- [ ] **Step 1 : Ouvrir et inspecter le workflow existant**

```powershell
cat "c:/Users/Utilisateur/Project/Application Web/Application-Web/.github/workflows/frontend-tests.yml"
```

Vérifier que le job `test` existe et que la structure générale est OK.

- [ ] **Step 2 : Ajouter le job `visual`**

Modifier `.github/workflows/frontend-tests.yml`, ajouter le nouveau job sous `jobs:` (en parallèle de `test`). Remplacer `<PLAYWRIGHT_VERSION>` par la version notée en Task 1 Step 1 :

```yaml
  visual:
    name: Visual regression tests
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v<PLAYWRIGHT_VERSION>-noble
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build app
        working-directory: frontend
        run: npx ng build --configuration=development

      - name: Run visual tests
        working-directory: frontend
        run: npx playwright test --config=e2e/playwright.config.ts

      - name: Upload diff artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: |
            frontend/test-results/
            frontend/playwright-report/
          retention-days: 14
```

- [ ] **Step 3 : Commit + push pour déclencher le CI**

```powershell
git add .github/workflows/frontend-tests.yml
git commit -m "ci(frontend): job tests visuels Playwright (bloquant)"
git push
```

- [ ] **Step 4 : Vérifier le run CI**

Aller sur GitHub Actions, ouvrir le workflow `Frontend Tests` du commit fraîchement poussé, vérifier que le job `Visual regression tests` apparaît en parallèle de `Run Frontend Tests` et passe au vert.

Si le job échoue avec une diff visuelle, c'est probablement une dérive de rendu entre le conteneur local et le conteneur CI (ne devrait pas arriver puisque c'est la même image). Dans ce cas :
1. Télécharger l'artefact `visual-diff` depuis le run CI.
2. Inspecter les PNG `actual` vs baseline.
3. Si le rendu CI est le bon, écraser les baselines locales avec celles de l'artefact, commit, push.

---

## Task 7 : Documentation (`e2e/README.md`)

**Files:**
- Create: `frontend/e2e/README.md`

- [ ] **Step 1 : Créer le README**

Créer `frontend/e2e/README.md` avec exactement le contenu suivant (le bloc ci-dessous utilise des fences `~~~` pour préserver les triples backticks du contenu — quand tu copies, les triples backticks dans le README doivent rester des triples backticks réels) :

~~~markdown
# Tests visuels Playwright

Régression visuelle des pages publiques du portfolio. Backend non démarré : tous les appels `/api/**` sont mockés via `page.route()` avec des fixtures statiques. Captures en Chromium desktop (1440×900) et mobile (iPhone 13).

## Pages couvertes

- `/` (home)
- `/mobilier` (catalogue)
- `/mobilier/tabouret-aurore` (fiche détail — slug fixé)
- `/expositions` (liste)
- `/expositions/lumen-2025` (fiche détail — slug fixé)
- `/contact`
- `/login`

7 specs × 2 viewports = 14 baselines.

## Lancer les tests localement

**Toujours via le conteneur Docker** (rendu identique au CI Linux ; depuis Windows hôte direct, les polices et le sub-pixel diffèrent et les tests échouent).

```powershell
cd frontend
npm run test:visual:docker
```

## Régénérer les baselines (changement UI volontaire)

```powershell
cd frontend
npm run test:visual:docker:update
git diff frontend/e2e/__screenshots__/   # inspecter visuellement les changements
git add frontend/e2e/__screenshots__/
git commit -m "test(visual): regen baselines suite a <changement>"
```

## Ajouter une page

1. Identifier les endpoints API appelés par le composant page (`grep portfolio\.` dans le fichier `.component.ts`).
2. Créer une fixture JSON dans `fixtures/` pour chaque endpoint. Utiliser le sentinel `"__PLACEHOLDER__"` pour tous les champs image (sera substitué par une data: URI 1×1 transparente via `helpers/stub-api.ts`).
3. Ajouter les `page.route('**/api/...')` dans `helpers/stub-api.ts`.
4. Créer le spec `tests/visual/<page>.spec.ts` sur le modèle des existants.
5. `npm run test:visual:docker:update` puis `npm run test:visual:docker`.
6. Inspecter visuellement les nouveaux PNG dans `__screenshots__/tests/visual/<page>.spec.ts/`.
7. Commit code + baselines dans le même commit.

## Stratégie de stabilité

Le helper `freezeForVisual(page)` neutralise les sources de flakiness :
- Désactive animations / transitions CSS
- Masque le caret de saisie
- Attend `document.fonts.ready`
- Attend que toutes les `<img>` soient chargées

Le helper `stubApi(page)` fige `Date.now()` à `2026-01-15T10:00:00Z` (footer ©, dates dynamiques).

Tolérance : `maxDiffPixelRatio: 0.01` (1% des pixels peuvent différer — couvre l'anti-aliasing résiduel).
~~~

- [ ] **Step 2 : Commit**

```powershell
git add frontend/e2e/README.md
git commit -m "docs(e2e): README tests visuels Playwright"
```

---

## Critères de complétion

- [ ] 7 specs créées et passantes (14 baselines committées)
- [ ] Job CI `visual` vert sur le commit final
- [ ] `npm run test:visual:docker` passe en local
- [ ] `frontend/e2e/README.md` permet à un nouveau venu d'ajouter une page sans contexte supplémentaire
- [ ] Aucune régression sur le job `test` existant (unit tests Karma toujours verts)
