# Tests visuels Playwright

Régression visuelle des pages publiques du portfolio. Backend non démarré : tous les appels `/api/**` sont mockés via `page.route()` avec des fixtures statiques. Captures en Chromium desktop (1440×900) et mobile (iPhone 13).

## Pages couvertes

| Route | Spec | Selecteur de contenu |
|---|---|---|
| `/` | `home.spec.ts` | `.feed .grid .card` |
| `/mobilier` | `catalog.spec.ts` | `.grid .card` |
| `/mobilier/tabouret-aurore` | `furniture-detail.spec.ts` | `article.fade-in` |
| `/expositions` | `expositions-list.spec.ts` | `.grid` |
| `/expositions/lumen-2025` | `exhibition-detail.spec.ts` | `article.fade-in` |
| `/contact` | `contact.spec.ts` | `section.contact-body` |
| `/login` | `login.spec.ts` | `section.wrap` |

**7 specs × 2 viewports = 14 baselines.**

## Lancer les tests localement

**Toujours via le conteneur Docker** — le rendu CI utilise la même image officielle Playwright (`mcr.microsoft.com/playwright:v1.60.0-noble`). Depuis l'hôte Windows direct, les polices et le sub-pixel diffèrent et les tests échouent à la première CI.

```powershell
cd frontend
npm run test:visual:docker
```

Premier run : pull de l'image (~2 Go). Runs suivants : ~2-3 min (npm ci + ng build + 14 tests parallèles).

## Régénérer les baselines (changement UI volontaire)

```powershell
cd frontend
npm run test:visual:docker:update
git diff frontend/e2e/__screenshots__/   # inspecter visuellement les diffs
git add frontend/e2e/__screenshots__/
git commit -m "test(visual): regen baselines suite a <changement>"
```

## Ajouter une page

1. **Identifier les endpoints API appelés** par le composant page :
   ```powershell
   grep -n "portfolio\." frontend/src/app/pages/<page>/<page>.component.ts
   ```
   Croiser avec `frontend/src/app/services/portfolio.service.ts` pour les URLs.

2. **Créer une fixture JSON** par endpoint dans `fixtures/`. Forme = celle du modèle TS dans `frontend/src/app/models/`. Utiliser le sentinel `"__PLACEHOLDER__"` pour tous les champs image (data URI 1×1 substituée à la volée par `helpers/stub-api.ts`).

3. **Ajouter l'entrée dans `STUBS`** de `helpers/stub-api.ts` :
   ```ts
   { glob: '**/api/<endpoint>', fixture: <fixtureName>Fixture },
   ```
   + l'import du JSON en haut du fichier.

4. **Créer `tests/visual/<page>.spec.ts`** sur le modèle d'un spec existant. Adapter le selector de contenu (le plus stable : un élément qui n'apparaît qu'après le rendu des data).

5. **Générer + inspecter + commit** :
   ```powershell
   npm run test:visual:docker:update
   # inspecter visuellement les 2 nouveaux PNG dans __screenshots__/<page>.spec.ts/
   npm run test:visual:docker   # confirmer stabilité
   git add frontend/e2e/
   git commit -m "test(visual): spec <page>"
   ```

## Stratégie de stabilité (déterminisme)

### Helpers

- **`stubApi(page)`** intercepte tous les appels `/api/**` et :
  - répond avec des fixtures statiques (forme alignée sur les modèles TS) ;
  - retourne 404 sur tout endpoint non explicitement stubé (révèle les oublis au lieu de laisser un appel pendre) ;
  - fige `Date.now()` à `2026-01-15T10:00:00Z` (footer `© 2026`, dates dynamiques, etc.) via `addInitScript`.

- **`freezeForVisual(page)`** stabilise la page avant capture :
  - désactive animations / transitions / caret blink ;
  - attend `document.fonts.ready` ;
  - attend que les `<img>` soient chargées (plafond 3 s en cas d'image orpheline).

### Pattern de wait dans chaque spec

```ts
await stubApi(page);
await page.goto('/route');
await page.waitForSelector('<CONTENT_SELECTOR>', { state: 'visible' });        // (1)
await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });  // (2)
await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 }); // (3)
await freezeForVisual(page);
await expect(page).toHaveScreenshot('<name>.png', { fullPage: true });
```

- **(1)** Selector spécifique à la page → les data API sont rendues.
- **(2)** Composant Angular `<app-splash>` détaché → `LoadingService.MIN_VISIBLE_MS = 400 ms` est écoulé.
- **(3)** Div HTML `<div id="app-splash">` détaché → `LoadingService.HTML_SPLASH_FADE_MS = 320 ms` (transition opacity + el.remove) est écoulée.

Sur `/login` et `/admin` le splash est exclu (cf. `AppComponent.isSplashExcludedUrl`) : les waits (2) et (3) resolvent immédiatement (no-op), on garde le pattern complet pour cohérence.

### Tolérance

`maxDiffPixelRatio: 0.01` dans `playwright.config.ts` — 1% des pixels peuvent différer (absorbe l'anti-aliasing résiduel sans masquer une vraie régression).

## Pièges connus

- **Ne JAMAIS générer les baselines depuis l'hôte Windows direct** (sans Docker). Le rendu sub-pixel et les polices diffèrent du conteneur Linux CI → tests rouges immédiats.
- **Bumper Playwright = bumper l'image Docker dans 3 endroits simultanément** : `package.json` (`@playwright/test`), `package.json` (scripts `test:visual:docker*` qui contiennent le tag), `.github/workflows/frontend-tests.yml` (`container.image`).
- **Le selector `app-splash` est commun au composant Angular et au div HTML** (id="app-splash") — les 2 waits ciblent des éléments distincts (selector tag vs id selector).
