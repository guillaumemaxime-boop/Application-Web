# Lightbox images des fiches — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agrandir une image de galerie d'une fiche mobilier/expo (public) au clic, dans une lightbox plein écran avec navigation précédent/suivant.

**Architecture:** Nouveau composant pur `<app-image-lightbox>` (overlay dialog a11y, image courante via `<app-cropped-image-canvas mode="fit">`). Les vues détail rendent la galerie publique cliquable et émettent `galleryImageOpen(index)`. Les pages publiques (`furniture-detail`/`exhibition-detail`) hébergent l'overlay — même pattern que `<app-story-viewer>`. Backend inchangé.

**Tech Stack:** Angular 21 standalone, signals, `@if`/`@for`, `@Input()`/`@Output()` (style des vues/composants existants), CDK `A11yModule` (cdkTrapFocus), `<app-cropped-image-canvas>` (mode `fit`). Tests Karma+Jasmine via Docker (`docker compose -f docker-compose.test.yml run --rm frontend-test`).

**Branche :** `feat/lightbox-images-fiches` (créée, spec commitée).

**Spec :** `docs/superpowers/specs/2026-06-17-lightbox-images-fiches-design.md`

**Baseline tests :** à constater au début (suite verte sur `main`). Chaque tâche rapporte le compte exact.

**Garde-fous projet (RAPPEL) :** AUCUNE normalisation d'apostrophe `'`. Copie UI en français. `@if`/`@for` (jamais `*ngIf`/`*ngFor`). Style `@Input()`/`@Output() = new EventEmitter`. Edits ciblés.

---

## Modèles de référence (NE PAS modifier)

- `frontend/src/app/models/crop.model.ts` : `Crop { x; y; w; h }` (%).
- `frontend/src/app/models/gallery-item.model.ts` : `GalleryItem { url: string; crop?: Crop | null; colSpan?; rowSpan? }` (vérifier le nom exact des champs en le lisant).
- `<app-cropped-image-canvas>` (`frontend/src/app/pages/admin/shared/cropped-image-canvas.component.ts`) : `@Input({required}) imageUrl`, `@Input() crop`, `@Input() alt`, `@Input() mode: 'adaptive'|'cover'|'fit'`. Le mode `fit` rend la région cropée exacte au ratio du crop (responsive).

## Structure des fichiers

| Fichier | Rôle | Tâche |
| --- | --- | --- |
| `frontend/src/app/components/image-lightbox/image-lightbox.component.ts` (+`.spec.ts`) | **Créé.** Overlay lightbox générique. | 1 |
| `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+`.spec.ts`) | Galerie publique cliquable + output `galleryImageOpen`. | 2 |
| `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+`.spec.ts`) | Idem (miroir). | 3 |
| `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` (+`.spec.ts`) | Héberge la lightbox (signal + galleryImages + overlay). | 4 |
| `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` (+`.spec.ts`) | Idem (miroir). | 5 |

---

## Task 1 : Composant `<app-image-lightbox>`

**Files:**
- Create: `frontend/src/app/components/image-lightbox/image-lightbox.component.ts`
- Test: `frontend/src/app/components/image-lightbox/image-lightbox.component.spec.ts`

- [ ] **Step 1 : Test (rouge)**

```typescript
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageLightboxComponent, LightboxImage } from './image-lightbox.component';

@Component({
  standalone: true,
  imports: [ImageLightboxComponent],
  template: `<app-image-lightbox [images]="images" [startIndex]="start()" (closed)="closedCount = closedCount + 1" />`,
})
class HostComponent {
  images: LightboxImage[] = [
    { url: '/a.jpg', crop: null, alt: 'A' },
    { url: '/b.jpg', crop: null, alt: 'B' },
    { url: '/c.jpg', crop: null, alt: 'C' },
  ];
  readonly start = signal(1);
  closedCount = 0;
}

describe('ImageLightboxComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function canvas(): HTMLElement { return fixture.nativeElement.querySelector('app-cropped-image-canvas'); }
  function counter(): string { return (fixture.nativeElement.querySelector('.lb-counter')?.textContent ?? '').trim(); }

  it('ouvre sur startIndex et rend un dialog modal', () => {
    const dlg = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dlg).toBeTruthy();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(counter()).toBe('2 / 3');
    expect(canvas()).toBeTruthy();
  });

  it('suivant avance et boucle (circulaire)', () => {
    (fixture.nativeElement.querySelector('.lb-next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('3 / 3');
    (fixture.nativeElement.querySelector('.lb-next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('1 / 3');
  });

  it('précédent recule et boucle', () => {
    (fixture.nativeElement.querySelector('.lb-prev') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('1 / 3');
    (fixture.nativeElement.querySelector('.lb-prev') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(counter()).toBe('3 / 3');
  });

  it('flèches clavier ← → naviguent', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(counter()).toBe('3 / 3');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(counter()).toBe('2 / 3');
  });

  it('Échap ferme (émet closed)', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.closedCount).toBe(1);
  });

  it('bouton Fermer émet closed', () => {
    (fixture.nativeElement.querySelector('.lb-close') as HTMLButtonElement).click();
    expect(host.closedCount).toBe(1);
  });

  it('clic sur le backdrop ferme', () => {
    const backdrop = fixture.nativeElement.querySelector('.lb-backdrop') as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // le handler ne ferme que si la cible EST le backdrop ; simulate en passant target=backdrop
    // (clic direct sur le backdrop)
    expect(host.closedCount).toBeGreaterThanOrEqual(1);
  });

  it('une seule image : pas de navigation', () => {
    host.images = [{ url: '/x.jpg', crop: null, alt: 'X' }];
    host.start.set(0);
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.images = [{ url: '/x.jpg', crop: null, alt: 'X' }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.lb-next')).toBeNull();
    expect(fixture.nativeElement.querySelector('.lb-prev')).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer la suite → échec** (composant introuvable).

- [ ] **Step 3 : Implémenter `image-lightbox.component.ts`**

```typescript
import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { Crop } from '../../models/crop.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

export interface LightboxImage {
  url: string;
  crop?: Crop | null;
  alt: string;
}

/**
 * Lightbox plein écran générique : parcourt une liste d'images (région cropée
 * via <app-cropped-image-canvas mode="fit">), navigation circulaire ‹ ›,
 * flèches clavier, Échap, clic backdrop. Composant pur : émet `closed`.
 */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [A11yModule, CroppedImageCanvasComponent],
  template: `
    <div class="lb-backdrop" role="dialog" aria-modal="true"
         [attr.aria-label]="'Image ' + (index() + 1) + ' sur ' + images.length"
         cdkTrapFocus cdkTrapFocusAutoCapture
         (click)="onBackdropClick($event)">
      <div class="sr-only" aria-live="polite">{{ current().alt }} — {{ index() + 1 }} sur {{ images.length }}</div>

      <button type="button" class="lb-close" aria-label="Fermer" (click)="close()">✕</button>

      @if (images.length > 1) {
        <button type="button" class="lb-nav lb-prev" aria-label="Image précédente" (click)="prev()">‹</button>
        <button type="button" class="lb-nav lb-next" aria-label="Image suivante" (click)="next()">›</button>
      }

      <figure class="lb-figure">
        <app-cropped-image-canvas class="lb-img" mode="fit"
          [imageUrl]="current().url" [crop]="current().crop ?? null" [alt]="current().alt" />
      </figure>

      @if (images.length > 1) {
        <div class="lb-counter">{{ index() + 1 }} / {{ images.length }}</div>
      }
    </div>
  `,
  styles: [`
    .lb-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(10,10,10,0.95); display: flex; align-items: center; justify-content: center; }
    .lb-figure { margin: 0; max-width: 92vw; max-height: 88vh; display: flex; align-items: center; justify-content: center; }
    .lb-img { display: block; max-width: 92vw; max-height: 88vh; }
    .lb-close { position: absolute; top: 18px; right: 22px; background: none; border: none; color: #fff; font-size: 1.4rem; cursor: pointer; opacity: 0.85; padding: 6px 10px; }
    .lb-close:hover, .lb-close:focus-visible { opacity: 1; }
    .lb-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); color: #fff; width: 48px; height: 48px; border-radius: 50%; font-size: 1.8rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .lb-nav:hover, .lb-nav:focus-visible { background: rgba(0,0,0,0.7); }
    .lb-prev { left: 20px; } .lb-next { right: 20px; }
    .lb-counter { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 0.78rem; letter-spacing: 0.14em; opacity: 0.8; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (max-width: 600px) { .lb-nav { width: 40px; height: 40px; font-size: 1.5rem; } .lb-prev { left: 8px; } .lb-next { right: 8px; } }
  `]
})
export class ImageLightboxComponent implements OnInit, OnDestroy {
  @Input({ required: true }) images: LightboxImage[] = [];
  @Input() startIndex = 0;
  @Output() closed = new EventEmitter<void>();

  protected readonly index = signal(0);
  private previousFocus: HTMLElement | null = null;

  protected readonly current = computed<LightboxImage>(() =>
    this.images[this.index()] ?? this.images[0] ?? { url: '', crop: null, alt: '' });

  ngOnInit(): void {
    this.previousFocus = (document.activeElement as HTMLElement | null);
    const n = this.images.length;
    this.index.set(n > 0 ? Math.min(Math.max(this.startIndex, 0), n - 1) : 0);
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus?.();
  }

  protected prev(): void {
    const n = this.images.length;
    if (n <= 1) return;
    this.index.set((this.index() - 1 + n) % n);
  }

  protected next(): void {
    const n = this.images.length;
    if (n <= 1) return;
    this.index.set((this.index() + 1) % n);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdropClick(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('lb-backdrop')) this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void { this.close(); }

  @HostListener('document:keydown.arrowleft')
  protected onLeft(): void { this.prev(); }

  @HostListener('document:keydown.arrowright')
  protected onRight(): void { this.next(); }
}
```

- [ ] **Step 4 : Lancer la suite → vert.** Rapporter le compte exact (baseline + ~8).

Note sur le test « clic backdrop » : si l'assertion via `dispatchEvent` est peu fiable (la cible doit être l'élément backdrop lui-même), simplifier le test en appelant directement `(component as any).onBackdropClick({ target: backdropEl } as any)` et vérifier `closedCount`. Garder un test pertinent.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/image-lightbox/
git commit -m "feat(public): composant image-lightbox (overlay, navigation circulaire, a11y)"
```

---

## Task 2 : `furniture-detail-view` — galerie publique cliquable

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`
- Test: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.spec.ts`

LIS la branche **non-editable** (`@else`) de la galerie. Elle ressemble à :
```html
} @else {
  <div class="g-grid">
    @for (img of item.gallery; track img.url; let i = $index) {
      <figure [style.grid-column]="'span ' + (img.colSpan ?? 1)" [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
        <div class="gallery-img-wrap">
          <app-cropped-image-canvas [imageUrl]="img.url" [crop]="img.crop ?? null" [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
        </div>
      </figure>
    }
  </div>
}
```

- [ ] **Step 1 : Test (rouge)** — dans le spec, mode public :
```typescript
  it('galerie publique : chaque image est un bouton qui émet galleryImageOpen avec l\'index', () => {
    // editable = false ; item.gallery avec 2+ images ; detectChanges
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('.gallery-open-btn');
    expect(btns.length).toBe(/* nb d'images de galerie du fixture */ 2);
    let received: number | null = null;
    component.galleryImageOpen.subscribe((i: number) => received = i);
    (btns[1] as HTMLButtonElement).click();
    expect(received).toBe(1);
  });

  it('mode editable : pas de bouton lightbox (overlays d\'édition conservés)', () => {
    // editable = true
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery-open-btn')).toBeNull();
  });
```
(Adapter au harnais du spec : fournir `item` avec une `gallery` de 2 images, basculer `editable`.)

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter**

Dans la branche `@else` de la galerie, envelopper l'image dans un `<button>` :
```html
      <figure [style.grid-column]="'span ' + (img.colSpan ?? 1)" [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
        <button type="button" class="gallery-open-btn" [attr.aria-label]="'Agrandir la vue ' + (i + 1)" (click)="galleryImageOpen.emit(i)">
          <div class="gallery-img-wrap">
            <app-cropped-image-canvas [imageUrl]="img.url" [crop]="img.crop ?? null" [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
          </div>
        </button>
      </figure>
```
Ajouter l'output (près des autres `@Output()`) :
```typescript
  @Output() galleryImageOpen = new EventEmitter<number>();
```
CSS (tableau `styles`) :
```css
    .gallery-open-btn { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
    .gallery-open-btn:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
```

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/furniture-detail-view/
git commit -m "feat(public): fiche mobilier - galerie cliquable (galleryImageOpen) pour la lightbox"
```

---

## Task 3 : `exhibition-detail-view` — galerie publique cliquable (miroir)

**Files:**
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`
- Test: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.spec.ts`

Mêmes étapes que Task 2, sur la galerie non-editable de la vue expo (structure identique : `.g-grid` → `figure` → `.gallery-img-wrap` → `app-cropped-image-canvas`). Mêmes tests (public émet `galleryImageOpen(i)`, editable sans bouton), même output `@Output() galleryImageOpen = new EventEmitter<number>();`, même CSS `.gallery-open-btn`.

- [ ] **Step 1 : Test (rouge)** (adapté à la vue expo).
- [ ] **Step 2 : Suite → échec.**
- [ ] **Step 3 : Implémenter** (envelopper l'image de galerie publique dans `<button class="gallery-open-btn" (click)="galleryImageOpen.emit(i)" [attr.aria-label]="'Agrandir la vue ' + (i + 1)">` + output + CSS).
- [ ] **Step 4 : Suite → vert.** Compte exact.
- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/components/exhibition-detail-view/
git commit -m "feat(public): fiche expo - galerie cliquable (galleryImageOpen) pour la lightbox"
```

---

## Task 4 : `furniture-detail` (page) — héberger la lightbox

**Files:**
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`
- Test: `frontend/src/app/pages/furniture-detail/furniture-detail.component.spec.ts`

La page délègue à `<app-furniture-detail-view>` et héberge déjà `<app-story-viewer>`. On ajoute le même pattern pour la lightbox.

- [ ] **Step 1 : Test (rouge)**
```typescript
  it('galleryImageOpen ouvre la lightbox avec les images mappées et le bon startIndex', () => {
    // setup : item chargé avec gallery de 2 images (flush des requêtes) ; detectChanges
    const cmp = fixture.componentInstance as any;
    cmp.onGalleryImageOpen(1); // ou émettre depuis la vue détail via By.directive
    fixture.detectChanges();
    expect(cmp.lightboxIndex()).toBe(1);
    expect(fixture.nativeElement.querySelector('app-image-lightbox')).toBeTruthy();
    expect(cmp.galleryImages().length).toBe(2);
    expect(cmp.galleryImages()[0].alt).toContain('vue 1');
  });

  it('closed referme la lightbox', () => {
    const cmp = fixture.componentInstance as any;
    cmp.lightboxIndex.set(0);
    fixture.detectChanges();
    cmp.lightboxIndex.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-image-lightbox')).toBeNull();
  });
```
(Adapter au harnais du spec existant : flush des appels `getFurniture`/`getContent` ; fournir une furniture avec `gallery`.)

- [ ] **Step 2 : Suite → échec.**

- [ ] **Step 3 : Implémenter**

Import + ajout au décorateur `imports` :
```typescript
import { ImageLightboxComponent, LightboxImage } from '../../components/image-lightbox/image-lightbox.component';
```
(Ajouter `ImageLightboxComponent` au tableau `imports`.)

Dans la classe :
```typescript
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly galleryImages = computed<LightboxImage[]>(() => {
    const f = this.item();
    if (!f) return [];
    return (f.gallery ?? []).map((img, i) => ({
      url: img.url,
      crop: img.crop ?? null,
      alt: f.title + ' — vue ' + (i + 1),
    }));
  });

  protected onGalleryImageOpen(i: number): void { this.lightboxIndex.set(i); }
```
Template : sur `<app-furniture-detail-view ...>`, ajouter `(galleryImageOpen)="onGalleryImageOpen($event)"`. Après le bloc `@if (viewerQueue()...)`, ajouter :
```html
      @if (lightboxIndex() !== null) {
        <app-image-lightbox [images]="galleryImages()" [startIndex]="lightboxIndex()!" (closed)="lightboxIndex.set(null)" />
      }
```
(Vérifier le nom réel du champ image dans `GalleryItem` — `url` et `crop` ; adapter si différent.)

- [ ] **Step 4 : Suite → vert.** Compte exact.

- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/pages/furniture-detail/
git commit -m "feat(public): fiche mobilier - hebergement de la lightbox (galerie au clic)"
```

---

## Task 5 : `exhibition-detail` (page) — héberger la lightbox (miroir)

**Files:**
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`
- Test: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.spec.ts`

Mêmes étapes que Task 4, adaptées à l'expo (`item()` = `Exhibition`, qui a aussi `gallery: GalleryItem[]` et `title`).

- [ ] **Step 1 : Test (rouge)** — `onGalleryImageOpen` ouvre la lightbox + `galleryImages()` mappe ; `closed` referme.
- [ ] **Step 2 : Suite → échec.**
- [ ] **Step 3 : Implémenter** — import `ImageLightboxComponent`/`LightboxImage` + `imports` ; signal `lightboxIndex` ; computed `galleryImages` (depuis `e.gallery`, alt `e.title + ' — vue ' + (i+1)`) ; handler `onGalleryImageOpen` ; relais `(galleryImageOpen)` sur `<app-exhibition-detail-view>` ; bloc `@if (lightboxIndex() !== null) { <app-image-lightbox ...> }`.
- [ ] **Step 4 : Suite → vert.** Compte exact + couverture (seuils 80%/75%).
- [ ] **Step 5 : Commit**
```powershell
git add frontend/src/app/pages/exhibition-detail/
git commit -m "feat(public): fiche expo - hebergement de la lightbox (galerie au clic)"
```

---

## Après toutes les tâches

1. **Validation visuelle locale** (`docker compose up --build -d frontend`) : fiche publique mobilier/expo → clic sur une image de galerie → lightbox plein écran (région cropée), ‹ › + flèches clavier (circulaire), compteur, Échap / clic fond ferment, focus restitué. Cover non cliquable. Admin/preview inchangé.
2. **Baselines Playwright** : galerie au repos inchangée (le `<button>` enveloppant ne change pas le rendu) → confirmer aucun diff (`npm run test:visual:docker:update` après validation visuelle ; régénérer seulement si diff justifié).
3. **Audits RGAA + sécurité** sur la branche (RGAA : dialog/focus trap/clavier/labels du lightbox ; sécu : pas de nouvel endpoint, images déjà publiques). Puis merge sur main (après confirmation).
4. **Doc** : `SPECIFICATION_FONCTIONNELLE.md` (lightbox galerie sur les fiches publiques) ; `SPECIFICATION_TECHNIQUE.md` (composant `<app-image-lightbox>`). Pas de changement backend/schema.
