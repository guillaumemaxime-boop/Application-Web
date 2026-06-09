# Preview WYSIWYG Fiche Exposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'admin un preview WYSIWYG live de la Fiche Exposition (toggle Modifier/Aperçu), avec édition d'images depuis le preview (hover Cadrer/Remplacer/Retirer/Ajouter), click-to-focus + double-clic édition inline pour les textes, swap `<input type="date">` pour les dates, drag-reorder + resize WYSIWYG de la galerie. Pattern page/view (ADR-0018) appliqué à exhibition-detail.

**Architecture:** Extraire `<app-exhibition-detail-view>` (composant pur, standalone, Inputs/Outputs) depuis l'actuel `ExhibitionDetailComponent`. La page publique consomme le view en branchant ses données API. L'admin instancie `<app-exhibition-preview>` qui agrège `FormGroup + signal galerie` en un `Exhibition` virtuel via signal/computed, et le passe au view en mode `editable=true`.

**Tech Stack:** Angular 21 standalone + signals + `@if`/`@for`, Karma + Jasmine, Playwright (régression visuelle), `ReorderableDirective` existante, modales `<app-image-crop-picker>` + `<app-photo-picker>` du sous-projet 1, `<app-cropped-image-canvas>` (sous-projet 1).

**Spec:** [docs/superpowers/specs/2026-06-09-exhibition-detail-wysiwyg-preview-design.md](../specs/2026-06-09-exhibition-detail-wysiwyg-preview-design.md)

**Branche:** `feat/wysiwyg-expo-preview` (créée depuis main après merge sous-projet 2).

---

## Cartographie des fichiers

**Nouveaux :**
- `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`
- `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.spec.ts`
- `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts`
- `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.spec.ts`

**Modifiés :**
- `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` (refactor : déléguer au view)
- `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.spec.ts`
- `frontend/src/app/pages/admin/expositions/expositions.component.ts` (toggle Modifier/Aperçu + IDs field-* + handlers)
- `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

**Playwright :**
- `frontend/e2e/tests/visual/exhibition-detail.spec.ts` (doit rester vert, possiblement régen baseline après validation visuelle si galerie passe au canvas)

**Pas de migration backend** : modèle Exhibition déjà étendu colSpan/rowSpan (sous-projet 2). Pas de nouveau champ.

---

## Task 1: Squelette `<app-exhibition-detail-view>` (hero only)

**Files:**
- Create: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`
- Create: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.spec.ts`

- [ ] **Step 1.1 : Écrire les tests qui échouent**

```ts
// exhibition-detail-view.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExhibitionDetailViewComponent } from './exhibition-detail-view.component';
import { Exhibition } from '../../models/exhibition.model';

describe('ExhibitionDetailViewComponent', () => {
  let fixture: ComponentFixture<ExhibitionDetailViewComponent>;

  const mockExhibition: Exhibition = {
    id: 'e-001', slug: 'lumen-2025', title: 'Lumen 2025',
    venue: 'Galerie Lumière', city: 'Paris', country: 'France',
    startDate: '2025-09-15', endDate: '2025-11-30',
    coverImage: 'https://example.com/cover.jpg', coverCrop: null,
    gallery: [], curator: 'Marie Dubois',
    shortDescription: 'Une exposition lumineuse.', description: 'Description longue.',
    tags: [], featured: false, showStoryLink: false, showStoryButton: false, slides: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExhibitionDetailViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ExhibitionDetailViewComponent);
  });

  it('affiche le titre de l\'exposition', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Lumen 2025');
  });

  it('affiche l\'eyebrow venue · city, country', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    const eyebrow = fixture.nativeElement.querySelector('.hero-content .eyebrow');
    expect(eyebrow.textContent).toContain('Galerie Lumière');
    expect(eyebrow.textContent).toContain('Paris');
    expect(eyebrow.textContent).toContain('France');
  });

  it('rend le canvas cover dans .hero-bg', () => {
    fixture.componentRef.setInput('item', mockExhibition);
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
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-detail-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 4 tests FAIL (composant inexistant).

- [ ] **Step 1.3 : Créer le composant minimal**

```ts
// exhibition-detail-view.component.ts
import { Component, Input } from '@angular/core';
import { Exhibition } from '../../models/exhibition.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

@Component({
  selector: 'app-exhibition-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent],
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
            <span class="eyebrow">{{ item.venue }} · {{ item.city }}, {{ item.country }}</span>
            <h1>{{ item.title }}</h1>
            <p class="dates">{{ formatRange(item.startDate, item.endDate) }}</p>
          </div>
        </header>
      </article>
    }
  `,
  styles: [`
    .hero { position: relative; min-height: 65vh; display: flex; align-items: flex-end; padding: 80px 0; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero-bg app-cropped-image-canvas { width: 100%; height: 100%; display: block; }
    .hero-bg::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 60%, transparent 100%); }
    .hero-content { position: relative; z-index: 1; color: #ffffff; max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero-content .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.85; }
    .hero-content h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin: 16px 0; }
    .hero-content .dates { font-size: 0.95rem; opacity: 0.85; }
  `]
})
export class ExhibitionDetailViewComponent {
  @Input({ required: true }) item: Exhibition | null = null;

  /** Format date ISO -> "DD mois YYYY". Migrée depuis exhibition-detail.component.ts. */
  formatRange(start: string, end: string): string {
    const fmt = (d: string) => {
      if (!d) return '';
      const date = new Date(d);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    return `${fmt(start)} — ${fmt(end)}`;
  }
}
```

- [ ] **Step 1.4 : Vérifier les tests passent**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-detail-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 4 tests PASS.

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/components/exhibition-detail-view/
git commit -m "feat(wysiwyg-expo): squelette <app-exhibition-detail-view> hero only + tests"
```

---

## Task 2: Étendre view (section intro + tags + galerie + slot story button)

**Files:**
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.spec.ts`

- [ ] **Step 2.1 : Lire le template public actuel**

```powershell
grep -n "section intro\|section gallery\|viewer-link\|hasSlides\|displaySlides" frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts | head -10
```

- [ ] **Step 2.2 : Étendre Inputs + template**

Ajouter à la classe + imports :

```ts
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Output, EventEmitter } from '@angular/core';
import { Story } from '../../models/story.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { SiteContent } from '../../models/site-content.model';
import { StoryItem } from '../story-viewer/story-viewer.component';
import { roleStyle } from '../../utils/title-style';

// dans @Component imports: [...] ajouter NgStyle, RouterLink

@Input() story: Story | null = null;
@Input() displaySlides: DisplaySlide[] = [];
@Input() content: SiteContent = {};

@Output() viewerOpen = new EventEmitter<StoryItem[]>();

protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }

protected onViewerOpen(): void {
  if (!this.item) return;
  // Construit StoryItem[] depuis displaySlides
  const queue: StoryItem[] = this.displaySlides.map((s, i) => ({
    storyId: 'preview', slug: this.item!.slug,
    ownerKind: 'exhibition', ownerLabel: this.item!.venue,
    slides: this.displaySlides, startAt: i,
  } as unknown as StoryItem)).slice(0, 1);
  if (queue.length > 0) this.viewerOpen.emit(queue);
}
```

(Adapter selon la vraie signature de StoryItem dans `story-viewer.component.ts` — confirmer via `grep`.)

Template étendu :

```html
<article class="fade-in">
  <header class="hero">
    <div class="hero-bg">
      <app-cropped-image-canvas
        [imageUrl]="item.coverImage" [crop]="item.coverCrop ?? null"
        [alt]="item.title" mode="cover" />
    </div>
    <div class="container hero-content">
      <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ item.venue }} · {{ item.city }}, {{ item.country }}</span>
      <h1 [ngStyle]="titleStyle()">{{ item.title }}</h1>
      <p class="dates">{{ formatRange(item.startDate, item.endDate) }}</p>
    </div>
  </header>

  <section class="section intro">
    <div class="container narrow">
      <span class="eyebrow" [ngStyle]="eyebrowStyle()">Commissariat — {{ item.curator }}</span>
      <p class="lead">{{ item.shortDescription }}</p>
      <p class="body">{{ item.description }}</p>

      @if (item.tags && item.tags.length > 0) {
        <div class="tags-list">
          @for (t of item.tags; track t) {
            <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
          }
        </div>
      }
    </div>
  </section>

  @if (item.gallery.length > 0) {
    <section class="section gallery">
      <div class="container">
        <div class="g-grid">
          @for (img of item.gallery; track img.url; let i = $index) {
            <figure [style.grid-column]="'span ' + (img.colSpan ?? 1)"
                    [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
              <div class="gallery-img-wrap">
                <app-cropped-image-canvas
                  [imageUrl]="img.url" [crop]="img.crop ?? null"
                  [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
              </div>
            </figure>
          }
        </div>
      </div>
    </section>
  }

  @if (displaySlides.length > 0 && item.showStoryButton) {
    <div class="container narrow viewer-link-wrap">
      <button type="button" class="viewer-link" aria-label="Voir la story en plein écran" (click)="onViewerOpen()">
        Voir la story →
      </button>
    </div>
  }
</article>
```

Styles à ajouter :

```css
.section { padding: 80px 0; }
.section .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
.container.narrow { max-width: 720px; }
.intro .lead { font-size: 1.2rem; line-height: 1.6; color: var(--color-ink); margin-bottom: 24px; }
.intro .body { font-size: 1rem; line-height: 1.7; color: var(--color-ink-soft); white-space: pre-line; }
.tags-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
.tag-chip { padding: 4px 10px; font-size: 0.78rem; border: 1px solid var(--color-line); color: var(--color-ink-soft); text-decoration: none; }
.tag-chip:hover { color: var(--color-ink); border-color: var(--color-ink); }

.gallery .g-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; grid-auto-rows: 220px; }
.gallery .g-grid figure { margin: 0; overflow: hidden; height: 100%; }
.gallery-img-wrap { position: relative; overflow: hidden; width: 100%; height: 100%; }
.gallery-img-wrap app-cropped-image-canvas { display: block; width: 100%; height: 100%; }

@media (max-width: 960px) { .gallery .g-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .gallery .g-grid { grid-template-columns: 1fr; } }

.viewer-link-wrap { padding: 32px 0 80px; text-align: center; }
.viewer-link { background: transparent; border: 1px solid var(--color-ink); padding: 12px 24px; color: var(--color-ink); cursor: pointer; font-family: inherit; font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; }
.viewer-link:hover { background: var(--color-ink); color: var(--color-bg); }
```

- [ ] **Step 2.3 : Étendre tests**

Ajouter à `exhibition-detail-view.component.spec.ts` :

```ts
it('affiche la lead et la description', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.intro .lead').textContent).toContain('Une exposition');
  expect(fixture.nativeElement.querySelector('.intro .body').textContent).toContain('Description longue');
});

it('affiche l\'eyebrow Commissariat — curator', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.detectChanges();
  const eyebrows = fixture.nativeElement.querySelectorAll('.eyebrow');
  expect(Array.from(eyebrows).some((el: any) => el.textContent.includes('Commissariat — Marie Dubois'))).toBeTrue();
});

it('ne rend pas la section galerie quand gallery est vide', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.gallery')).toBeNull();
});

it('rend une figure par item de galerie', () => {
  const e = { ...mockExhibition, gallery: [
    { url: 'https://e.com/a.jpg', crop: null },
    { url: 'https://e.com/b.jpg', crop: null },
  ]};
  fixture.componentRef.setInput('item', e);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.gallery figure').length).toBe(2);
});

it('rend le bouton viewer quand displaySlides + showStoryButton', () => {
  const e = { ...mockExhibition, showStoryButton: true };
  fixture.componentRef.setInput('item', e);
  fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as DisplaySlide]);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.viewer-link')).toBeTruthy();
});

it('ne rend pas le bouton viewer si showStoryButton=false', () => {
  const e = { ...mockExhibition, showStoryButton: false };
  fixture.componentRef.setInput('item', e);
  fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as DisplaySlide]);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.viewer-link')).toBeNull();
});

it('emet viewerOpen au clic sur le bouton', () => {
  const e = { ...mockExhibition, showStoryButton: true };
  fixture.componentRef.setInput('item', e);
  fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as DisplaySlide]);
  fixture.detectChanges();
  let emitted = false;
  fixture.componentInstance.viewerOpen.subscribe(() => emitted = true);
  (fixture.nativeElement.querySelector('.viewer-link') as HTMLButtonElement).click();
  expect(emitted).toBeTrue();
});
```

(Vérifier que `DisplaySlide` est importable depuis le bon chemin via `grep`.)

- [ ] **Step 2.4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-detail-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 11 tests PASS.

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/components/exhibition-detail-view/
git commit -m "feat(wysiwyg-expo): view ajoute section intro + galerie + bouton viewer story"
```

---

## Task 3: Mode editable (overlays + click-to-focus + dblclick text + dates swap input + drag/reorder/resize)

**Files:**
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.spec.ts`

- [ ] **Step 3.1 : Ajouter Inputs editable + Outputs + types**

```ts
import { ApplicationRef, ChangeDetectorRef, EventEmitter, inject, NgZone, OnDestroy, Output, signal } from '@angular/core';
import { ReorderableDirective } from '../../directives/reorderable.directive';

export type EditableExhibitionField =
  | 'title' | 'venue' | 'city' | 'country'
  | 'curator' | 'shortDescription' | 'description';

@Input() editable = false;

@Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
@Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
@Output() galleryReorder = new EventEmitter<number[]>();
@Output() galleryAdd = new EventEmitter<void>();
@Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();
@Output() textFieldClick = new EventEmitter<EditableExhibitionField | 'startDate' | 'endDate'>();
@Output() textFieldEdit = new EventEmitter<{ field: EditableExhibitionField; value: string }>();
@Output() dateFieldEdit = new EventEmitter<{ field: 'startDate' | 'endDate'; value: string }>();

protected editingField: EditableExhibitionField | null = null;
protected editingDateField: 'startDate' | 'endDate' | null = null;

protected readonly resizingIndex = signal<number | null>(null);
protected readonly resizingCols = signal(1);
protected readonly resizingRows = signal(1);

private readonly zone = inject(NgZone);

isEditingField(name: EditableExhibitionField): boolean | null {
  return this.editingField === name ? true : null;
}

isEditingDate(name: 'startDate' | 'endDate'): boolean {
  return this.editingDateField === name;
}
```

Ajouter `ReorderableDirective` à imports.

- [ ] **Step 3.2 : Template hero editable (3 spans pour eyebrow composite + h1 + dates spans)**

Remplacer le `<div class="hero-content">` :

```html
<div class="container hero-content">
  @if (editable) {
    <span class="eyebrow-composite" [ngStyle]="eyebrowStyle()">
      <span class="eyebrow-segment editable-text" tabindex="0"
            [attr.contenteditable]="isEditingField('venue')"
            (click)="textFieldClick.emit('venue')"
            (dblclick)="startInlineEdit($event, 'venue')"
            (blur)="commitInlineEdit($event, 'venue')"
            (keydown.enter)="onInlineEnter($event, 'venue')"
            (keydown.escape)="cancelInlineEdit($event)"
            (keydown.space)="onSpaceWhenNotEditing($event, 'venue')">{{ item.venue }}</span>
      <span class="eyebrow-sep" aria-hidden="true"> · </span>
      <span class="eyebrow-segment editable-text" tabindex="0"
            [attr.contenteditable]="isEditingField('city')"
            (click)="textFieldClick.emit('city')"
            (dblclick)="startInlineEdit($event, 'city')"
            (blur)="commitInlineEdit($event, 'city')"
            (keydown.enter)="onInlineEnter($event, 'city')"
            (keydown.escape)="cancelInlineEdit($event)"
            (keydown.space)="onSpaceWhenNotEditing($event, 'city')">{{ item.city }}</span>
      <span class="eyebrow-sep" aria-hidden="true">, </span>
      <span class="eyebrow-segment editable-text" tabindex="0"
            [attr.contenteditable]="isEditingField('country')"
            (click)="textFieldClick.emit('country')"
            (dblclick)="startInlineEdit($event, 'country')"
            (blur)="commitInlineEdit($event, 'country')"
            (keydown.enter)="onInlineEnter($event, 'country')"
            (keydown.escape)="cancelInlineEdit($event)"
            (keydown.space)="onSpaceWhenNotEditing($event, 'country')">{{ item.country }}</span>
    </span>
    <h1 class="editable-text" [ngStyle]="titleStyle()" tabindex="0"
        [attr.aria-label]="isEditingField('title') ? item.title + ' — en édition' : item.title + ' — double-cliquer pour éditer'"
        [attr.contenteditable]="isEditingField('title')"
        (click)="textFieldClick.emit('title')"
        (dblclick)="startInlineEdit($event, 'title')"
        (blur)="commitInlineEdit($event, 'title')"
        (keydown.enter)="onInlineEnter($event, 'title')"
        (keydown.escape)="cancelInlineEdit($event)"
        (keydown.space)="onSpaceWhenNotEditing($event, 'title')">{{ item.title }}</h1>
    <p class="dates">
      @if (isEditingDate('startDate')) {
        <input type="date" class="date-inline" [value]="item.startDate"
               (blur)="commitDateEdit($event, 'startDate')"
               (keydown.enter)="onDateEnter($event, 'startDate')"
               (keydown.escape)="cancelDateEdit()" />
      } @else {
        <span class="date-segment editable-text" tabindex="0"
              (click)="textFieldClick.emit('startDate')"
              (dblclick)="startDateEdit($event, 'startDate')"
              (keydown.enter)="textFieldClick.emit('startDate')"
              (keydown.space)="onSpaceWhenNotEditing($event, 'startDate')">{{ formatSingleDate(item.startDate) }}</span>
      }
      <span class="date-sep" aria-hidden="true"> — </span>
      @if (isEditingDate('endDate')) {
        <input type="date" class="date-inline" [value]="item.endDate"
               (blur)="commitDateEdit($event, 'endDate')"
               (keydown.enter)="onDateEnter($event, 'endDate')"
               (keydown.escape)="cancelDateEdit()" />
      } @else {
        <span class="date-segment editable-text" tabindex="0"
              (click)="textFieldClick.emit('endDate')"
              (dblclick)="startDateEdit($event, 'endDate')"
              (keydown.enter)="textFieldClick.emit('endDate')"
              (keydown.space)="onSpaceWhenNotEditing($event, 'endDate')">{{ formatSingleDate(item.endDate) }}</span>
      }
    </p>
  } @else {
    <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ item.venue }} · {{ item.city }}, {{ item.country }}</span>
    <h1 [ngStyle]="titleStyle()">{{ item.title }}</h1>
    <p class="dates">{{ formatRange(item.startDate, item.endDate) }}</p>
  }
</div>
```

Ajouter méthode `formatSingleDate` :

```ts
formatSingleDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
```

- [ ] **Step 3.3 : Template intro editable (curator + lead + body)**

Remplacer `<section class="section intro">` :

```html
<section class="section intro">
  <div class="container narrow">
    @if (editable) {
      <span class="eyebrow">Commissariat —
        <span class="editable-text" tabindex="0"
              [attr.contenteditable]="isEditingField('curator')"
              (click)="textFieldClick.emit('curator')"
              (dblclick)="startInlineEdit($event, 'curator')"
              (blur)="commitInlineEdit($event, 'curator')"
              (keydown.enter)="onInlineEnter($event, 'curator')"
              (keydown.escape)="cancelInlineEdit($event)"
              (keydown.space)="onSpaceWhenNotEditing($event, 'curator')">{{ item.curator }}</span>
      </span>
      <p class="lead editable-text" tabindex="0"
         [attr.contenteditable]="isEditingField('shortDescription')"
         (click)="textFieldClick.emit('shortDescription')"
         (dblclick)="startInlineEdit($event, 'shortDescription')"
         (blur)="commitInlineEdit($event, 'shortDescription')"
         (keydown.enter)="onInlineEnter($event, 'shortDescription')"
         (keydown.escape)="cancelInlineEdit($event)"
         (keydown.space)="onSpaceWhenNotEditing($event, 'shortDescription')">{{ item.shortDescription }}</p>
      <p class="body editable-text" tabindex="0"
         [attr.contenteditable]="isEditingField('description')"
         (click)="textFieldClick.emit('description')"
         (dblclick)="startInlineEdit($event, 'description')"
         (blur)="commitInlineEdit($event, 'description')"
         (keydown.enter)="onInlineEnter($event, 'description')"
         (keydown.escape)="cancelInlineEdit($event)"
         (keydown.space)="onSpaceWhenNotEditing($event, 'description')">{{ item.description }}</p>
    } @else {
      <span class="eyebrow" [ngStyle]="eyebrowStyle()">Commissariat — {{ item.curator }}</span>
      <p class="lead">{{ item.shortDescription }}</p>
      <p class="body">{{ item.description }}</p>
    }

    @if (item.tags && item.tags.length > 0) {
      <div class="tags-list">
        @for (t of item.tags; track t) {
          <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
        }
      </div>
    }
  </div>
</section>
```

- [ ] **Step 3.4 : Template galerie editable (overlays + drag + resize + add)**

Remplacer `<section class="section gallery">` :

```html
@if (item.gallery.length > 0 || editable) {
  <section class="section gallery">
    <div class="container">
      @if (editable) {
        <ul class="g-grid editable" appReorderable (reordered)="galleryReorder.emit($event)">
          @for (img of item.gallery; track img.url; let i = $index) {
            <li class="g-item-draggable"
                [style.grid-column]="'span ' + (img.colSpan ?? 1)"
                [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
              <figure>
                <div class="gallery-img-wrap">
                  <app-cropped-image-canvas
                    [imageUrl]="img.url" [crop]="img.crop ?? null"
                    [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
                  <div class="drag-handle" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</div>
                  <div class="edit-overlay">
                    <button type="button" class="edit-btn" aria-label="Cadrer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'crop' })">✂</button>
                    <button type="button" class="edit-btn" aria-label="Remplacer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'replace' })">🖼</button>
                    <button type="button" class="edit-btn edit-btn-danger" aria-label="Retirer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'remove' })">×</button>
                  </div>
                  <div class="resize-handle"
                       (pointerdown)="onResizeStart($event, i)"
                       title="Glisser pour redimensionner ({{ img.colSpan ?? 1 }}×{{ img.rowSpan ?? 1 }})"
                       aria-hidden="true">⤡</div>
                  @if (resizingIndex() === i) {
                    <div class="resize-badge">{{ resizingCols() }} × {{ resizingRows() }}</div>
                  }
                </div>
              </figure>
            </li>
          }
          <li class="gallery-add-tile" data-no-drag>
            <button type="button" class="gallery-add-btn" aria-label="Ajouter une image" (click)="galleryAdd.emit()">
              <span class="gallery-add-icon">+</span>
              <span class="gallery-add-label">Ajouter une image</span>
            </button>
          </li>
        </ul>
      } @else {
        <div class="g-grid">
          @for (img of item.gallery; track img.url; let i = $index) {
            <figure [style.grid-column]="'span ' + (img.colSpan ?? 1)"
                    [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
              <div class="gallery-img-wrap">
                <app-cropped-image-canvas
                  [imageUrl]="img.url" [crop]="img.crop ?? null"
                  [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
              </div>
            </figure>
          }
        </div>
      }
    </div>
  </section>
}
```

- [ ] **Step 3.5 : Méthodes inline edit + dates + resize**

Ajouter à la classe :

```ts
implements OnDestroy

protected startInlineEdit(ev: Event, field: EditableExhibitionField): void {
  ev.preventDefault();
  ev.stopPropagation();
  this.editingField = field;
  const el = ev.currentTarget as HTMLElement;
  queueMicrotask(() => {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
}

protected commitInlineEdit(ev: FocusEvent, field: EditableExhibitionField): void {
  if (this.editingField !== field) return;
  const el = ev.target as HTMLElement;
  const value = (el.textContent ?? '').trim();
  this.editingField = null;
  this.textFieldEdit.emit({ field, value });
}

protected onInlineEnter(ev: Event, field: EditableExhibitionField): void {
  if (this.editingField === field) {
    ev.preventDefault();
    (ev.target as HTMLElement).blur();
  } else {
    this.textFieldClick.emit(field);
  }
}

protected cancelInlineEdit(ev: Event): void {
  if (!this.editingField) return;
  ev.preventDefault();
  this.editingField = null;
  (ev.target as HTMLElement).blur();
}

protected onSpaceWhenNotEditing(ev: Event, field: EditableExhibitionField | 'startDate' | 'endDate'): void {
  if (this.editingField === field) return;
  ev.preventDefault();
  this.textFieldClick.emit(field);
}

protected startDateEdit(ev: Event, field: 'startDate' | 'endDate'): void {
  ev.preventDefault();
  ev.stopPropagation();
  this.editingDateField = field;
}

protected commitDateEdit(ev: FocusEvent, field: 'startDate' | 'endDate'): void {
  if (this.editingDateField !== field) return;
  const input = ev.target as HTMLInputElement;
  const value = input.value;
  this.editingDateField = null;
  if (value) this.dateFieldEdit.emit({ field, value });
}

protected onDateEnter(ev: Event, field: 'startDate' | 'endDate'): void {
  ev.preventDefault();
  (ev.target as HTMLInputElement).blur();
}

protected cancelDateEdit(): void {
  this.editingDateField = null;
}

// Resize identique au sous-projet 2 (copier depuis furniture-detail-view.component.ts)
private resizing: { index: number; startX: number; startY: number; startCol: number; startRow: number; cellW: number; cellH: number } | null = null;

protected onResizeStart(ev: PointerEvent, index: number): void {
  ev.preventDefault();
  ev.stopPropagation();
  const item = this.item?.gallery[index];
  if (!item) return;
  const grid = (ev.target as HTMLElement).closest('.g-grid') as HTMLElement | null;
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const cols = 3;
  const gap = 16;
  const cellW = (rect.width - gap * (cols - 1)) / cols;
  const cellH = 220;
  const startCol = item.colSpan ?? 1;
  const startRow = item.rowSpan ?? 1;
  this.resizing = { index, startX: ev.clientX, startY: ev.clientY, startCol, startRow, cellW, cellH };
  this.resizingIndex.set(index);
  this.resizingCols.set(startCol);
  this.resizingRows.set(startRow);
  window.addEventListener('pointermove', this.onResizeMove);
  window.addEventListener('pointerup', this.onResizeEnd);
  (ev.target as HTMLElement & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(ev.pointerId);
}

private readonly onResizeMove = (ev: PointerEvent): void => {
  if (!this.resizing) return;
  const dx = ev.clientX - this.resizing.startX;
  const dy = ev.clientY - this.resizing.startY;
  const newCol = Math.max(1, Math.min(3, this.resizing.startCol + Math.round(dx / (this.resizing.cellW + 16))));
  const newRow = Math.max(1, Math.min(4, this.resizing.startRow + Math.round(dy / (this.resizing.cellH + 16))));
  this.zone.run(() => {
    this.resizingCols.set(newCol);
    this.resizingRows.set(newRow);
    this.galleryItemResize.emit({ index: this.resizing!.index, colSpan: newCol, rowSpan: newRow });
  });
};

private readonly onResizeEnd = (): void => {
  this.zone.run(() => {
    this.resizing = null;
    this.resizingIndex.set(null);
  });
  window.removeEventListener('pointermove', this.onResizeMove);
  window.removeEventListener('pointerup', this.onResizeEnd);
};

ngOnDestroy(): void {
  this.onResizeEnd();
}
```

- [ ] **Step 3.6 : Styles overlays + editable-text + date-inline + drag/resize handles**

Copier-coller depuis `furniture-detail-view.component.ts` (sous-projet 2) :

```css
.editable .hero-bg { cursor: pointer; outline: 1px dashed rgba(255,255,255,0.25); outline-offset: -2px; }
.hero-bg .edit-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 12px;
  background: rgba(0,0,0,0.0); opacity: 0.55; transition: opacity 180ms ease, background 180ms ease; z-index: 3;
}
.hero-bg:hover .edit-overlay, .hero-bg:focus-within .edit-overlay { opacity: 1; background: rgba(0,0,0,0.4); }
.edit-btn {
  padding: 8px 14px; background: var(--color-bg); border: 1px solid var(--color-line);
  color: var(--color-ink); font-size: 0.85rem; cursor: pointer; font-family: inherit;
}
.edit-btn:hover { background: var(--color-ink); color: var(--color-bg); }
.edit-btn-danger:hover { background: #c44; color: #fff; border-color: #c44; }
.editable-text { cursor: pointer; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color 180ms ease; border-radius: 2px; }
.editable-text:hover, .editable-text:focus-visible { outline-color: currentColor; }
.editable-text[contenteditable="true"] { outline: 2px solid var(--color-accent, #2a9d8f); outline-offset: 4px; background: rgba(255,255,255,0.08); cursor: text; }

.eyebrow-composite { display: inline; }
.eyebrow-segment { display: inline; }
.eyebrow-sep { display: inline; }

.date-inline { padding: 2px 6px; font: inherit; border: 2px solid var(--color-accent, #2a9d8f); background: rgba(255,255,255,0.08); color: inherit; }
.date-segment { display: inline; }
.date-sep { display: inline; }

.gallery-img-wrap { position: relative; }
.gallery-img-wrap .edit-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(0,0,0,0.0); opacity: 0.55; transition: opacity 180ms ease, background 180ms ease; z-index: 3;
}
.gallery-img-wrap:hover .edit-overlay, .gallery-img-wrap:focus-within .edit-overlay { opacity: 1; background: rgba(0,0,0,0.4); }
.gallery-img-wrap .edit-btn { padding: 4px 8px; font-size: 0.75rem; }
.gallery-img-wrap .drag-handle {
  position: absolute; top: 4px; left: 4px; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-ink); color: var(--color-bg); border: 2px solid var(--color-bg); border-radius: 50%;
  font-size: 0.85rem; line-height: 1; font-weight: bold; letter-spacing: -2px;
  cursor: grab; z-index: 4; opacity: 0.85; box-shadow: 0 2px 6px rgba(0,0,0,0.3); user-select: none;
}
.gallery-img-wrap .drag-handle:hover { opacity: 1; transform: scale(1.15); }
.gallery-img-wrap .drag-handle:active { cursor: grabbing; }
.gallery-img-wrap .resize-handle {
  position: absolute; right: 4px; bottom: 4px; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-ink); color: var(--color-bg); border: 2px solid var(--color-bg); border-radius: 50%;
  font-size: 1rem; line-height: 1; font-weight: bold;
  cursor: nwse-resize; z-index: 4; opacity: 0.85; box-shadow: 0 2px 6px rgba(0,0,0,0.3); user-select: none; touch-action: none;
}
.gallery-img-wrap .resize-handle:hover { opacity: 1; transform: scale(1.15); }
.resize-badge {
  position: absolute; top: 8px; left: 8px; padding: 4px 10px;
  background: var(--color-ink); color: var(--color-bg);
  font-size: 0.85rem; font-weight: 600; border-radius: 3px;
  pointer-events: none; z-index: 5; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.g-grid.editable { list-style: none; padding: 0; margin: 0; }
.g-grid.editable > li { position: relative; display: block; }
.gallery-add-tile { display: block; }
.gallery-add-btn {
  width: 100%; height: 100%; min-height: 200px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: transparent; border: 2px dashed var(--color-line); color: var(--color-ink-soft);
  cursor: pointer; font-family: inherit;
}
.gallery-add-btn:hover { border-color: var(--color-ink); color: var(--color-ink); }
.gallery-add-icon { font-size: 2rem; line-height: 1; }
.gallery-add-label { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; }
```

Ajouter `[class.editable]="editable"` au `<header class="hero">` et `<div class="hero-bg">` :

```html
<header class="hero" [class.editable]="editable">
  <div class="hero-bg">
    <app-cropped-image-canvas ... />
    @if (editable) {
      <div class="edit-overlay">
        <button type="button" class="edit-btn" aria-label="Cadrer la cover" (click)="coverEdit.emit('crop')">✂ Cadrer</button>
        <button type="button" class="edit-btn" aria-label="Remplacer la cover" (click)="coverEdit.emit('replace')">🖼 Remplacer</button>
      </div>
    }
  </div>
  ...
</header>
```

- [ ] **Step 3.7 : Tests mode editable**

Ajouter à `exhibition-detail-view.component.spec.ts` :

```ts
it('decompose l\'eyebrow en 3 spans editable en mode editable', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  const segments = fixture.nativeElement.querySelectorAll('.eyebrow-segment');
  expect(segments.length).toBe(3);
});

it('emet coverEdit=crop au clic sur Cadrer', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
  const btn = fixture.nativeElement.querySelector('.hero-bg .edit-btn[aria-label="Cadrer la cover"]') as HTMLButtonElement;
  btn.click();
  expect(emitted).toBe('crop');
});

it('emet textFieldClick au clic sur le titre', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
  (fixture.nativeElement.querySelector('h1.editable-text') as HTMLElement).click();
  expect(emitted).toBe('title');
});

it('emet textFieldClick au clic sur startDate', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
  (fixture.nativeElement.querySelector('.date-segment') as HTMLElement).click();
  expect(emitted).toBe('startDate');
});

it('startDateEdit affiche un input type=date', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.startDateEdit({ preventDefault: () => {}, stopPropagation: () => {} } as any, 'startDate');
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeTruthy();
});

it('commitDateEdit emet dateFieldEdit avec valeur du input', (done) => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.editingDateField = 'startDate';
  cmp.dateFieldEdit.subscribe((e: any) => {
    expect(e).toEqual({ field: 'startDate', value: '2026-01-15' });
    done();
  });
  const input = document.createElement('input');
  input.type = 'date';
  input.value = '2026-01-15';
  cmp.commitDateEdit({ target: input } as any, 'startDate');
});

it('emet galleryItemEdit remove au clic sur ×', () => {
  const e = { ...mockExhibition, gallery: [{ url: 'a.jpg', crop: null }] };
  fixture.componentRef.setInput('item', e);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.galleryItemEdit.subscribe(ev => emitted = ev);
  const btn = fixture.nativeElement.querySelector('.gallery-img-wrap .edit-btn[aria-label="Retirer cette image"]') as HTMLButtonElement;
  btn.click();
  expect(emitted).toEqual({ index: 0, action: 'remove' });
});

it('emet galleryAdd au clic sur la tuile +', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  let emitted = false;
  fixture.componentInstance.galleryAdd.subscribe(() => emitted = true);
  (fixture.nativeElement.querySelector('.gallery-add-btn') as HTMLButtonElement).click();
  expect(emitted).toBeTrue();
});

it('overlays absents quand editable=false', () => {
  fixture.componentRef.setInput('item', mockExhibition);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.hero-bg .edit-overlay')).toBeNull();
});
```

- [ ] **Step 3.8 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-detail-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 20 tests PASS.

- [ ] **Step 3.9 : Commit**

```powershell
git add frontend/src/app/components/exhibition-detail-view/
git commit -m "feat(wysiwyg-expo): view mode editable overlays + click-to-focus + dblclick + dates swap input + reorder/resize"
```

---

## Task 4: Refactor `exhibition-detail.component.ts` (public) pour déléguer au view

**Files:**
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.spec.ts`

- [ ] **Step 4.1 : Lire le composant actuel**

```powershell
grep -n "PortfolioService\|getExhibitionBySlug\|getStoryFor\|setTitle\|coverCropStyle\|galleryItemStyle\|formatRange\|hasSlides\|openViewer\|enrichSlides" frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts
```

- [ ] **Step 4.2 : Réécrire**

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Exhibition } from '../../models/exhibition.model';
import { Story } from '../../models/story.model';
import { SiteContent } from '../../models/site-content.model';
import { PortfolioService } from '../../services/portfolio.service';
import { LoadingService } from '../../services/loading.service';
import { ExhibitionDetailViewComponent } from '../../components/exhibition-detail-view/exhibition-detail-view.component';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';
import { enrichSlides } from '../../utils/display-slides';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [RouterLink, ExhibitionDetailViewComponent, StoryViewerComponent],
  template: `
    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h1>Exposition introuvable</h1>
        <p><a class="btn-link" routerLink="/expositions">Retour aux expositions</a></p>
      </div>
    } @else if (item(); as e) {
      <app-exhibition-detail-view
        [item]="e"
        [story]="story()"
        [displaySlides]="displaySlides()"
        [content]="content()"
        (viewerOpen)="onViewerOpen($event)" />

      @if (viewerQueue().length > 0) {
        <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
      }
    }
  `,
  styles: [`
    .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .section { padding: 80px 0; }
    .status { text-align: center; color: var(--color-ink-soft); }
    .btn-link { color: var(--color-ink); text-decoration: underline; }
  `]
})
export class ExhibitionDetailComponent implements OnInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly route = inject(ActivatedRoute);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly item = signal<Exhibition | null>(null);
  protected readonly story = signal<Story | null>(null);
  protected readonly viewerQueue = signal<StoryItem[]>([]);
  protected readonly content = signal<SiteContent>({});
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  protected readonly displaySlides = computed(() => {
    const s = this.story();
    const e = this.item();
    if (!s || !e) return [];
    return enrichSlides(s, { ownerKind: 'exhibition', ownerLabel: e.venue, ownerSlug: e.slug, coverCrop: e.coverCrop ?? null });
  });

  ngOnInit() {
    this.loadingSvc.start('page');
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) { this.loading.set(false); this.loadingSvc.done('page'); return; }
    this.portfolio.getExhibitionBySlug(slug).subscribe({
      next: e => {
        if (!e) { this.notFound.set(true); this.loading.set(false); this.loadingSvc.done('page'); return; }
        this.item.set(e);
        document.title = `${e.title} — Atelier Lumen`;
        this.portfolio.getStoryFor('exhibition', e.id).subscribe(s => this.story.set(s));
        this.loading.set(false);
        this.loadingSvc.done('page');
      },
      error: () => { this.notFound.set(true); this.loading.set(false); this.loadingSvc.done('page'); }
    });
    this.portfolio.getContent().subscribe(c => this.content.set(c));
  }

  onViewerOpen(queue: StoryItem[]): void { this.viewerQueue.set(queue); }
  closeViewer(): void { this.viewerQueue.set([]); }
}
```

(Vérifier les vrais noms de méthodes du `PortfolioService` : `getExhibitionBySlug`, `getStoryFor`. Si différents, adapter.)

- [ ] **Step 4.3 : Adapter les tests existants**

```powershell
grep -n "describe\|it(" frontend/src/app/pages/exhibition-detail/exhibition-detail.component.spec.ts
```

Stratégie :
- Suppression des tests sur `coverCropStyle()`, `galleryItemStyle()`, `hasSlides()`, `openViewer()`, sélecteurs sur `.hero-content .eyebrow` directs.
- Adapter les sélecteurs vers `app-exhibition-detail-view`.
- Conserver tests loading/notFound/viewerOpen.
- Ajouter "passe l'item au view".

```ts
it('passe l\'item chargé au view', () => {
  setup('lumen-2025', of(mockExhibition));
  const fixture = TestBed.createComponent(ExhibitionDetailComponent);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-exhibition-detail-view')).toBeTruthy();
});
```

- [ ] **Step 4.4 : Run tests unitaires**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-detail/**' 2>&1 | tail -5
```
Attendu : tous PASS.

- [ ] **Step 4.5 : Run Playwright SANS --update — CRITIQUE**

```powershell
cd frontend && npm run test:visual:docker -- --grep="exhibition-detail" 2>&1 | tail -10
```
Attendu : PASS sans diff. Si FAIL :
- La galerie publique est passée du transform CSS au canvas via le view. Régression visuelle possible.
- Examiner le diff. Si la galerie est juste légèrement différente mais cohérente, NE PAS régénérer la baseline ici. Reporter à Task 7 (validation visuelle utilisateur).
- Si écart non-galerie : fixer dans le view CSS.

- [ ] **Step 4.6 : Commit**

```powershell
git add frontend/src/app/pages/exhibition-detail/
git commit -m "refactor(wysiwyg-expo): exhibition-detail delegue le rendu a <app-exhibition-detail-view>"
```

---

## Task 5: Créer `<app-exhibition-preview>` (wrapper admin avec previewItem computed)

**Files:**
- Create: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts`
- Create: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.spec.ts`

- [ ] **Step 5.1 : Écrire les tests**

```ts
// exhibition-preview.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { ExhibitionPreviewComponent } from './exhibition-preview.component';
import { GalleryItem } from '../../../../models/gallery-item.model';

describe('ExhibitionPreviewComponent', () => {
  let fixture: ComponentFixture<ExhibitionPreviewComponent>;

  function setup(formValues: Record<string, unknown> = {}, gallery: GalleryItem[] = []) {
    const fb = new FormBuilder();
    const form: FormGroup = fb.group({
      title: [''], venue: [''], city: [''], country: [''],
      startDate: [''], endDate: [''], curator: [''],
      shortDescription: [''], description: [''], slug: [''], tags: [[]],
      coverImage: [''], coverCrop: [null],
      featured: [false], showStoryLink: [false], showStoryButton: [false],
    });
    form.patchValue(formValues);
    const gallerySig = signal<GalleryItem[]>(gallery);
    TestBed.configureTestingModule({ imports: [ExhibitionPreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ExhibitionPreviewComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('gallery', gallerySig.asReadonly());
    fixture.detectChanges();
    return { form, gallerySig };
  }

  it('rend un <app-exhibition-detail-view> en mode editable', () => {
    setup({ title: 'Lumen 2025' });
    expect(fixture.nativeElement.querySelector('app-exhibition-detail-view')).toBeTruthy();
  });

  it('previewItem agrege form + signal gallery', () => {
    setup({ title: 'Lumen', venue: 'Lumière', city: 'Paris', country: 'France', curator: 'Marie' });
    const item = (fixture.componentInstance as any).previewItem();
    expect(item.title).toBe('Lumen');
    expect(item.venue).toBe('Lumière');
    expect(item.curator).toBe('Marie');
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
  });

  it('reemet coverEdit', () => {
    setup({ coverImage: 'x.jpg' });
    let emitted: any = null;
    fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
    (fixture.componentInstance as any).onCoverEdit('crop');
    expect(emitted).toBe('crop');
  });

  it('reemet textFieldEdit', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.textFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onTextFieldEdit({ field: 'title', value: 'X' });
    expect(emitted).toEqual({ field: 'title', value: 'X' });
  });

  it('reemet dateFieldEdit', () => {
    setup();
    let emitted: any = null;
    fixture.componentInstance.dateFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onDateFieldEdit({ field: 'startDate', value: '2026-01-15' });
    expect(emitted).toEqual({ field: 'startDate', value: '2026-01-15' });
  });
});
```

- [ ] **Step 5.2 : Vérifier l'échec**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-preview.component.spec.ts' 2>&1 | tail -5
```
Attendu : FAIL (composant inexistant).

- [ ] **Step 5.3 : Créer le composant**

```ts
// exhibition-preview.component.ts
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, Signal, computed, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Exhibition } from '../../../../models/exhibition.model';
import { GalleryItem } from '../../../../models/gallery-item.model';
import { Story } from '../../../../models/story.model';
import { SiteContent } from '../../../../models/site-content.model';
import { DisplaySlide } from '../../../../models/display-slide.model';
import { EditableExhibitionField, ExhibitionDetailViewComponent } from '../../../../components/exhibition-detail-view/exhibition-detail-view.component';

@Component({
  selector: 'app-exhibition-preview',
  standalone: true,
  imports: [ExhibitionDetailViewComponent],
  template: `
    <app-exhibition-detail-view
      [item]="previewItem()"
      [story]="story"
      [displaySlides]="displaySlides"
      [content]="content"
      [editable]="true"
      (coverEdit)="onCoverEdit($event)"
      (galleryItemEdit)="onGalleryItemEdit($event)"
      (galleryReorder)="onGalleryReorder($event)"
      (galleryAdd)="onGalleryAdd()"
      (galleryItemResize)="onGalleryItemResize($event)"
      (textFieldClick)="onTextFieldClick($event)"
      (textFieldEdit)="onTextFieldEdit($event)"
      (dateFieldEdit)="onDateFieldEdit($event)" />
  `,
  styles: []
})
export class ExhibitionPreviewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) gallery!: Signal<GalleryItem[]>;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};

  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() galleryAdd = new EventEmitter<void>();
  @Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();
  @Output() textFieldClick = new EventEmitter<EditableExhibitionField | 'startDate' | 'endDate'>();
  @Output() textFieldEdit = new EventEmitter<{ field: EditableExhibitionField; value: string }>();
  @Output() dateFieldEdit = new EventEmitter<{ field: 'startDate' | 'endDate'; value: string }>();

  private readonly _formTick = signal(0);
  private formSub?: Subscription;

  protected readonly previewItem = computed<Exhibition | null>(() => {
    this._formTick();
    if (!this.form) return null;
    const v = this.form.getRawValue();
    return {
      id: v.id ?? 'preview',
      slug: v.slug ?? '',
      title: v.title ?? '',
      venue: v.venue ?? '',
      city: v.city ?? '',
      country: v.country ?? '',
      startDate: v.startDate ?? '',
      endDate: v.endDate ?? '',
      coverImage: v.coverImage ?? '',
      coverCrop: v.coverCrop ?? null,
      gallery: this.gallery(),
      curator: v.curator ?? '',
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      tags: v.tags ?? [],
      featured: !!v.featured,
      showStoryLink: !!v.showStoryLink,
      showStoryButton: !!v.showStoryButton,
      slides: [],
    } as unknown as Exhibition;
  });

  ngOnInit(): void {
    if (this.form) {
      this.formSub = this.form.valueChanges.subscribe(() => this._formTick.update(n => n + 1));
    }
  }
  ngOnDestroy(): void { this.formSub?.unsubscribe(); }

  protected onCoverEdit(a: 'crop' | 'replace'): void { this.coverEdit.emit(a); }
  protected onGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void { this.galleryItemEdit.emit(e); }
  protected onGalleryReorder(o: number[]): void { this.galleryReorder.emit(o); }
  protected onGalleryAdd(): void { this.galleryAdd.emit(); }
  protected onGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void { this.galleryItemResize.emit(e); }
  protected onTextFieldClick(n: EditableExhibitionField | 'startDate' | 'endDate'): void { this.textFieldClick.emit(n); }
  protected onTextFieldEdit(e: { field: EditableExhibitionField; value: string }): void { this.textFieldEdit.emit(e); }
  protected onDateFieldEdit(e: { field: 'startDate' | 'endDate'; value: string }): void { this.dateFieldEdit.emit(e); }
}
```

- [ ] **Step 5.4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-preview.component.spec.ts' 2>&1 | tail -5
```
Attendu : 7 tests PASS.

- [ ] **Step 5.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/preview/
git commit -m "feat(wysiwyg-expo): <app-exhibition-preview> wrap le view en mode editable avec form signal"
```

---

## Task 6: Intégrer dans `expositions.component.ts` (toggle Modifier/Aperçu + IDs field-* + handlers + saveExhibition reload)

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

- [ ] **Step 6.1 : Ajouter IDs `field-*`**

Lire :

```powershell
grep -n "formControlName\|<input\|<textarea" frontend/src/app/pages/admin/expositions/expositions.component.ts | head -20
```

Pour chaque input/textarea cible du click-to-focus, ajouter `id="field-<name>"` :
- `formControlName="title"` → `id="field-title"`
- `formControlName="venue"` → `id="field-venue"`
- `formControlName="city"` → `id="field-city"`
- `formControlName="country"` → `id="field-country"`
- `formControlName="startDate"` → `id="field-startDate"`
- `formControlName="endDate"` → `id="field-endDate"`
- `formControlName="curator"` → `id="field-curator"`
- `formControlName="shortDescription"` → `id="field-shortDescription"`
- `formControlName="description"` → `id="field-description"`

- [ ] **Step 6.2 : Template — toggle Modifier/Aperçu + bouton Enregistrer toolbar + plein écran**

Wrapper la zone d'édition :

```html
<div class="admin-split">
  @if (editingExhibitionSlug() !== null || editingExhibitionId() !== null || creatingExhibition()) {
    <div class="admin-mode-bar" role="tablist" aria-label="Mode d'édition de l'exposition">
      <button type="button" role="tab" class="admin-mode-tab"
              [class.active]="expoViewMode() === 'form'"
              [attr.aria-selected]="expoViewMode() === 'form'"
              (click)="expoViewMode.set('form')">
        ✏ Modifier l'exposition
      </button>
      <button type="button" role="tab" class="admin-mode-tab"
              [class.active]="expoViewMode() === 'preview'"
              [attr.aria-selected]="expoViewMode() === 'preview'"
              (click)="expoViewMode.set('preview')">
        👁 Aperçu
      </button>
    </div>
  }

  <section class="admin-form" [class.is-hidden]="expoViewMode() !== 'form'">
    <!-- form existant inchangé -->
    <form class="form" [formGroup]="exhibitionForm" (ngSubmit)="saveExhibition()">
      ...
    </form>
  </section>

  @if (expoViewMode() === 'preview' && (editingExhibitionSlug() !== null || editingExhibitionId() !== null || creatingExhibition())) {
    <aside class="admin-preview" [class.fullscreen]="previewFullscreen()"
           [attr.aria-modal]="previewFullscreen() ? 'true' : null"
           [attr.role]="previewFullscreen() ? 'dialog' : null"
           aria-label="Aperçu de l'exposition">
      <div class="admin-preview-toolbar">
        <span class="admin-preview-label">Aperçu</span>
        <div class="admin-preview-actions">
          <button type="button" class="btn-preview-save"
                  [disabled]="exhibitionForm.invalid || saving()"
                  (click)="saveExhibition()">
            @if (saving()) { Enregistrement… } @else { 💾 Enregistrer }
          </button>
          <button type="button" class="btn-preview-toggle"
                  (click)="togglePreviewFullscreen()"
                  [attr.aria-label]="previewFullscreenLabel()">
            @if (previewFullscreen()) { ⤡ Réduire } @else { ⤢ Plein écran }
          </button>
        </div>
      </div>
      <app-exhibition-preview
        [form]="exhibitionForm"
        [gallery]="exhibitionGallery.asReadonly()"
        [story]="currentStories()[0] ?? null"
        [displaySlides]="previewDisplaySlides()"
        (coverEdit)="onPreviewCoverEdit($event)"
        (galleryItemEdit)="onPreviewGalleryItemEdit($event)"
        (galleryReorder)="onPreviewGalleryReorder($event)"
        (galleryAdd)="onPreviewGalleryAdd()"
        (galleryItemResize)="onPreviewGalleryItemResize($event)"
        (textFieldClick)="focusField($event)"
        (textFieldEdit)="onPreviewTextFieldEdit($event)"
        (dateFieldEdit)="onPreviewDateFieldEdit($event)" />
    </aside>
  }
</div>
```

Ajouter styles (identiques au mobilier sous-projet 2) :

```css
.admin-split { display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
.admin-mode-bar { display: inline-flex; gap: 4px; padding: 4px; background: var(--color-bg-alt); border: 1px solid var(--color-line); align-self: flex-start; }
.admin-mode-tab { padding: 8px 16px; background: transparent; border: 0; color: var(--color-ink-soft); font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
.admin-mode-tab:hover { color: var(--color-ink); }
.admin-mode-tab.active { background: var(--color-ink); color: var(--color-bg); font-weight: 600; }
.admin-form { max-width: 100%; }
.admin-form.is-hidden { position: absolute; left: -100vw; top: 0; width: 0; height: 0; overflow: hidden; pointer-events: none; }
.admin-preview { max-height: calc(100vh - 100px); overflow-y: auto; background: var(--color-bg-alt); border: 1px solid var(--color-line); padding: 24px; }
.admin-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -8px -8px 16px; padding: 0 4px; }
.admin-preview-label { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-mute); }
.admin-preview-actions { display: inline-flex; gap: 8px; align-items: center; }
.btn-preview-save { padding: 6px 14px; background: var(--color-ink); color: var(--color-bg); border: 1px solid var(--color-ink); font-size: 0.78rem; cursor: pointer; font-family: inherit; font-weight: 600; }
.btn-preview-save:hover:not(:disabled) { background: var(--color-bg); color: var(--color-ink); }
.btn-preview-save:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-preview-toggle { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line); color: var(--color-ink-soft); font-size: 0.78rem; cursor: pointer; font-family: inherit; }
.btn-preview-toggle:hover { color: var(--color-ink); border-color: var(--color-ink); }
.admin-preview.fullscreen { position: fixed; inset: 0; max-height: none; z-index: 1200; border: 0; padding: 24px 32px; }
.admin-preview.fullscreen .admin-preview-toolbar { margin-top: 0; }
@media (max-width: 768px) { .admin-mode-tab[class*="preview"] { opacity: 0.5; } .admin-preview { max-height: 60vh; } }
```

- [ ] **Step 6.3 : Imports + signals + handlers + focusField + reload save**

```ts
import { ExhibitionPreviewComponent } from './preview/exhibition-preview.component';
import { ViewChild, computed, signal } from '@angular/core';
import { ImageFieldComponent } from '../shared/image-field.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { enrichSlides } from '../../../utils/display-slides';
import { Subscription } from 'rxjs';

// dans imports: [...] ajouter ExhibitionPreviewComponent

// dans la classe :

@ViewChild('coverField') coverImageField?: ImageFieldComponent;
@ViewChild('galleryEditor') galleryEditor?: GalleryEditorComponent;

protected readonly creatingExhibition = signal(false);
protected readonly previewFullscreen = signal(false);
protected readonly expoViewMode = signal<'form' | 'preview'>('form');

private readonly _formTick = signal(0);
private formTickSub?: Subscription;

protected readonly previewDisplaySlides = computed(() => {
  this._formTick();
  const story = this.currentStories()[0];
  if (!story) return [];
  const v = this.exhibitionForm.getRawValue();
  return enrichSlides(story, { ownerKind: 'exhibition', ownerLabel: v.venue ?? '', ownerSlug: v.slug ?? '', coverCrop: v.coverCrop ?? null });
});

ngOnInit(): void {
  // si ngOnInit existe deja, juste ajouter cette ligne
  this.formTickSub = this.exhibitionForm.valueChanges.subscribe(() => this._formTick.update(n => n + 1));
  // ... reste du ngOnInit existant
}

ngOnDestroy(): void {
  this.formTickSub?.unsubscribe();
}

protected togglePreviewFullscreen(): void { this.previewFullscreen.update(v => !v); }
protected previewFullscreenLabel(): string {
  return this.previewFullscreen() ? 'Réduire l’aperçu' : 'Aperçu plein écran';
}

focusField(name: string): void {
  const el = document.getElementById(`field-${name}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  (el as HTMLInputElement | HTMLTextAreaElement).focus();
}

onPreviewCoverEdit(action: 'crop' | 'replace'): void {
  if (action === 'crop') this.coverImageField?.openCrop();
  else this.coverImageField?.openPicker();
}

onPreviewGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void {
  if (e.action === 'remove') {
    this.exhibitionGallery.update(arr => arr.filter((_, i) => i !== e.index));
    return;
  }
  if (e.action === 'crop') this.galleryEditor?.openCropFor(e.index);
  else this.galleryEditor?.openReplaceFor?.(e.index);
}

onPreviewGalleryReorder(order: number[]): void {
  const items = this.exhibitionGallery();
  this.exhibitionGallery.set(order.map(i => items[i]));
}

onPreviewGalleryAdd(): void {
  this.galleryEditor?.openPicker();
}

onPreviewGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void {
  this.exhibitionGallery.update(arr => arr.map((it, i) =>
    i === e.index ? { ...it, colSpan: e.colSpan, rowSpan: e.rowSpan } : it
  ));
}

onPreviewTextFieldEdit(e: { field: string; value: string }): void {
  this.exhibitionForm.patchValue({ [e.field]: e.value });
  this.exhibitionForm.get(e.field)?.markAsDirty();
}

onPreviewDateFieldEdit(e: { field: 'startDate' | 'endDate'; value: string }): void {
  this.exhibitionForm.patchValue({ [e.field]: e.value });
  this.exhibitionForm.get(e.field)?.markAsDirty();
}
```

Mettre `#coverField` et `#galleryEditor` sur les composants :

```html
<app-image-field #coverField formControlName="coverImage" [cropEnabled]="true" ...></app-image-field>
<app-gallery-editor #galleryEditor [images]="exhibitionGallery()" ...></app-gallery-editor>
```

- [ ] **Step 6.4 : Modifier `saveExhibition()` pour reload depuis réponse**

Trouver l'actuel :

```powershell
grep -n "saveExhibition\|newExhibition" frontend/src/app/pages/admin/expositions/expositions.component.ts | head -5
```

Patcher le `next:` callback :

```ts
saveExhibition(): void {
  if (this.exhibitionForm.invalid) return;
  // ... existing payload construction
  this.saving.set(true);
  const op$ = slug
    ? this.portfolio.updateExhibition(slug, payload)
    : this.portfolio.createExhibition(payload);
  op$.subscribe({
    next: (saved) => {
      this.saving.set(false);
      this.toast.success(slug ? 'Exposition mise à jour.' : 'Exposition créée.');
      this.refreshExhibitions();
      if (saved) {
        this.loadExhibition(saved);
      }
    },
    error: () => {
      this.saving.set(false);
      this.toast.error('Erreur lors de l\'enregistrement.');
    }
  });
}
```

Modifier `newExhibition()` et `loadExhibition()` pour set `expoViewMode.set('form')` et `creatingExhibition.set(...)` selon contexte :

```ts
newExhibition(): void {
  this.editingExhibitionSlug.set(null);
  this.editingExhibitionId.set(null);
  this.creatingExhibition.set(true);
  this.expoViewMode.set('form');
  // ... reste de newExhibition
}

loadExhibition(item: Exhibition): void {
  this.editingExhibitionSlug.set(item.slug);
  this.editingExhibitionId.set(item.id ?? null);
  this.creatingExhibition.set(false);
  this.expoViewMode.set('form');
  // ... reste de loadExhibition
}
```

- [ ] **Step 6.5 : Tests handlers**

Ajouter à `expositions.component.spec.ts` (étendre `ExpoInternals` type si présent, sinon adapter au pattern existant) :

```ts
it('focusField scroll + focus l\'input field-title', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
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

it('onPreviewGalleryItemEdit remove enleve l\'item du signal', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.exhibitionGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
  cmp.onPreviewGalleryItemEdit({ index: 0, action: 'remove' });
  expect(cmp.exhibitionGallery()).toEqual([{ url: 'b', crop: null }]);
});

it('onPreviewGalleryReorder remet le signal dans le bon ordre', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.exhibitionGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }, { url: 'c', crop: null }]);
  cmp.onPreviewGalleryReorder([2, 0, 1]);
  expect(cmp.exhibitionGallery().map((i: any) => i.url)).toEqual(['c', 'a', 'b']);
});

it('onPreviewGalleryItemResize patche colSpan/rowSpan', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.exhibitionGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
  cmp.onPreviewGalleryItemResize({ index: 1, colSpan: 2, rowSpan: 3 });
  expect(cmp.exhibitionGallery()[1]).toEqual({ url: 'b', crop: null, colSpan: 2, rowSpan: 3 } as any);
});

it('onPreviewTextFieldEdit patche form value + dirty', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.onPreviewTextFieldEdit({ field: 'title', value: 'Nouveau titre' });
  expect(cmp.exhibitionForm.get('title').value).toBe('Nouveau titre');
  expect(cmp.exhibitionForm.get('title').dirty).toBeTrue();
});

it('onPreviewDateFieldEdit patche date dans le form', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.onPreviewDateFieldEdit({ field: 'startDate', value: '2026-03-01' });
  expect(cmp.exhibitionForm.get('startDate').value).toBe('2026-03-01');
});

it('togglePreviewFullscreen bascule le signal', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  expect(cmp.previewFullscreen()).toBeFalse();
  cmp.togglePreviewFullscreen();
  expect(cmp.previewFullscreen()).toBeTrue();
});

it('expoViewMode default form, switche preview', () => {
  configure();
  const fixture = TestBed.createComponent(ExpositionsComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/exhibitions').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  expect(cmp.expoViewMode()).toBe('form');
  cmp.expoViewMode.set('preview');
  expect(cmp.expoViewMode()).toBe('preview');
});
```

- [ ] **Step 6.6 : Run tests + build prod**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -3
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng build --configuration production 2>&1 | tail -3
```

- [ ] **Step 6.7 : Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/
git commit -m "feat(wysiwyg-expo): toggle Modifier/Aperçu + handlers preview + saveExhibition reload"
```

---

## Task 7: Validation visuelle utilisateur + Playwright

**Files:** aucun. Validation manuelle + Playwright.

- [ ] **Step 7.1 : Lancer le stack**

```powershell
docker compose up --build -d
```

Une fois `http://localhost:4200` répond.

- [ ] **Step 7.2 : Tests visuels admin**

`/admin` → login → `/admin/expositions` → cliquer sur une expo :
- Toggle Modifier / Aperçu visible
- Mode Aperçu : rendu identique au public (hero, intro, galerie)
- Live update : modifier le titre dans le form → preview h1 update
- Hover hero → boutons Cadrer / Remplacer
- Hover item galerie → 3 boutons + drag handle + resize handle
- Clic ⋮⋮ → drag réordonne live
- Drag de ⤡ → resize cellule live + badge `N×M`
- Tuile « + Ajouter » → ouvre médiathèque
- Click simple sur titre → focus du champ form
- **Double-clic sur titre / venue / city / country / curator / lead / body** → contenteditable, taper, Entrée valide
- **Double-clic sur startDate / endDate** → `<input type="date">` apparaît avec datepicker browser, modifier, blur valide
- Bouton « 💾 Enregistrer » dans toolbar preview
- Bouton « ⤢ Plein écran » → preview occupe tout viewport
- En plein écran, ouvrir Cadrer ou Remplacer depuis un item → modale par-dessus

- [ ] **Step 7.3 : Vérifier `exhibition-detail` public sans régression visuelle**

```powershell
cd frontend && npm run test:visual:docker -- --grep="exhibition-detail" 2>&1 | tail -10
```
Attendu : 
- Si la galerie publique est passée au canvas (via le view), le rendu peut diverger des baselines. Si fail, l'utilisateur doit valider visuellement avant régen.
- Si juste hero+intro : PASS attendu.

- [ ] **Step 7.4 : Régénérer baselines exhibition-detail si nécessaire après validation utilisateur**

**SEULEMENT après validation visuelle manuelle utilisateur** :

```powershell
cd frontend && npm run test:visual:docker:update -- --grep="exhibition-detail" 2>&1 | tail -5
git add frontend/e2e/__screenshots__/exhibition-detail.spec.ts/
git commit -m "test(visual): regen baselines exhibition-detail apres migration galerie au canvas"
```

- [ ] **Step 7.5 : Demander confirmation utilisateur**

À l'utilisateur : "Validation visuelle OK ?"

---

## Task 8: Mise à jour doc (spec tech + spec fonc) + finishing branch

**Files:** docs.

- [ ] **Step 8.1 : Mettre à jour `docs/SPECIFICATION_TECHNIQUE.md`**

Bump version. Sections à étendre : composants `<app-exhibition-detail-view>` + `<app-exhibition-preview>`, refactor `exhibition-detail.component.ts`, toggle Modifier/Aperçu dans `expositions.component.ts`, swap `<input type="date">`, eyebrow composite décomposé.

Référence : ADR-0018 (déjà accepté, juste mentionner réutilisation).

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md
git commit -m "docs(spec-tech): preview WYSIWYG fiche exposition (sous-projet 3/4)"
```

- [ ] **Step 8.2 : Mettre à jour `docs/SPECIFICATION_FONCTIONNELLE.md`**

Bump version. Ajouter section preview WYSIWYG admin Expositions (parallèle au mobilier). Roadmap : Phase 6quater (sous-projet 3) ✅ Terminé. Sous-projet 4 (Accueil) restant.

```powershell
git add docs/SPECIFICATION_FONCTIONNELLE.md
git commit -m "docs(spec-fonc): preview WYSIWYG fiche exposition (sous-projet 3/4)"
```

- [ ] **Step 8.3 : Vérifier tests verts**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | grep -E "Tests run: [0-9]+, Failures: 0" | tail -3
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -3
cd frontend && npm run test:visual:docker 2>&1 | tail -3
```

- [ ] **Step 8.4 : Invoquer `superpowers:finishing-a-development-branch`**

Le skill propose audits (sécu + RGAA) + 4 options de finalisation. Pour cette branche :
- Audits sécu + RGAA (cohérent avec sous-projet 2).
- Option recommandée : merge local + push.

---

## Self-Review

**Spec coverage :**

- Composant `<app-exhibition-detail-view>` extrait → Tasks 1, 2, 3. ✓
- Refactor `exhibition-detail.component.ts` → Task 4. ✓
- `<app-exhibition-preview>` → Task 5. ✓
- Toggle Modifier/Aperçu + handlers + saveExhibition reload → Task 6. ✓
- Édition inline texte (title, venue, city, country, curator, lead, body) → Task 3. ✓
- Édition inline dates via swap `<input type="date">` → Task 3. ✓
- Drag-reorder + resize WYSIWYG galerie → Task 3. ✓
- Cover overlays Cadrer/Remplacer + galerie overlays + tuile + Ajouter → Task 3. ✓
- Bouton Enregistrer + plein écran toolbar → Task 6. ✓
- Tests unitaires + Playwright sans `--update` → Tasks 1-6 (unit), Task 7 (Playwright). ✓
- Doc spec/fonc maj → Task 8. ✓
- Validation visuelle avant régen baselines → Task 7. ✓

**Placeholder scan :**

- "Adapter les vrais noms de méthodes du PortfolioService" Task 4.2 : `grep` à côté donne l'info. ✓
- "Étendre `ExpoInternals` type si présent" Task 6.5 : pattern existant à suivre. ✓
- Pas de "TBD" / "TODO" / "implement later". ✓

**Type consistency :**

- `EditableExhibitionField` même union partout (Tasks 3, 5, 6). ✓
- Outputs `coverEdit` / `galleryItemEdit` / `textFieldClick` / `textFieldEdit` / `dateFieldEdit` mêmes types view → preview → MobilierComponent. ✓
- `id="field-<name>"` cohérent dans Task 6.1 et l'usage dans `focusField` (Task 6.3). ✓
- `previewFullscreenLabel()` retourne string non vide (`'Réduire l’aperçu'` ou `'Aperçu plein écran'`). ✓
