# Preview WYSIWYG Fiche Mobilier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'admin un preview WYSIWYG de la Fiche Mobilier (split 50/50), avec édition d'images depuis le preview (hover Cadrer / Remplacer / Retirer) et click-to-focus sur les textes, le tout en réutilisant un composant view extrait partagé avec la page publique.

**Architecture:** Extraire `<app-furniture-detail-view>` (composant pur, standalone, Inputs/Outputs) depuis l'actuel `FurnitureDetailComponent`. La page publique consomme le view en branchant ses données API. L'admin instancie un wrapper `<app-furniture-preview>` qui agrège le `FormGroup` + signal galerie en un `Furniture` virtuel via signal/computed, et le passe au view en mode `editable=true`.

**Tech Stack:** Angular 21 standalone + signals + `@if`/`@for`, Karma + Jasmine pour les unit tests, Playwright pour la régression visuelle, ReorderableDirective existante pour le drag, modales `<app-image-crop-picker>` + `<app-photo-picker>` du sous-projet 1.

**Spec:** [docs/superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md](../specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md)

**Branche:** `feat/wysiwyg-mobilier-preview` (créée depuis `main` après le merge du sous-projet 1).

---

## Cartographie des fichiers

**Nouveaux :**
- `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`
- `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.spec.ts`
- `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts`
- `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.spec.ts`
- `docs/adr/0018-page-vs-view-pattern.md`

**Modifiés :**
- `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` (gros refactor : déléguer le rendu au view)
- `frontend/src/app/pages/furniture-detail/furniture-detail.component.spec.ts` (adapter)
- `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (split layout + brancher le preview + IDs `field-*`)
- `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts` (focusField, handlers preview)
- `CLAUDE.md` (mentionner le pattern page/view)

**Tests Playwright :**
- `frontend/e2e/tests/visual/furniture-detail.spec.ts` (doit rester vert SANS régen de baseline)
- (Pas de baseline pour `/admin/mobilier` — admin pas testé en Playwright)

---

## Task 1: Squelette du composant `<app-furniture-detail-view>` (rendu hero only)

**Files:**
- Create: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`
- Create: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.spec.ts`

- [ ] **Step 1.1 : Écrire les tests qui échouent**

```ts
// furniture-detail-view.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FurnitureDetailViewComponent } from './furniture-detail-view.component';
import { Furniture } from '../../models/furniture.model';

describe('FurnitureDetailViewComponent', () => {
  let fixture: ComponentFixture<FurnitureDetailViewComponent>;

  const mockFurniture: Furniture = {
    id: 'f-001', slug: 'tabouret-aurore', title: 'Tabouret Aurore',
    category: 'Sièges', year: 2024, material: 'Chêne et cuir',
    coverImage: 'https://example.com/cover.jpg', coverCrop: null,
    description: 'Description du tabouret.',
    dimensions: ['H 45cm', 'L 30cm'],
    gallery: [], tags: [], price: null,
    featured: false, showStoryLink: false, showStoryButton: false,
  } as Furniture;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FurnitureDetailViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(FurnitureDetailViewComponent);
  });

  it('affiche le titre du mobilier', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Tabouret Aurore');
  });

  it('affiche l\'eyebrow categorie · annee', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    const eyebrow = fixture.nativeElement.querySelector('.eyebrow');
    expect(eyebrow.textContent).toContain('Sièges');
    expect(eyebrow.textContent).toContain('2024');
  });

  it('rend le canvas cover dans .hero-bg', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-bg app-cropped-image-canvas')).toBeTruthy();
  });

  it('rend null state quand item est null', () => {
    fixture.componentRef.setInput('item', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero')).toBeNull();
  });
});
```

- [ ] **Step 1.2 : Vérifier l'échec**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-detail-view.component.spec.ts' 2>&1 | tail -5
```

Attendu : 4 tests FAIL (composant inexistant).

- [ ] **Step 1.3 : Créer le composant minimal**

```ts
// furniture-detail-view.component.ts
import { Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Furniture } from '../../models/furniture.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

@Component({
  selector: 'app-furniture-detail-view',
  standalone: true,
  imports: [NgStyle, CroppedImageCanvasComponent],
  template: `
    @if (item) {
      <article class="fade-in">
        <header class="hero">
          <div class="hero-bg">
            <app-cropped-image-canvas
              [imageUrl]="item.coverImage"
              [crop]="item.coverCrop ?? null"
              [alt]="item.title"
              mode="cover" />
          </div>
          <div class="container hero-content">
            <span class="eyebrow">{{ item.category }} · {{ item.year }}</span>
            <h1>{{ item.title }}</h1>
            <p class="material">{{ item.material }}</p>
          </div>
        </header>
      </article>
    }
  `,
  styles: [`
    .hero { position: relative; min-height: 70vh; display: flex; align-items: flex-end; padding: 80px 0; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero-bg app-cropped-image-canvas { width: 100%; height: 100%; display: block; }
    .hero-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 100%); }
    .hero-content { position: relative; z-index: 1; color: #fff; max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero-content .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.85; }
    .hero-content h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin: 16px 0; }
    .hero-content .material { font-size: 0.95rem; opacity: 0.85; }
  `]
})
export class FurnitureDetailViewComponent {
  @Input({ required: true }) item: Furniture | null = null;
}
```

- [ ] **Step 1.4 : Vérifier les tests passent**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-detail-view.component.spec.ts' 2>&1 | tail -5
```

Attendu : 4 tests PASS.

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/components/furniture-detail-view/
git commit -m "feat(wysiwyg): squelette <app-furniture-detail-view> hero only + tests"
```

---

## Task 2: Étendre le view avec description / spec / dimensions / story-inline / galerie / CTA

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.spec.ts`

- [ ] **Step 2.1 : Lire l'actuel `furniture-detail.component.ts` template + styles**

Copier les sections suivantes depuis `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` vers le view :
- section description (`<section class="section description">`)
- section dimensions / specs (recherche le bloc <section> qui rend `item.dimensions` et autres)
- `<app-story-inline [slides]="displaySlides()">`
- section gallery (boucle `@for` sur `item.gallery`)
- section CTA contact form

```powershell
grep -n "section description\|section gallery\|app-story-inline\|<section class=\"section" frontend/src/app/pages/furniture-detail/furniture-detail.component.ts
```

- [ ] **Step 2.2 : Étendre les Inputs et déplacer le template**

Ajouter à `furniture-detail-view.component.ts` :

```ts
import { StoryInlineComponent, DisplaySlide } from '../../components/story-inline/story-inline.component';
import { Story } from '../../models/story.model';
import { SiteContent } from '../../models/site-content.model';

@Input() story: Story | null = null;
@Input() displaySlides: DisplaySlide[] = [];
@Input() content: SiteContent = {};
```

(Le composant `<app-contact-form>` peut rester dans la page publique ; le view ne le rend pas si on veut le restreindre. Pour ce sous-projet, le view rend une "zone CTA" qui peut être une projection de contenu via `<ng-content select="[ctaSlot]">`.)

Template étendu (concat depuis l'existant) :

```html
<article class="fade-in">
  <header class="hero"> ... (déjà fait) </header>

  <section class="section description">
    <div class="container">
      <p class="body">{{ item.description }}</p>
    </div>
  </section>

  @if (displaySlides.length > 0) {
    <app-story-inline [slides]="displaySlides"></app-story-inline>
  }

  @if (item.gallery.length > 0) {
    <section class="section gallery">
      <div class="container">
        <div class="g-grid">
          @for (img of item.gallery; track img.url; let i = $index) {
            <figure [class.tall]="i % 3 === 0">
              <div class="gallery-img-wrap">
                <app-cropped-image-canvas
                  [imageUrl]="img.url"
                  [crop]="img.crop ?? null"
                  [alt]="item.title + ' — vue ' + (i + 1)"
                  mode="cover" />
              </div>
            </figure>
          }
        </div>
      </div>
    </section>
  }

  <ng-content select="[ctaSlot]"></ng-content>
</article>
```

Styles : copier les styles `.section`, `.gallery`, `.g-grid`, `.gallery-img-wrap` depuis `furniture-detail.component.ts`.

- [ ] **Step 2.3 : Étendre les tests**

Ajouter dans `furniture-detail-view.component.spec.ts` :

```ts
it('affiche la description', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.description .body').textContent).toContain('Description du tabouret.');
});

it('ne rend pas la section galerie quand gallery est vide', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.gallery')).toBeNull();
});

it('rend une figure par item de galerie', () => {
  const f = { ...mockFurniture, gallery: [
    { url: 'https://e.com/a.jpg', crop: null },
    { url: 'https://e.com/b.jpg', crop: { x: 0, y: 0, w: 50, h: 50 } },
  ]};
  fixture.componentRef.setInput('item', f);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.gallery figure').length).toBe(2);
});

it('rend story-inline quand displaySlides non vides', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as DisplaySlide]);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-story-inline')).toBeTruthy();
});

it('ne rend pas story-inline quand displaySlides est vide', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
});
```

- [ ] **Step 2.4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-detail-view.component.spec.ts' 2>&1 | tail -5
```

Attendu : 9 tests PASS (4 anciens + 5 nouveaux).

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/components/furniture-detail-view/
git commit -m "feat(wysiwyg): view ajoute description + galerie + story-inline + slot CTA"
```

---

## Task 3: Mode editable — overlays hover Cadrer / Remplacer / Retirer + click-to-focus textes + drag-reorder galerie

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.spec.ts`

- [ ] **Step 3.1 : Ajouter Inputs editable + Outputs au composant**

```ts
import { EventEmitter, Output } from '@angular/core';
import { ReorderableDirective } from '../../directives/reorderable.directive';

@Input() editable = false;

@Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
@Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
@Output() galleryReorder = new EventEmitter<number[]>();
@Output() textFieldClick = new EventEmitter<string>();
```

Ajouter `ReorderableDirective` dans `imports: [...]`.

- [ ] **Step 3.2 : Template — overlays hero + galerie + click sur textes**

Hero : enrober `.hero-bg` d'un wrapper editable. Ajouter overlay d'actions :

```html
<header class="hero" [class.editable]="editable">
  <div class="hero-bg">
    <app-cropped-image-canvas
      [imageUrl]="item.coverImage"
      [crop]="item.coverCrop ?? null"
      [alt]="item.title"
      mode="cover" />
    @if (editable) {
      <div class="edit-overlay">
        <button type="button" class="edit-btn" aria-label="Cadrer la cover" (click)="coverEdit.emit('crop')">✂ Cadrer</button>
        <button type="button" class="edit-btn" aria-label="Remplacer la cover" (click)="coverEdit.emit('replace')">🖼 Remplacer</button>
      </div>
    }
  </div>
  <div class="container hero-content">
    @if (editable) {
      <span class="eyebrow editable-text" role="button" tabindex="0"
            (click)="textFieldClick.emit('eyebrow')"
            (keydown.enter)="textFieldClick.emit('eyebrow')"
            (keydown.space)="textFieldClick.emit('eyebrow')">{{ item.category }} · {{ item.year }}</span>
      <h1 class="editable-text" role="button" tabindex="0"
          (click)="textFieldClick.emit('title')"
          (keydown.enter)="textFieldClick.emit('title')"
          (keydown.space)="textFieldClick.emit('title')">{{ item.title }}</h1>
      <p class="material editable-text" role="button" tabindex="0"
         (click)="textFieldClick.emit('material')"
         (keydown.enter)="textFieldClick.emit('material')"
         (keydown.space)="textFieldClick.emit('material')">{{ item.material }}</p>
    } @else {
      <span class="eyebrow">{{ item.category }} · {{ item.year }}</span>
      <h1>{{ item.title }}</h1>
      <p class="material">{{ item.material }}</p>
    }
  </div>
</header>
```

Description : pareil pour le `.body` :

```html
<section class="section description">
  <div class="container">
    @if (editable) {
      <p class="body editable-text" role="button" tabindex="0"
         (click)="textFieldClick.emit('description')"
         (keydown.enter)="textFieldClick.emit('description')"
         (keydown.space)="textFieldClick.emit('description')">{{ item.description }}</p>
    } @else {
      <p class="body">{{ item.description }}</p>
    }
  </div>
</section>
```

Galerie : enrober chaque figure + ajouter overlay + drag-reorder :

```html
@if (item.gallery.length > 0) {
  <section class="section gallery">
    <div class="container">
      <div class="g-grid"
           [class.editable]="editable"
           [appReorderable]="editable"
           (reordered)="galleryReorder.emit($event)">
        @for (img of item.gallery; track img.url; let i = $index) {
          <figure [class.tall]="i % 3 === 0">
            <div class="gallery-img-wrap">
              <app-cropped-image-canvas
                [imageUrl]="img.url"
                [crop]="img.crop ?? null"
                [alt]="item.title + ' — vue ' + (i + 1)"
                mode="cover" />
              @if (editable) {
                <div class="edit-overlay">
                  <button type="button" class="edit-btn" aria-label="Cadrer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'crop' })">✂</button>
                  <button type="button" class="edit-btn" aria-label="Remplacer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'replace' })">🖼</button>
                  <button type="button" class="edit-btn edit-btn-danger" aria-label="Retirer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'remove' })">×</button>
                </div>
              }
            </div>
          </figure>
        }
      </div>
    </div>
  </section>
}
```

(Note : la directive `appReorderable` est sur frontend/src/app/directives/reorderable.directive.ts. Confirmer sa signature actuelle pour l'usage `[appReorderable]="boolean" (reordered)="..."` — adapter si différent.)

Vérifier signature :

```powershell
grep -n "Reorderable\|@Output\|@Input" frontend/src/app/directives/reorderable.directive.ts
```

Si la directive ne prend pas de `[appReorderable]="boolean"`, simplement la passer/retirer conditionnellement via un `@if` :

```html
@if (editable) {
  <div class="g-grid editable" appReorderable (reordered)="galleryReorder.emit($event)">
    <!-- contenu -->
  </div>
} @else {
  <div class="g-grid">
    <!-- contenu -->
  </div>
}
```

- [ ] **Step 3.3 : Styles overlays + editable-text**

Ajouter aux styles du composant :

```css
.editable .hero-bg { cursor: pointer; outline: 1px dashed rgba(255,255,255,0.25); outline-offset: -2px; }
.hero-bg .edit-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 12px;
  background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 180ms ease;
  z-index: 2;
}
.hero-bg:hover .edit-overlay, .hero-bg:focus-within .edit-overlay { opacity: 1; }
.edit-btn {
  padding: 8px 14px; background: var(--color-bg); border: 1px solid var(--color-line);
  color: var(--color-ink); font-size: 0.85rem; cursor: pointer; font-family: inherit;
}
.edit-btn:hover { background: var(--color-ink); color: var(--color-bg); }
.edit-btn-danger:hover { background: #c44; color: #fff; border-color: #c44; }
.editable-text { cursor: pointer; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color 180ms ease; border-radius: 2px; }
.editable-text:hover, .editable-text:focus-visible { outline-color: currentColor; }
.gallery-img-wrap { position: relative; }
.gallery-img-wrap .edit-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 180ms ease; z-index: 2;
}
.gallery-img-wrap:hover .edit-overlay, .gallery-img-wrap:focus-within .edit-overlay { opacity: 1; }
.gallery-img-wrap .edit-btn { padding: 4px 8px; font-size: 0.75rem; }
```

- [ ] **Step 3.4 : Tests pour le mode editable**

Ajouter à `furniture-detail-view.component.spec.ts` :

```ts
it('n\'affiche pas les overlays par defaut (editable=false)', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.edit-overlay')).toBeNull();
});

it('affiche l\'overlay hero quand editable=true', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.hero-bg .edit-overlay')).toBeTruthy();
});

it('emet coverEdit=crop au clic sur Cadrer', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: string | null = null;
  fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
  const btn = fixture.nativeElement.querySelector('.hero-bg .edit-btn[aria-label="Cadrer la cover"]') as HTMLButtonElement;
  btn.click();
  expect(emitted).toBe('crop');
});

it('emet coverEdit=replace au clic sur Remplacer', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: string | null = null;
  fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
  const btn = fixture.nativeElement.querySelector('.hero-bg .edit-btn[aria-label="Remplacer la cover"]') as HTMLButtonElement;
  btn.click();
  expect(emitted).toBe('replace');
});

it('emet textFieldClick au clic sur le titre', () => {
  fixture.componentRef.setInput('item', mockFurniture);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: string | null = null;
  fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
  const h1 = fixture.nativeElement.querySelector('h1.editable-text') as HTMLElement;
  h1.click();
  expect(emitted).toBe('title');
});

it('emet galleryItemEdit avec index + action remove', () => {
  const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }, { url: 'b.jpg', crop: null }] };
  fixture.componentRef.setInput('item', f);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: { index: number; action: string } | null = null;
  fixture.componentInstance.galleryItemEdit.subscribe(e => emitted = e);
  const btns = fixture.nativeElement.querySelectorAll('.gallery-img-wrap .edit-btn[aria-label="Retirer cette image"]') as NodeListOf<HTMLButtonElement>;
  btns[1].click();
  expect(emitted).toEqual({ index: 1, action: 'remove' });
});

it('overlays galerie absents quand editable=false', () => {
  const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }] };
  fixture.componentRef.setInput('item', f);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.gallery-img-wrap .edit-overlay')).toBeNull();
});
```

- [ ] **Step 3.5 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-detail-view.component.spec.ts' 2>&1 | tail -5
```

Attendu : 16 tests PASS.

- [ ] **Step 3.6 : Commit**

```powershell
git add frontend/src/app/components/furniture-detail-view/
git commit -m "feat(wysiwyg): view mode editable avec overlays hover + click-to-focus + reorder galerie"
```

---

## Task 4: Refactor `furniture-detail.component.ts` (public) pour déléguer au view

**Files:**
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.spec.ts`

- [ ] **Step 4.1 : Lire le composant actuel pour identifier ce qui reste à la page**

```powershell
grep -n "Title\|Meta\|Router\|PortfolioService\|ContactForm\|StoryViewer\|loadFurniture\|displaySlides\|viewerQueue\|cropTransform\|galleryItemStyle\|coverCropStyle" frontend/src/app/pages/furniture-detail/furniture-detail.component.ts
```

Ce qui RESTE à la page :
- Inject PortfolioService, ActivatedRoute, Router, Meta/Title si présents.
- Signals `item`, `story`, `viewerQueue`, `displaySlides`, `content`.
- Méthodes `onViewerOpen`, `closeViewer`, et tout ce qui n'est pas du rendu visuel.
- Le `<app-contact-form>` est instancié dans le slot `[ctaSlot]` du view.
- Le `<app-story-viewer>` reste au top niveau de la page.

Ce qui DISPARAÎT du composant :
- Tout le template hero, description, galerie (déplacé dans le view).
- Tous les styles associés à ces sections (déplacés dans le view).
- Méthodes `coverCropStyle()`, `galleryItemStyle()`.
- Imports `cropTransform`, `CropStyle`, `CroppedImageCanvasComponent`, `NgStyle` (NgStyle si plus utilisé).

- [ ] **Step 4.2 : Réécrire le template + class**

```ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Furniture } from '../../models/furniture.model';
import { Story } from '../../models/story.model';
import { SiteContent } from '../../models/site-content.model';
import { PortfolioService } from '../../services/portfolio.service';
import { LoadingService } from '../../services/loading.service';
import { FurnitureDetailViewComponent } from '../../components/furniture-detail-view/furniture-detail-view.component';
import { ContactFormComponent } from '../../components/contact-form/contact-form.component';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';
import { enrichSlides } from '../../utils/display-slides';

@Component({
  selector: 'app-furniture-detail',
  standalone: true,
  imports: [RouterLink, FurnitureDetailViewComponent, ContactFormComponent, StoryViewerComponent],
  template: `
    @if (loading()) {
      <section class="status">…chargement…</section>
    } @else if (item() === null) {
      <section class="status">
        <p>Cette pièce est introuvable.</p>
        <p><a class="btn-link" routerLink="/mobilier">Retour au catalogue</a></p>
      </section>
    } @else if (item(); as f) {
      <app-furniture-detail-view
        [item]="f"
        [story]="story()"
        [displaySlides]="displaySlides()"
        [content]="content()"
        (viewerOpen)="onViewerOpen($event)">
        <section class="section cta" ctaSlot>
          <div class="container">
            <h3>Intéressé par cette pièce ?</h3>
            <app-contact-form [subject]="'À propos de ' + f.title"></app-contact-form>
          </div>
        </section>
      </app-furniture-detail-view>

      @if (viewerQueue().length > 0) {
        <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
      }
    }
  `,
  styles: [`
    .status { padding: 120px 32px; text-align: center; color: var(--color-ink-soft); }
    .btn-link { color: var(--color-ink); text-decoration: underline; }
    .section.cta { padding: 80px 0; background: var(--color-bg-alt); }
    .section.cta h3 { font-family: var(--serif); font-weight: 400; margin: 0 0 24px; }
  `]
})
export class FurnitureDetailComponent implements OnInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly route = inject(ActivatedRoute);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly item = signal<Furniture | null>(null);
  protected readonly story = signal<Story | null>(null);
  protected readonly viewerQueue = signal<StoryItem[]>([]);
  protected readonly content = signal<SiteContent>({});
  protected readonly loading = signal(true);

  protected readonly displaySlides = computed(() => {
    const s = this.story();
    const f = this.item();
    if (!s || !f) return [];
    return enrichSlides(s, { ownerKind: 'furniture', ownerLabel: f.category, ownerSlug: f.slug, coverCrop: f.coverCrop ?? null });
  });

  ngOnInit() {
    this.loadingSvc.start('page');
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) { this.loading.set(false); this.loadingSvc.done('page'); return; }
    this.portfolio.getFurnitureBySlug(slug).subscribe({
      next: f => {
        this.item.set(f);
        this.portfolio.getStoryFor('furniture', f.id).subscribe(s => this.story.set(s));
        this.loading.set(false);
        this.loadingSvc.done('page');
      },
      error: () => { this.loading.set(false); this.loadingSvc.done('page'); }
    });
    this.portfolio.getContent().subscribe(c => this.content.set(c));
  }

  onViewerOpen(queue: StoryItem[]): void { this.viewerQueue.set(queue); }
  closeViewer(): void { this.viewerQueue.set([]); }
}
```

(Vérifier les noms exacts des méthodes du PortfolioService : `getFurnitureBySlug`, `getStoryFor`. Si différents, adapter — utiliser ce que le code existant utilise.)

```powershell
grep -n "getFurnitureBySlug\|getStoryFor\|loadingSvc\|enrichSlides" frontend/src/app/pages/furniture-detail/furniture-detail.component.ts
```

- [ ] **Step 4.3 : Adapter les tests existants**

Lire les tests :

```powershell
grep -n "describe\|it(" frontend/src/app/pages/furniture-detail/furniture-detail.component.spec.ts
```

Pour chaque test qui interroge des sélecteurs déplacés (`.hero-bg img`, `.gallery figure`, `.description .body`), changer le sélecteur en `app-furniture-detail-view` (ou interroger le view via fixture.debugElement).

Le test "coverCropStyle()" et "galleryItemStyle()" sont à SUPPRIMER (les méthodes n'existent plus).

Ajouter un nouveau test :

```ts
it('passe l\'item charge au view', () => {
  setup('onde', of(mockFurniture));
  const fixture = TestBed.createComponent(FurnitureDetailComponent);
  fixture.detectChanges();
  const view = fixture.nativeElement.querySelector('app-furniture-detail-view');
  expect(view).toBeTruthy();
});
```

- [ ] **Step 4.4 : Run tests furniture-detail**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-detail/**' 2>&1 | tail -5
```

Attendu : tous PASS (count dépend de quels tests ont été conservés).

- [ ] **Step 4.5 : Run Playwright visual sur furniture-detail (CRITIQUE — pas de --update)**

```powershell
cd frontend && npm run test:visual:docker -- --grep="furniture-detail" 2>&1 | tail -10
```

Attendu : **PASS sans diff** (rendu identique au public d'avant refactor). Si FAIL : examiner le diff, fixer le view jusqu'à ce que pixel-identique. **Ne pas régénérer la baseline.**

- [ ] **Step 4.6 : Commit**

```powershell
git add frontend/src/app/pages/furniture-detail/
git commit -m "refactor(wysiwyg): furniture-detail delegue le rendu a <app-furniture-detail-view>"
```

---

## Task 5: Créer `<app-furniture-preview>` (wrapper admin avec previewItem computed)

**Files:**
- Create: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts`
- Create: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.spec.ts`

- [ ] **Step 5.1 : Écrire les tests**

```ts
// furniture-preview.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { FurniturePreviewComponent } from './furniture-preview.component';
import { GalleryItem } from '../../../../models/gallery-item.model';

describe('FurniturePreviewComponent', () => {
  let fixture: ComponentFixture<FurniturePreviewComponent>;

  function setup(formValues: Record<string, unknown> = {}, gallery: GalleryItem[] = []) {
    const fb = new FormBuilder();
    const form: FormGroup = fb.group({
      title: [''], category: [''], year: [2024], material: [''], description: [''],
      dimensions: [[]], coverImage: [''], coverCrop: [null],
      featured: [false], showStoryLink: [false], showStoryButton: [false], slug: [''], tags: [[]], price: [null],
    });
    form.patchValue(formValues);
    const gallerySig = signal<GalleryItem[]>(gallery);
    TestBed.configureTestingModule({ imports: [FurniturePreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(FurniturePreviewComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('gallery', gallerySig.asReadonly());
    fixture.detectChanges();
    return { form, gallerySig };
  }

  it('rend un <app-furniture-detail-view> en mode editable', () => {
    setup({ title: 'Test' });
    expect(fixture.nativeElement.querySelector('app-furniture-detail-view')).toBeTruthy();
  });

  it('previewItem agrege form values + signal gallery', () => {
    const { form } = setup({ title: 'Tabouret', category: 'Sieges', year: 2024 });
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('Tabouret');
    expect(item.category).toBe('Sieges');
    expect(item.year).toBe(2024);
  });

  it('previewItem se met a jour quand form.patchValue est appele', () => {
    const { form } = setup({ title: 'Old' });
    form.patchValue({ title: 'New' });
    fixture.detectChanges();
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('New');
  });

  it('previewItem.gallery vient du signal injecte', () => {
    setup({}, [{ url: 'a.jpg', crop: null }, { url: 'b.jpg', crop: null }]);
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.gallery.length).toBe(2);
    expect(item.gallery[0].url).toBe('a.jpg');
  });

  it('reemet coverEdit du view', () => {
    setup({ coverImage: 'x.jpg' });
    let emitted: string | null = null;
    fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
    (fixture.componentInstance as any).onCoverEdit('crop');
    expect(emitted).toBe('crop');
  });

  it('reemet textFieldClick du view', () => {
    setup();
    let emitted: string | null = null;
    fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
    (fixture.componentInstance as any).onTextFieldClick('title');
    expect(emitted).toBe('title');
  });
});
```

- [ ] **Step 5.2 : Run pour vérifier l'échec**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-preview.component.spec.ts' 2>&1 | tail -5
```

Attendu : FAIL (composant inexistant).

- [ ] **Step 5.3 : Créer le composant**

```ts
// furniture-preview.component.ts
import { Component, EventEmitter, Input, Output, Signal, computed, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Furniture } from '../../../../models/furniture.model';
import { GalleryItem } from '../../../../models/gallery-item.model';
import { Story } from '../../../../models/story.model';
import { SiteContent } from '../../../../models/site-content.model';
import { DisplaySlide } from '../../../../components/story-inline/story-inline.component';
import { FurnitureDetailViewComponent } from '../../../../components/furniture-detail-view/furniture-detail-view.component';

@Component({
  selector: 'app-furniture-preview',
  standalone: true,
  imports: [FurnitureDetailViewComponent],
  template: `
    <app-furniture-detail-view
      [item]="previewItem()"
      [story]="story"
      [displaySlides]="displaySlides"
      [content]="content"
      [editable]="true"
      (coverEdit)="onCoverEdit($event)"
      (galleryItemEdit)="onGalleryItemEdit($event)"
      (galleryReorder)="onGalleryReorder($event)"
      (textFieldClick)="onTextFieldClick($event)" />
  `,
  styles: []
})
export class FurniturePreviewComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) gallery!: Signal<GalleryItem[]>;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};

  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() textFieldClick = new EventEmitter<string>();

  protected readonly previewItem = computed<Furniture | null>(() => {
    if (!this.form) return null;
    const v = this.form.getRawValue();
    return {
      id: v.id ?? 'preview',
      slug: v.slug ?? '',
      title: v.title ?? '',
      category: v.category ?? '',
      year: v.year ?? new Date().getFullYear(),
      material: v.material ?? '',
      dimensions: v.dimensions ?? [],
      description: v.description ?? '',
      coverImage: v.coverImage ?? '',
      coverCrop: v.coverCrop ?? null,
      gallery: this.gallery(),
      tags: v.tags ?? [],
      price: v.price ?? null,
      featured: !!v.featured,
      showStoryLink: !!v.showStoryLink,
      showStoryButton: !!v.showStoryButton,
    } as Furniture;
  });

  // Branche la réactivité valueChanges → signal pour que computed réagisse
  private readonly formSignal = computed(() => {
    return this.form ? toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() })() : null;
  });

  protected onCoverEdit(action: 'crop' | 'replace'): void { this.coverEdit.emit(action); }
  protected onGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void { this.galleryItemEdit.emit(e); }
  protected onGalleryReorder(order: number[]): void { this.galleryReorder.emit(order); }
  protected onTextFieldClick(name: string): void { this.textFieldClick.emit(name); }
}
```

**Note technique** : `toSignal` ne peut pas être utilisé dans un `computed()`. Solution : convertir dans le constructeur via `runInInjectionContext` ou utiliser un pattern différent. Implémentation plus simple :

```ts
import { effect, signal as ngSignal } from '@angular/core';

private readonly _formTick = ngSignal(0);

constructor() {
  // Branche valueChanges au tick signal pour invalider previewItem
  effect((onCleanup) => {
    if (!this.form) return;
    const sub = this.form.valueChanges.subscribe(() => this._formTick.update(n => n + 1));
    onCleanup(() => sub.unsubscribe());
  });
}

protected readonly previewItem = computed<Furniture | null>(() => {
  this._formTick();  // dependance signal
  if (!this.form) return null;
  const v = this.form.getRawValue();
  return { ... };  // comme avant
});
```

(Ajuster selon l'API Angular 21. Si `effect` n'a pas accès au form au moment de l'instanciation, utiliser un `OnInit` qui démarre l'abonnement.)

- [ ] **Step 5.4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-preview.component.spec.ts' 2>&1 | tail -5
```

Attendu : 6 tests PASS. Si échec sur "previewItem se met a jour", c'est le wiring valueChanges — ajuster.

- [ ] **Step 5.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/preview/
git commit -m "feat(wysiwyg): <app-furniture-preview> wrap le view en mode editable avec form signal"
```

---

## Task 6: Brancher le preview dans MobilierComponent (split layout + handlers)

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`

- [ ] **Step 6.1 : Ajouter import + IDs `field-*` sur les inputs/textareas du form**

Lire le template existant :

```powershell
grep -n "formControlName\|<input\|<textarea\|<app-image-field" frontend/src/app/pages/admin/mobilier/mobilier.component.ts | head -30
```

Pour chaque input/textarea principal, ajouter un `id="field-<nom>"`. Cibles minimales :
- `formControlName="title"` → `id="field-title"`
- `formControlName="category"` → `id="field-category"`
- `formControlName="year"` → `id="field-year"`
- `formControlName="material"` → `id="field-material"`
- `formControlName="description"` → `id="field-description"`
- `formControlName="dimensions"` → `id="field-dimensions"` (si simple input)

Note : `<app-image-field formControlName="coverImage">` n'a pas besoin d'id, l'édition cover passe par l'overlay hover.

- [ ] **Step 6.2 : Refactor template en split layout 50/50**

Wrapper le contenu de la page admin éditable dans une grille split :

```html
<div class="admin-split">
  <section class="admin-form">
    <!-- form existant inchangé -->
    <form class="form" [formGroup]="furnitureForm" (ngSubmit)="saveFurniture()">
      ...
    </form>
  </section>
  @if (editingFurnitureSlug() !== null || editingFurnitureId() !== null) {
    <aside class="admin-preview" aria-label="Aperçu de la fiche">
      <app-furniture-preview
        [form]="furnitureForm"
        [gallery]="furnitureGallery.asReadonly()"
        [story]="currentStories()[0] ?? null"
        [displaySlides]="previewDisplaySlides()"
        (coverEdit)="onPreviewCoverEdit($event)"
        (galleryItemEdit)="onPreviewGalleryItemEdit($event)"
        (galleryReorder)="onPreviewGalleryReorder($event)"
        (textFieldClick)="focusField($event)" />
    </aside>
  }
</div>
```

Note : la liste des fiches à gauche dans le sidebar existant garde sa place. Le split s'applique à la zone d'édition active (à droite du sidebar). Adapter la structure réelle.

Ajouter styles :

```css
.admin-split { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; max-width: 100%; }
.admin-form { overflow-y: auto; max-height: calc(100vh - 80px); padding-right: 8px; }
.admin-preview { position: sticky; top: 16px; max-height: calc(100vh - 80px); overflow-y: auto; background: var(--color-bg-alt); border: 1px solid var(--color-line); padding: 24px; }
@media (max-width: 1280px) { .admin-split { grid-template-columns: 1fr; } .admin-preview { position: static; max-height: 60vh; } }
@media (max-width: 768px) { .admin-preview { display: none; } }
```

- [ ] **Step 6.3 : Imports + handlers + focusField**

```ts
import { FurniturePreviewComponent } from './preview/furniture-preview.component';
import { computed } from '@angular/core';
import { enrichSlides } from '../../../utils/display-slides';

// dans imports: [...] du @Component
FurniturePreviewComponent,

// dans la classe :

protected readonly previewDisplaySlides = computed(() => {
  const story = this.currentStories()[0];
  if (!story) return [];
  const v = this.furnitureForm.getRawValue();
  return enrichSlides(story, { ownerKind: 'furniture', ownerLabel: v.category ?? '', ownerSlug: v.slug ?? '', coverCrop: v.coverCrop ?? null });
});

focusField(name: string): void {
  const el = document.getElementById(`field-${name}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  (el as HTMLInputElement | HTMLTextAreaElement).focus();
}

onPreviewCoverEdit(action: 'crop' | 'replace'): void {
  if (action === 'crop') {
    // Réutilise le bouton "Cadrer" de l'app-image-field en ouvrant directement la modale crop
    // Solution simple : passer par un signal interne ouvert par le composant <app-image-field>
    // ou émettre vers le coverImageField via @ViewChild. Implémentation : @ViewChild de l'app-image-field cover.
    this.coverImageField?.openCrop();
  } else {
    this.coverImageField?.openPicker();
  }
}

@ViewChild('coverField') coverImageField?: ImageFieldComponent;

onPreviewGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void {
  if (e.action === 'remove') {
    this.furnitureGallery.update(arr => arr.filter((_, i) => i !== e.index));
    return;
  }
  if (e.action === 'crop') {
    this.galleryEditor?.openCropFor(e.index);
  } else {
    // Remplacer item : ouvrir picker + sur sélection, remplacer
    this.galleryEditor?.openReplaceFor(e.index);
  }
}

@ViewChild('galleryEditor') galleryEditor?: GalleryEditorComponent;

onPreviewGalleryReorder(order: number[]): void {
  const items = this.furnitureGallery();
  this.furnitureGallery.set(order.map(i => items[i]));
}
```

Donner les template references aux composants :

```html
<app-image-field #coverField formControlName="coverImage" [cropEnabled]="true" ...></app-image-field>
<app-gallery-editor #galleryEditor [images]="furnitureGallery()" ...></app-gallery-editor>
```

Notes d'implémentation :
- Si `ImageFieldComponent.openCrop()` ou `GalleryEditorComponent.openCropFor()` ne sont pas publics, les rendre publics (changer `protected` → `public`) ou exposer une méthode publique dédiée.
- Si `openReplaceFor()` n'existe pas dans `GalleryEditorComponent`, l'ajouter (ouvre le `<app-photo-picker>` et au callback, remplace l'item au lieu d'ajouter).

- [ ] **Step 6.4 : Tests pour focusField + handlers**

Ajouter à `mobilier.component.spec.ts` :

```ts
it('focusField scroll + focus l\'input field-title', () => {
  configure();
  const fixture = TestBed.createComponent(MobilierComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/furniture').flush([]);
  httpMock.expectOne('/api/tags').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as unknown as MobilierInternals;

  // Créer un input fake avec l'id attendu
  const input = document.createElement('input');
  input.id = 'field-title';
  document.body.appendChild(input);
  spyOn(input, 'scrollIntoView');
  spyOn(input, 'focus');

  cmp.focusField('title');

  expect(input.scrollIntoView).toHaveBeenCalled();
  expect(input.focus).toHaveBeenCalled();
  document.body.removeChild(input);
});

it('focusField no-op quand id introuvable', () => {
  configure();
  const fixture = TestBed.createComponent(MobilierComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/furniture').flush([]);
  httpMock.expectOne('/api/tags').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as unknown as MobilierInternals;
  expect(() => cmp.focusField('inexistant')).not.toThrow();
});

it('onPreviewGalleryItemEdit remove enleve l\'item du signal galerie', () => {
  configure();
  const fixture = TestBed.createComponent(MobilierComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/furniture').flush([]);
  httpMock.expectOne('/api/tags').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as unknown as MobilierInternals;
  cmp.furnitureGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
  cmp.onPreviewGalleryItemEdit({ index: 0, action: 'remove' });
  expect(cmp.furnitureGallery()).toEqual([{ url: 'b', crop: null }]);
});

it('onPreviewGalleryReorder remet le signal galerie dans le bon ordre', () => {
  configure();
  const fixture = TestBed.createComponent(MobilierComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/furniture').flush([]);
  httpMock.expectOne('/api/tags').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as unknown as MobilierInternals;
  cmp.furnitureGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }, { url: 'c', crop: null }]);
  cmp.onPreviewGalleryReorder([2, 0, 1]);
  expect(cmp.furnitureGallery().map(i => i.url)).toEqual(['c', 'a', 'b']);
});
```

Étendre le type `MobilierInternals` :

```ts
focusField: (name: string) => void;
onPreviewCoverEdit: (action: 'crop' | 'replace') => void;
onPreviewGalleryItemEdit: (e: { index: number; action: 'crop' | 'replace' | 'remove' }) => void;
onPreviewGalleryReorder: (order: number[]) => void;
furnitureGallery: { (): GalleryItem[]; set: (v: GalleryItem[]) => void; update: (fn: (v: GalleryItem[]) => GalleryItem[]) => void };
```

- [ ] **Step 6.5 : Run tests + suite complète**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -5
```

Attendu : tous PASS, count ≥ 678.

- [ ] **Step 6.6 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/
git commit -m "feat(wysiwyg): split layout admin mobilier + preview branche + focusField + handlers galerie"
```

---

## Task 7: Validation visuelle utilisateur + Playwright

**Files:** aucun, validation manuelle puis Playwright.

- [ ] **Step 7.1 : Lancer le stack et valider manuellement**

```powershell
docker compose up --build -d
```

Une fois `http://localhost:4200` répond, ouvrir :
- `http://localhost:4200/admin` → login admin.
- `http://localhost:4200/admin/mobilier` → cliquer sur une fiche existante.
- Vérifier le split layout (form gauche, preview droite).
- Modifier le titre dans le form → le preview se met à jour live.
- Hover sur le hero du preview → boutons Cadrer / Remplacer apparaissent.
- Clic sur "Cadrer" → la modale crop s'ouvre avec les bonnes valeurs.
- Idem sur un item de galerie : hover → 3 boutons (Cadrer / Remplacer / Retirer).
- Cliquer sur le titre du preview → le champ Titre du form prend le focus.
- Drag-reorder dans la grille galerie du preview.
- Sauvegarder, recharger, vérifier la persistance.

- [ ] **Step 7.2 : Vérifier `furniture-detail` public n'a pas régressé visuellement**

```powershell
cd frontend && npm run test:visual:docker -- --grep="furniture-detail" 2>&1 | tail -10
```

Attendu : PASS. Si fail visuel sur public : le refactor view a introduit une régression — fix avant de continuer.

- [ ] **Step 7.3 : Aucun update de baselines admin**

Le projet ne teste pas `/admin/mobilier` en Playwright. Pas de baseline à régénérer.

- [ ] **Step 7.4 : Demander confirmation utilisateur**

À l'utilisateur : "Validation visuelle OK ? Le hero, la galerie, le drag, les overlays et le click-to-focus fonctionnent comme attendu ?"

Si OK, continuer à Task 8. Si non, retour aux tasks concernées pour fixes.

---

## Task 8: ADR-0018 + doc impactée

**Files:**
- Create: `docs/adr/0018-page-vs-view-pattern.md`
- Modify: `CLAUDE.md`

- [ ] **Step 8.1 : Créer l'ADR-0018**

```markdown
# 18. Pattern page-vs-view pour les fiches détail

Date : 2026-06-08
Statut : Accepté

## Contexte

Les fiches détail (mobilier, exposition) sont rendues côté public via des composants `*-detail.component.ts` qui mélangent rendu, chargement API, routing et SEO. Le preview WYSIWYG admin (sous-projet 2/4) demande le même rendu que le public, à partir de données différentes (FormGroup en cours d'édition au lieu de DB).

## Décision

Séparer chaque fiche en deux composants :
- **Page** (`furniture-detail.component.ts`) : route Angular, chargement API, SEO, story viewer queue, contact form. Délègue le rendu visuel.
- **View** (`furniture-detail-view.component.ts`) : composant standalone pur, prend une entité en input, rend hero / sections / galerie. Accepte un mode `editable` pour les overlays admin et un `ng-content [ctaSlot]` pour le CTA contextuel.

## Conséquences

- (+) Le rendu public et le preview admin partagent le même composant — zéro drift.
- (+) Le view est testable indépendamment des routes et de l'API.
- (+) Tests Playwright restent intacts (rendu pixel-identique).
- (-) Surface API plus grande (Inputs/Outputs du view).
- (-) Refactor à appliquer aussi aux fiches exposition (sous-projet 3) et home (sous-projet 4).

## Référence

- Spec sous-projet 2/4 : [docs/superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md](../superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md)
```

- [ ] **Step 8.2 : Mettre à jour CLAUDE.md**

Ajouter une ligne à la section "Conventions" :

```markdown
- **Pattern page/view pour fiches détail** : les composants `*-detail.component.ts` (page) délèguent le rendu visuel à `<app-*-detail-view>` (view pur). Voir ADR-0018. Pattern à respecter pour furniture-detail (fait), exhibition-detail (sous-projet 3 à venir), home (sous-projet 4 à venir).
```

- [ ] **Step 8.3 : Commit**

```powershell
git add docs/adr/0018-page-vs-view-pattern.md CLAUDE.md
git commit -m "docs(adr): ADR-0018 pattern page-vs-view pour fiches detail"
```

---

## Task 9: Finishing the branch (audits + doc spec/fonc + merge)

**Files:** aucun, exécution du skill.

- [ ] **Step 9.1 : Vérifier tests verts**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | tail -3
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -3
cd frontend && npm run test:visual:docker 2>&1 | tail -3
```

- [ ] **Step 9.2 : Invoquer le skill finishing-a-development-branch**

Quand l'agent reprend la main, invoquer `superpowers:finishing-a-development-branch` qui proposera audits (sécurité + RGAA), maj doc (spec technique + fonctionnelle), et 4 options de finalisation.

Pour cette branche, proposer en plus le passage par les 2 audits ET la maj des specs :
- Audits via les agents `security-auditor` et un audit a11y dédié (RGAA).
- Maj de `docs/SPECIFICATION_TECHNIQUE.md` (composants nouveaux, refactor furniture-detail) et `docs/SPECIFICATION_FONCTIONNELLE.md` (preview WYSIWYG admin).

Choix de merge par défaut suggéré : option 1 (merge local) avec push vers `origin/main` après tests verts sur main fusionné.

---

## Self-Review

**Spec coverage :**

- Composant `<app-furniture-detail-view>` extrait, utilisé par public + admin → Tasks 1, 2, 3 (view) + Task 4 (page publique) + Task 5/6 (admin). ✓
- Split layout admin avec preview live → Task 6. ✓
- Overlays hover cover + galerie + click-to-focus + drag-reorder → Task 3 (view) + Task 6 (handlers admin). ✓
- Refactor public sans régression visuelle → Task 4 step 4.5 (Playwright sans `--update`). ✓
- ADR-0018 → Task 8. ✓
- Tests unitaires + Playwright → Tasks 1-3, 4-6 (unit), Task 7 (Playwright). ✓
- Validation visuelle utilisateur AVANT régen baseline → Task 7 step 7.1 (rappel : pas de régen côté admin de toute façon). ✓
- Doc spec/fonc maj + audits → Task 9 (delegate au skill). ✓

**Placeholder scan :**

- "(Vérifier les noms exacts des méthodes du PortfolioService)" en Task 4.2 : OK, la commande `grep` à côté donne l'info. ✓
- "Adapter selon l'API Angular 21" en Task 5.3 (toSignal dans computed) : le snippet alternatif via `effect` est complet et utilisable. ✓
- "Si la directive ne prend pas de..." en Task 3.2 : alternative complète fournie. ✓
- "Si `ImageFieldComponent.openCrop()` ne sont pas publics, les rendre publics" : action explicite. ✓

**Type consistency :**

- `Furniture | null` partout. ✓
- `GalleryItem[]` pour signal galerie partout. ✓
- `coverEdit` Output émet `'crop' | 'replace'` partout. ✓
- `galleryItemEdit` émet `{ index: number; action: 'crop' | 'replace' | 'remove' }` cohérent du view jusqu'au mobilier handler. ✓
- `textFieldClick` émet `string` (nom du champ) partout. ✓
- `focusField(name: string)` même signature partout. ✓
- IDs `field-<name>` cohérents : `field-title`, `field-description`, `field-material`, `field-eyebrow` (eyebrow click émet via `textFieldClick.emit('eyebrow')` mais il n'y a pas d'input `field-eyebrow` car l'eyebrow est composé de `category + year`. Le click-to-focus sur eyebrow doit pointer vers `field-category` par défaut. À clarifier dans l'impl). **Correction à faire au moment du code** : changer l'émission depuis l'eyebrow vers `textFieldClick.emit('category')` plutôt que `'eyebrow'`.

→ Correction inline appliquée dans cet auto-review : Task 3.2, remplacer dans le template `(click)="textFieldClick.emit('eyebrow')"` par `(click)="textFieldClick.emit('category')"`. Mémo pour l'impl.
