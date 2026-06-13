# Sliders éditables dans le preview accueil — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éditer les sliders d'actualités (titre, composition des stories, créer/supprimer/changer de zone) directement depuis le preview WYSIWYG de l'accueil, en auto-save.

**Architecture:** Extraction d'un `<app-slider-composition-editor>` (modale composition partagée form-side + preview) ; le `home-view` pur (ADR-0018) gagne des affordances inline en mode editable (barre d'édition par slider + placeholder « créer » sur zone vide) et émet des events ; `AccueilComponent` orchestre les appels API (auto-save + toast + re-fetch `getPublicSliders()`) et rend l'éditeur de composition en overlay.

**Tech Stack:** Angular 21 standalone, signals, `@angular/cdk/a11y` (cdkTrapFocus), Karma + Jasmine, suite Docker.

**Spec:** [docs/superpowers/specs/2026-06-13-wysiwyg-sliders-preview-design.md](../specs/2026-06-13-wysiwyg-sliders-preview-design.md)
**Branche:** `feat/wysiwyg-sliders-preview` (créée, spec déjà commitée)

---

## Structure de fichiers

| Fichier | Rôle |
| --- | --- |
| Create: `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts` | Modale composition extraite (inputs `title`/`storyIds`/`allStories`, outputs `save`/`cancel`) |
| Create: `frontend/src/app/pages/admin/shared/slider-composition-editor.component.spec.ts` | Tests composition |
| Modify: `frontend/src/app/pages/admin/sliders/sliders.component.ts` | Délègue la composition à l'éditeur extrait (CRUD/zones inchangés) |
| Modify: `frontend/src/app/components/home-view/home-view.component.ts` (+ spec) | Affordances editable sliders (barre d'édition, placeholder create) ; nouveaux outputs |
| Modify: `frontend/src/app/pages/admin/accueil/preview/home-preview.component.ts` | Relais des nouveaux outputs |
| Modify: `frontend/src/app/pages/admin/accueil/accueil.component.ts` (+ spec) | Handlers auto-save + overlay composition |
| Modify: `docs/SPECIFICATION_TECHNIQUE.md`, spec design | Doc finale |

## Commandes de test

- Suite complète (chaque fin de task) : `docker compose -f docker-compose.test.yml run --rm frontend-test` depuis la racine. Baseline : **896 SUCCESS**.
- Couverture (Task 6) : `docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --code-coverage` (seuils 80 %/75 %).

## Garde-fous d'exécution

- AUCUNE normalisation de caractères (apostrophes `’`, accents, `—`, `↑`/`↓`/`×`). Edits ciblés ; vérifier le diff au niveau caractère (régressions historiques sur ce point).
- Rendu PUBLIC des sliders (carrousels `<app-news-slider>`) inchangé — ne jamais le toucher.
- Compteurs de tests attendus approximatifs sur baseline 896 ; ajuster d'autant si elle diffère.

---

### Task 1 : Extraction `<app-slider-composition-editor>` + refactor SlidersComponent

**Files:**
- Create: `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts`
- Create: `frontend/src/app/pages/admin/shared/slider-composition-editor.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/sliders/sliders.component.ts`

- [ ] **Step 1.1 : Écrire les tests de l'éditeur (échec attendu)**

Créer `slider-composition-editor.component.spec.ts` :

```typescript
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Story } from '../../../models/story.model';
import { SliderCompositionEditorComponent } from './slider-composition-editor.component';

@Component({
  standalone: true,
  imports: [SliderCompositionEditorComponent],
  template: `<app-slider-composition-editor
    [title]="title" [storyIds]="storyIds()" [allStories]="allStories"
    (save)="saved = $event" (cancel)="cancelled = true" />`,
})
class HostComponent {
  title = 'Slider A';
  readonly storyIds = signal<string[]>(['s1']);
  allStories: Story[] = [
    { id: 's1', title: 'Story 1', ownerKind: 'furniture', ownerId: 'f1' } as Story,
    { id: 's2', title: 'Story 2', ownerKind: 'exhibition', ownerId: 'e1' } as Story,
    { id: 's3', title: 'Story 3', ownerKind: 'furniture', ownerId: 'f2' } as Story,
  ];
  saved: string[] | null = null;
  cancelled = false;
}

describe('SliderCompositionEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function available(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.story-option')); }
  function pending(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.comp-item')); }
  function byText(els: HTMLElement[], txt: string): HTMLElement | undefined { return els.find(e => e.textContent?.includes(txt)); }

  it('liste les stories disponibles en excluant celles déjà dans la composition', () => {
    const labels = available().map(e => e.textContent ?? '');
    expect(labels.some(l => l.includes('Story 2'))).toBeTrue();
    expect(labels.some(l => l.includes('Story 3'))).toBeTrue();
    expect(labels.some(l => l.includes('Story 1'))).toBeFalse();   // déjà dans storyIds
  });

  it('compose : la story courante est affichée', () => {
    expect(pending().length).toBe(1);
    expect(pending()[0].textContent).toContain('Story 1');
  });

  it('ajout : sélectionner puis Ajouter déplace la story vers la composition', () => {
    const opt2 = byText(available(), 'Story 2')!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    opt2.click();
    (fixture.nativeElement.querySelector('.add-selected') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(pending().map(e => e.textContent).join()).toContain('Story 2');
  });

  it('retrait : retire une story de la composition', () => {
    const removeBtn = pending()[0].querySelector('.comp-remove') as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();
    expect(pending().length).toBe(0);
  });

  it('save émet la liste ordonnée courante', () => {
    const opt2 = byText(available(), 'Story 2')!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    opt2.click();
    (fixture.nativeElement.querySelector('.add-selected') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s1', 's2']);
  });

  it('cancel émet cancel', () => {
    (fixture.nativeElement.querySelector('.comp-cancel') as HTMLButtonElement).click();
    expect(host.cancelled).toBeTrue();
  });

  it('moveUp réordonne la composition', () => {
    // amène s2 dans la compo puis le remonte
    const opt2 = byText(available(), 'Story 2')!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    opt2.click();
    (fixture.nativeElement.querySelector('.add-selected') as HTMLButtonElement).click();
    fixture.detectChanges();
    const up = pending()[1].querySelector('.comp-up') as HTMLButtonElement;
    up.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s2', 's1']);
  });
});
```

- [ ] **Step 1.2 : Vérifier l'échec** — suite Docker. Attendu : échec de compilation (`./slider-composition-editor.component` absent).

- [ ] **Step 1.3 : Implémenter `slider-composition-editor.component.ts`**

```typescript
import { Component, computed, input, output, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { Story } from '../../../models/story.model';

/**
 * Modale de composition d'un slider (liste « disponibles » filtrable +
 * sélection, liste « composition courante » réordonnable + retrait).
 * Extraite de SlidersComponent pour être réutilisée form-side ET depuis le
 * preview accueil. Piloté par inputs, émet `save` (liste d'ids ordonnée) ou
 * `cancel`. La persistance (replaceSliderStories) est faite par le consommateur.
 */
@Component({
  selector: 'app-slider-composition-editor',
  standalone: true,
  imports: [A11yModule, FormsModule],
  template: `
    <div class="composition-modal" role="dialog" aria-modal="true" aria-labelledby="composition-title"
         cdkTrapFocus cdkTrapFocusAutoCapture>
      <div class="composition-panel">
        <header>
          <h3 id="composition-title">Composition de "{{ title() }}"</h3>
          <button type="button" class="comp-cancel" (click)="cancel.emit()" aria-label="Fermer">Fermer</button>
        </header>
        <div class="composition-grid">
          <aside class="available">
            <h4>Stories disponibles</h4>
            <input type="text" [(ngModel)]="storyFilter" placeholder="Rechercher..." aria-label="Filtrer les stories" />
            @for (story of filteredAvailable(); track story.id) {
              <label class="story-option">
                <input type="checkbox" [checked]="selectedToAdd().includes(story.id)" (change)="toggleSelect(story.id)" />
                <span>{{ story.title }} <small>({{ story.ownerKind }} {{ story.ownerId }})</small></span>
              </label>
            }
            <button type="button" class="add-selected" (click)="addSelected()" [disabled]="selectedToAdd().length === 0">→ Ajouter</button>
          </aside>
          <aside class="composition">
            <h4>Composition courante</h4>
            @if (pendingStoryIds().length === 0) {
              <p class="empty">Aucune story sélectionnée.</p>
            }
            @for (storyId of pendingStoryIds(); track storyId; let i = $index) {
              <div class="comp-item">
                <span>{{ storyTitle(storyId) }}</span>
                <button type="button" class="comp-up" (click)="moveUp(storyId)" [disabled]="i === 0">↑</button>
                <button type="button" class="comp-down" (click)="moveDown(storyId)" [disabled]="i === pendingStoryIds().length - 1">↓</button>
                <button type="button" class="comp-remove" (click)="removeFromComposition(storyId)">← Retirer</button>
              </div>
            }
            <button type="button" class="primary comp-save" (click)="save.emit(pendingStoryIds())">Enregistrer</button>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .composition-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1300;
      display: flex; align-items: center; justify-content: center;
    }
    .composition-panel { width: 90%; max-width: 900px; max-height: 80vh; overflow: auto; background: var(--color-bg); padding: 24px; border: 1px solid var(--color-ink); }
    .composition-panel header { display: flex; align-items: center; justify-content: space-between; }
    .composition-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .available, .composition { display: flex; flex-direction: column; gap: 8px; }
    .story-option { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .story-option small { color: var(--color-mute); }
    .comp-item { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-line); }
    .comp-item > span:first-child { flex: 1; }
    button { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.85rem; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    button.primary { background: var(--color-ink); color: var(--color-bg); }
  `]
})
export class SliderCompositionEditorComponent {
  readonly title = input<string>('');
  readonly storyIds = input<string[]>([]);
  readonly allStories = input<Story[]>([]);
  readonly save = output<string[]>();
  readonly cancel = output<void>();

  protected readonly pendingStoryIds = signal<string[]>([]);
  protected readonly selectedToAdd = signal<string[]>([]);
  protected storyFilter = '';

  constructor() {
    // Synchronise la composition courante quand l'input storyIds change
    // (ouverture sur un autre slider). effect() en contexte d'injection.
    // Import effect depuis @angular/core.
  }

  protected readonly filteredAvailable = computed(() => {
    const pending = new Set(this.pendingStoryIds());
    const q = this.storyFilter.toLowerCase();
    return this.allStories()
      .filter(s => !pending.has(s.id))
      .filter(s => !q || s.title.toLowerCase().includes(q) || s.ownerId.toLowerCase().includes(q));
  });

  protected storyTitle(id: string): string {
    return this.allStories().find(s => s.id === id)?.title ?? id;
  }

  protected toggleSelect(id: string): void {
    this.selectedToAdd.update(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  }

  protected addSelected(): void {
    this.pendingStoryIds.update(arr => [...arr, ...this.selectedToAdd()]);
    this.selectedToAdd.set([]);
  }

  protected removeFromComposition(id: string): void {
    this.pendingStoryIds.update(arr => arr.filter(x => x !== id));
  }

  protected moveUp(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i <= 0) return arr;
      const copy = [...arr];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
  }

  protected moveDown(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i < 0 || i >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
  }
}
```

**Important** : remplacer le commentaire du `constructor()` par une vraie synchro. Ajouter `effect` à l'import `@angular/core` et écrire :

```typescript
  constructor() {
    effect(() => {
      // Réinitialise la composition pendante sur la valeur d'entrée.
      this.pendingStoryIds.set([...this.storyIds()]);
      this.selectedToAdd.set([]);
    });
  }
```

(L'`effect` lit `storyIds()` → se réexécute à chaque changement d'input, ce qui réinitialise correctement la composition à l'ouverture sur un slider donné.)

- [ ] **Step 1.4 : Vérifier le vert (éditeur)** — suite Docker. Attendu : **903 SUCCESS** (896 + 7).

- [ ] **Step 1.5 : Refactor `SlidersComponent` pour déléguer la composition**

Dans `sliders.component.ts` :
1. Imports : ajouter `import { SliderCompositionEditorComponent } from '../shared/slider-composition-editor.component';` + l'ajouter au tableau `imports` du décorateur.
2. Template : remplacer tout le bloc `@if (compositionOpen() && editingSlider(); as s) { <div class="composition-modal">…</div> }` (lignes ~52-88) par :

```html
    @if (compositionOpen() && editingSlider(); as s) {
      <app-slider-composition-editor
        [title]="s.title"
        [storyIds]="s.storyIds"
        [allStories]="allStories()"
        (save)="onCompositionSave($event)"
        (cancel)="closeComposition()" />
    }
```

3. Classe : supprimer `pendingStoryIds`, `selectedToAdd`, `storyFilter`, `filteredAvailable`, `toggleSelect`, `addSelected`, `removeFromComposition`, `moveUp`, `moveDown`, `storyTitle`, `saveComposition` (toute la logique migrée dans l'éditeur). Dans `openComposition`, retirer les lignes `this.pendingStoryIds.set(...)` et `this.selectedToAdd.set([])` (l'éditeur s'initialise seul via son `effect`). Ajouter :

```typescript
  onCompositionSave(storyIds: string[]): void {
    const slider = this.editingSlider();
    if (!slider) return;
    this.portfolio.replaceSliderStories(slider.id, storyIds).subscribe(updated => {
      this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x));
      this.closeComposition();
    });
  }
```

4. Supprimer les styles CSS de la modale migrés (`.composition-modal`, `.composition-grid`, `.available`, `.composition`, `.story-option`, `.comp-item`) — ils vivent dans l'éditeur. Garder les styles propres à la liste des sliders.
5. Retirer l'import `FormsModule` SEULEMENT s'il n'est plus utilisé ailleurs dans le template (le `[(ngModel)]` du filtre a migré ; vérifier qu'aucun autre `ngModel` ne subsiste — sinon le garder).

- [ ] **Step 1.6 : Vérifier le vert (refactor)** — suite Docker. Attendu : **903 SUCCESS** (le spec `sliders.component.spec.ts` reste vert ; si un test ciblait un sélecteur de la modale migrée comme `.composition-modal`, il faut qu'il passe encore — le DOM est rendu par l'éditeur enfant, mêmes classes `.story-option`/`.comp-item`/`.composition-modal`. Si un test échoue parce qu'il appelait une méthode interne supprimée comme `saveComposition()`, NE PAS affaiblir : signaler NEEDS_CONTEXT).

- [ ] **Step 1.7 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts frontend/src/app/pages/admin/shared/slider-composition-editor.component.spec.ts frontend/src/app/pages/admin/sliders/sliders.component.ts
git commit -m "feat(admin): extraction <app-slider-composition-editor> + sliders form-side delegue"
```

---

### Task 2 : Affordances editable dans `home-view`

**Files:**
- Modify: `frontend/src/app/components/home-view/home-view.component.ts`
- Modify: `frontend/src/app/components/home-view/home-view.component.spec.ts`

- [ ] **Step 2.1 : Écrire les tests (échec attendu)**

Dans `home-view.component.spec.ts` : LIS le fichier pour repérer comment une fixture est construite (item `data`, `sliders`, `editable`). Adapte ces tests (un slider en `home-top`, une zone vide) :

```typescript
  it('mode editable : barre d\'édition du slider (titre, composition, supprimer, zone)', () => {
    // configurer un NewsSliderView en home-top + editable=true (réutiliser le pattern du fichier)
    component.editable = true;
    component.sliders = [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [{ id: 'st1' } as any] }];
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.slider-edit-bar');
    expect(bar).toBeTruthy();
    expect(bar.querySelector('.slider-title-edit')).toBeTruthy();
    expect(bar.querySelector('.slider-compose-btn')).toBeTruthy();
    expect(bar.querySelector('.slider-delete-btn')).toBeTruthy();
    expect(bar.querySelector('.slider-zone-select')).toBeTruthy();
  });

  it('clic composition émet sliderCompositionRequested avec l\'id', () => {
    component.editable = true;
    component.sliders = [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }];
    fixture.detectChanges();
    let emitted: string | null = null;
    component.sliderCompositionRequested.subscribe((v: string) => emitted = v);
    (fixture.nativeElement.querySelector('.slider-compose-btn') as HTMLButtonElement).click();
    expect(emitted).toBe('sl1');
  });

  it('clic supprimer émet sliderDelete avec l\'id', () => {
    component.editable = true;
    component.sliders = [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }];
    fixture.detectChanges();
    let emitted: string | null = null;
    component.sliderDelete.subscribe((v: string) => emitted = v);
    (fixture.nativeElement.querySelector('.slider-delete-btn') as HTMLButtonElement).click();
    expect(emitted).toBe('sl1');
  });

  it('zone vide en editable : placeholder créer émet sliderCreate avec la zone', () => {
    component.editable = true;
    component.sliders = [];   // toutes zones vides
    fixture.detectChanges();
    let emitted: string | null = null;
    component.sliderCreate.subscribe((v: string) => emitted = v);
    const createBtn = fixture.nativeElement.querySelector('.slider-create-btn');
    expect(createBtn).toBeTruthy();
    (createBtn as HTMLButtonElement).click();
    expect(emitted).toBe('home-top');   // première zone vide
  });

  it('changement de zone émet sliderZoneChange', () => {
    component.editable = true;
    component.sliders = [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }];
    fixture.detectChanges();
    let emitted: { id: string; zoneKey: string } | null = null;
    component.sliderZoneChange.subscribe((v: any) => emitted = v);
    const select = fixture.nativeElement.querySelector('.slider-zone-select') as HTMLSelectElement;
    select.value = 'home-bottom';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toEqual({ id: 'sl1', zoneKey: 'home-bottom' });
  });

  it('mode public : pas de barre d\'édition ni placeholder', () => {
    component.editable = false;
    component.sliders = [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slider-edit-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.slider-create-btn')).toBeNull();
  });
```

(Adapte `component`/`fixture`/le typage du `NewsSliderView` aux conventions du fichier. Les `stories` peuvent être un tableau minimal.)

- [ ] **Step 2.2 : Vérifier l'échec** — suite Docker.

- [ ] **Step 2.3 : Implémenter dans `home-view.component.ts`**

1. Classe — remplacer l'output `sliderEditRequested` par les nouveaux :

```typescript
  @Output() sliderTitleEdit = new EventEmitter<{ id: string; title: string }>();
  @Output() sliderCompositionRequested = new EventEmitter<string>();
  @Output() sliderDelete = new EventEmitter<string>();
  @Output() sliderZoneChange = new EventEmitter<{ id: string; zoneKey: 'home-top' | 'home-middle' | 'home-bottom' }>();
  @Output() sliderCreate = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();
```

2. Classe — ajouter les helpers (près de `sliderByZone()`) :

```typescript
  protected readonly editableZones: ('home-top' | 'home-middle' | 'home-bottom')[] = ['home-top', 'home-middle', 'home-bottom'];

  protected onSliderTitleBlur(id: string, ev: Event): void {
    const title = (ev.target as HTMLElement).textContent?.trim() ?? '';
    if (title) this.sliderTitleEdit.emit({ id, title });
  }

  protected onSliderZoneSelect(id: string, ev: Event): void {
    const zoneKey = (ev.target as HTMLSelectElement).value as 'home-top' | 'home-middle' | 'home-bottom';
    this.sliderZoneChange.emit({ id, zoneKey });
  }
```

3. Template — pour CHACUNE des 3 zones (`home-top` ~ligne 54, `home-middle` ~ligne 66, `home-bottom` ~ligne 140), remplacer le bloc editable `<div class="slider-wrap editable"> … badge [i] … </div>` par une barre d'édition + le carrousel, et ajouter un `@else` pour la zone vide. Modèle pour `home-top` (transposer `'home-top'` → zone correspondante pour les deux autres) :

```html
      @if (sliderByZone()['home-top']; as s) {
        @if (editable) {
          <div class="slider-wrap editable">
            <div class="slider-edit-bar">
              <span class="slider-title-edit" contenteditable="true" role="textbox"
                    aria-label="Titre du slider"
                    (blur)="onSliderTitleBlur(s.id, $event)">{{ s.title }}</span>
              <button type="button" class="slider-compose-btn" (click)="sliderCompositionRequested.emit(s.id)">Composer</button>
              <select class="slider-zone-select" aria-label="Zone du slider"
                      [value]="s.zoneKey" (change)="onSliderZoneSelect(s.id, $event)">
                @for (z of editableZones; track z) { <option [value]="z">{{ z }}</option> }
              </select>
              <button type="button" class="slider-delete-btn" aria-label="Supprimer ce slider"
                      (click)="sliderDelete.emit(s.id)">×</button>
            </div>
            <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
          </div>
        } @else {
          <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
        }
      } @else if (editable) {
        <div class="slider-create-placeholder">
          <button type="button" class="slider-create-btn" (click)="sliderCreate.emit('home-top')">+ Créer un slider ici (home-top)</button>
        </div>
      }
```

(Note : `contenteditable` rend le contenu initial via `{{ s.title }}` ; le blur lit `textContent`. Le `[value]` du `<select>` initialise la zone courante.)

4. Styles — ajouter au tableau `styles` du composant :

```css
    .slider-edit-bar { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line); margin-bottom: 8px; }
    .slider-title-edit { flex: 1; padding: 2px 4px; outline: 1px dashed transparent; }
    .slider-title-edit:hover, .slider-title-edit:focus { outline-color: var(--color-accent); }
    .slider-edit-bar button, .slider-zone-select { padding: 4px 8px; font-size: 0.8rem; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; }
    .slider-create-placeholder { padding: 16px; text-align: center; border: 1px dashed var(--color-line); margin: 12px 0; }
    .slider-create-btn { padding: 8px 16px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; }
```

- [ ] **Step 2.4 : Vérifier le vert** — suite Docker. Attendu : **909 SUCCESS** (903 + 6).

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/components/home-view/
git commit -m "feat(admin): home-view - affordances editable sliders (titre, composition, zone, supprimer, creer)"
```

---

### Task 3 : Relais `home-preview`

**Files:**
- Modify: `frontend/src/app/pages/admin/accueil/preview/home-preview.component.ts`

- [ ] **Step 3.1 : Remplacer l'output relayé**

Dans `home-preview.component.ts` :
1. Retirer l'output `sliderEditRequested` et son handler `onSliderEditRequested` ; retirer le binding `(sliderEditRequested)` du template.
2. Ajouter les 5 outputs + bindings relayés (1-pour-1) :

```typescript
  @Output() sliderTitleEdit = new EventEmitter<{ id: string; title: string }>();
  @Output() sliderCompositionRequested = new EventEmitter<string>();
  @Output() sliderDelete = new EventEmitter<string>();
  @Output() sliderZoneChange = new EventEmitter<{ id: string; zoneKey: 'home-top' | 'home-middle' | 'home-bottom' }>();
  @Output() sliderCreate = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();
```

Template `<app-home-view …>` : remplacer `(sliderEditRequested)="onSliderEditRequested($event)"` par :

```html
      (sliderTitleEdit)="sliderTitleEdit.emit($event)"
      (sliderCompositionRequested)="sliderCompositionRequested.emit($event)"
      (sliderDelete)="sliderDelete.emit($event)"
      (sliderZoneChange)="sliderZoneChange.emit($event)"
      (sliderCreate)="sliderCreate.emit($event)"
```

- [ ] **Step 3.2 : Vérifier le vert** — suite Docker. Attendu : **909 SUCCESS** (inchangé ; ce composant n'a pas de spec dédié, la compilation valide le câblage).

- [ ] **Step 3.3 : Commit**

```powershell
git add frontend/src/app/pages/admin/accueil/preview/home-preview.component.ts
git commit -m "feat(admin): home-preview relaie les outputs d'edition sliders"
```

---

### Task 4 : Handlers auto-save + overlay composition dans `AccueilComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/accueil/accueil.component.ts`
- Modify: `frontend/src/app/pages/admin/accueil/accueil.component.spec.ts`

- [ ] **Step 4.1 : Écrire les tests (échec attendu)**

Dans `accueil.component.spec.ts` : LIS le fichier pour le pattern de fixture (provideHttpClient testing, flush des requêtes init). Ajoute :

```typescript
  it('onSliderTitleEdit met à jour le slider via updateSlider et rafraîchit', () => {
    // fixture initialisée (réutiliser le helper du fichier) avec un slider home-top
    const cmp = fixture.componentInstance as any;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'Vieux', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderTitleEdit({ id: 'sl1', title: 'Neuf' });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl1');
    expect(req.request.body).toEqual({ title: 'Neuf', zoneKey: 'home-top' });
    req.flush({ id: 'sl1', slug: 'a', title: 'Neuf', zoneKey: 'home-top', storyIds: [] });
    httpMock.expectOne('/api/sliders').flush([]);   // re-fetch getPublicSliders
  });

  it('onSliderZoneChange refuse une zone déjà occupée (toast erreur, pas d\'appel)', () => {
    const cmp = fixture.componentInstance as any;
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    cmp.sliders.set([
      { id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] },
      { id: 'sl2', slug: 'b', title: 'B', zoneKey: 'home-bottom', stories: [] },
    ]);
    cmp.onSliderZoneChange({ id: 'sl1', zoneKey: 'home-bottom' });   // occupée par sl2
    expect(toast.error).toHaveBeenCalled();
    httpMock.expectNone(r => r.url.startsWith('/api/admin/sliders/'));
  });

  it('onSliderDelete confirmé appelle deleteSlider', () => {
    const cmp = fixture.componentInstance as any;
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderDelete('sl1');
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/sliders/sl1').flush(null);
    httpMock.expectOne('/api/sliders').flush([]);
  });

  it('onSliderDelete refusé ne fait rien', () => {
    const cmp = fixture.componentInstance as any;
    spyOn(window, 'confirm').and.returnValue(false);
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderDelete('sl1');
    httpMock.expectNone(r => r.url === '/api/admin/sliders/sl1');
  });

  it('onSliderCreate avec titre crée le slider', () => {
    const cmp = fixture.componentInstance as any;
    spyOn(window, 'prompt').and.returnValue('Nouveau');
    cmp.onSliderCreate('home-middle');
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/sliders');
    expect(req.request.body).toEqual({ title: 'Nouveau', zoneKey: 'home-middle' });
    req.flush({ id: 'sl9', slug: 'n', title: 'Nouveau', zoneKey: 'home-middle', storyIds: [] });
    httpMock.expectOne('/api/sliders').flush([]);
  });

  it('composition : requested charge les stories et ouvre l\'éditeur ; save appelle replaceSliderStories', () => {
    const cmp = fixture.componentInstance as any;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [{ id: 'st1' }] }]);
    cmp.onSliderCompositionRequested('sl1');
    httpMock.expectOne('/api/admin/stories/all').flush([{ id: 'st1', title: 'S1' }, { id: 'st2', title: 'S2' }]);
    expect(cmp.editingSliderId()).toBe('sl1');
    cmp.onSliderCompositionSave(['st1', 'st2']);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl1/stories').flush({ id: 'sl1', storyIds: ['st1', 'st2'] });
    httpMock.expectOne('/api/sliders').flush([]);
    expect(cmp.editingSliderId()).toBeNull();
  });
```

(Vérifie l'URL réelle de `getAllAdminStories()` dans `portfolio.service.ts` — adapte `/api/admin/stories/all` au vrai chemin. Idem pour les autres endpoints si besoin. Réutilise le helper de fixture du fichier pour l'init.)

- [ ] **Step 4.2 : Vérifier l'échec** — suite Docker.

- [ ] **Step 4.3 : Implémenter dans `accueil.component.ts`**

1. Imports : ajouter `SliderCompositionEditorComponent` (`from '../shared/slider-composition-editor.component'`) + au tableau `imports` ; ajouter `Story` (`from '../../../models/story.model'`) et `SliderZone`/types si besoin.

2. Signaux (avec les autres) :

```typescript
  protected readonly editingSliderId = signal<string | null>(null);
  protected readonly allStories = signal<Story[]>([]);
  private storiesLoaded = false;
```

3. `computed` pour le slider en cours d'édition + ses storyIds (pour alimenter l'éditeur) :

```typescript
  protected readonly editingSlider = computed(() =>
    this.sliders().find(s => s.id === this.editingSliderId()) ?? null
  );
  protected readonly editingStoryIds = computed(() =>
    this.editingSlider()?.stories.map(s => s.id) ?? []
  );
```

4. Template — remplacer `(sliderEditRequested)="onSliderEditRequested($event)"` sur `<app-home-preview>` par les 5 nouveaux bindings :

```html
        (sliderTitleEdit)="onSliderTitleEdit($event)"
        (sliderCompositionRequested)="onSliderCompositionRequested($event)"
        (sliderDelete)="onSliderDelete($event)"
        (sliderZoneChange)="onSliderZoneChange($event)"
        (sliderCreate)="onSliderCreate($event)"
```

et ajouter l'overlay composition (après le bloc crop-picker existant, au même niveau) :

```html
    @if (editingSlider(); as s) {
      <app-slider-composition-editor
        [title]="s.title"
        [storyIds]="editingStoryIds()"
        [allStories]="allStories()"
        (save)="onSliderCompositionSave($event)"
        (cancel)="editingSliderId.set(null)" />
    }
```

5. Supprimer `onSliderEditRequested` (et le `queueMicrotask`/`scrollIntoView` associé). Ajouter les handlers :

```typescript
  private refreshSliders(): void {
    this.portfolio.getPublicSliders().subscribe(s => this.sliders.set(s));
  }

  protected onSliderTitleEdit(e: { id: string; title: string }): void {
    const slider = this.sliders().find(s => s.id === e.id);
    if (!slider) return;
    this.portfolio.updateSlider(e.id, { title: e.title, zoneKey: slider.zoneKey }).subscribe({
      next: () => { this.toast.success('Slider renommé.'); this.refreshSliders(); },
      error: () => this.toast.error('Erreur lors du renommage du slider.'),
    });
  }

  protected onSliderZoneChange(e: { id: string; zoneKey: 'home-top' | 'home-middle' | 'home-bottom' }): void {
    const slider = this.sliders().find(s => s.id === e.id);
    if (!slider) return;
    const occupied = this.sliders().some(s => s.id !== e.id && s.zoneKey === e.zoneKey);
    if (occupied) { this.toast.error('Cette zone est déjà occupée par un autre slider.'); return; }
    this.portfolio.updateSlider(e.id, { title: slider.title, zoneKey: e.zoneKey }).subscribe({
      next: () => { this.toast.success('Zone du slider mise à jour.'); this.refreshSliders(); },
      error: () => this.toast.error('Erreur lors du changement de zone.'),
    });
  }

  protected onSliderDelete(id: string): void {
    const slider = this.sliders().find(s => s.id === id);
    if (!slider) return;
    if (!confirm(`Supprimer le slider "${slider.title}" ?`)) return;
    this.portfolio.deleteSlider(id).subscribe({
      next: () => { this.toast.success('Slider supprimé.'); this.refreshSliders(); },
      error: () => this.toast.error('Erreur lors de la suppression du slider.'),
    });
  }

  protected onSliderCreate(zoneKey: 'home-top' | 'home-middle' | 'home-bottom'): void {
    const title = prompt('Titre du nouveau slider ?');
    if (!title || !title.trim()) return;
    this.portfolio.createSlider({ title: title.trim(), zoneKey }).subscribe({
      next: () => { this.toast.success('Slider créé.'); this.refreshSliders(); },
      error: () => this.toast.error('Erreur lors de la création du slider.'),
    });
  }

  protected onSliderCompositionRequested(id: string): void {
    if (!this.storiesLoaded) {
      this.portfolio.getAllAdminStories().subscribe(s => { this.allStories.set(s); this.storiesLoaded = true; });
    }
    this.editingSliderId.set(id);
  }

  protected onSliderCompositionSave(storyIds: string[]): void {
    const id = this.editingSliderId();
    if (!id) return;
    this.portfolio.replaceSliderStories(id, storyIds).subscribe({
      next: () => { this.toast.success('Composition enregistrée.'); this.editingSliderId.set(null); this.refreshSliders(); },
      error: () => this.toast.error('Erreur lors de l\'enregistrement de la composition.'),
    });
  }
```

(Vérifie que `toast` et `portfolio` sont déjà injectés — ils le sont. Vérifie la signature de `getAllAdminStories()` dans le service.)

- [ ] **Step 4.4 : Vérifier le vert** — suite Docker. Attendu : **915 SUCCESS** (909 + 6). Si un test init du spec accueil casse parce que `onSliderEditRequested` était testé : supprimer ce test obsolète (le comportement n'existe plus).

- [ ] **Step 4.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/accueil/
git commit -m "feat(admin): accueil - edition sliders in-preview auto-save (titre, composition, zone, creer, supprimer)"
```

---

### Task 5 : Suite complète, couverture, documentation

**Files:**
- Modify: `docs/SPECIFICATION_TECHNIQUE.md`
- Modify: `docs/superpowers/specs/2026-06-13-wysiwyg-sliders-preview-design.md`

- [ ] **Step 5.1 : Suite + couverture**

Run : `docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --code-coverage`
Attendu : **915 SUCCESS**, exit 0, seuils 80 %/75 % respectés. Noter les chiffres. Si un seuil échoue : STOP, BLOCKED.

- [ ] **Step 5.2 : `docs/SPECIFICATION_TECHNIQUE.md`**

1. §5.5 — ajouter une sous-section `<app-slider-composition-editor>` (chemin, rôle : modale composition extraite, inputs `title`/`storyIds`/`allStories`, outputs `save`/`cancel`, partagée SlidersComponent form-side + preview accueil).
2. §5.5 — dans la description de `<app-home-view>` : remplacer la mention de l'output `sliderEditRequested` (cartouche [i] → form) par les 5 nouveaux outputs d'édition sliders (titre/composition/delete/zone/create, mode editable) ; préciser le rendu public inchangé.
3. §5.4 — sous-section `AccueilComponent` : ajouter une bullet :

```markdown
- **Sliders in-preview** : édition des sliders depuis le preview (auto-save) — `onSliderTitleEdit`/`onSliderZoneChange`/`onSliderDelete`/`onSliderCreate` (appels `updateSlider`/`deleteSlider`/`createSlider` + re-fetch) ; composition via `<app-slider-composition-editor>` en overlay (`onSliderCompositionRequested` charge `getAllAdminStories` en lazy, `onSliderCompositionSave` → `replaceSliderStories`). Garde « une zone = un slider ».
```

4. §5.4 sous-section `SlidersComponent` (si présente) : préciser que la composition est désormais déléguée à `<app-slider-composition-editor>`.
5. Tableau d'historique : nouvelle ligne (incrément mineur depuis la dernière — 2.10.0 → 2.11.0, date 13/06/2026) + version en tête :

```markdown
| 2.11.0 | 13/06/2026 | Sliders éditables in-preview accueil (chantier v2, sous-projet 5/6) : extraction `<app-slider-composition-editor>` (partagé form-side + preview), édition des sliders depuis le preview (titre, composition, créer/supprimer/zone) en auto-save, garde « une zone = un slider » |
```

- [ ] **Step 5.3 : Statut spec design** → `Implémenté — feat/wysiwyg-sliders-preview`. Amender si déviation.

- [ ] **Step 5.4 : Commit**

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md docs/superpowers/specs/2026-06-13-wysiwyg-sliders-preview-design.md
git commit -m "docs(spec-tech): sliders editables preview accueil (sous-projet 5/6 chantier v2)"
```

---

## Critères de fin

- [ ] Suite frontend complète verte (~915), couverture ≥ seuils 80 %/75 %.
- [ ] Validation visuelle manuelle par l'utilisateur : depuis le preview accueil — renommer un slider, composer (ajouter/retirer/réordonner stories via l'éditeur), créer un slider dans une zone vide, supprimer, changer de zone (+ refus si zone occupée) ; form-side Sliders toujours fonctionnel ; rendu public des sliders inchangé.
- [ ] Baselines Playwright non régénérées (rendu public inchangé).
- [ ] Doc à jour (spec-tech 2.11.0 + statut spec design).
- [ ] Hors périmètre intact : pas d'undo sliders, pas de drag-carrousel, stories gérées via les fiches.
