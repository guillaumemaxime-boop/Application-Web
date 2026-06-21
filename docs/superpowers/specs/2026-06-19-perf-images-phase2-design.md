# Performance images — Phase 2a (variantes responsive) — Spec

**Date** : 2026-06-19
**Statut** : ✅ Implémenté — mergé sur main (Phase 2a) ; Phase 2b (WebP/AVIF) reste backlog
**Type** : Optimisation perf (backlog). **Phase 2a** : variantes responsive multi-tailles. La **Phase 2b** (WebP/AVIF) est explicitement reportée (nécessite un encodeur dédié). La Phase 1 (cache immuable + lazy/priority + decoding) est mergée.

## Objectif

Réduire le **poids transféré** des images en servant une **variante de taille adaptée** au rendu, au lieu de toujours charger la pleine résolution (≤1920px) — y compris pour une vignette de ~200px. Mesurer avant/après (Lighthouse/LCP + poids Network).

## Contexte (existant)

- **Upload** : `PhotoService.store` écrit `{uuid}.{ext}` après `ImageOptimizer.optimize` (Thumbnailator, redim ≤1920px grand côté, JPEG q0.85, PNG conservé, EXIF préservé ; GIF/WebP/AVIF inchangés). Batch idempotent `optimizeAll()` (`POST /api/admin/photos/optimize`).
- **Serve** : `PhotoController.serve` (`GET /api/photos/files/{filename}`) — fichier statique, content-type par extension, **cache immuable 1 an** (Phase 1). Noms UUID immuables.
- **Rendu** : la plupart des images publiques passent par **`<app-cropped-image-canvas>`** (`<canvas>` + `new Image()` + `drawImage`) — charge la pleine résolution quelle que soit la taille d'affichage. Garde anti-rendu-périmé (`requestedUrl !== imageUrl`), `lazy`/`priority` (Phase 1), `ResizeObserver`. Quelques `<img>` bruts : `news-slider` (vignette, déjà `loading="lazy"` + `decoding="async"`), `story-inline` lecture seule.
- **Référencement par URL** : les images sont référencées par **URL** partout (`furniture.coverImage`, `GalleryImage.url`, cover de story, `home_feed`…), **pas** par id photo. Les variantes doivent donc être **dérivables de l'URL de base** (convention de nommage), pas trackées en DB.
- **Crop en %** : `ImageCrop`/`Crop` est en pourcentages → **résolution-indépendant** : une variante réduite reste cohérente avec le cadrage.
- `ImageIO`/Thumbnailator standard **n'encode pas** WebP/AVIF → Phase 2b séparée.

## Décisions validées

| Sujet | Choix |
| --- | --- |
| Périmètre | **Variantes responsive (JPEG/PNG)**. WebP/AVIF → Phase 2b. |
| Génération | **Pré-génération à l'upload** + **batch** pour l'existant. |
| Escalier de largeurs | **400, 800, 1280** (+ l'original ≤1920 = « pleine taille »). Pas d'upscale. |
| Nommage | Convention `{uuid}-{w}.{ext}` à côté de l'original `{uuid}.{ext}`. |
| Sélection front | `cropped-image-canvas` choisit la largeur (clientWidth × dPR), **dérive l'URL**, **fallback** sur l'original si la variante manque. Pas de tracking DB. |
| Serve | **Inchangé** (fichiers statiques, cache immuable). |

## Architecture

### 1. Génération des variantes (backend)

- **`ImageOptimizer`** : ajouter `resizeToWidth(byte[] input, String ext, int targetWidth) : byte[]` — redimensionne à la **largeur** cible (hauteur proportionnelle), JPEG q0.85 / PNG, EXIF préservé. **Pas d'upscale** : si la largeur source ≤ `targetWidth`, renvoie **`null`** (le `store` n'écrit alors aucune variante pour cette largeur). Extension non-JPEG/PNG → `null`. Réutilise la mécanique Thumbnailator existante. Constante `VARIANT_WIDTHS = {400, 800, 1280}`.
- **`PhotoService.store`** : après écriture de l'original `{uuid}.{ext}` (inchangée), pour chaque `w` de `VARIANT_WIDTHS`, appeler `resizeToWidth(original, ext, w)` ; si non-`null` (donc source plus large que `w`), écrire `{uuid}-{w}.{ext}`. Erreur sur une variante = skip (l'original prime ; conformité d'abord).
- **`PhotoService.delete`** : supprimer aussi `{uuid}-{w}.{ext}` pour chaque `w` (best-effort, `deleteIfExists`).
- **Batch** : `POST /api/admin/photos/variants` (JWT) — pour chaque photo existante, (re)génère les variantes manquantes depuis l'original. Idempotent (skip si déjà présentes). Renvoie un résumé `{count, generated}`. (Côté service : `generateVariantsAll()`.)
- **Serve** : aucun changement — les variantes sont des fichiers servis par l'endpoint existant (cache immuable). Une variante absente → 404 (géré côté front par fallback).
- **Format** : seuls JPEG/PNG produisent des variantes (mêmes extensions que `ImageOptimizer.OPTIMIZABLE_EXTENSIONS`). GIF/WebP/AVIF : pas de variante (le front utilisera l'original).

### 2. Sélection de variante au rendu (frontend)

- **Util `variantUrl(baseUrl, width)`** (`frontend/src/app/utils/image-variant.ts`) : si `baseUrl` correspond à `/api/photos/files/{name}.{ext}` avec ext ∈ {jpg,jpeg,png}, renvoie `/api/photos/files/{name}-{width}.{ext}` ; sinon renvoie `baseUrl` inchangé (URLs externes, GIF/WebP/AVIF). Fonction pure, testée.
- **`pickVariantWidth(neededPx)`** : renvoie la plus petite largeur de `[400,800,1280]` ≥ `neededPx`, ou `null` si `neededPx > 1280` (→ utiliser l'original).
- **`<app-cropped-image-canvas>`** : dans `render()`, calculer `neededPx = ceil(clientWidth × devicePixelRatio)` (clientWidth dispo via le canvas/host, déjà mesuré par `ResizeObserver` pour cover/fit). Déterminer l'URL à charger : `w = pickVariantWidth(neededPx)` ; `srcToLoad = w ? variantUrl(this.imageUrl, w) : this.imageUrl`. Charger `srcToLoad` dans l'`Image`.
  - **Fallback** : `img.onerror` (variante 404, ex. source < w) → si `srcToLoad !== this.imageUrl`, recharger avec `this.imageUrl` (garde un flag anti-boucle `variantFallbackTried`). Conserver le garde anti-rendu-périmé (`requestedUrl !== this.imageUrl`) et `priority`/`lazy`.
  - Le **crop** est appliqué comme aujourd'hui sur l'image chargée (variante ou originale) — cohérent car % .
- **`<img>` bruts** : `news-slider` vignette et `story-inline` lecture seule reçoivent un `srcset` construit depuis les variantes (`{base-400} 400w, {base-800} 800w, {base-1280} 1280w, {base} 1920w`) + `sizes` adapté au contexte, `src` = original (fallback navigateurs sans srcset / variantes absentes). Construit via un helper `srcsetFor(baseUrl)` (renvoie `''` pour les URLs non éligibles → pas de srcset).

### 3. Cohérence & robustesse

- Pas de schéma DB ni de DTO modifié (convention d'URL).
- Variante manquante (source plus petite, ou image non-JPEG/PNG) → fallback gracieux sur l'original (canvas onerror ; `<img>` : le navigateur ignore les candidats 404 et garde `src`).
- CLS inchangé (les conteneurs réservent déjà leur hauteur — Phase 1).

## Tests

- **Backend** : `ImageOptimizer.resizeToWidth` (image 1600px → variante 800 = 800px largeur, ratio conservé ; source 300px, target 400 → pas d'upscale / null) ; `PhotoService.store` écrit `{uuid}-400/800/1280` selon la taille source (mock/`@TempDir`) ; `delete` retire les variantes ; `generateVariantsAll` idempotent ; endpoint `POST /api/admin/photos/variants` (JWT, 200 + résumé).
- **Frontend** : `variantUrl` (URL photo → variante ; URL externe/gif → inchangée) ; `pickVariantWidth` (seuils) ; `srcsetFor` ; `cropped-image-canvas` charge la variante adaptée (mock `devicePixelRatio`/clientWidth) et **retombe sur l'original** au `onerror` (sans boucle) ; `<img>` news-slider/story-inline portent un `srcset`.
- **Régression** : suites back + front vertes ; baselines Playwright — le rendu final est identique (variante = même image réduite) → baselines a priori intactes ; régénérer seulement si diff justifié, **après validation visuelle**.
- **Mesure** : Lighthouse (mobile+desktop) + Network (filtre Img) avant/après sur accueil + fiche riche : poids transféré et largeurs réellement chargées.

## Hors portée (→ Phase 2b / backlog)

- Conversion **WebP/AVIF** (encodeur dédié, `<picture>` multi-format).
- CDN médias.
- Tracking DB des variantes / manifeste de tailles.
- Variantes pour les vidéos/posters (hors sujet).
