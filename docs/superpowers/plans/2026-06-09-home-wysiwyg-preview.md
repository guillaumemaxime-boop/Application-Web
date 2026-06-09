# Preview WYSIWYG Accueil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'admin un preview WYSIWYG live de la page d'accueil (toggle Modifier/Aperçu), avec édition inline des textes hero au double-clic et **auto-save** vers `site_content`, hover overlay sur les cards du feed (toggle inclusion + drag-reorder), et cartouche `[i]` sur les news-sliders qui ramène à la section sliders form-side.

**Architecture:** Extraire `<app-home-view>` (composant pur, standalone) depuis `HomeComponent`. Public utilise le view branché aux signaux API. `<app-home-preview>` wrapper admin passe les signaux directement (pas de FormGroup — pattern différent des sous-projets 2/3). `AccueilComponent` ajoute toggle + handlers preview avec **auto-save** via `PortfolioService.updateContent()` (API existante).

**Tech Stack:** Angular 21 standalone + signals + `@if`/`@for`, Karma + Jasmine, Playwright (régression visuelle), `ReorderableDirective` existante, `<app-cropped-image-canvas>` (sous-projet 1), `cdkTrapFocus` pour plein écran.

**Spec:** [docs/superpowers/specs/2026-06-09-home-wysiwyg-preview-design.md](../specs/2026-06-09-home-wysiwyg-preview-design.md)

**Branche:** `feat/wysiwyg-home-preview` (créée depuis main après merge sous-projet 3).

---

## Cartographie des fichiers

**Nouveaux :**
- `frontend/src/app/components/home-view/home-view.component.ts`
- `frontend/src/app/components/home-view/home-view.component.spec.ts`
- `frontend/src/app/pages/admin/accueil/preview/home-preview.component.ts`
- `frontend/src/app/pages/admin/accueil/preview/home-preview.component.spec.ts`

**Modifiés :**
- `frontend/src/app/pages/home/home.component.ts` (refactor : déléguer au view)
- `frontend/src/app/pages/home/home.component.spec.ts`
- `frontend/src/app/pages/admin/accueil/accueil.component.ts` (toggle + handlers preview + cdkTrapFocus + form caché)
- `frontend/src/app/pages/admin/accueil/accueil.component.spec.ts`

**Pas de modif backend** : `updateContent` API existante, pas de migration DB, pas de nouveau endpoint.

---

## Task 1: Squelette `<app-home-view>` (hero only)

**Files:**
- Create: `frontend/src/app/components/home-view/home-view.component.ts`
- Create: `frontend/src/app/components/home-view/home-view.component.spec.ts`

- [ ] **Step 1.1 : Écrire les tests qui échouent**

```ts
// home-view.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeViewComponent } from './home-view.component';
import { HomePageData } from '../../models/home.model';

describe('HomeViewComponent', () => {
  let fixture: ComponentFixture<HomeViewComponent>;

  const mockData: HomePageData = {
    feed: [],
    sliders: [],
  } as unknown as HomePageData;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeViewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeViewComponent);
  });

  it('affiche le hero eyebrow par defaut quand content vide', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .eyebrow')).toBeTruthy();
  });

  it('affiche le hero title par defaut quand content vide', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .hero-title')).toBeTruthy();
  });

  it('affiche les overrides quand content fournit eyebrow/title/lead', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('content', {
      'home.hero.eyebrow': 'Mon eyebrow',
      'home.hero.title': 'Mon titre',
      'home.hero.lead': 'Mon lead',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .eyebrow').textContent).toContain('Mon eyebrow');
    expect(fixture.nativeElement.querySelector('.hero .hero-title').textContent).toContain('Mon titre');
    expect(fixture.nativeElement.querySelector('.hero .lead').textContent).toContain('Mon lead');
  });

  it('rend null state quand data est null', () => {
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero')).toBeNull();
  });
});
```

- [ ] **Step 1.2 : Vérifier l'échec**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 4 tests FAIL.

- [ ] **Step 1.3 : Créer le composant minimal**

```ts
// home-view.component.ts
import { Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { HomePageData } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { roleStyle } from '../../utils/title-style';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [NgStyle],
  template: `
    @if (data) {
      <section class="hero">
        <div class="container">
          <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ heroEyebrow() }}</span>
          <h1 class="hero-title" [ngStyle]="titleStyle()">{{ heroTitle() }}</h1>
          <p class="lead">{{ heroLead() }}</p>
        </div>
      </section>
    }
  `,
  styles: [`
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; white-space: pre-line; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }
  `]
})
export class HomeViewComponent {
  @Input({ required: true }) data: HomePageData | null = null;
  @Input() content: SiteContent = {};

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }

  protected heroEyebrow(): string {
    return this.content['home.hero.eyebrow'] || 'Atelier Lumen — Portfolio';
  }
  protected heroTitle(): string {
    const t = this.content['home.hero.title'];
    return (t && t.trim()) ? t : 'Mobilier sculpté,\nscénographies vivantes.';
  }
  protected heroLead(): string {
    return this.content['home.hero.lead'] || 'À feuilleter en stories, à explorer en profondeur.';
  }
}
```

- [ ] **Step 1.4 : Vérifier les tests passent**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 4 tests PASS.

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/components/home-view/
git commit -m "feat(wysiwyg-home): squelette <app-home-view> hero only + tests"
```

---

## Task 2: Étendre view (news-sliders 3 zones + feed grid + story-viewer)

**Files:**
- Modify: `frontend/src/app/components/home-view/home-view.component.ts`
- Modify: `frontend/src/app/components/home-view/home-view.component.spec.ts`

- [ ] **Step 2.1 : Lire la structure home.component.ts actuelle pour référence**

```powershell
sed -n '20,90p' frontend/src/app/pages/home/home.component.ts
```

Note les sections rendues :
1. Hero (Task 1, fait)
2. News-slider zone `home-top` (conditionnel via `sliderByZone()['home-top']`)
3. News-slider zone `home-middle`
4. Section feed (grid avec h2 title + cards mobilier/expo + canvas cover + meta + cta)
5. News-slider zone `home-bottom`
6. Story-viewer modale conditionnel

- [ ] **Step 2.2 : Étendre Inputs + template + imports**

Ajouter à `home-view.component.ts` :

```ts
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventEmitter, Output, computed } from '@angular/core';
import { NewsSliderComponent } from '../news-slider/news-slider.component';
import { StoryViewerComponent, StoryItem } from '../story-viewer/story-viewer.component';
import { HomeFeedItem } from '../../models/home.model';
import { NewsSliderView, SLIDER_ZONES, SliderStoryRef } from '../../models/news-slider.model';

// dans @Component imports: [...] ajouter CommonModule, RouterLink, NewsSliderComponent, StoryViewerComponent

// dans la classe :
@Input() sliders: NewsSliderView[] = [];
@Input() viewerQueue: StoryItem[] = [];

@Output() storyOpen = new EventEmitter<SliderStoryRef>();
@Output() viewerClosed = new EventEmitter<void>();

protected feedTitleStyle(): Record<string, string> { return roleStyle(this.content, 'section-title'); }
protected cardTitleStyle(): Record<string, string> { return roleStyle(this.content, 'card-title'); }

protected feedTitleText(): string { return this.content['home.feed.title'] || ''; }

protected readonly sliderByZone = computed(() => {
  const map: Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> = {};
  for (const s of this.sliders) {
    if ((SLIDER_ZONES as readonly string[]).includes(s.zoneKey)) {
      map[s.zoneKey as 'home-top' | 'home-middle' | 'home-bottom'] = s;
    }
  }
  return map;
});

protected cardLink(item: HomeFeedItem): string[] {
  return item.kind === 'exhibition' ? ['/expositions', item.slug] : ['/mobilier', item.slug];
}

protected onSliderStoryOpen(story: SliderStoryRef): void {
  this.storyOpen.emit(story);
}

protected onViewerClosed(): void {
  this.viewerClosed.emit();
}
```

**Note** : `sliderByZone()` doit utiliser `this.sliders` (champ d'instance, pas un signal Input). Avec un computed qui dépend du field instance, on doit s'assurer que le computed re-calcule quand l'Input change. Pattern : utiliser un getter au lieu de computed pour éviter la sémantique signal.

Adapter en getter simple :
```ts
protected sliderByZone(): Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> {
  const map: Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> = {};
  for (const s of this.sliders) {
    if ((SLIDER_ZONES as readonly string[]).includes(s.zoneKey)) {
      map[s.zoneKey as 'home-top' | 'home-middle' | 'home-bottom'] = s;
    }
  }
  return map;
}
```

Template étendu (après le hero) :

```html
@if (sliderByZone()['home-top']; as s) {
  <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
}

@if (sliderByZone()['home-middle']; as s) {
  <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
}

<section class="feed">
  <div class="container">
    @if (feedTitleText(); as t) {
      <h2 class="feed-title" [ngStyle]="feedTitleStyle()">{{ t }}</h2>
    }
    @if (data.feed.length > 0) {
      <div class="grid">
        @for (item of data.feed; track item.slug) {
          <a class="card" [routerLink]="cardLink(item)">
            @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
            <div class="thumb">
              <app-cropped-image-canvas
                [imageUrl]="item.cover" [crop]="item.coverCrop ?? null"
                [alt]="item.title" mode="cover" />
            </div>
            <div class="meta">
              <span class="cat" [ngStyle]="eyebrowStyle()">{{ item.subtitle }}</span>
              <h3 class="title" [ngStyle]="cardTitleStyle()">{{ item.title }}</h3>
              @if (item.description) { <p class="excerpt">{{ item.description }}</p> }
              <span class="cta">Découvrir <span class="arrow" aria-hidden="true">→</span></span>
            </div>
          </a>
        }
      </div>
    }
  </div>
</section>

@if (sliderByZone()['home-bottom']; as s) {
  <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
}

@if (viewerQueue.length > 0) {
  <app-story-viewer [queue]="viewerQueue" (closed)="onViewerClosed()"></app-story-viewer>
}
```

Ajouter `CroppedImageCanvasComponent` à imports.

Copier les styles `.feed`, `.feed-title`, `.grid`, `.card`, `.thumb`, `.meta`, `.cat`, `.title`, `.excerpt`, `.cta`, `.badge`, media queries depuis l'actuel `home.component.ts`.

- [ ] **Step 2.3 : Étendre tests**

Ajouter :

```ts
it('rend une card par item du feed', () => {
  const data = { feed: [
    { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'Mobilier · 2025', cover: '/a.jpg', coverCrop: null, description: '' },
    { kind: 'exhibition', slug: 'b', title: 'B', subtitle: 'Galerie X', cover: '/b.jpg', coverCrop: null, description: '' },
  ]} as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.feed .card').length).toBe(2);
});

it('affiche le badge Exposition sur les items kind=exhibition', () => {
  const data = { feed: [
    { kind: 'exhibition', slug: 'b', title: 'B', subtitle: 'X', cover: '/b.jpg', coverCrop: null, description: '' },
  ]} as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.feed .badge').textContent).toContain('Exposition');
});

it('rend les news sliders dans les bonnes zones', () => {
  const data = { feed: [] } as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('sliders', [
    { id: 's-top', zoneKey: 'home-top', title: 'Top', stories: [] },
    { id: 's-bottom', zoneKey: 'home-bottom', title: 'Bottom', stories: [] },
  ]);
  fixture.detectChanges();
  const sliders = fixture.nativeElement.querySelectorAll('app-news-slider');
  expect(sliders.length).toBe(2);
});

it('emet storyOpen quand un slider emet', () => {
  const data = { feed: [] } as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.storyOpen.subscribe(s => emitted = s);
  (fixture.componentInstance as any).onSliderStoryOpen({ id: 'st-1' } as any);
  expect(emitted).toEqual({ id: 'st-1' } as any);
});

it('rend le story-viewer quand viewerQueue non vide', () => {
  const data = { feed: [] } as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('viewerQueue', [{ id: 'q1' } as any]);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-story-viewer')).toBeTruthy();
});

it('emet viewerClosed depuis le story-viewer', () => {
  const data = { feed: [] } as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  let emitted = false;
  fixture.componentInstance.viewerClosed.subscribe(() => emitted = true);
  (fixture.componentInstance as any).onViewerClosed();
  expect(emitted).toBeTrue();
});
```

- [ ] **Step 2.4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 10 tests PASS.

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/components/home-view/
git commit -m "feat(wysiwyg-home): view ajoute news-sliders + feed grid + story-viewer"
```

---

## Task 3: Mode editable (hero inline + cards overlay inclusion+drag + sliders cartouche)

**Files:**
- Modify: `frontend/src/app/components/home-view/home-view.component.ts`
- Modify: `frontend/src/app/components/home-view/home-view.component.spec.ts`

- [ ] **Step 3.1 : Ajouter Input editable + Outputs + types + imports**

```ts
import { ReorderableDirective } from '../../directives/reorderable.directive';

export type EditableHomeContentKey =
  | 'home.hero.eyebrow' | 'home.hero.title' | 'home.hero.lead';

@Input() editable = false;
@Input() includedSlugs: Set<string> = new Set();  // pour styler les cards exclues

@Output() feedReorder = new EventEmitter<number[]>();
@Output() feedItemToggleInclude = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string; included: boolean }>();
@Output() textFieldEdit = new EventEmitter<{ key: EditableHomeContentKey; value: string }>();
@Output() sliderEditRequested = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();

protected editingKey: EditableHomeContentKey | null = null;

protected isEditingKey(k: EditableHomeContentKey): boolean | null {
  return this.editingKey === k ? true : null;
}

protected isIncluded(item: HomeFeedItem): boolean {
  return this.includedSlugs.has(item.kind + ':' + item.slug);
}

protected onToggleInclude(item: HomeFeedItem, ev: Event): void {
  const checked = (ev.target as HTMLInputElement).checked;
  this.feedItemToggleInclude.emit({ kind: item.kind, slug: item.slug, included: checked });
}

protected startInlineEdit(ev: Event, key: EditableHomeContentKey): void {
  ev.preventDefault();
  ev.stopPropagation();
  this.editingKey = key;
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

protected commitInlineEdit(ev: FocusEvent, key: EditableHomeContentKey): void {
  if (this.editingKey !== key) return;
  const el = ev.target as HTMLElement;
  const value = (el.textContent ?? '').trim();
  this.editingKey = null;
  this.textFieldEdit.emit({ key, value });
}

protected onInlineEnter(ev: Event, key: EditableHomeContentKey): void {
  if (this.editingKey === key) {
    ev.preventDefault();
    (ev.target as HTMLElement).blur();
  }
}

protected cancelInlineEdit(ev: Event): void {
  if (!this.editingKey) return;
  ev.preventDefault();
  this.editingKey = null;
  (ev.target as HTMLElement).blur();
}

protected onSliderEditRequested(zone: 'home-top' | 'home-middle' | 'home-bottom'): void {
  this.sliderEditRequested.emit(zone);
}
```

Ajouter `ReorderableDirective` à imports.

- [ ] **Step 3.2 : Template hero editable**

Remplacer le `<section class="hero">` :

```html
<section class="hero" [class.editable]="editable">
  <div class="container">
    @if (editable) {
      <span class="eyebrow editable-text" tabindex="0" [ngStyle]="eyebrowStyle()"
            [attr.contenteditable]="isEditingKey('home.hero.eyebrow')"
            (click)="textFieldEdit.emit({ key: 'home.hero.eyebrow', value: heroEyebrow() })"
            (dblclick)="startInlineEdit($event, 'home.hero.eyebrow')"
            (blur)="commitInlineEdit($event, 'home.hero.eyebrow')"
            (keydown.enter)="onInlineEnter($event, 'home.hero.eyebrow')"
            (keydown.escape)="cancelInlineEdit($event)">{{ heroEyebrow() }}</span>
      <h1 class="hero-title editable-text" tabindex="0" [ngStyle]="titleStyle()"
          [attr.contenteditable]="isEditingKey('home.hero.title')"
          (click)="textFieldEdit.emit({ key: 'home.hero.title', value: heroTitle() })"
          (dblclick)="startInlineEdit($event, 'home.hero.title')"
          (blur)="commitInlineEdit($event, 'home.hero.title')"
          (keydown.enter)="onInlineEnter($event, 'home.hero.title')"
          (keydown.escape)="cancelInlineEdit($event)">{{ heroTitle() }}</h1>
      <p class="lead editable-text" tabindex="0"
         [attr.contenteditable]="isEditingKey('home.hero.lead')"
         (click)="textFieldEdit.emit({ key: 'home.hero.lead', value: heroLead() })"
         (dblclick)="startInlineEdit($event, 'home.hero.lead')"
         (blur)="commitInlineEdit($event, 'home.hero.lead')"
         (keydown.enter)="onInlineEnter($event, 'home.hero.lead')"
         (keydown.escape)="cancelInlineEdit($event)">{{ heroLead() }}</p>
    } @else {
      <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ heroEyebrow() }}</span>
      <h1 class="hero-title" [ngStyle]="titleStyle()">{{ heroTitle() }}</h1>
      <p class="lead">{{ heroLead() }}</p>
    }
  </div>
</section>
```

- [ ] **Step 3.3 : Template sliders cartouche `[i]`**

Wrapper chaque `<app-news-slider>` quand editable :

```html
@if (sliderByZone()['home-top']; as s) {
  <div class="slider-wrap" [class.editable]="editable">
    <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
    @if (editable) {
      <button type="button" class="slider-edit-badge" aria-label="Éditer ce slider (Sliders dans Modifier)"
              (click)="onSliderEditRequested('home-top')">i</button>
    }
  </div>
}
```

Idem pour `home-middle` et `home-bottom`.

- [ ] **Step 3.4 : Template feed cards editable**

Remplacer le `<div class="grid">` :

```html
@if (data.feed.length > 0) {
  @if (editable) {
    <ul class="grid editable" appReorderable (reordered)="feedReorder.emit($event)">
      @for (item of data.feed; track item.slug; let i = $index) {
        <li class="card editable" [class.excluded]="!isIncluded(item)">
          @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
          @if (!isIncluded(item)) { <span class="excluded-badge">Exclu</span> }
          <div class="thumb">
            <app-cropped-image-canvas [imageUrl]="item.cover" [crop]="item.coverCrop ?? null" [alt]="item.title" mode="cover" />
          </div>
          <div class="meta">
            <span class="cat">{{ item.subtitle }}</span>
            <h3 class="title">{{ item.title }}</h3>
          </div>
          <div class="edit-overlay">
            <label class="incl-toggle">
              <input type="checkbox" [checked]="isIncluded(item)" (change)="onToggleInclude(item, $event)" />
              <span>Inclus</span>
            </label>
            <div class="drag-handle" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</div>
          </div>
        </li>
      }
    </ul>
  } @else {
    <div class="grid">
      @for (item of data.feed; track item.slug) {
        <a class="card" [routerLink]="cardLink(item)">
          @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
          <div class="thumb">
            <app-cropped-image-canvas [imageUrl]="item.cover" [crop]="item.coverCrop ?? null" [alt]="item.title" mode="cover" />
          </div>
          <div class="meta">
            <span class="cat" [ngStyle]="eyebrowStyle()">{{ item.subtitle }}</span>
            <h3 class="title" [ngStyle]="cardTitleStyle()">{{ item.title }}</h3>
            @if (item.description) { <p class="excerpt">{{ item.description }}</p> }
            <span class="cta">Découvrir <span class="arrow" aria-hidden="true">→</span></span>
          </div>
        </a>
      }
    </div>
  }
}
```

- [ ] **Step 3.5 : Styles editable**

Ajouter :

```css
.editable-text { cursor: pointer; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color 180ms ease; border-radius: 2px; }
.editable-text:hover, .editable-text:focus-visible { outline-color: currentColor; }
.editable-text[contenteditable="true"] { outline: 2px solid var(--color-accent, #2a9d8f); outline-offset: 4px; background: rgba(0,0,0,0.03); cursor: text; }

.slider-wrap { position: relative; }
.slider-edit-badge {
  position: absolute; top: 16px; right: 32px; z-index: 5;
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--color-ink); color: var(--color-bg);
  border: 0; font-family: serif; font-style: italic; font-weight: bold;
  cursor: pointer; opacity: 0.6; transition: opacity 180ms ease, transform 180ms ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
.slider-edit-badge:hover { opacity: 1; transform: scale(1.1); }

.grid.editable { list-style: none; padding: 0; }
.grid.editable > li.card { position: relative; }
.grid.editable > li.card.excluded { opacity: 0.35; }
.excluded-badge { position: absolute; top: 14px; right: 14px; background: #c44; color: #fff; font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; z-index: 2; }
.card.editable .edit-overlay {
  position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: space-between;
  background: rgba(0,0,0,0.0); opacity: 0; transition: opacity 180ms ease, background 180ms ease;
  padding: 12px; z-index: 3;
}
.card.editable:hover .edit-overlay { opacity: 1; background: rgba(0,0,0,0.45); }
.card.editable .incl-toggle {
  background: var(--color-bg); color: var(--color-ink); padding: 6px 10px;
  display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; cursor: pointer;
}
.card.editable .drag-handle {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--color-ink); color: var(--color-bg); border: 2px solid var(--color-bg);
  border-radius: 50%; font-size: 0.85rem; letter-spacing: -2px; cursor: grab;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.card.editable .drag-handle:active { cursor: grabbing; }
```

- [ ] **Step 3.6 : Tests mode editable**

Ajouter :

```ts
it('startInlineEdit met editingKey pour title', () => {
  fixture.componentRef.setInput('data', mockData);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  const el = document.createElement('h1');
  el.textContent = 'X';
  document.body.appendChild(el);
  const fake = { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: el };
  cmp.startInlineEdit(fake, 'home.hero.title');
  expect(cmp.editingKey).toBe('home.hero.title');
  document.body.removeChild(el);
});

it('commitInlineEdit emet textFieldEdit avec key+value trim', (done) => {
  fixture.componentRef.setInput('data', mockData);
  fixture.componentRef.setInput('editable', true);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.editingKey = 'home.hero.title';
  cmp.textFieldEdit.subscribe((e: any) => {
    expect(e).toEqual({ key: 'home.hero.title', value: 'Nouveau' });
    expect(cmp.editingKey).toBeNull();
    done();
  });
  const el = document.createElement('h1');
  el.textContent = '  Nouveau  ';
  cmp.commitInlineEdit({ target: el } as any, 'home.hero.title');
});

it('rend les cards en <ul.editable> avec overlay quand editable=true', () => {
  const data = { feed: [
    { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
  ]} as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('editable', true);
  fixture.componentRef.setInput('includedSlugs', new Set(['furniture:a']));
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.grid.editable')).toBeTruthy();
  expect(fixture.nativeElement.querySelector('.card.editable')).toBeTruthy();
  expect(fixture.nativeElement.querySelector('.card.editable .edit-overlay')).toBeTruthy();
});

it('emet feedItemToggleInclude au change checkbox', () => {
  const data = { feed: [
    { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
  ]} as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('editable', true);
  fixture.componentRef.setInput('includedSlugs', new Set(['furniture:a']));
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.feedItemToggleInclude.subscribe(e => emitted = e);
  const checkbox = fixture.nativeElement.querySelector('.incl-toggle input') as HTMLInputElement;
  checkbox.checked = false;
  checkbox.dispatchEvent(new Event('change'));
  expect(emitted).toEqual({ kind: 'furniture', slug: 'a', included: false });
});

it('badge Exclu sur les cards non incluses', () => {
  const data = { feed: [
    { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
  ]} as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('editable', true);
  fixture.componentRef.setInput('includedSlugs', new Set());  // vide -> exclu
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.excluded-badge')).toBeTruthy();
  expect(fixture.nativeElement.querySelector('.card.excluded')).toBeTruthy();
});

it('emet sliderEditRequested au clic sur cartouche', () => {
  const data = { feed: [] } as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('editable', true);
  fixture.componentRef.setInput('sliders', [
    { id: 's-top', zoneKey: 'home-top', title: 'Top', stories: [] },
  ]);
  fixture.detectChanges();
  let emitted: any = null;
  fixture.componentInstance.sliderEditRequested.subscribe(z => emitted = z);
  const btn = fixture.nativeElement.querySelector('.slider-edit-badge') as HTMLButtonElement;
  btn.click();
  expect(emitted).toBe('home-top');
});

it('overlays cards absents quand editable=false', () => {
  const data = { feed: [
    { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
  ]} as unknown as HomePageData;
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.edit-overlay')).toBeNull();
});
```

- [ ] **Step 3.7 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home-view.component.spec.ts' 2>&1 | tail -5
```
Attendu : 17 tests PASS.

- [ ] **Step 3.8 : Build prod**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng build --configuration production 2>&1 | tail -3
```

- [ ] **Step 3.9 : Commit**

```powershell
git add frontend/src/app/components/home-view/
git commit -m "feat(wysiwyg-home): view mode editable hero inline + cards overlay + sliders cartouche"
```

---

## Task 4: Refactor `home.component.ts` (public) pour déléguer au view

**Files:**
- Modify: `frontend/src/app/pages/home/home.component.ts`
- Modify: `frontend/src/app/pages/home/home.component.spec.ts`

- [ ] **Step 4.1 : Lire les méthodes actuelles**

```powershell
grep -n "openStoryFromSlider\|cardLink\|heroEyebrow\|heroTitle\|heroLead\|feedTitle\|sliderByZone\|enrichSlides" frontend/src/app/pages/home/home.component.ts | head -20
```

- [ ] **Step 4.2 : Réécrire le composant page**

```ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { HomePageData } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { NewsSliderView, SliderStoryRef } from '../../models/news-slider.model';
import { LoadingService } from '../../services/loading.service';
import { StoryItem } from '../../components/story-viewer/story-viewer.component';
import { enrichSlides } from '../../utils/display-slides';
import { HomeViewComponent } from '../../components/home-view/home-view.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HomeViewComponent],
  template: `
    <app-home-view
      [data]="data()"
      [content]="content()"
      [sliders]="sliders()"
      [viewerQueue]="viewerQueue()"
      (storyOpen)="openStoryFromSlider($event)"
      (viewerClosed)="closeViewer()" />
  `,
  styles: []
})
export class HomeComponent implements OnInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected data = signal<HomePageData | null>(null);
  protected viewerQueue = signal<StoryItem[]>([]);
  protected content = signal<SiteContent>({});
  protected sliders = signal<NewsSliderView[]>([]);

  ngOnInit() {
    this.loadingSvc.start('page');
    forkJoin({
      home: this.portfolio.getHome(),
      content: this.portfolio.getContent(),
      sliders: this.portfolio.getSliders(),
    }).subscribe({
      next: ({ home, content, sliders }) => {
        this.data.set(home);
        this.content.set(content);
        this.sliders.set(sliders);
        this.loadingSvc.done('page');
      },
      error: () => { this.loadingSvc.done('page'); }
    });
  }

  openStoryFromSlider(story: SliderStoryRef): void {
    const home = this.data();
    if (!home) return;
    this.viewerQueue.set([{
      storyId: story.id,
      slug: story.slug,
      ownerKind: story.ownerKind,
      ownerLabel: story.ownerLabel,
      slides: enrichSlides({
        slug: story.slug,
        coverImage: story.coverImage,
        coverCrop: story.coverCrop,
        slides: [],
        showStoryLink: true,
      }, story.ownerKind),
      startAt: 0,
    } as unknown as StoryItem]);
  }

  closeViewer() { this.viewerQueue.set([]); }
}
```

(Vérifier les vraies signatures via `grep` :)

```powershell
grep -n "getHome\|getContent\|getSliders" frontend/src/app/services/portfolio.service.ts
```

Adapter si différent.

- [ ] **Step 4.3 : Adapter tests**

```powershell
grep -n "describe\|it(" frontend/src/app/pages/home/home.component.spec.ts
```

Stratégie :
- Suppression des tests sur les sélecteurs déplacés (`.hero .eyebrow`, `.feed .card`).
- Adaptation : sélecteur `app-home-view` (présence).
- Garder tests sur openStoryFromSlider, closeViewer, signal load.
- Ajouter test "passe data/content/sliders/viewerQueue au view".

- [ ] **Step 4.4 : Run unit tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home/home.component.spec.ts' 2>&1 | tail -5
```

- [ ] **Step 4.5 : Playwright SANS --update**

```powershell
cd frontend && npm run test:visual:docker -- --grep="home" 2>&1 | tail -10
```
Attendu : PASS sans diff.
- Si FAIL : examiner. La home utilise déjà canvas pour les covers du masonry (sous-projet 1). Pas de migration cover prévue. Reportez tout écart à Task 7 (validation utilisateur).

- [ ] **Step 4.6 : Commit**

```powershell
git add frontend/src/app/pages/home/
git commit -m "refactor(wysiwyg-home): home delegue le rendu a <app-home-view>"
```

---

## Task 5: Créer `<app-home-preview>` (wrapper admin)

**Files:**
- Create: `frontend/src/app/pages/admin/accueil/preview/home-preview.component.ts`
- Create: `frontend/src/app/pages/admin/accueil/preview/home-preview.component.spec.ts`

- [ ] **Step 5.1 : Écrire les tests**

```ts
// home-preview.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { HomePreviewComponent } from './home-preview.component';
import { HomePageData } from '../../../../models/home.model';

describe('HomePreviewComponent', () => {
  let fixture: ComponentFixture<HomePreviewComponent>;

  function setup(data: HomePageData | null = null, content: any = {}, sliders: any[] = [], included: Set<string> = new Set()) {
    TestBed.configureTestingModule({
      imports: [HomePreviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomePreviewComponent);
    fixture.componentRef.setInput('data', signal(data).asReadonly());
    fixture.componentRef.setInput('content', signal(content).asReadonly());
    fixture.componentRef.setInput('sliders', signal(sliders).asReadonly());
    fixture.componentRef.setInput('includedSlugs', signal(included).asReadonly());
    fixture.detectChanges();
  }

  it('rend <app-home-view> en mode editable', () => {
    setup({ feed: [] } as unknown as HomePageData);
    expect(fixture.nativeElement.querySelector('app-home-view')).toBeTruthy();
  });

  it('reemet feedReorder du view', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.feedReorder.subscribe(o => emitted = o);
    (fixture.componentInstance as any).onFeedReorder([2, 0, 1]);
    expect(emitted).toEqual([2, 0, 1]);
  });

  it('reemet feedItemToggleInclude', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.feedItemToggleInclude.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onFeedItemToggleInclude({ kind: 'furniture', slug: 'a', included: false });
    expect(emitted).toEqual({ kind: 'furniture', slug: 'a', included: false });
  });

  it('reemet textFieldEdit', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.textFieldEdit.subscribe(e => emitted = e);
    (fixture.componentInstance as any).onTextFieldEdit({ key: 'home.hero.title', value: 'X' });
    expect(emitted).toEqual({ key: 'home.hero.title', value: 'X' });
  });

  it('reemet sliderEditRequested', () => {
    setup({ feed: [] } as unknown as HomePageData);
    let emitted: any = null;
    fixture.componentInstance.sliderEditRequested.subscribe(z => emitted = z);
    (fixture.componentInstance as any).onSliderEditRequested('home-top');
    expect(emitted).toBe('home-top');
  });
});
```

- [ ] **Step 5.2 : Vérifier l'échec**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home-preview.component.spec.ts' 2>&1 | tail -5
```

- [ ] **Step 5.3 : Créer le composant**

```ts
// home-preview.component.ts
import { Component, EventEmitter, Input, Output, Signal } from '@angular/core';
import { HomePageData } from '../../../../models/home.model';
import { SiteContent } from '../../../../models/site-content.model';
import { NewsSliderView } from '../../../../models/news-slider.model';
import { EditableHomeContentKey, HomeViewComponent } from '../../../../components/home-view/home-view.component';

@Component({
  selector: 'app-home-preview',
  standalone: true,
  imports: [HomeViewComponent],
  template: `
    <app-home-view
      [data]="data()"
      [content]="content()"
      [sliders]="sliders()"
      [includedSlugs]="includedSlugs()"
      [editable]="true"
      (feedReorder)="onFeedReorder($event)"
      (feedItemToggleInclude)="onFeedItemToggleInclude($event)"
      (textFieldEdit)="onTextFieldEdit($event)"
      (sliderEditRequested)="onSliderEditRequested($event)" />
  `,
  styles: []
})
export class HomePreviewComponent {
  @Input({ required: true }) data!: Signal<HomePageData | null>;
  @Input({ required: true }) content!: Signal<SiteContent>;
  @Input({ required: true }) sliders!: Signal<NewsSliderView[]>;
  @Input({ required: true }) includedSlugs!: Signal<Set<string>>;

  @Output() feedReorder = new EventEmitter<number[]>();
  @Output() feedItemToggleInclude = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string; included: boolean }>();
  @Output() textFieldEdit = new EventEmitter<{ key: EditableHomeContentKey; value: string }>();
  @Output() sliderEditRequested = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();

  protected onFeedReorder(o: number[]): void { this.feedReorder.emit(o); }
  protected onFeedItemToggleInclude(e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }): void { this.feedItemToggleInclude.emit(e); }
  protected onTextFieldEdit(e: { key: EditableHomeContentKey; value: string }): void { this.textFieldEdit.emit(e); }
  protected onSliderEditRequested(z: 'home-top' | 'home-middle' | 'home-bottom'): void { this.sliderEditRequested.emit(z); }
}
```

- [ ] **Step 5.4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home-preview.component.spec.ts' 2>&1 | tail -5
```
Attendu : 5 tests PASS.

- [ ] **Step 5.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/accueil/preview/
git commit -m "feat(wysiwyg-home): <app-home-preview> wrap le view en mode editable avec signaux"
```

---

## Task 6: Toggle Modifier/Aperçu dans `AccueilComponent` + handlers + auto-save updateContent

**Files:**
- Modify: `frontend/src/app/pages/admin/accueil/accueil.component.ts`
- Modify: `frontend/src/app/pages/admin/accueil/accueil.component.spec.ts`

- [ ] **Step 6.1 : Lire structure actuelle**

```powershell
grep -n "homeItems\|toggleIncluded\|onFeedReorder\|getHome\|getContent\|getSliders\|updateContent" frontend/src/app/pages/admin/accueil/accueil.component.ts | head -10
```

- [ ] **Step 6.2 : Imports + signals + handlers + template toggle**

Ajouter à `accueil.component.ts` :

```ts
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { Subscription, forkJoin } from 'rxjs';
import { HomePreviewComponent } from './preview/home-preview.component';
import { HomePageData } from '../../../models/home.model';
import { SiteContent } from '../../../models/site-content.model';
import { NewsSliderView } from '../../../models/news-slider.model';

// dans @Component imports: [...] ajouter A11yModule, HomePreviewComponent

// dans la classe :
protected readonly accueilViewMode = signal<'form' | 'preview'>('form');
protected readonly previewFullscreen = signal(false);
protected readonly homeData = signal<HomePageData | null>(null);
protected readonly content = signal<SiteContent>({});
protected readonly sliders = signal<NewsSliderView[]>([]);

protected readonly includedSlugs = computed(() => {
  const items = this.homeItems();
  if (!items) return new Set<string>();
  return new Set(items.filter(i => i.included).map(i => i.kind + ':' + i.slug));
});

ngOnInit(): void {
  // si ngOnInit existe deja, integrer les calls supplementaires
  forkJoin({
    home: this.portfolio.getHome(),
    content: this.portfolio.getContent(),
    sliders: this.portfolio.getSliders(),
  }).subscribe(({ home, content, sliders }) => {
    this.homeData.set(home);
    this.content.set(content);
    this.sliders.set(sliders);
  });
}

protected togglePreviewFullscreen(): void { this.previewFullscreen.update(v => !v); }
protected previewFullscreenLabel(): string {
  return this.previewFullscreen() ? 'Réduire l’aperçu' : 'Aperçu plein écran';
}

protected onPreviewFeedReorder(order: number[]): void {
  // Reutilise la logique existante onFeedReorder
  this.onFeedReorder(order);
  // refresh homeData apres reorder (l'API endpoint le permet)
  this.portfolio.getHome().subscribe(h => this.homeData.set(h));
}

protected onPreviewFeedItemToggleInclude(e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }): void {
  const items = this.homeItems() ?? [];
  const target = items.find(it => it.kind === e.kind && it.slug === e.slug);
  if (!target) return;
  this.toggleIncluded(target, { target: { checked: e.included } } as unknown as Event);
  this.portfolio.getHome().subscribe(h => this.homeData.set(h));
}

protected onPreviewTextFieldEdit(e: { key: string; value: string }): void {
  // Whitelist defensive
  if (!['home.hero.eyebrow', 'home.hero.title', 'home.hero.lead'].includes(e.key)) return;
  const next: SiteContent = { ...this.content(), [e.key]: e.value };
  this.portfolio.updateContent(next).subscribe({
    next: () => {
      this.content.set(next);
      this.toast.success('Texte sauvegardé.');
    },
    error: () => this.toast.error('Erreur lors de la sauvegarde du texte.'),
  });
}

protected onSliderEditRequested(zone: 'home-top' | 'home-middle' | 'home-bottom'): void {
  this.accueilViewMode.set('form');
  // Scroll vers la section sliders form-side (existante via SlidersComponent)
  queueMicrotask(() => {
    const el = document.getElementById('admin-sliders-anchor');
    el?.scrollIntoView({ behavior: 'smooth' });
  });
}
```

Template — wrapper la zone d'édition :

```html
<div class="admin-split">
  <div class="admin-mode-bar" role="tablist" aria-label="Mode d'édition de l'accueil">
    <button type="button" role="tab" class="admin-mode-tab"
            [class.active]="accueilViewMode() === 'form'"
            [attr.aria-selected]="accueilViewMode() === 'form'"
            (click)="accueilViewMode.set('form')">
      ✏ Modifier l'accueil
    </button>
    <button type="button" role="tab" class="admin-mode-tab"
            [class.active]="accueilViewMode() === 'preview'"
            [attr.aria-selected]="accueilViewMode() === 'preview'"
            (click)="accueilViewMode.set('preview')">
      👁 Aperçu
    </button>
  </div>

  <section class="admin-form" [class.is-hidden]="accueilViewMode() !== 'form'">
    <!-- contenu existant (ordre éditorial + sliders) -->
    <div class="home-editor">
      <h2>Ordre éditorial du masonry</h2>
      ...
    </div>
    <div class="home-editor sliders-section" id="admin-sliders-anchor">
      <app-admin-sliders />
    </div>
  </section>

  @if (accueilViewMode() === 'preview') {
    <aside class="admin-preview" [class.fullscreen]="previewFullscreen()"
           [attr.aria-modal]="previewFullscreen() ? 'true' : null"
           [attr.role]="previewFullscreen() ? 'dialog' : null"
           [cdkTrapFocus]="previewFullscreen()"
           [cdkTrapFocusAutoCapture]="previewFullscreen()"
           aria-label="Aperçu de l'accueil">
      <div class="admin-preview-toolbar">
        <span class="admin-preview-label">Aperçu</span>
        <button type="button" class="btn-preview-toggle"
                (click)="togglePreviewFullscreen()"
                [attr.aria-label]="previewFullscreenLabel()">
          @if (previewFullscreen()) { ⤡ Réduire } @else { ⤢ Plein écran }
        </button>
      </div>
      <app-home-preview
        [data]="homeData.asReadonly ? homeData.asReadonly() : homeData"
        [content]="content.asReadonly ? content.asReadonly() : content"
        [sliders]="sliders.asReadonly ? sliders.asReadonly() : sliders"
        [includedSlugs]="includedSlugs"
        (feedReorder)="onPreviewFeedReorder($event)"
        (feedItemToggleInclude)="onPreviewFeedItemToggleInclude($event)"
        (textFieldEdit)="onPreviewTextFieldEdit($event)"
        (sliderEditRequested)="onSliderEditRequested($event)" />
    </aside>
  }
</div>
```

Note : signals créés par `signal()` ne sont pas writable signals à l'origine — sauf si on les crée avec `signal()` directement (qui retourne `WritableSignal`). Pour le binding `[data]`, on passe `this.homeData` (le signal lui-même), pas `this.homeData()`.

```html
[data]="homeData"
[content]="content"
[sliders]="sliders"
[includedSlugs]="includedSlugs"
```

(Les Inputs typed `Signal<T>` reçoivent le signal — qui sera dereferencé par le binding `[data]="data()"` dans le view.)

Styles admin-split / admin-mode-bar / admin-form.is-hidden / admin-preview / admin-preview-toolbar — copier depuis `expositions.component.ts` (sous-projet 3 mergé).

- [ ] **Step 6.3 : Tests**

Ajouter :

```ts
it('accueilViewMode default form, switche preview', () => {
  configure();
  const fixture = TestBed.createComponent(AccueilComponent);
  fixture.detectChanges();
  // flush APIs ... adapter selon convention existante
  const cmp = fixture.componentInstance as any;
  expect(cmp.accueilViewMode()).toBe('form');
  cmp.accueilViewMode.set('preview');
  expect(cmp.accueilViewMode()).toBe('preview');
});

it('onPreviewTextFieldEdit appelle updateContent avec map mergee', () => {
  configure();
  const fixture = TestBed.createComponent(AccueilComponent);
  fixture.detectChanges();
  // ... flush ...
  const cmp = fixture.componentInstance as any;
  cmp.content.set({ 'home.hero.eyebrow': 'Ancien' });
  cmp.onPreviewTextFieldEdit({ key: 'home.hero.title', value: 'Nouveau titre' });
  const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content');
  expect(req.request.body['home.hero.eyebrow']).toBe('Ancien');
  expect(req.request.body['home.hero.title']).toBe('Nouveau titre');
  req.flush({});
  expect(cmp.content()['home.hero.title']).toBe('Nouveau titre');
});

it('onPreviewTextFieldEdit ignore les clés hors whitelist', () => {
  configure();
  const fixture = TestBed.createComponent(AccueilComponent);
  fixture.detectChanges();
  // ... flush ...
  const cmp = fixture.componentInstance as any;
  cmp.onPreviewTextFieldEdit({ key: 'home.hero.evil', value: 'x' });
  httpMock.expectNone(r => r.method === 'PUT' && r.url === '/api/admin/content');
});

it('togglePreviewFullscreen bascule', () => {
  configure();
  const fixture = TestBed.createComponent(AccueilComponent);
  fixture.detectChanges();
  // ... flush ...
  const cmp = fixture.componentInstance as any;
  expect(cmp.previewFullscreen()).toBeFalse();
  cmp.togglePreviewFullscreen();
  expect(cmp.previewFullscreen()).toBeTrue();
});

it('includedSlugs reflete les items inclus', () => {
  configure();
  const fixture = TestBed.createComponent(AccueilComponent);
  fixture.detectChanges();
  // ... flush ...
  const cmp = fixture.componentInstance as any;
  cmp.homeItems.set([
    { kind: 'furniture', slug: 'a', included: true } as any,
    { kind: 'exhibition', slug: 'b', included: false } as any,
  ]);
  const set = cmp.includedSlugs();
  expect(set.has('furniture:a')).toBeTrue();
  expect(set.has('exhibition:b')).toBeFalse();
});

it('onSliderEditRequested switch mode + scroll', () => {
  configure();
  const fixture = TestBed.createComponent(AccueilComponent);
  fixture.detectChanges();
  // ... flush ...
  const cmp = fixture.componentInstance as any;
  const anchor = document.createElement('div');
  anchor.id = 'admin-sliders-anchor';
  document.body.appendChild(anchor);
  spyOn(anchor, 'scrollIntoView');
  cmp.accueilViewMode.set('preview');
  cmp.onSliderEditRequested('home-top');
  expect(cmp.accueilViewMode()).toBe('form');
  document.body.removeChild(anchor);
});
```

- [ ] **Step 6.4 : Run tests + build**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -3
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng build --configuration production 2>&1 | tail -3
```

- [ ] **Step 6.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/accueil/
git commit -m "feat(wysiwyg-home): toggle Modifier/Aperçu + handlers preview + autoSave updateContent"
```

---

## Task 7: Validation visuelle utilisateur + Playwright

**Files:** aucun.

- [ ] **Step 7.1 : Lancer le stack**

```powershell
docker compose up --build -d
```

Une fois `http://localhost:4200` répond.

- [ ] **Step 7.2 : Tests admin**

`/admin` → login → `/admin/accueil` :
- Toggle ✏ Modifier / 👁 Aperçu en haut
- Mode Aperçu : rendu identique au public
- **Double-clic hero eyebrow** → contenteditable → taper → blur → toast "Texte sauvegardé."
- Idem title et lead
- Hover sur une card du feed → overlay avec checkbox Inclus + drag handle ⋮⋮
- Toggle checkbox → toast / refresh
- Drag d'une card → réordonne (auto-save existante)
- Cartouche `[i]` en haut-droite de chaque slider → click → switch vers Modifier + scroll vers la section sliders
- Bouton ⤢ Plein écran → preview occupe tout viewport
- En plein écran : focus trap fonctionne, échap pour sortir (s'il y a un handler)

- [ ] **Step 7.3 : Vérifier home public sans régression**

```powershell
cd frontend && npm run test:visual:docker -- --grep="home" 2>&1 | tail -10
```
Attendu : PASS sans diff.
- Si fail : examiner. La home utilise déjà le canvas (sous-projet 1). Pas de migration prévue. Reporter à validation utilisateur si écart cosmétique. Sinon fix dans le view.

- [ ] **Step 7.4 : Régénérer baselines home si nécessaire**

**SEULEMENT après validation visuelle manuelle utilisateur** :

```powershell
cd frontend && npm run test:visual:docker:update -- --grep="home" 2>&1 | tail -5
git add frontend/e2e/__screenshots__/home.spec.ts/
git commit -m "test(visual): regen baselines home apres extraction view (sous-projet 4/4)"
```

- [ ] **Step 7.5 : Demander confirmation utilisateur**

À l'utilisateur : "Validation visuelle OK ?"

---

## Task 8: Mise à jour doc + finishing branch

**Files:** docs.

- [ ] **Step 8.1 : Mettre à jour `docs/SPECIFICATION_TECHNIQUE.md`**

Bump version. Sections à étendre : composants `<app-home-view>` + `<app-home-preview>`, refactor `home.component.ts`, AccueilComponent avec auto-save inline via `updateContent`.

Référence : ADR-0018.

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md
git commit -m "docs(spec-tech): preview WYSIWYG accueil (sous-projet 4/4)"
```

- [ ] **Step 8.2 : Mettre à jour `docs/SPECIFICATION_FONCTIONNELLE.md`**

Bump version. Ajouter section preview WYSIWYG accueil avec auto-save inline (différence vs fiches détail). Marquer **Roadmap : chantier WYSIWYG TERMINÉ** (4/4 sous-projets).

```powershell
git add docs/SPECIFICATION_FONCTIONNELLE.md
git commit -m "docs(spec-fonc): preview WYSIWYG accueil (sous-projet 4/4) - chantier WYSIWYG complet"
```

- [ ] **Step 8.3 : Vérifier tests verts**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | grep -E "Tests run:|BUILD" | tail -3
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -3
cd frontend && npm run test:visual:docker 2>&1 | tail -3
```

- [ ] **Step 8.4 : Audits + merge via `superpowers:finishing-a-development-branch`**

Proposer audits sécu + RGAA. Option recommandée : merge local + push.

---

## Self-Review

**Spec coverage :**

- `<app-home-view>` extrait → Tasks 1, 2, 3. ✓
- Refactor `home.component.ts` → Task 4. ✓
- `<app-home-preview>` → Task 5. ✓
- Toggle Modifier/Aperçu + handlers + auto-save → Task 6. ✓
- Auto-save inline texte hero via `updateContent` → Task 6.2. ✓
- Overlays cards hover + drag-reorder + toggle inclusion → Task 3 (view) + Task 6 (handlers). ✓
- Sliders cartouche `[i]` + sliderEditRequested → Task 3 (view) + Task 6 (handler). ✓
- Cards exclues opacité 0.35 + badge → Task 3. ✓
- Plein écran avec `cdkTrapFocus` + `aria-modal` → Task 6. ✓
- Form caché en mode preview → Task 6 template. ✓
- Playwright sans `--update` → Task 4.5 + Task 7. ✓
- Doc spec/fonc maj → Task 8. ✓
- Audits + merge → Task 8.4. ✓

**Placeholder scan :**

- "Vérifier les vraies signatures via grep" Task 4.2 : commandes grep données. ✓
- "Adapter selon convention existante" Task 6.3 (tests) : pattern existant dans le file (configure/flushInitial). ✓
- Pas de TBD/TODO. ✓

**Type consistency :**

- `EditableHomeContentKey` même union partout (Tasks 3, 5, 6). ✓
- Outputs `feedReorder` `number[]`, `feedItemToggleInclude` `{kind, slug, included}`, `textFieldEdit` `{key, value}`, `sliderEditRequested` `'home-top'|'home-middle'|'home-bottom'` — cohérent view → preview → AccueilComponent. ✓
- `includedSlugs: Set<string>` cohérent (`includedSlugs.has(item.kind + ':' + item.slug)`). ✓
- `previewFullscreenLabel()` retourne string non vide. ✓
