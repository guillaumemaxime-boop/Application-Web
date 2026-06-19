# Performance de chargement des images — Phase 1 (quick wins) — Spec

**Date** : 2026-06-19
**Statut** : Validé — à planifier
**Type** : Optimisation perf (backlog). **Phase 1** d'un effort potentiellement en 2 phases ; la Phase 2 (variantes responsive + WebP/AVIF + srcset) est explicitement reportée en backlog.

## Objectif

Réduire le temps de chargement des images du site (galeries mobilier/expo, covers, cards d'accueil, vignettes de slider) via des optimisations **à faible risque et fort ROI**, sans introduire de pipeline de variantes d'images. Mesurer avant/après (Lighthouse/LCP).

## Contexte (existant)

- **Upload optimisé** : `ImageOptimizer` (Thumbnailator) redimensionne à **max 1920px** sur le grand côté + JPEG qualité 0.85 ; PNG conservé ; GIF/WebP/AVIF passent inchangés. Batch `optimizeAll()` pour les fichiers existants. → un **seul fichier** par image, ≤ 1920px.
- **Service** : `PhotoController.serve` (`GET /api/photos/files/{filename}`) renvoie le fichier (content-type correct) **sans aucun en-tête de cache**. Les noms de fichiers sont des UUID, **immuables** (le contenu d'un filename donné ne change pas après upload).
- **Rendu** : la plupart des images publiques passent par `<app-cropped-image-canvas>` (`<canvas>` + `new Image()` + `drawImage`), qui **télécharge la pleine résolution** (≤1920px) quel que soit la taille d'affichage, **immédiatement** (pas de lazy). Quelques `<img>` bruts subsistent (ex. `story-inline` public, qui a déjà `loading="lazy"`).

## Périmètre validé (Phase 1)

| # | Optimisation | Couche |
| --- | --- | --- |
| 1 | **Cache HTTP immuable** sur les images servies | Backend |
| 2 | **Lazy-loading** des images canvas sous la ligne de flottaison (opt-in) | Frontend |
| 3 | **`decoding="async"`** sur les `<img>` bruts + **`fetchpriority="high"`** sur la cover (LCP) | Frontend |
| 4 | **CLS** : dimensions/aspect définis sur les conteneurs canvas (vérif + correctifs ciblés) | Frontend |
| 5 | **Mesure** avant/après (Lighthouse/LCP) | Validation |

## Décisions architecturales

### 1. Cache HTTP immuable (backend)

Dans `PhotoController.serve`, ajouter sur la réponse :
- `Cache-Control: public, max-age=31536000, immutable` (1 an).
- `ETag` (ex. dérivé de la taille + mtime du fichier, ou un hash léger) et/ou `Last-Modified`, pour permettre les revalidations `304` si besoin.

Justification de `immutable` : le filename est un UUID écrit une seule fois ; le contenu pour un filename donné ne change jamais (le crop est appliqué au rendu, pas au fichier ; `optimizeAll()` est une migration one-shot hors trafic normal). Aucun risque de servir un contenu périmé.

NB : en prod, Nginx proxie `/api/` vers le backend (pas de service statique) — l'en-tête doit donc être posé **par le backend**. Test : un test de `PhotoController` (MockMvc/WebTestClient selon le style existant) vérifie la présence de `Cache-Control` sur `GET /api/photos/files/{filename}`.

### 2. Lazy-loading des images canvas (frontend)

`<app-cropped-image-canvas>` reçoit un nouvel input **`@Input() lazy = false`** (défaut `false` = comportement actuel inchangé → **zéro risque** pour les usages existants non modifiés).

- En mode `lazy=true` : le chargement (`new Image()` / `render()`) est **différé** jusqu'à ce que l'élément hôte approche du viewport, via un **`IntersectionObserver`** (`rootMargin: '200px'`, se déconnecte après la première intersection). Tant que non intersecté, le canvas reste vide (ou un fond neutre).
- Compat : si `IntersectionObserver` est indisponible (vieux navigateur / environnement de test sans IO), **fallback en eager** (rendu immédiat) — pas de régression.
- Nettoyage de l'observer au `ngOnDestroy`.
- Appliquer `[lazy]="true"` aux contextes **sous la ligne de flottaison** : galeries des fiches (mobilier/expo, mode public), cards du feed d'accueil, vignettes de slider (`news-slider`). **NE PAS** lazifier la **cover hero** des fiches (élément LCP) ni les images au-dessus de la ligne de flottaison.

Le plan d'implémentation identifiera précisément chaque usage de `<app-cropped-image-canvas>` et marquera lesquels passent `[lazy]="true"`.

### 3. `decoding="async"` + `fetchpriority` (frontend)

- Les `<img>` bruts du rendu public (ex. `story-inline`, et tout autre `<img>` repéré au plan) reçoivent `decoding="async"`.
- La cover hero (canvas eager) charge avec priorité élevée : dans `cropped-image-canvas`, quand **non lazy**, poser `img.fetchPriority = 'high'` sur l'`Image` créée (hint navigateur pour le LCP). À défaut de support, sans effet (dégradation gracieuse).
  - Détail tranché au plan : soit toujours `high` en mode eager, soit via un input dédié `[priority]` ; on retient `high` par défaut en eager (les usages eager restants sont des covers/above-the-fold) — le plan confirmera sur les usages réels.

### 4. CLS (Cumulative Layout Shift)

Vérifier que chaque conteneur de `<app-cropped-image-canvas>` réserve sa place avant chargement :
- Galerie : `grid-auto-rows: 220px` (hauteur fixe) → déjà OK.
- Cover hero : hauteur définie via `.hero-bg` → déjà OK.
- Cards d'accueil / vignettes slider : vérifier ; si un conteneur n'a pas de hauteur/aspect défini, ajouter `aspect-ratio` (ou hauteur) pour éviter le saut au chargement (d'autant plus en mode lazy).

Le plan listera les conteneurs et n'ajoutera des règles que là où c'est nécessaire (pas de refonte CSS).

### 5. Mesure

Validation manuelle **avant/après** via Lighthouse (mobile + desktop) sur la page d'accueil et une fiche mobilier riche en images : suivre **LCP**, **poids transféré total des images**, et nombre de requêtes images au chargement initial. Les baselines Playwright (rendu visuel) doivent rester inchangées (le lazy ne change pas le rendu final, seulement le moment du chargement).

## Hors portée (→ Phase 2, backlog)

- Génération de **variantes responsive** multi-tailles (400/800/1280/1920) à l'upload + stockage.
- `srcset` / `sizes` au rendu ; sélection par le canvas d'une variante adaptée à la taille d'affichage (corrige le « vignette qui charge 1920px »).
- Conversion **WebP/AVIF** (encodeur backend) des JPEG/PNG.
- CDN dédié aux médias.

## Tests

- **Backend** : test `PhotoController` (style existant) — `GET /api/photos/files/{filename}` renvoie 200 avec un en-tête `Cache-Control` contenant `max-age=31536000` et `immutable`.
- **Frontend** : `cropped-image-canvas.component.spec` — en mode `lazy=true` avec `IntersectionObserver` mocké, aucune `Image` n'est créée tant qu'aucune intersection ; après intersection simulée, l'image est chargée/dessinée. Mode `lazy=false` (défaut) : comportement actuel inchangé (rendu immédiat). Fallback sans `IntersectionObserver` : eager.
- **Frontend (usages)** : les composants qui passent `[lazy]="true"` rendent bien l'attribut/binding ; la cover hero reste eager.
- **Régression** : suite verte ; baselines Playwright intactes (rendu final identique).
