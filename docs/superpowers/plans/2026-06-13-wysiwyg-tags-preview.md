# Tags éditables dans les previews WYSIWYG — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éditer les tags d'une fiche mobilier/exposition directement dans le preview WYSIWYG (ajout autocomplété, création libre, suppression, undo/redo).

**Architecture:** Extraction d'un composant présentation pur `<app-tag-editor>` (toute l'a11y combobox, piloté par inputs/output, sans Router/HttpClient/forms — respecte ADR-0018) ; `<app-tag-input>` form-side devient un mince wrapper `ControlValueAccessor` autour de lui ; les vues détail (furniture/exhibition) rendent `<app-tag-editor>` en mode editable (routerLinks inchangés en public) ; les pages relaient `tagsChange` vers `patchValue` + `markAsDirty` + `history.record()` (undo SP3).

**Tech Stack:** Angular 21 standalone, signals (`input()`/`output()`/`computed`), Karma + Jasmine, suite Docker.

**Spec:** [docs/superpowers/specs/2026-06-13-wysiwyg-tags-preview-design.md](../specs/2026-06-13-wysiwyg-tags-preview-design.md)
**Branche:** `feat/wysiwyg-tags-preview` (créée, spec déjà commitée)

---

## Structure de fichiers

| Fichier | Rôle |
| --- | --- |
| Create: `frontend/src/app/components/tag-editor/tag-editor.component.ts` | Composant pur combobox tags (inputs `tags`/`suggestions`/`disabled`/`placeholder`/`ariaLabel`, output `tagsChange`) |
| Create: `frontend/src/app/components/tag-editor/tag-editor.component.spec.ts` | Tests a11y + comportement |
| Modify: `frontend/src/app/pages/admin/shared/tag-input.component.ts` | Devient wrapper CVA autour de `<app-tag-editor>` |
| Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+ spec) | Input `tagSuggestions`, output `tagsChange`, tag-editor en editable |
| Modify: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts` | Relais `tagSuggestions` / `tagsChange` |
| Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (+ spec) | `[tagSuggestions]="allTags()"`, `onPreviewTagsChange` (record + patch + dirty) |
| Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+ spec) | Miroir furniture |
| Modify: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts` | Miroir |
| Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` (+ spec) | Miroir |
| Modify: `docs/SPECIFICATION_TECHNIQUE.md`, spec design | Doc finale |

## Commandes de test

- Suite complète (chaque fin de task) : `docker compose -f docker-compose.test.yml run --rm frontend-test` depuis la racine. Baseline : **871 SUCCESS**.
- Couverture (Task 5) : `docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --code-coverage` (seuils 80 %/75 %).

## Garde-fous d'exécution

- AUCUNE normalisation de caractères (apostrophes `’`, accents, tirets `—`). Edits ciblés ; vérifier le diff au niveau caractère (régressions historiques sur ce point).
- Compteurs de tests attendus = approximatifs sur baseline 871 ; ajuster d'autant si elle diffère.

---

### Task 1 : Composant pur `<app-tag-editor>`

**Files:**
- Create: `frontend/src/app/components/tag-editor/tag-editor.component.ts`
- Create: `frontend/src/app/components/tag-editor/tag-editor.component.spec.ts`

- [ ] **Step 1.1 : Écrire les tests (échec attendu)**

Créer `tag-editor.component.spec.ts` :

```typescript
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagEditorComponent } from './tag-editor.component';

@Component({
  standalone: true,
  imports: [TagEditorComponent],
  template: `<app-tag-editor [tags]="tags()" [suggestions]="suggestions"
                             [disabled]="disabled()" (tagsChange)="onChange($event)" />`,
})
class HostComponent {
  readonly tags = signal<string[]>([]);
  readonly disabled = signal(false);
  suggestions = ['bois', 'sculpture', 'frene', 'boheme'];
  last: string[] | null = null;
  onChange(next: string[]) { this.last = next; this.tags.set(next); }
}

describe('TagEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function inputEl(): HTMLInputElement { return fixture.nativeElement.querySelector('input[type="text"]'); }
  function chips(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.chip')); }
  function suggestions(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.suggestion')); }
  function type(v: string) { const el = inputEl(); el.value = v; el.dispatchEvent(new Event('input')); fixture.detectChanges(); }
  function key(k: string) { inputEl().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); fixture.detectChanges(); }

  it('rend les chips depuis l\'input tags', () => {
    host.tags.set(['bois', 'sculpture']);
    fixture.detectChanges();
    expect(chips().length).toBe(2);
    expect(chips()[0].textContent).toContain('bois');
  });

  it('combobox : aria-expanded suit l\'ouverture du dropdown', () => {
    const el = inputEl();
    expect(el.getAttribute('role')).toBe('combobox');
    inputEl().dispatchEvent(new Event('focus'));
    type('bo');
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('Entrée sur saisie libre ajoute le tag (création libre)', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('inedit');
    key('Enter');
    expect(host.last).toEqual(['inedit']);
  });

  it('virgule ajoute le tag', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('vegetal');
    key(',');
    expect(host.last).toEqual(['vegetal']);
  });

  it('flèches + Entrée ajoutent la suggestion active', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');                 // bois, boheme (frene exclu, sculpture exclu)
    key('ArrowDown');          // active index 0
    key('Enter');
    expect(host.last && host.last.length).toBe(1);
    expect(['bois', 'boheme']).toContain(host.last![0]);
  });

  it('aria-activedescendant pointe l\'option active', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');
    key('ArrowDown');
    const ad = inputEl().getAttribute('aria-activedescendant');
    expect(ad).toBeTruthy();
    expect(suggestions().length).toBeGreaterThan(0);
  });

  it('Backspace sur champ vide retire le dernier tag', () => {
    host.tags.set(['bois', 'sculpture']);
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    key('Backspace');
    expect(host.last).toEqual(['bois']);
  });

  it('clic sur × retire le tag', () => {
    host.tags.set(['bois', 'sculpture']);
    fixture.detectChanges();
    const removeBtn = chips()[0].querySelector('.chip-remove') as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();
    expect(host.last).toEqual(['sculpture']);
  });

  it('filtre les suggestions sur la saisie et exclut les tags présents', () => {
    host.tags.set(['bois']);
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    type('b');
    const labels = suggestions().map(s => s.textContent?.trim());
    expect(labels).toContain('boheme');
    expect(labels).not.toContain('bois');     // déjà présent
    expect(labels).not.toContain('frene');    // ne matche pas "b" au début mais inclut… (frene n'a pas de b)
  });

  it('n\'ajoute pas de doublon', () => {
    host.tags.set(['bois']);
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    type('bois');
    key('Enter');
    expect(host.last).toBeNull();   // aucun changement émis
  });

  it('tagsChange émet un tableau neuf (immutable)', () => {
    const before = host.tags();
    inputEl().dispatchEvent(new Event('focus'));
    type('neuf');
    key('Enter');
    expect(host.last).not.toBe(before);
  });

  it('disabled désactive le champ et les × ', () => {
    host.tags.set(['bois']);
    host.disabled.set(true);
    fixture.detectChanges();
    expect(inputEl().disabled).toBeTrue();
    expect((chips()[0].querySelector('.chip-remove') as HTMLButtonElement).disabled).toBeTrue();
  });
});
```

- [ ] **Step 1.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échec de compilation (`./tag-editor.component` absent).

- [ ] **Step 1.3 : Implémenter `tag-editor.component.ts`**

Créer le fichier (logique combobox reprise de l'actuel `tag-input`, mais pilotée par inputs/output, sans CVA) :

```typescript
import { Component, computed, input, output, signal } from '@angular/core';

let _counter = 0;

/**
 * Éditeur de tags présentation pur (combobox a11y : listbox, flèches,
 * Enter/virgule, Backspace, chips supprimables, autocomplétion). Aucune
 * dépendance Router/HttpClient/forms — partagé public+admin (ADR-0018).
 * Piloté par `tags`/`suggestions` en entrée, émet `tagsChange` (tableau neuf)
 * à chaque ajout/retrait. Consommé par <app-tag-input> (wrapper CVA form-side)
 * et par les vues détail en mode editable (preview WYSIWYG).
 */
@Component({
  selector: 'app-tag-editor',
  standalone: true,
  imports: [],
  template: `
    <div class="tag-input" [class.disabled]="disabled()">
      @for (tag of tags(); track tag) {
        <span class="chip">
          <span class="chip-label">{{ tag }}</span>
          <button type="button" class="chip-remove" aria-label="Retirer ce tag"
                  [disabled]="disabled()" (click)="removeTag(tag)">×</button>
        </span>
      }
      <input type="text"
             #comboInput
             role="combobox"
             [attr.aria-controls]="listboxId"
             [attr.aria-expanded]="dropdownOpen() && filteredSuggestions().length > 0"
             aria-haspopup="listbox"
             [attr.aria-activedescendant]="activeOptionId()"
             [value]="inputValue()"
             [disabled]="disabled()"
             [placeholder]="placeholder()"
             (input)="onInput($event)"
             (keydown)="onKey($event)"
             (focus)="dropdownOpen.set(true)"
             (blur)="onBlur()"
             [attr.aria-label]="ariaLabel()" />
      @if (dropdownOpen() && filteredSuggestions().length > 0) {
        <ul class="dropdown" [id]="listboxId" role="listbox">
          @for (s of filteredSuggestions(); track s; let i = $index) {
            <li role="option"
                [id]="listboxId + '-opt-' + i"
                [attr.aria-selected]="activeIndex() === i">
              <button type="button" class="suggestion"
                      [class.active]="activeIndex() === i"
                      tabindex="-1"
                      (mousedown)="$event.preventDefault()"
                      (click)="addTag(s)">{{ s }}</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .tag-input {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 6px 8px; border: 1px solid var(--color-line); background: var(--color-bg);
      position: relative;
    }
    .tag-input.disabled { opacity: 0.5; pointer-events: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line);
      font-size: 0.82rem;
    }
    .chip-remove {
      background: none; border: 0; cursor: pointer; font-size: 1.1rem; line-height: 1;
      color: var(--color-ink-soft); padding: 0 0 0 2px;
    }
    .chip-remove:hover { color: var(--color-ink); }
    input {
      flex: 1; min-width: 120px; border: 0; outline: none; padding: 4px 0;
      font: inherit; background: transparent; color: var(--color-ink);
    }
    .dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
      max-height: 200px; overflow-y: auto; margin: 4px 0 0; padding: 0;
      list-style: none; background: var(--color-bg); border: 1px solid var(--color-line);
    }
    .dropdown li { display: block; }
    .suggestion {
      width: 100%; text-align: left; padding: 8px 12px; cursor: pointer;
      background: transparent; border: 0; font: inherit; color: var(--color-ink);
    }
    .suggestion:hover, .suggestion.active { background: var(--color-bg-alt); }
  `]
})
export class TagEditorComponent {
  readonly tags = input<string[]>([]);
  readonly suggestions = input<string[]>([]);
  readonly disabled = input(false);
  readonly placeholder = input('Ajouter un tag…');
  readonly ariaLabel = input('Ajouter un tag');
  readonly tagsChange = output<string[]>();

  readonly listboxId = 'tag-editor-listbox-' + (++_counter);

  protected readonly inputValue = signal<string>('');
  protected readonly dropdownOpen = signal(false);
  protected readonly activeIndex = signal<number>(-1);

  protected readonly filteredSuggestions = computed(() => {
    const q = this.inputValue().trim().toLowerCase();
    const current = new Set(this.tags());
    return this.suggestions()
      .filter(s => !current.has(s))
      .filter(s => !q || s.toLowerCase().includes(q));
  });

  protected readonly activeOptionId = computed(() => {
    const i = this.activeIndex();
    if (i < 0 || i >= this.filteredSuggestions().length) return null;
    return `${this.listboxId}-opt-${i}`;
  });

  protected onInput(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
    this.activeIndex.set(-1);
  }

  protected onKey(event: KeyboardEvent): void {
    const suggestions = this.filteredSuggestions();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.dropdownOpen.set(true);
      const next = this.activeIndex() + 1;
      this.activeIndex.set(next >= suggestions.length ? suggestions.length - 1 : next);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = this.activeIndex() - 1;
      this.activeIndex.set(prev < 0 ? 0 : prev);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.dropdownOpen.set(false);
      this.activeIndex.set(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeIndex();
      if (idx >= 0 && idx < suggestions.length) {
        this.addTag(suggestions[idx]);
      } else {
        const v = this.inputValue().trim();
        if (v) this.addTag(v);
      }
      return;
    }

    if (event.key === ',') {
      event.preventDefault();
      const v = this.inputValue().trim();
      if (v) this.addTag(v);
      return;
    }

    if (event.key === 'Backspace' && this.inputValue() === '' && this.tags().length > 0) {
      event.preventDefault();
      this.removeTag(this.tags()[this.tags().length - 1]);
    }
  }

  protected onBlur(): void {
    setTimeout(() => this.dropdownOpen.set(false), 150);
  }

  protected addTag(tag: string): void {
    const v = tag.trim();
    if (!v) return;
    if (this.tags().includes(v)) return;
    this.inputValue.set('');
    this.activeIndex.set(-1);
    this.tagsChange.emit([...this.tags(), v]);
  }

  protected removeTag(tag: string): void {
    this.tagsChange.emit(this.tags().filter(t => t !== tag));
  }
}
```

- [ ] **Step 1.4 : Vérifier le vert**

Run : suite Docker. Attendu : **883 SUCCESS** (871 + 12).

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/components/tag-editor/
git commit -m "feat(admin): composant pur <app-tag-editor> (combobox tags partage)"
```

---

### Task 2 : `<app-tag-input>` délègue à `<app-tag-editor>`

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/tag-input.component.ts`

Le spec `tag-input.component.spec.ts` existant (host avec `[formControl]`, sélecteurs `.chip`/`input[type="text"]`/`.suggestion`/`.dropdown`) est le filet de sécurité — il ne change PAS et doit rester vert.

- [ ] **Step 2.1 : Réécrire `tag-input.component.ts` comme wrapper CVA**

Remplacer tout le contenu par :

```typescript
import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TagEditorComponent } from '../../../components/tag-editor/tag-editor.component';

/**
 * Champ de tags form-side : wrapper ControlValueAccessor autour du composant
 * présentation pur <app-tag-editor> (toute la logique combobox/a11y y vit).
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [TagEditorComponent],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
  template: `
    <app-tag-editor
      [tags]="value()"
      [suggestions]="suggestions"
      [disabled]="disabled()"
      [placeholder]="placeholder"
      (tagsChange)="onEditorChange($event)" />
  `,
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() suggestions: string[] = [];
  @Input() placeholder = 'Ajouter un tag…';

  protected readonly value = signal<string[]>([]);
  protected readonly disabled = signal(false);

  private onChangeFn: (value: string[]) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.value.set(value ?? []);
  }
  registerOnChange(fn: (value: string[]) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  protected onEditorChange(next: string[]): void {
    this.value.set(next);
    this.onChangeFn(next);
    this.onTouchedFn();
  }
}
```

- [ ] **Step 2.2 : Vérifier le vert**

Run : suite Docker. Attendu : **883 SUCCESS** (inchangé — le spec tag-input existant reste vert via le DOM projeté identique).

Si un test tag-input échoue sur le timing du dropdown (focus/blur asynchrone) : ne PAS affaiblir le test ; vérifier que le DOM projeté du tag-editor correspond aux sélecteurs. Le markup `.chip`/`input[type="text"]`/`.dropdown`/`.suggestion` est identique à l'original.

- [ ] **Step 2.3 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/tag-input.component.ts
git commit -m "refactor(admin): tag-input devient wrapper CVA autour de <app-tag-editor>"
```

---

### Task 3 : Intégration mobilier (vue + preview + page)

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+ `.spec.ts`)
- Modify: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (+ `.spec.ts`)

- [ ] **Step 3.1 : Écrire les tests vue (échec attendu)**

Dans `furniture-detail-view.component.spec.ts`, ajouter (helper de création de fixture déjà présent ; adapter au pattern du fichier) :

```typescript
  it('mode editable : rend <app-tag-editor> au lieu des routerLinks', () => {
    // fixture avec item ayant des tags + editable=true (réutiliser le pattern d'instanciation du fichier)
    component.item = { ...baseItem, tags: ['bois'] };
    component.editable = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.tags-list a.tag-chip')).toBeNull();
  });

  it('mode public : rend les routerLinks, pas de tag-editor', () => {
    component.item = { ...baseItem, tags: ['bois'] };
    component.editable = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tags-list a.tag-chip')).toBeTruthy();
  });

  it('mode editable : tags-editor visible même si tags vide', () => {
    component.item = { ...baseItem, tags: [] };
    component.editable = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeTruthy();
  });

  it('tagsChange du tag-editor est réémis par la vue', () => {
    component.item = { ...baseItem, tags: [] };
    component.editable = true;
    fixture.detectChanges();
    let emitted: string[] | null = null;
    component.tagsChange.subscribe((v: string[]) => emitted = v);
    const editor = fixture.debugElement.query(By.css('app-tag-editor'));
    editor.triggerEventHandler('tagsChange', ['neuf']);
    expect(emitted).toEqual(['neuf']);
  });
```

(`baseItem` / `component` / `By` : reprendre les conventions exactes du fichier spec existant ; s'il n'y a pas de `baseItem`, construire un `Furniture` minimal inline.)

- [ ] **Step 3.2 : Vérifier l'échec** — suite Docker, échecs (pas de `app-tag-editor`, pas d'output `tagsChange`).

- [ ] **Step 3.3 : Implémenter la vue `furniture-detail-view.component.ts`**

1. Imports : ajouter `import { TagEditorComponent } from '../tag-editor/tag-editor.component';` et l'ajouter au tableau `imports` du décorateur.
2. Classe : ajouter `@Input() tagSuggestions: string[] = [];` (près des autres `@Input`) et `@Output() tagsChange = new EventEmitter<string[]>();` (près des autres `@Output`).
3. Template — remplacer le bloc `tags-list` actuel :

```html
            @if (item.tags && item.tags.length > 0) {
              <div class="tags-list">
                @for (t of item.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
```

par :

```html
            @if (editable) {
              <div class="tags-list editable">
                <app-tag-editor
                  [tags]="item.tags ?? []"
                  [suggestions]="tagSuggestions"
                  (tagsChange)="tagsChange.emit($event)" />
              </div>
            } @else if (item.tags && item.tags.length > 0) {
              <div class="tags-list">
                @for (t of item.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
```

- [ ] **Step 3.4 : Implémenter le relais `furniture-preview.component.ts`**

1. Classe : ajouter `@Input() tagSuggestions: string[] = [];` et `@Output() tagsChange = new EventEmitter<string[]>();`
2. Template `<app-furniture-detail-view …>` : ajouter `[tagSuggestions]="tagSuggestions"` et `(tagsChange)="tagsChange.emit($event)"`.

(Note : `previewItem()` lit déjà `v.tags ?? []` — les tags du form alimentent la vue. Aucun changement du computed.)

- [ ] **Step 3.5 : Implémenter la page `mobilier.component.ts`**

1. Template `<app-furniture-preview …>` (dans le `<ng-template shellPreview>`) : ajouter `[tagSuggestions]="allTags()"` et `(tagsChange)="onPreviewTagsChange($event)"`.
2. Handler (près des autres `onPreview*`) :

```typescript
  protected onPreviewTagsChange(tags: string[]): void {
    this.history.record();
    this.furnitureForm.patchValue({ tags });
    this.furnitureForm.markAsDirty();
  }
```

- [ ] **Step 3.6 : Écrire le test page (intégration undo)**

Dans `mobilier.component.spec.ts`, ajouter (le helper `setupHistoryFixture` existe depuis SP3) :

```typescript
  it('onPreviewTagsChange patche les tags, marque dirty et enregistre un snapshot undo', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTagsChange(['bois', 'frene']);
    expect(cmp.furnitureForm.getRawValue().tags).toEqual(['bois', 'frene']);
    expect(cmp.furnitureForm.dirty).toBeTrue();
    cmp.history.undo();
    expect(cmp.furnitureForm.getRawValue().tags).toEqual([]);
  });
```

- [ ] **Step 3.7 : Vérifier le vert**

Run : suite Docker. Attendu : **888 SUCCESS** (883 + 4 vue + 1 page).

- [ ] **Step 3.8 : Commit**

```powershell
git add frontend/src/app/components/furniture-detail-view/ frontend/src/app/pages/admin/mobilier/
git commit -m "feat(admin): tags editables in-preview mobilier (tag-editor dans la vue + undo)"
```

---

### Task 4 : Intégration expositions (miroir)

**Files:**
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+ `.spec.ts`)
- Modify: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` (+ `.spec.ts`)

Miroir exact de la Task 3. LIS `furniture-detail-view.component.ts` migré comme modèle.

- [ ] **Step 4.1 : Tests vue (échec attendu)**

Dans `exhibition-detail-view.component.spec.ts`, mêmes 4 tests que Step 3.1 transposés (`app-tag-editor` en editable, routerLinks en public, visible si tags vide, `tagsChange` réémis). Adapter `baseItem` à un `Exhibition` minimal.

- [ ] **Step 4.2 : Vérifier l'échec** — suite Docker.

- [ ] **Step 4.3 : Implémenter la vue `exhibition-detail-view.component.ts`** — mêmes 3 retouches que Step 3.3 : import `TagEditorComponent` + `imports[]` ; `@Input() tagSuggestions` + `@Output() tagsChange` ; remplacement du bloc `tags-list` par la variante editable/public (identique au mobilier, le bloc HTML des tags est le même).

- [ ] **Step 4.4 : Implémenter le relais `exhibition-preview.component.ts`** — `@Input() tagSuggestions` + `@Output() tagsChange` + bindings `[tagSuggestions]`/`(tagsChange)` sur `<app-exhibition-detail-view>`.

- [ ] **Step 4.5 : Implémenter la page `expositions.component.ts`** — `[tagSuggestions]="allTags()"` + `(tagsChange)="onPreviewTagsChange($event)"` sur `<app-exhibition-preview>` ; handler :

```typescript
  protected onPreviewTagsChange(tags: string[]): void {
    this.history.record();
    this.exhibitionForm.patchValue({ tags });
    this.exhibitionForm.markAsDirty();
  }
```

- [ ] **Step 4.6 : Test page (intégration undo)**

Dans `expositions.component.spec.ts` (le `setupHistoryFixture` existe depuis SP3) :

```typescript
  it('onPreviewTagsChange patche les tags, marque dirty et enregistre un snapshot undo', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTagsChange(['design', 'moderne']);
    expect(cmp.exhibitionForm.getRawValue().tags).toEqual(['design', 'moderne']);
    expect(cmp.exhibitionForm.dirty).toBeTrue();
    cmp.history.undo();
    expect(cmp.exhibitionForm.getRawValue().tags).toEqual([]);
  });
```

- [ ] **Step 4.7 : Vérifier le vert** — suite Docker. Attendu : **893 SUCCESS** (888 + 5).

- [ ] **Step 4.8 : Commit**

```powershell
git add frontend/src/app/components/exhibition-detail-view/ frontend/src/app/pages/admin/expositions/
git commit -m "feat(admin): tags editables in-preview expositions (miroir mobilier)"
```

---

### Task 5 : Suite complète, couverture, documentation

**Files:**
- Modify: `docs/SPECIFICATION_TECHNIQUE.md`
- Modify: `docs/superpowers/specs/2026-06-13-wysiwyg-tags-preview-design.md`

- [ ] **Step 5.1 : Suite + couverture**

Run : `docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --code-coverage`
Attendu : **893 SUCCESS**, exit 0, seuils 80 %/75 % respectés. Noter les chiffres. Si un seuil échoue : STOP, BLOCKED.

- [ ] **Step 5.2 : `docs/SPECIFICATION_TECHNIQUE.md`**

1. §5.5 (composants partagés) — ajouter une sous-section :

```markdown
#### `<app-tag-editor>` (`TagEditorComponent`)

Chemin : `frontend/src/app/components/tag-editor/tag-editor.component.ts`

Éditeur de tags présentation pur (combobox a11y : listbox, flèches ↑/↓, Enter/virgule pour ajouter, Backspace pour retirer le dernier, Échap, chips supprimables, autocomplétion filtrée). Aucune dépendance Router/HttpClient/forms (ADR-0018). Inputs : `tags`, `suggestions`, `disabled`, `placeholder`, `ariaLabel`. Output : `tagsChange` (tableau neuf immutable). Consommé par `<app-tag-input>` (wrapper CVA form-side) et par les vues détail mobilier/exposition en mode editable (édition des tags in-preview).
```

2. §5.5 — dans la description de `<app-tag-input>` (si elle existe ; sinon l'ajouter) : préciser qu'il est désormais un wrapper `ControlValueAccessor` autour de `<app-tag-editor>`.

3. §5.5 — dans les descriptions de `<app-furniture-detail-view>` et `<app-exhibition-detail-view>` : ajouter l'input `tagSuggestions` et l'output `tagsChange` (mode editable : tags rendus via `<app-tag-editor>` ; mode public : routerLinks inchangés).

4. §5.4 — sous-sections `MobilierComponent`/`ExpositionsComponent` : ajouter une bullet :

```markdown
- **Tags in-preview** : `[tagSuggestions]="allTags()"` passé au preview ; `onPreviewTagsChange` → `history.record()` + `patchValue({ tags })` + `markAsDirty()` (édition des tags depuis la fiche sans repasser par le form).
```

5. Tableau d'historique : nouvelle ligne (incrément mineur depuis la dernière — 2.9.0 → 2.10.0, date 13/06/2026) + version en tête de fichier :

```markdown
| 2.10.0 | 13/06/2026 | Tags éditables in-preview (chantier v2, sous-projet 4/6) : extraction `<app-tag-editor>` pur (combobox partagé), `<app-tag-input>` devient wrapper CVA, édition des tags dans les previews mobilier/exposition avec autocomplétion + undo/redo |
```

- [ ] **Step 5.3 : Statut spec design**

Dans `docs/superpowers/specs/2026-06-13-wysiwyg-tags-preview-design.md` : `**Statut**` → `Implémenté — feat/wysiwyg-tags-preview`. Amender si déviation.

- [ ] **Step 5.4 : Commit**

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md docs/superpowers/specs/2026-06-13-wysiwyg-tags-preview-design.md
git commit -m "docs(spec-tech): tags editables previews WYSIWYG (sous-projet 4/6 chantier v2)"
```

---

## Critères de fin

- [ ] Suite frontend complète verte (~893), couverture ≥ seuils 80 %/75 %.
- [ ] Validation visuelle manuelle par l'utilisateur : édition tags dans le preview mobilier ET exposition (ajout autocomplété, création libre, suppression ×, undo Ctrl+Z) ; rendu public des tags (routerLinks) inchangé ; form-side tag-input toujours fonctionnel.
- [ ] Baselines Playwright non régénérées (rendu public inchangé).
- [ ] Doc à jour (spec-tech 2.10.0 + statut spec design).
- [ ] Hors périmètre intact : accueil non touché, pas de renommage global de tags, pas de réordonnancement.
