# Perf images Phase 2a — variantes responsive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réduire le poids transféré des images en générant des variantes responsive (400/800/1280) à l'upload et en chargeant la taille adaptée au rendu (sélection par `cropped-image-canvas` + `srcset` sur les `<img>` bruts).

**Architecture:** Backend — `ImageOptimizer.resizeToWidth` + `PhotoService` génère `{uuid}-{w}.{ext}` à l'upload, batch idempotent, suppression des variantes ; serve inchangé (fichiers statiques, cache immuable). Frontend — util `image-variant.ts` (dérivation d'URL par convention) ; `cropped-image-canvas` choisit la variante (clientWidth × dPR, ajusté du crop) avec fallback sur l'original ; `srcset` sur news-slider + story-inline. Pas de schéma DB (référencement par URL).

**Tech Stack:** Spring Boot 4.1 (Java 25), Thumbnailator, JUnit 5 ; Angular 21 standalone+signals, Karma+Jasmine.

**Branche :** `feat/perf-images-phase2` (créée, spec committée).

**Spec :** `docs/superpowers/specs/2026-06-19-perf-images-phase2-design.md`

**Conventions :** tests via `docker compose -f docker-compose.test.yml run --rm {backend-test,frontend-test}`. Copie FR, apostrophes `’`. Pas de `HttpClient` en composant. Ne JAMAIS régénérer les baselines Playwright avant validation visuelle.

**Faits de référence (vérifiés) :**
- `ImageOptimizer` : `MAX_DIMENSION=1920`, `JPEG_QUALITY=0.85`, `OPTIMIZABLE_EXTENSIONS={.jpg,.jpeg,.png}`, `optimize(byte[],ext)`, `readMaxDimension(byte[])` (privé). Thumbnailator `Thumbnails.of(...).useExifOrientation(true).outputFormat(...)`.
- `PhotoService` : `store(MultipartFile)` écrit `{uuid}{ext}` via `ImageOptimizer.optimize` ; `delete(id)` supprime le fichier ; `optimizeAll()` batch ; `@Value app.upload.dir`. `loadAsResource` garde path-traversal.
- `AdminPhotoController` : `/api/admin/photos`, `POST /optimize` → `optimizeAll()`.
- `cropped-image-canvas.component.ts` : `render()` crée `new Image()`, `requestedUrl !== this.imageUrl` guard, `cachedImage`, `lazy`/`priority`, modes adaptive/cover/fit/contain ; `getBoundingClientRect()` pour cover/fit.
- `<img>` bruts : `news-slider` (vignette) et `story-inline` (slide image lecture seule).

---

## Task 1 — `ImageOptimizer.resizeToWidth` + ladder

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ImageOptimizer.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/ImageOptimizerTest.java` (créer si absent)

- [ ] **Step 1 : Écrire le test**

Dans `ImageOptimizerTest` (créer le fichier si besoin) :
```java
package com.atelier.portfolio.service;

import org.junit.jupiter.api.Test;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class ImageOptimizerTest {

    private static byte[] jpeg(int w, int h) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", out);
        return out.toByteArray();
    }

    private static int widthOf(byte[] bytes) throws Exception {
        return ImageIO.read(new ByteArrayInputStream(bytes)).getWidth();
    }

    @Test
    void resizeToWidth_reduit_a_la_largeur_cible() throws Exception {
        byte[] variant = ImageOptimizer.resizeToWidth(jpeg(1600, 1000), ".jpg", 800);
        assertNotNull(variant);
        assertEquals(800, widthOf(variant));
    }

    @Test
    void resizeToWidth_pas_d_upscale_renvoie_null() throws Exception {
        assertNull(ImageOptimizer.resizeToWidth(jpeg(300, 200), ".jpg", 400));
    }

    @Test
    void resizeToWidth_extension_non_optimisable_renvoie_null() throws Exception {
        assertNull(ImageOptimizer.resizeToWidth(jpeg(1600, 1000), ".gif", 800));
    }

    @Test
    void variantWidths_exposees() {
        assertArrayEquals(new int[]{400, 800, 1280}, ImageOptimizer.VARIANT_WIDTHS);
    }
}
```

- [ ] **Step 2 : Lancer → échec** (`resizeToWidth`/`VARIANT_WIDTHS` absents)

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`

- [ ] **Step 3 : Implémenter dans `ImageOptimizer`**

Ajouter la constante (près de `MAX_DIMENSION`) et la méthode :
```java
    /** Largeurs des variantes responsive generees a l'upload (Phase 2a). */
    public static final int[] VARIANT_WIDTHS = {400, 800, 1280};

    /**
     * Renvoie une variante JPEG/PNG redimensionnee a {@code targetWidth} de large
     * (hauteur proportionnelle, EXIF preservee, JPEG q0.85). Pas d'upscale : renvoie
     * {@code null} si la source n'est pas plus grande que la cible, si l'extension
     * n'est pas optimisable, ou si la variante n'est pas plus legere que l'original.
     */
    public static byte[] resizeToWidth(byte[] input, String extension, int targetWidth) {
        if (input == null || input.length == 0) return null;
        String normalized = extension == null ? "" : extension.toLowerCase(Locale.ROOT);
        if (!OPTIMIZABLE_EXTENSIONS.contains(normalized)) return null;
        boolean isJpeg = normalized.equals(".jpg") || normalized.equals(".jpeg");
        String outputFormat = isJpeg ? "jpg" : "png";
        try {
            int maxSide = readMaxDimension(input);
            if (maxSide <= 0 || maxSide <= targetWidth) return null;  // pas d'upscale / aucun benefice
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Thumbnails.Builder<? extends InputStream> builder = Thumbnails.of(new ByteArrayInputStream(input))
                    .useExifOrientation(true)
                    .width(targetWidth)
                    .outputFormat(outputFormat);
            if (isJpeg) {
                builder = builder.outputQuality(JPEG_QUALITY);
            }
            builder.toOutputStream(out);
            byte[] variant = out.toByteArray();
            // Garde-fou : si la variante n'est pas plus legere (ex. upscale d'un portrait
            // dont la largeur etait deja < cible), on ne la garde pas.
            return variant.length < input.length ? variant : null;
        } catch (Exception e) {
            return null;
        }
    }
```
> `Thumbnails....width(targetWidth)` redimensionne à cette largeur en gardant le ratio. `readMaxDimension` est déjà présent (privé).

- [ ] **Step 4 : Lancer → vert**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`

- [ ] **Step 5 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/service/ImageOptimizer.java backend/src/test/java/com/atelier/portfolio/service/ImageOptimizerTest.java
git commit -m "feat(perf): ImageOptimizer.resizeToWidth + ladder 400/800/1280 (pas d'upscale)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2 — `PhotoService` : variantes (store + delete + batch) + endpoint

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/PhotoService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminPhotoController.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/PhotoServiceTest.java` (créer si absent)

Convention : variante de `{uuid}.{ext}` = `{uuid}-{w}.{ext}` (insérer `-{w}` avant l'extension). Helper privé partagé.

- [ ] **Step 1 : Écrire le test (service, `@TempDir`)**

Dans `PhotoServiceTest` (créer si absent ; style `ReflectionTestUtils` comme `VideoServiceTest`) :
```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.repository.PhotoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class PhotoServiceTest {

    private PhotoService newService(Path dir) {
        PhotoService service = new PhotoService(Mockito.mock(PhotoRepository.class));
        ReflectionTestUtils.setField(service, "uploadDir", dir.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "/api/photos/files");
        return service;
    }

    private static byte[] jpeg(int w, int h) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", out);
        return out.toByteArray();
    }

    @Test
    void store_ecrit_les_variantes_inferieures_a_la_source(@TempDir Path dir) throws Exception {
        PhotoService service = newService(dir);
        // Source 1600px : variantes 400, 800, 1280 attendues
        var photo = service.store(new MockMultipartFile("file", "x.jpg", "image/jpeg", jpeg(1600, 1000)));
        String base = photo.filename().replace(".jpg", "");
        assertTrue(Files.exists(dir.resolve(base + "-400.jpg")));
        assertTrue(Files.exists(dir.resolve(base + "-800.jpg")));
        assertTrue(Files.exists(dir.resolve(base + "-1280.jpg")));
    }

    @Test
    void store_pas_de_variante_plus_large_que_la_source(@TempDir Path dir) throws Exception {
        PhotoService service = newService(dir);
        // Source 500px : seule 400 applicable
        var photo = service.store(new MockMultipartFile("file", "x.jpg", "image/jpeg", jpeg(500, 400)));
        String base = photo.filename().replace(".jpg", "");
        assertTrue(Files.exists(dir.resolve(base + "-400.jpg")));
        assertFalse(Files.exists(dir.resolve(base + "-800.jpg")));
    }

    @Test
    void delete_retire_aussi_les_variantes(@TempDir Path dir) throws Exception {
        PhotoService service = newService(dir);
        // Stub repository pour delete (findById -> entity)
        var repo = (PhotoRepository) ReflectionTestUtils.getField(service, "repository");
        // delete() teste via fichiers : on cree manuellement original + variante puis on appelle un helper.
        // (Si delete() exige une entity, ce test verifie deleteVariantFiles via le chemin reel — voir impl.)
        Files.write(dir.resolve("u.jpg"), new byte[]{1});
        Files.write(dir.resolve("u-400.jpg"), new byte[]{1});
        ReflectionTestUtils.invokeMethod(service, "deleteVariants", "u.jpg");
        assertFalse(Files.exists(dir.resolve("u-400.jpg")));
        assertTrue(Files.exists(dir.resolve("u.jpg")));  // deleteVariants ne touche pas l'original
    }
}
```
> Note : `PhotoService` injecte `PhotoRepository`. Le test mocke le repo. Si la signature du constructeur diffère, adapter. Le test de `delete` cible le helper `deleteVariants(filename)` (à créer) pour rester unitaire ; le `delete(id)` complet est couvert par l'existant.

- [ ] **Step 2 : Lancer → échec**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`

- [ ] **Step 3 : Implémenter dans `PhotoService`**

Ajouter le helper de nommage + génération + suppression, et brancher dans `store`/`delete` :
```java
    // --- Variantes responsive (Phase 2a) ---

    /** Insere -{w} avant l'extension : "uuid.jpg" -> "uuid-800.jpg". */
    static String variantFilename(String filename, int width) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return filename + "-" + width;
        return filename.substring(0, dot) + "-" + width + filename.substring(dot);
    }

    /** Genere les variantes (≤ largeur source) a cote de l'original deja ecrit. */
    private void writeVariants(Path dir, String filename, byte[] originalBytes, String extension) {
        for (int w : ImageOptimizer.VARIANT_WIDTHS) {
            try {
                byte[] variant = ImageOptimizer.resizeToWidth(originalBytes, extension, w);
                if (variant != null) {
                    Files.write(dir.resolve(variantFilename(filename, w)), variant);
                }
            } catch (IOException ignored) {
                // conformite d'abord : l'original prime, une variante ratee est sans gravite
            }
        }
    }

    /** Supprime les fichiers variantes d'un original (best-effort). */
    void deleteVariants(String filename) {
        Path dir = Paths.get(uploadDir);
        for (int w : ImageOptimizer.VARIANT_WIDTHS) {
            try {
                Files.deleteIfExists(dir.resolve(variantFilename(filename, w)));
            } catch (IOException ignored) {
            }
        }
    }
```
Dans `store(...)`, juste après `Files.write(target, optimized);` :
```java
        writeVariants(dir, filename, optimized, normalizedExt);
```
Dans `delete(...)`, dans le bloc qui supprime le fichier de l'entity (après/avec `Files.deleteIfExists(file)`), ajouter :
```java
                deleteVariants(entity.getFilename());
```

- [ ] **Step 4 : `generateVariantsAll()` (batch idempotent) + endpoint**

Dans `PhotoService`, ajouter (mirroir d'`optimizeAll`) :
```java
    /** Resume du batch de generation de variantes. */
    public record VariantReport(int count, int generated) {}

    /**
     * Genere les variantes manquantes pour toutes les photos existantes (idempotent :
     * une variante deja presente est laissee). Migration one-shot.
     */
    public VariantReport generateVariantsAll() {
        int count = 0;
        int generated = 0;
        Path dir = Paths.get(uploadDir);
        for (PhotoEntity entity : repository.findAll()) {
            count++;
            String filename = entity.getFilename();
            Path original = dir.resolve(filename).normalize();
            if (!Files.exists(original)) continue;
            String ext = extractExtension(filename);
            byte[] originalBytes;
            try {
                originalBytes = Files.readAllBytes(original);
            } catch (IOException e) {
                continue;
            }
            for (int w : ImageOptimizer.VARIANT_WIDTHS) {
                Path variantPath = dir.resolve(variantFilename(filename, w));
                if (Files.exists(variantPath)) continue;  // idempotent
                try {
                    byte[] variant = ImageOptimizer.resizeToWidth(originalBytes, ext, w);
                    if (variant != null) {
                        Files.write(variantPath, variant);
                        generated++;
                    }
                } catch (IOException ignored) {
                }
            }
        }
        return new VariantReport(count, generated);
    }
```
> `extractExtension` existe déjà (privé, statique) dans `PhotoService` (utilisé par `optimizeAll`). Réutiliser.

Dans `AdminPhotoController`, ajouter l'endpoint (mirroir de `/optimize`) :
```java
    @PostMapping("/variants")
    public ResponseEntity<PhotoService.VariantReport> generateVariants() {
        return ResponseEntity.ok(service.generateVariantsAll());
    }
```

- [ ] **Step 5 : Lancer → vert + suite complète**

Run: `docker compose -f docker-compose.test.yml run --rm backend-test`
Expected : nouveaux tests verts, suite backend complète verte.

- [ ] **Step 6 : Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/service/PhotoService.java backend/src/main/java/com/atelier/portfolio/controller/AdminPhotoController.java backend/src/test/java/com/atelier/portfolio/service/PhotoServiceTest.java
git commit -m "feat(perf): generation des variantes a l'upload + delete + batch /api/admin/photos/variants" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3 — Frontend : util `image-variant.ts`

**Files:**
- Create: `frontend/src/app/utils/image-variant.ts`
- Create: `frontend/src/app/utils/image-variant.spec.ts`

- [ ] **Step 1 : Écrire le spec**

```ts
import { variantUrl, pickVariantWidth, srcsetFor, VARIANT_WIDTHS } from './image-variant';

describe('image-variant', () => {
  it('variantUrl insère -{w} avant l’extension pour une URL photo', () => {
    expect(variantUrl('/api/photos/files/abc.jpg', 800)).toBe('/api/photos/files/abc-800.jpg');
    expect(variantUrl('/api/photos/files/abc.png', 400)).toBe('/api/photos/files/abc-400.png');
  });

  it('variantUrl laisse inchangées les URLs non éligibles', () => {
    expect(variantUrl('https://cdn.example.com/x.jpg', 800)).toBe('https://cdn.example.com/x.jpg');
    expect(variantUrl('/api/photos/files/x.gif', 800)).toBe('/api/photos/files/x.gif');
    expect(variantUrl('', 800)).toBe('');
  });

  it('pickVariantWidth renvoie la plus petite largeur ≥ besoin, sinon null', () => {
    expect(pickVariantWidth(150)).toBe(400);
    expect(pickVariantWidth(400)).toBe(400);
    expect(pickVariantWidth(401)).toBe(800);
    expect(pickVariantWidth(1000)).toBe(1280);
    expect(pickVariantWidth(1281)).toBeNull();   // > max ladder → original
  });

  it('srcsetFor construit les candidats pour une URL photo, vide sinon', () => {
    const s = srcsetFor('/api/photos/files/abc.jpg');
    expect(s).toContain('/api/photos/files/abc-400.jpg 400w');
    expect(s).toContain('/api/photos/files/abc-800.jpg 800w');
    expect(s).toContain('/api/photos/files/abc-1280.jpg 1280w');
    expect(s).toContain('/api/photos/files/abc.jpg 1920w');
    expect(srcsetFor('https://cdn/x.jpg')).toBe('');
    expect(srcsetFor('/api/photos/files/x.gif')).toBe('');
  });
});
```

- [ ] **Step 2 : Lancer → échec**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`

- [ ] **Step 3 : Implémenter**

```ts
/** Largeurs des variantes responsive (alignées sur le backend ImageOptimizer.VARIANT_WIDTHS). */
export const VARIANT_WIDTHS = [400, 800, 1280] as const;

/** Largeur "pleine taille" servie par l'original (post-optimisation backend ≤ 1920). */
const ORIGINAL_WIDTH = 1920;

/** /api/photos/files/{name}.{jpg|jpeg|png} → éligible aux variantes. */
const PHOTO_RE = /^(\/api\/photos\/files\/[^?#]+)\.(jpe?g|png)$/i;

/** Dérive l'URL d'une variante de largeur `width` ; renvoie l'URL inchangée si non éligible. */
export function variantUrl(baseUrl: string, width: number): string {
  const m = baseUrl.match(PHOTO_RE);
  if (!m) return baseUrl;
  return `${m[1]}-${width}.${m[2]}`;
}

/** Plus petite largeur de l'escalier ≥ neededPx ; null si > max (→ utiliser l'original). */
export function pickVariantWidth(neededPx: number): number | null {
  for (const w of VARIANT_WIDTHS) {
    if (neededPx <= w) return w;
  }
  return null;
}

/** srcset des variantes + original (1920w) pour une URL photo ; '' si non éligible. */
export function srcsetFor(baseUrl: string): string {
  if (!PHOTO_RE.test(baseUrl)) return '';
  const parts = VARIANT_WIDTHS.map(w => `${variantUrl(baseUrl, w)} ${w}w`);
  parts.push(`${baseUrl} ${ORIGINAL_WIDTH}w`);
  return parts.join(', ');
}
```

- [ ] **Step 4 : Lancer → vert** · **Step 5 : Commit**

```bash
git add frontend/src/app/utils/image-variant.ts frontend/src/app/utils/image-variant.spec.ts
git commit -m "feat(perf): util image-variant (variantUrl/pickVariantWidth/srcsetFor)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4 — `cropped-image-canvas` : sélection de variante + fallback

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/cropped-image-canvas.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/cropped-image-canvas.component.spec.ts`

Le `render()` charge désormais une **variante adaptée** au lieu de toujours `this.imageUrl`. Conserve le garde anti-rendu-périmé (`requestedUrl !== this.imageUrl`), `lazy`/`priority`, le cache, les 4 modes. Fallback sur l'original si la variante 404.

- [ ] **Step 1 : Écrire le test**

Ajouter dans `cropped-image-canvas.component.spec.ts` (adapter au style du fichier ; le composant est testé via un host ou directement) :
```ts
import { variantUrl } from '../../../utils/image-variant';

it('résout une variante adaptée à la taille d’affichage (mode cover)', () => {
  const cmp = fixture.componentInstance; // adapter selon le spec existant
  cmp.imageUrl = '/api/photos/files/abc.jpg';
  cmp.crop = null;
  cmp.mode = 'cover';
  // largeur d'affichage simulée ~200px, dPR 1 → besoin ~200 → variante 400
  const src = (cmp as any).resolveSrc(200, 1);
  expect(src).toBe('/api/photos/files/abc-400.jpg');
});

it('utilise l’original si le besoin dépasse l’escalier', () => {
  const cmp = fixture.componentInstance;
  cmp.imageUrl = '/api/photos/files/abc.jpg';
  cmp.crop = null;
  expect((cmp as any).resolveSrc(1500, 1)).toBe('/api/photos/files/abc.jpg');
});

it('ajuste le besoin selon la fraction de crop (crop serré → plus haute résolution)', () => {
  const cmp = fixture.componentInstance;
  cmp.imageUrl = '/api/photos/files/abc.jpg';
  cmp.crop = { x: 0, y: 0, w: 25, h: 25 };  // 25% → besoin ×4
  // 200px d'affichage / 0.25 = 800 → variante 800
  expect((cmp as any).resolveSrc(200, 1)).toBe('/api/photos/files/abc-800.jpg');
});
```
> Si le spec existant n'expose pas `fixture.componentInstance` directement, suivre son pattern (host wrapper). `resolveSrc(displayWidthCss, dpr)` est une méthode **pure** extraite pour être testable sans canvas/layout.

- [ ] **Step 2 : Lancer → échec** (`resolveSrc` absent)

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`

- [ ] **Step 3 : Implémenter**

Ajouter l'import en tête :
```ts
import { variantUrl, pickVariantWidth } from '../../../utils/image-variant';
```
Ajouter une méthode pure de résolution (testable) :
```ts
  /**
   * URL à charger pour une largeur d'affichage CSS donnée et un devicePixelRatio.
   * Choisit une variante responsive (ajustée de la fraction de crop) ou l'original.
   */
  resolveSrc(displayWidthCss: number, dpr: number): string {
    if (!displayWidthCss || displayWidthCss <= 0) return this.imageUrl;
    const cropFrac = (this.crop && this.crop.w) ? this.crop.w / 100 : 1;
    const neededPx = Math.ceil((displayWidthCss * dpr) / cropFrac);
    const w = pickVariantWidth(neededPx);
    return w ? variantUrl(this.imageUrl, w) : this.imageUrl;
  }

  /** Largeur d'affichage CSS estimée selon le mode (pour la sélection de variante). */
  private displayWidthFor(canvas: HTMLCanvasElement): number {
    if (this.mode === 'adaptive') return this.maxWidth;
    if (this.mode === 'contain') return Number.MAX_SAFE_INTEGER;  // pleine résolution
    const rect = canvas.getBoundingClientRect();
    return rect.width || 0;
  }
```
Réécrire `render()` pour charger la variante + fallback (remplace le corps actuel à partir de la création de l'`Image`) :
```ts
  private render(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.imageUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const targetSrc = this.resolveSrc(this.displayWidthFor(canvas), dpr);

    // Cache : l'image chargee correspond a la source visee courante.
    if (this.cachedImage && this.cachedImage.src.endsWith(srcTail(targetSrc)) && this.cachedImage.complete && this.cachedImage.naturalWidth > 0) {
      this.draw(ctx, canvas, this.cachedImage);
      return;
    }
    this.loadAndDraw(ctx, canvas, targetSrc, false);
  }

  private loadAndDraw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, src: string, isFallback: boolean): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (this.priority) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
    }
    const requestedUrl = this.imageUrl;  // garde anti-rendu-perime sur l'INPUT (pas la variante)
    img.onload = () => {
      if (requestedUrl !== this.imageUrl) return;
      this.cachedImage = img;
      this.draw(ctx, canvas, img);
    };
    img.onerror = () => {
      if (requestedUrl !== this.imageUrl) return;
      // Variante absente (source plus petite que la cible) → retente l'original une fois.
      if (!isFallback && src !== this.imageUrl) {
        this.loadAndDraw(ctx, canvas, this.imageUrl, true);
        return;
      }
      canvas.width = canvas.width;  // clear
    };
    img.src = src;
  }
```
Ajouter en haut du fichier (helper de comparaison de cache robuste aux URLs absolues/relatives) :
```ts
/** Queue d'URL pour comparer le src d'une Image (absolu) au src demande (relatif). */
function srcTail(url: string): string { return url; }
```
> Le cache compare via `endsWith` car `img.src` est résolu en URL absolue par le navigateur. `srcTail` renvoie l'URL telle quelle (relative) — `absoluteSrc.endsWith(relativeSrc)` est vrai pour nos URLs `/api/...`. Supprimer l'ancienne logique de cache `=== this.imageUrl`.

- [ ] **Step 4 : Lancer → vert + suite complète**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected : nouveaux tests verts ; aucun test existant du canvas cassé (modes, lazy/priority, garde).

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/app/pages/admin/shared/cropped-image-canvas.component.ts frontend/src/app/pages/admin/shared/cropped-image-canvas.component.spec.ts
git commit -m "feat(perf): cropped-image-canvas charge une variante adaptee (fallback original)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5 — `srcset` sur les `<img>` bruts (news-slider + story-inline)

**Files (lire d'abord)** :
- Modify: `frontend/src/app/components/news-slider/news-slider.component.ts` (+ spec)
- Modify: `frontend/src/app/components/story-inline/story-inline.component.ts` (+ spec)

> ⚠ Si `story-inline` a été supprimé (refonte stories), **ignorer story-inline** et n'appliquer le `srcset` qu'à `news-slider`. Vérifier l'existence du fichier avant.

- [ ] **Step 1 : Lire** les deux composants, repérer les `<img [src]="...">` bruts (vignette news-slider ; slide image lecture seule story-inline si présent). Noter l'expression de l'URL (ex. `story.coverImage`, `slide.src`).

- [ ] **Step 2 : Spec** — ajouter un test par composant vérifiant que l'`<img>` porte un attribut `srcset` contenant `-400.jpg 400w` quand l'URL est une photo (`/api/photos/files/...`). Suivre le style du spec existant (fixtures, `fixture.detectChanges()`).

- [ ] **Step 3 : Implémenter** — importer `srcsetFor` (`../../utils/image-variant`), ajouter sur l'`<img>` :
  ```html
  [attr.srcset]="srcsetFor(<url>) || null"
  sizes="(max-width: 600px) 100vw, 400px"
  ```
  Exposer `protected readonly srcsetFor = srcsetFor;` dans la classe (ou une méthode wrapper) pour l'utiliser dans le template. Adapter `sizes` au contexte réel (vignette slider ~ petite ; ajuster si besoin).

- [ ] **Step 4 : Lancer → vert** (suite frontend complète)

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/app/components/news-slider/ frontend/src/app/components/story-inline/ 2>/dev/null; git commit -m "feat(perf): srcset responsive sur les <img> bruts (news-slider, story-inline)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Après toutes les tâches

1. **Revue finale holistique** (intégration backend variantes ↔ sélection front ↔ fallback ; pas de régression des 4 modes du canvas ni du garde anti-périmé).
2. **Redéploiement** back+front (`docker compose up --build -d backend frontend`).
3. **Batch des variantes existantes** : appeler `POST /api/admin/photos/variants` (admin connecté) pour générer les variantes des photos déjà uploadées.
4. **Mesure avant/après** (utilisateur) : Lighthouse (mobile+desktop) + Network (filtre Img) sur l'accueil et une fiche riche — vérifier que des variantes `-400/-800/...` sont chargées (et non l'original 1920) et la baisse du poids transféré.
5. **Validation visuelle** : rendu identique (variantes = mêmes images réduites) ; pas d'image floue (si flou → la sélection sous-dimensionne : ajuster `sizes`/marge). Vérifier le fallback (image sans variante = ancienne photo non batchée → doit s'afficher via l'original).
6. **Playwright** : exécuter sans `--update` ; baselines a priori intactes (même rendu). Régénérer seulement si diff justifié, **après** validation visuelle.
7. **Doc** : `docs/SPECIFICATION_TECHNIQUE.md` (variantes responsive : convention `{uuid}-{w}.{ext}`, endpoint `/api/admin/photos/variants`, sélection canvas + srcset ; mention Phase 2b WebP/AVIF backlog). Mettre à jour la note Phase 2 backlog de la section perf.
8. **Merge** sur `main` après confirmation explicite utilisateur.

---

## Self-review (effectuée)

- **Couverture spec** : ladder + resizeToWidth (T1) ; génération upload + delete + batch + endpoint (T2) ; util dérivation/sélection/srcset (T3) ; canvas sélection + fallback (T4) ; srcset imgs bruts (T5) ; mesure/doc/merge en post-tâches. WebP/AVIF explicitement hors scope. ✓
- **Cohérence types** : `VARIANT_WIDTHS` back `{400,800,1280}` ↔ front `[400,800,1280]` ; `variantFilename`/`variantUrl` même convention `-{w}` avant extension ; `resolveSrc(displayWidthCss, dpr)` testée pure ; `VariantReport(count, generated)` consommé par l'endpoint. ✓
- **Placeholders** : T1-T4 code complet ; T5 demande de **lire** news-slider/story-inline (URLs variables) et fournit le patch type — volontaire, + garde « si story-inline supprimé, l'ignorer ».
- **Risque** : T4 réécrit `render()` — préserver impérativement le garde `requestedUrl !== this.imageUrl`, `lazy`/`priority`, le `ResizeObserver`, et les 4 modes ; le cache passe d'une comparaison `=== imageUrl` à `endsWith(targetSrc)` (l'`img.src` est absolu). Bien revérifier les tests existants du canvas.
