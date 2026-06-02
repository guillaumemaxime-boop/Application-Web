# Tests visuels automatisés avec Playwright

Date : 2026-06-02
Statut : Validé (en attente de plan d'implémentation)

## Contexte

Le projet n'a aujourd'hui que des tests unitaires Karma/Jasmine sur la couche front (composants, services, guards), exécutés dans `frontend-tests.yml`. Aucun garde-fou n'existe pour détecter qu'un changement (CSS, mise à jour d'Angular, refactor de template, modification d'un composant partagé comme le header/footer ou la typo) altère **visuellement** le rendu d'une page publique.

Objectif : mettre en place une chaîne de tests de **régression visuelle** automatisée, qui capture des screenshots de référence sur les pages clés, les compare à chaque PR, et bloque le merge en cas de diff non explicitement validée.

## Décisions structurantes

Les choix suivants ont été arbitrés en amont :

| Axe | Décision |
|---|---|
| Outil | **Playwright** (`@playwright/test`) en mode `toHaveScreenshot` |
| Scope initial | **Smoke** — 7 pages publiques clés (admin et pages secondaires hors périmètre v1) |
| Données | **Mock HTTP** via `page.route('**/api/**', ...)` — pas de backend démarré |
| Matrice captures | **Chromium desktop (1440×900) + Chromium mobile (iPhone 13, 390×844)** |
| Intégration CI | **Job dédié** dans `frontend-tests.yml`, image officielle Playwright, **bloquant** |
| MAJ baselines | **Régénération locale via conteneur Docker + commit manuel** dans le PR |

## Périmètre

**Inclus (v1) :**

- 7 pages publiques × 2 viewports = **14 baselines** :
  - `/` (home)
  - `/mobilier` (liste catalogue)
  - `/mobilier/:slug` (fiche détail — 1 fixture)
  - `/expositions` (liste expositions)
  - `/expositions/:slug` (fiche expo — 1 fixture)
  - `/contact`
  - `/login`
- Infrastructure : `frontend/e2e/` (config Playwright, specs, fixtures, helpers, baselines), `frontend/Dockerfile.e2e`, scripts `npm`, job CI.
- Documentation : `frontend/e2e/README.md`.

**Exclus (v1) :**

- Pages `/studio`, et tout `/admin/**` (demande un parcours de login automatisé et un seed beaucoup plus large — possible v2).
- Tests d'intégration backend ↔ frontend (le backend n'est pas démarré ; on isole le front).
- Tests cross-browser Firefox/WebKit (Chromium only — les diffs de rendu cross-browser créent du bruit sans valeur ajoutée sur un portfolio Angular standard).
- Tests d'accessibilité / Lighthouse / performance.
- Tests visuels au niveau composant (style Storybook + Chromatic) — la priorité est le rendu intégré des pages.

## Architecture

### Arborescence

```
frontend/
├── e2e/
│   ├── playwright.config.ts
│   ├── tests/
│   │   └── visual/
│   │       ├── home.spec.ts
│   │       ├── catalog.spec.ts
│   │       ├── furniture-detail.spec.ts
│   │       ├── expositions-list.spec.ts
│   │       ├── exhibition-detail.spec.ts
│   │       ├── contact.spec.ts
│   │       └── login.spec.ts
│   ├── fixtures/
│   │   ├── home-feed.json
│   │   ├── furniture-list.json
│   │   ├── furniture-detail.json
│   │   ├── expositions-list.json
│   │   ├── exhibition-detail.json
│   │   ├── site-content.json
│   │   └── ... (autant que d'endpoints touchés)
│   ├── helpers/
│   │   ├── stub-api.ts
│   │   ├── freeze-page.ts
│   │   └── viewports.ts
│   ├── __screenshots__/    # baselines versionnées
│   └── README.md
└── Dockerfile.e2e          # mince, pour `test:visual:docker` local
```

Le dossier `e2e/` est **isolé** des unit tests Karma (`src/`) : `tsconfig.spec.json` ne le voit pas, Karma ne le voit pas, ng build ne le voit pas.

### `playwright.config.ts`

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
    contextOptions: {
      // Date figée pour tout le contexte de test
      // (helper d'init injecté ci-dessous via addInitScript)
    },
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

### Helpers

**`helpers/stub-api.ts`** — installe les routes mock et figure la date avant chaque navigation :

```ts
import { Page } from '@playwright/test';
import homeFeed from '../fixtures/home-feed.json';
import furnitureList from '../fixtures/furniture-list.json';
// ... autres fixtures

export async function stubApi(page: Page) {
  await page.addInitScript(() => {
    const fixedNow = new Date('2026-01-15T10:00:00Z').getTime();
    const RealDate = Date;
    // @ts-expect-error patch global Date
    globalThis.Date = class extends RealDate {
      constructor(...args: ConstructorParameters<typeof RealDate>) {
        if (args.length === 0) super(fixedNow); else super(...args);
      }
      static now() { return fixedNow; }
    };
  });

  await page.route('**/api/home', r => r.fulfill({ json: homeFeed }));
  await page.route('**/api/furniture', r => r.fulfill({ json: furnitureList }));
  // … une route par endpoint touché par les pages testées
}
```

**`helpers/freeze-page.ts`** — neutralise les sources de flakiness juste avant la capture :

```ts
import { Page } from '@playwright/test';

export async function freezeForVisual(page: Page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  `});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(
    Array.from(document.images).map(img =>
      img.complete
        ? null
        : new Promise(res => img.addEventListener('load', res, { once: true }))
    )
  ));
}
```

### Structure d'une spec

```ts
// tests/visual/home.spec.ts
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

Chaque spec produit 2 baselines (une par projet Playwright = par viewport). Le `snapshotPathTemplate` les range proprement par fichier.

## Stratégie de stabilité

Les sources de flakiness identifiées et leurs contre-mesures :

| Source | Contre-mesure |
|---|---|
| Polices web pas chargées au snapshot | `document.fonts.ready` dans `freezeForVisual` |
| Animations CSS / transitions | Injection CSS `animation: none / transition: none` |
| Animations Angular | Couvertes par le CSS ci-dessus ; pas de provider Noop à ajouter dans l'app |
| Images en cours de chargement | Boucle d'attente `img.complete` dans `freezeForVisual` |
| Dates dynamiques (footer © 2026, `Date.now()`) | `addInitScript` qui patche `Date` à `2026-01-15T10:00:00Z` |
| Curseur de saisie / focus rings | `caret: 'hide'` + `caret-color: transparent` |
| Différences sub-pixel (anti-aliasing) | `maxDiffPixelRatio: 0.01` (1% des pixels tolérés) |
| Rendu Linux vs Windows (polices, sub-pixel) | Génération **toujours sous Linux** : conteneur Docker en local, image officielle en CI |
| Données dynamiques d'API | Fixtures statiques (mock HTTP) |

## Workflow

### Local — lancer les tests

```powershell
# Build l'app (statique, source maps)
cd frontend
npm run build

# Lancer les tests visuels via le conteneur Playwright (rendu identique au CI)
npm run test:visual:docker
```

Le `webServer` Playwright démarre `http-server` automatiquement et reste en vie pour la session.

### Local — régénérer les baselines (changement UI volontaire)

```powershell
npm run test:visual:docker:update
git diff frontend/e2e/__screenshots__/   # inspecter les changements
git add frontend/e2e/__screenshots__/
git commit -m "test(visual): regen baselines suite a <changement>"
```

**Règle d'or :** ne jamais générer les baselines depuis l'hôte Windows direct, toujours via le conteneur — sinon le rendu de polices/sub-pixel diffère du CI Linux et les tests échouent à la première CI.

### Scripts `frontend/package.json`

```json
"e2e:install": "playwright install --with-deps chromium",
"test:visual": "playwright test --config=e2e/playwright.config.ts",
"test:visual:update": "playwright test --config=e2e/playwright.config.ts --update-snapshots",
"test:visual:docker": "docker run --rm -v \"%cd%:/work\" -w /work mcr.microsoft.com/playwright:v1.x.x-noble sh -c \"npm ci && npm run build && npx playwright test --config=e2e/playwright.config.ts\"",
"test:visual:docker:update": "docker run --rm -v \"%cd%:/work\" -w /work mcr.microsoft.com/playwright:v1.x.x-noble sh -c \"npm ci && npm run build && npx playwright test --config=e2e/playwright.config.ts --update-snapshots\""
```

(La version `:docker` est exécutée depuis `frontend/`, monte le repo dans le conteneur, build et lance Playwright en une seule passe.)

### CI — `.github/workflows/frontend-tests.yml`

Ajout d'un job `visual` en parallèle du job `test` existant :

```yaml
visual:
  name: Visual regression tests
  runs-on: ubuntu-latest
  container:
    image: mcr.microsoft.com/playwright:v1.x.x-noble
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

**Critère bloquant :** le job échoue si une diff > 1% → bloque le merge tant que les baselines n'ont pas été régénérées volontairement et commitées.

## Tests à mettre en place

Plan de couverture v1 (un fichier par page) :

1. `home.spec.ts` — `/` — fixtures : `home-feed`, `site-content`.
2. `catalog.spec.ts` — `/mobilier` — fixtures : `furniture-list`.
3. `furniture-detail.spec.ts` — `/mobilier/:slug` — fixtures : `furniture-detail` + `story-slides`.
4. `expositions-list.spec.ts` — `/expositions` — fixtures : `expositions-list`.
5. `exhibition-detail.spec.ts` — `/expositions/:slug` — fixtures : `exhibition-detail`.
6. `contact.spec.ts` — `/contact` — fixtures : `site-content` (si page lit du texte CMS).
7. `login.spec.ts` — `/login` — pas d'appel API (formulaire local).

Chaque spec est un test unique : capture full-page après `stubApi + goto + freezeForVisual`.

## Risques et points d'attention

- **Drift de version Playwright** : la version exacte de l'image officielle (`v1.x.x-noble`) doit matcher la version dans `package.json`. À fixer dans la spec d'implémentation, à versionner dans `.github/workflows/frontend-tests.yml`.
- **Drift de fontes système** : si une future image `playwright:vX.Y.Z` change les fontes embarquées, toutes les baselines drifteront. Mitigation : bump conscient de la version, régénération en une PR dédiée.
- **Fixtures qui se désynchronisent du contrat API** : si le backend change la forme d'une réponse, les fixtures restent à l'ancien format → les tests visuels passent mais l'app casserait en prod. Mitigation acceptée v1 : on accepte ce risque, à compenser plus tard par des contract tests ou une v2 hybride (cf. Q2).
- **Volume de baselines** : 14 PNG ~100 Ko chacune ≈ 1.5 Mo dans le repo. Acceptable. Pas de Git LFS nécessaire en v1.
- **Faux positifs résiduels** : si la tolérance 1% s'avère insuffisante, ajuster `maxDiffPixelRatio` après mesure réelle sur quelques itérations CI.

## Évolutions possibles (hors v1)

- Ajout `/studio` et pages admin (avec parcours login mocké).
- États interactifs (hover sur carte mobilier, modale ouverte, formulaire contact rempli, picker média ouvert).
- Tests contractuels back↔front pour compenser le risque de drift fixtures (cf. option « hybride » écartée en Q2).
- Mode "review" — visualiseur HTML des diffs pour les revues PR.
