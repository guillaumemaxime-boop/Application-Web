# Socle factorisé des previews WYSIWYG — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraire le squelette WYSIWYG dupliqué des 3 pages admin (accueil, mobilier, expositions) vers un composant shell `<app-admin-preview-shell>` + des fonctions composables, sans changement visuel ni comportemental.

**Architecture:** Le shell possède la mode-bar tablist, le panneau form (projeté par `ng-content`, maintenu hors-écran en mode preview), le panneau preview (rendu via `ngTemplateOutlet` d'un `<ng-template shellPreview>`, détruit/recréé au toggle), la toolbar (💾 + ⤢) et le plein écran (`cdkTrapFocus`, swap role tabpanel↔dialog). Les handlers TS communs (formTick, focus whitelist, galerie) deviennent des composables dans `preview-page-helpers.ts`. Les pages gardent les **mêmes noms de membres publics** (`focusField`, `onPreviewCoverEdit`…) assignés depuis les composables → les specs existantes qui les appellent restent vertes.

**Tech Stack:** Angular 21 standalone, signals (`input()`, `model()`, `output()`, `contentChild()`), `@angular/cdk/a11y`, Karma + Jasmine.

**Spec:** [docs/superpowers/specs/2026-06-10-wysiwyg-socle-factorise-design.md](../specs/2026-06-10-wysiwyg-socle-factorise-design.md)

---

## Structure de fichiers

| Fichier | Rôle |
|---|---|
| Create: `frontend/src/app/pages/admin/shared/preview-page-helpers.ts` | Composables : `formTickSignal`, `createFieldFocus`, `createTextFieldEditHandler`, `createGalleryPreviewHandlers` + interfaces `GalleryEditorLike`/`CoverFieldLike` |
| Create: `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts` | Tests unitaires des composables |
| Create: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts` | Shell : mode-bar, panel form, panel preview, toolbar, fullscreen, CSS partagé + `ShellPreviewDirective` |
| Create: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts` | Tests du shell (host component) |
| Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` | Migration vers le shell + composables |
| Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts` | Suppression des 2 tests fullscreen (couverts par le shell) |
| Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` | Migration vers le shell + composables |
| Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts` | Suppression des 3 tests fullscreen |
| Modify: `frontend/src/app/pages/admin/accueil/accueil.component.ts` | Migration vers le shell |
| Modify: `frontend/src/app/pages/admin/accueil/accueil.component.spec.ts` | Suppression du test fullscreen |
| Modify: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts` | Adoption `formTickSignal` |
| Modify: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts` | Adoption `formTickSignal` |
| Modify: `docs/SPECIFICATION_TECHNIQUE.md` | Sections 5.4/5.5 + changelog |
| Modify: `docs/superpowers/specs/2026-06-10-wysiwyg-socle-factorise-design.md` | Amendements (écarts assumés, API à 3 inputs de libellés) |

## Écarts assumés vs « zéro changement visuel » (à valider à l'exécution)

Les 3 pages ont des micro-divergences CSS que l'unification harmonise. **Aucune n'est visible à largeur desktop standard (>1280px)** :

1. **Mobilier ≤768px** : gagne `.admin-mode-tab { font-size: 0.78rem; }` (présent sur expo/accueil, absent sur mobilier).
2. **Accueil 769–1280px** : `.admin-preview` passe de `max-height: calc(100vh - 100px)` à `60vh` (règle 1280px de mobilier/expo, absente sur accueil).
3. **Accueil** : la toolbar preview gagne un wrapper `<div class="admin-preview-actions">` autour du bouton ⤢ (DOM, rendu identique).

La divergence **comportementale** mobilier ≤768px (`.admin-preview { display: none; }`) est **préservée** via l'input `hidePreviewOnMobile`.

Si un test visuel Playwright échoue sur ces points, ne PAS régénérer la baseline : remonter à l'utilisateur.

## Commandes de test

- Spec ciblée (rapide, local) : `cd frontend` puis `npx ng test --watch=false --include='**/<nom>.spec.ts'`
- Suite complète (fin de task) : `docker compose -f docker-compose.test.yml run --rm frontend-test` (depuis la racine repo)

---

### Task 1 : Composables `preview-page-helpers.ts`

**Files:**
- Create: `frontend/src/app/pages/admin/shared/preview-page-helpers.ts`
- Create: `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts`

- [ ] **Step 1.1 : Écrire les tests (échec attendu)**

Créer `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts` :

```typescript
import { DestroyRef, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { GalleryItem } from '../../../models/gallery-item.model';
import {
  CoverFieldLike,
  GalleryEditorLike,
  createFieldFocus,
  createGalleryPreviewHandlers,
  createTextFieldEditHandler,
  formTickSignal,
} from './preview-page-helpers';

class FakeDestroyRef extends DestroyRef {
  private callbacks: Array<() => void> = [];
  override onDestroy(cb: () => void): () => void {
    this.callbacks.push(cb);
    return () => { this.callbacks = this.callbacks.filter(c => c !== cb); };
  }
  destroy(): void { this.callbacks.forEach(cb => cb()); }
}

describe('preview-page-helpers', () => {

  describe('formTickSignal', () => {
    it('incremente a chaque valueChanges puis se desabonne au destroy', () => {
      const form = new FormBuilder().group({ title: [''] });
      const destroyRef = new FakeDestroyRef();
      const tick = formTickSignal(form, destroyRef);
      expect(tick()).toBe(0);
      form.patchValue({ title: 'a' });
      expect(tick()).toBe(1);
      form.patchValue({ title: 'b' });
      expect(tick()).toBe(2);
      destroyRef.destroy();
      form.patchValue({ title: 'c' });
      expect(tick()).toBe(2);
    });
  });

  describe('createFieldFocus', () => {
    let input: HTMLInputElement;
    beforeEach(() => {
      input = document.createElement('input');
      input.id = 'field-title';
      document.body.appendChild(input);
    });
    afterEach(() => input.remove());

    it('scroll + focus un champ whiteliste', () => {
      const focusField = createFieldFocus(new Set(['title']));
      const scrollSpy = spyOn(input, 'scrollIntoView');
      const focusSpy = spyOn(input, 'focus');
      focusField('title');
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(focusSpy).toHaveBeenCalled();
    });

    it('ignore un champ hors whitelist meme si l\'element existe', () => {
      const focusField = createFieldFocus(new Set(['category']));
      const focusSpy = spyOn(input, 'focus');
      focusField('title');
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it('no-op sans erreur quand l\'element est absent du DOM', () => {
      const focusField = createFieldFocus(new Set(['absent']));
      expect(() => focusField('absent')).not.toThrow();
    });
  });

  describe('createTextFieldEditHandler', () => {
    it('patche la valeur + marque dirty pour un champ whiteliste', () => {
      const form = new FormBuilder().group({ title: [''] });
      const handler = createTextFieldEditHandler(form, new Set(['title']));
      handler({ field: 'title', value: 'Nouveau' });
      expect(form.value.title).toBe('Nouveau');
      expect(form.get('title')!.dirty).toBeTrue();
    });

    it('ignore un champ hors whitelist', () => {
      const form = new FormBuilder().group({ title: [''], slug: ['s'] });
      const handler = createTextFieldEditHandler(form, new Set(['title']));
      handler({ field: 'slug', value: 'hack' });
      expect(form.value.slug).toBe('s');
      expect(form.get('slug')!.dirty).toBeFalse();
    });
  });

  describe('createGalleryPreviewHandlers', () => {
    function setup() {
      const gallery = signal<GalleryItem[]>([
        { url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' },
      ] as GalleryItem[]);
      const galleryEditor = jasmine.createSpyObj<GalleryEditorLike>('GalleryEditorLike', ['openCropFor', 'openReplaceFor', 'openPicker']);
      const coverField = jasmine.createSpyObj<CoverFieldLike>('CoverFieldLike', ['openCrop', 'openPicker']);
      const handlers = createGalleryPreviewHandlers({
        gallery,
        galleryEditor: () => galleryEditor,
        coverField: () => coverField,
      });
      return { gallery, galleryEditor, coverField, handlers };
    }

    it('onCoverEdit crop -> coverField.openCrop', () => {
      const { coverField, handlers } = setup();
      handlers.onCoverEdit('crop');
      expect(coverField.openCrop).toHaveBeenCalled();
      expect(coverField.openPicker).not.toHaveBeenCalled();
    });

    it('onCoverEdit replace -> coverField.openPicker', () => {
      const { coverField, handlers } = setup();
      handlers.onCoverEdit('replace');
      expect(coverField.openPicker).toHaveBeenCalled();
    });

    it('onGalleryItemEdit remove retire l\'item du signal', () => {
      const { gallery, handlers } = setup();
      handlers.onGalleryItemEdit({ index: 0, action: 'remove' });
      expect(gallery().map(g => g.url)).toEqual(['b.jpg', 'c.jpg']);
    });

    it('onGalleryItemEdit crop -> galleryEditor.openCropFor(index)', () => {
      const { galleryEditor, handlers } = setup();
      handlers.onGalleryItemEdit({ index: 2, action: 'crop' });
      expect(galleryEditor.openCropFor).toHaveBeenCalledWith(2);
    });

    it('onGalleryItemEdit replace -> galleryEditor.openReplaceFor(index)', () => {
      const { galleryEditor, handlers } = setup();
      handlers.onGalleryItemEdit({ index: 1, action: 'replace' });
      expect(galleryEditor.openReplaceFor).toHaveBeenCalledWith(1);
    });

    it('onGalleryAdd -> galleryEditor.openPicker', () => {
      const { galleryEditor, handlers } = setup();
      handlers.onGalleryAdd();
      expect(galleryEditor.openPicker).toHaveBeenCalled();
    });

    it('onGalleryReorder reordonne le signal', () => {
      const { gallery, handlers } = setup();
      handlers.onGalleryReorder([2, 0, 1]);
      expect(gallery().map(g => g.url)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
    });

    it('onGalleryItemResize patche colSpan/rowSpan sur l\'item cible', () => {
      const { gallery, handlers } = setup();
      handlers.onGalleryItemResize({ index: 1, colSpan: 2, rowSpan: 3 });
      expect(gallery()[1].colSpan).toBe(2);
      expect(gallery()[1].rowSpan).toBe(3);
      expect(gallery()[0].colSpan).toBeUndefined();
    });

    it('no-op sans erreur quand les editeurs sont absents (getters undefined)', () => {
      const gallery = signal<GalleryItem[]>([]);
      const handlers = createGalleryPreviewHandlers({
        gallery,
        galleryEditor: () => undefined,
        coverField: () => undefined,
      });
      expect(() => {
        handlers.onCoverEdit('crop');
        handlers.onCoverEdit('replace');
        handlers.onGalleryItemEdit({ index: 0, action: 'crop' });
        handlers.onGalleryAdd();
      }).not.toThrow();
    });
  });
});
```

- [ ] **Step 1.2 : Vérifier l'échec**

```powershell
cd frontend
npx ng test --watch=false --include='**/preview-page-helpers.spec.ts'
```

Attendu : ÉCHEC de compilation — `Cannot find module './preview-page-helpers'`.

- [ ] **Step 1.3 : Implémenter les composables**

Créer `frontend/src/app/pages/admin/shared/preview-page-helpers.ts` :

```typescript
import { DestroyRef, Signal, WritableSignal, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { GalleryItem } from '../../../models/gallery-item.model';

/**
 * Composables partagés par les pages admin à preview WYSIWYG
 * (mobilier, expositions, accueil). Voir spec
 * docs/superpowers/specs/2026-06-10-wysiwyg-socle-factorise-design.md.
 */

/**
 * Signal tick incrémenté à chaque valueChanges du form, pour forcer un
 * computed à se recalculer (toSignal() est impossible dans un computed).
 * Le désabonnement est rattaché au DestroyRef passé en paramètre, ce qui
 * permet l'appel hors contexte d'injection (ex. ngOnInit des previews).
 */
export function formTickSignal(form: FormGroup, destroyRef: DestroyRef): Signal<number> {
  const tick = signal(0);
  const sub = form.valueChanges.subscribe(() => tick.update(n => n + 1));
  destroyRef.onDestroy(() => sub.unsubscribe());
  return tick.asReadonly();
}

/**
 * Click-to-focus depuis le preview : scroll + focus l'input `field-<name>`
 * du form-side. Whitelist obligatoire (défense en profondeur — l'event
 * vient du DOM du preview).
 */
export function createFieldFocus(allowedFields: ReadonlySet<string>): (name: string) => void {
  return (name: string) => {
    if (!allowedFields.has(name)) return;
    const el = document.getElementById(`field-${name}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLInputElement | HTMLTextAreaElement).focus();
  };
}

/**
 * Édition inline depuis le preview : patche le FormControl + markAsDirty,
 * derrière la même whitelist que le focus.
 */
export function createTextFieldEditHandler(
  form: FormGroup,
  allowedFields: ReadonlySet<string>,
): (e: { field: string; value: string }) => void {
  return (e) => {
    if (!allowedFields.has(e.field)) return;
    form.patchValue({ [e.field]: e.value });
    form.get(e.field)?.markAsDirty();
  };
}

/** Vue structurelle de GalleryEditorComponent (évite le couplage direct). */
export interface GalleryEditorLike {
  openCropFor(index: number): void;
  openReplaceFor(index: number): void;
  openPicker(): void;
}

/** Vue structurelle de ImageFieldComponent. */
export interface CoverFieldLike {
  openCrop(): void;
  openPicker(): void;
}

export interface GalleryPreviewHandlers {
  onCoverEdit(action: 'crop' | 'replace'): void;
  onGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void;
  onGalleryAdd(): void;
  onGalleryReorder(order: number[]): void;
  onGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void;
}

/**
 * Handlers galerie du preview, identiques entre mobilier et expositions.
 * Les éditeurs sont passés en getters car les ViewChild ne sont pas
 * disponibles à la construction du composant.
 */
export function createGalleryPreviewHandlers(opts: {
  gallery: WritableSignal<GalleryItem[]>;
  galleryEditor: () => GalleryEditorLike | undefined;
  coverField: () => CoverFieldLike | undefined;
}): GalleryPreviewHandlers {
  const { gallery, galleryEditor, coverField } = opts;
  return {
    onCoverEdit(action) {
      if (action === 'crop') coverField()?.openCrop();
      else coverField()?.openPicker();
    },
    onGalleryItemEdit(e) {
      if (e.action === 'remove') {
        gallery.update(arr => arr.filter((_, i) => i !== e.index));
        return;
      }
      if (e.action === 'crop') galleryEditor()?.openCropFor(e.index);
      else galleryEditor()?.openReplaceFor(e.index);
    },
    onGalleryAdd() {
      galleryEditor()?.openPicker();
    },
    onGalleryReorder(order) {
      const items = gallery();
      gallery.set(order.map(i => items[i]));
    },
    onGalleryItemResize(e) {
      gallery.update(arr => arr.map((it, i) =>
        i === e.index ? { ...it, colSpan: e.colSpan, rowSpan: e.rowSpan } : it
      ));
    },
  };
}
```

- [ ] **Step 1.4 : Vérifier le vert**

```powershell
cd frontend
npx ng test --watch=false --include='**/preview-page-helpers.spec.ts'
```

Attendu : tous les tests PASS.

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/preview-page-helpers.ts frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts
git commit -m "feat(admin): composables preview-page-helpers (formTick, focus whitelist, handlers galerie)"
```

---

### Task 2 : Composant `<app-admin-preview-shell>`

**Files:**
- Create: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts`
- Create: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts`

**Note API vs spec** : la spec prévoyait un input `entityLabel` unique ; les libellés réels ne sont pas composables (« Mode d'édition de la pièce » / « Aperçu de la fiche »). On utilise 3 inputs : `modeBarAriaLabel`, `formTabLabel`, `previewDialogLabel`. Amendement de spec en Task 6.

- [ ] **Step 2.1 : Écrire les tests (échec attendu)**

Créer `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts` :

```typescript
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AdminPreviewShellComponent, ShellPreviewDirective } from './admin-preview-shell.component';

@Component({
  standalone: true,
  imports: [AdminPreviewShellComponent, ShellPreviewDirective],
  template: `
    <app-admin-preview-shell
      [active]="active()"
      [(viewMode)]="viewMode"
      modeBarAriaLabel="Mode d'édition de test"
      formTabLabel="✏ Modifier le test"
      previewDialogLabel="Aperçu du test"
      [showSave]="showSave()"
      [saveDisabled]="saveDisabled()"
      [saving]="saving()"
      (save)="saveCount = saveCount + 1">
      <p class="form-marker">FORM</p>
      <ng-template shellPreview><p class="preview-marker">PREVIEW</p></ng-template>
    </app-admin-preview-shell>
  `,
})
class HostComponent {
  readonly active = signal(true);
  readonly viewMode = signal<'form' | 'preview'>('form');
  readonly showSave = signal(true);
  readonly saveDisabled = signal(false);
  readonly saving = signal(false);
  saveCount = 0;
}

describe('AdminPreviewShellComponent', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('rend la tablist avec 2 onglets et les attributs ARIA', () => {
    const fixture = create();
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]'));
    expect(tablist).toBeTruthy();
    expect(tablist.attributes['aria-label']).toBe("Mode d'édition de test");
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(tabs.length).toBe(2);
    expect(tabs[0].attributes['id']).toBe('tab-form');
    expect(tabs[0].attributes['aria-controls']).toBe('panel-form');
    expect(tabs[0].attributes['aria-selected']).toBe('true');
    expect(tabs[0].nativeElement.textContent).toContain('Modifier le test');
    expect(tabs[1].attributes['id']).toBe('tab-preview');
    expect(tabs[1].attributes['aria-controls']).toBe('panel-preview');
    expect(tabs[1].attributes['aria-selected']).toBe('false');
  });

  it('masque la mode-bar quand active=false', () => {
    const fixture = create();
    fixture.componentInstance.active.set(false);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.admin-mode-bar'))).toBeNull();
  });

  it('projette le contenu form dans le panel tabpanel, visible en mode form', () => {
    const fixture = create();
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.attributes['role']).toBe('tabpanel');
    expect(panel.nativeElement.querySelector('.form-marker')).toBeTruthy();
    expect(panel.nativeElement.classList.contains('is-hidden')).toBeFalse();
    expect(panel.nativeElement.hasAttribute('inert')).toBeFalse();
    expect(fixture.debugElement.query(By.css('.preview-marker'))).toBeNull();
  });

  it('mode preview : panel form is-hidden + inert, template preview instancié', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.nativeElement.classList.contains('is-hidden')).toBeTrue();
    expect(panel.nativeElement.hasAttribute('inert')).toBeTrue();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside).toBeTruthy();
    expect(aside.attributes['role']).toBe('tabpanel');
    expect(aside.nativeElement.querySelector('.preview-marker')).toBeTruthy();
  });

  it('pas de panel preview quand active=false meme en mode preview', () => {
    const fixture = create();
    fixture.componentInstance.active.set(false);
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('#panel-preview'))).toBeNull();
  });

  it('clic sur l\'onglet Aperçu bascule viewMode (two-way vers le host)', () => {
    const fixture = create();
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    tabs[1].nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('preview');
    tabs[0].nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('form');
  });

  it('plein écran : role=dialog + aria-modal + aria-label + classe fullscreen, puis retour', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const toggle = fixture.debugElement.query(By.css('.btn-preview-toggle'));
    toggle.nativeElement.click();
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeTrue();
    expect(aside.attributes['role']).toBe('dialog');
    expect(aside.attributes['aria-modal']).toBe('true');
    expect(aside.attributes['aria-label']).toBe('Aperçu du test');
    expect(aside.attributes['aria-labelledby']).toBeFalsy();
    toggle.nativeElement.click();
    fixture.detectChanges();
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeFalse();
    expect(aside.attributes['role']).toBe('tabpanel');
    expect(aside.attributes['aria-labelledby']).toBe('tab-preview');
  });

  it('bouton save : émet save, disabled si saveDisabled, label Enregistrement… si saving', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const save = fixture.debugElement.query(By.css('.btn-preview-save'));
    expect(save).toBeTruthy();
    save.nativeElement.click();
    expect(fixture.componentInstance.saveCount).toBe(1);
    fixture.componentInstance.saveDisabled.set(true);
    fixture.detectChanges();
    expect(save.nativeElement.disabled).toBeTrue();
    fixture.componentInstance.saveDisabled.set(false);
    fixture.componentInstance.saving.set(true);
    fixture.detectChanges();
    expect(save.nativeElement.disabled).toBeTrue();
    expect(save.nativeElement.textContent).toContain('Enregistrement');
  });

  it('pas de bouton save quand showSave=false', () => {
    const fixture = create();
    fixture.componentInstance.showSave.set(false);
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.btn-preview-save'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-preview-toggle'))).toBeTruthy();
  });
});
```

- [ ] **Step 2.2 : Vérifier l'échec**

```powershell
cd frontend
npx ng test --watch=false --include='**/admin-preview-shell.component.spec.ts'
```

Attendu : ÉCHEC — `Cannot find module './admin-preview-shell.component'`.

- [ ] **Step 2.3 : Implémenter le shell**

Créer `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts` :

```typescript
import { Component, Directive, TemplateRef, contentChild, inject, input, model, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';

/** Marqueur du template preview projeté dans le shell. */
@Directive({ selector: 'ng-template[shellPreview]', standalone: true })
export class ShellPreviewDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Squelette partagé des pages admin à preview WYSIWYG (mobilier,
 * expositions, accueil) : mode-bar tablist Modifier/Aperçu, panneau form
 * maintenu hors-écran en mode preview (préserve ViewChild et modales),
 * panneau preview détruit/recréé au toggle, toolbar 💾/⤢, plein écran
 * avec trap focus. Voir spec 2026-06-10-wysiwyg-socle-factorise-design.md.
 */
@Component({
  selector: 'app-admin-preview-shell',
  standalone: true,
  imports: [A11yModule, NgTemplateOutlet],
  host: { '[class.hide-preview-mobile]': 'hidePreviewOnMobile()' },
  template: `
    <div class="admin-split">
      @if (active()) {
        <div class="admin-mode-bar" role="tablist" [attr.aria-label]="modeBarAriaLabel()">
          <button type="button" role="tab" id="tab-form" class="admin-mode-tab"
                  aria-controls="panel-form"
                  [class.active]="viewMode() === 'form'"
                  [attr.aria-selected]="viewMode() === 'form'"
                  (click)="viewMode.set('form')">
            {{ formTabLabel() }}
          </button>
          <button type="button" role="tab" id="tab-preview" class="admin-mode-tab"
                  aria-controls="panel-preview"
                  [class.active]="viewMode() === 'preview'"
                  [attr.aria-selected]="viewMode() === 'preview'"
                  (click)="viewMode.set('preview')">
            👁 Aperçu
          </button>
        </div>
      }

      <section class="admin-form" id="panel-form" role="tabpanel" aria-labelledby="tab-form"
               [class.is-hidden]="viewMode() !== 'form'"
               [attr.inert]="viewMode() !== 'form' ? '' : null">
        <ng-content />
      </section>

      @if (viewMode() === 'preview' && active()) {
        <aside class="admin-preview" id="panel-preview"
               [class.fullscreen]="previewFullscreen()"
               [attr.role]="previewFullscreen() ? 'dialog' : 'tabpanel'"
               [attr.aria-labelledby]="previewFullscreen() ? null : 'tab-preview'"
               [attr.aria-label]="previewFullscreen() ? previewDialogLabel() : null"
               [attr.aria-modal]="previewFullscreen() ? 'true' : null"
               [cdkTrapFocus]="previewFullscreen()"
               [cdkTrapFocusAutoCapture]="previewFullscreen()">
          <div class="admin-preview-toolbar">
            <span class="admin-preview-label">Aperçu</span>
            <div class="admin-preview-actions">
              @if (showSave()) {
                <button type="button" class="btn-preview-save"
                        [disabled]="saveDisabled() || saving()"
                        (click)="save.emit()">
                  @if (saving()) { Enregistrement… } @else { 💾 Enregistrer }
                </button>
              }
              <button type="button" class="btn-preview-toggle"
                      (click)="togglePreviewFullscreen()"
                      [attr.aria-label]="previewFullscreenLabel()">
                @if (previewFullscreen()) { ⤡ Réduire } @else { ⤢ Plein écran }
              </button>
            </div>
          </div>
          @if (previewTpl(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl.templateRef" />
          }
        </aside>
      }
    </div>
  `,
  styles: [`
    .admin-split { display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
    .admin-mode-bar { display: inline-flex; gap: 4px; padding: 4px; background: var(--color-bg-alt); border: 1px solid var(--color-line); align-self: flex-start; }
    .admin-mode-tab { padding: 8px 16px; background: transparent; border: 0; color: var(--color-ink-soft); font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
    .admin-mode-tab:hover { color: var(--color-ink); }
    .admin-mode-tab.active { background: var(--color-ink); color: var(--color-bg); font-weight: 600; }
    .admin-form { max-width: 100%; }
    /* En mode preview : form rendue mais positionnee hors viewport. Pas de display:none
       (qui retirerait les modales descendantes) ni de visibility:hidden (qui se propage
       en heritage CSS aux modales position:fixed et bloque par view encapsulation
       Angular sur les composants enfants). Les pickers position:fixed s'affichent
       toujours au viewport grace a leur z-index. */
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
    @media (max-width: 1280px) {
      .admin-preview { position: static; max-height: 60vh; }
    }
    @media (max-width: 768px) {
      .admin-mode-tab { font-size: 0.78rem; }
      .admin-preview { max-height: 60vh; }
      :host(.hide-preview-mobile) .admin-preview { display: none; }
    }
  `]
})
export class AdminPreviewShellComponent {
  /** Item en cours d'édition : affiche la mode-bar et autorise le panel preview. */
  readonly active = input(true);
  /** aria-label de la tablist, ex. « Mode d'édition de la pièce ». */
  readonly modeBarAriaLabel = input.required<string>();
  /** Texte de l'onglet form, ex. « ✏ Modifier la pièce ». */
  readonly formTabLabel = input.required<string>();
  /** aria-label du dialog plein écran, ex. « Aperçu de la fiche ». */
  readonly previewDialogLabel = input.required<string>();
  /** Bouton 💾 dans la toolbar (false pour l'accueil : auto-save). */
  readonly showSave = input(false);
  readonly saveDisabled = input(false);
  readonly saving = input(false);
  /** Préserve le comportement mobilier : preview masqué ≤768px. */
  readonly hidePreviewOnMobile = input(false);
  readonly viewMode = model<'form' | 'preview'>('form');
  readonly save = output<void>();

  protected readonly previewTpl = contentChild(ShellPreviewDirective);
  protected readonly previewFullscreen = signal(false);

  protected togglePreviewFullscreen(): void {
    this.previewFullscreen.update(v => !v);
  }

  protected previewFullscreenLabel(): string {
    return this.previewFullscreen() ? 'Réduire l’aperçu' : 'Aperçu plein écran';
  }
}
```

- [ ] **Step 2.4 : Vérifier le vert**

```powershell
cd frontend
npx ng test --watch=false --include='**/admin-preview-shell.component.spec.ts'
```

Attendu : tous les tests PASS.

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts
git commit -m "feat(admin): composant <app-admin-preview-shell> (squelette WYSIWYG partage)"
```

---

### Task 3 : Migration `MobilierComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`

Refactor pur : les tests existants sont le filet. Les noms de membres publics (`focusField`, `onPreviewCoverEdit`, `onPreviewGalleryItemEdit`, `onPreviewGalleryAdd`, `onPreviewGalleryReorder`, `onPreviewGalleryItemResize`, `onPreviewTextFieldEdit`) sont **conservés** comme champs assignés depuis les composables → les specs qui les appellent restent vertes sans modification.

- [ ] **Step 3.1 : Imports**

Dans `mobilier.component.ts` :
- Ligne 1 : retirer `OnInit`, `OnDestroy` ; ajouter `DestroyRef` → `import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';`
- Ligne 2 : supprimer `import { A11yModule } from '@angular/cdk/a11y';` (cdkTrapFocus vit dans le shell).
- Ligne 5 : retirer `Subscription` → `import { forkJoin } from 'rxjs';`
- Ajouter :

```typescript
import { AdminPreviewShellComponent, ShellPreviewDirective } from '../shared/admin-preview-shell.component';
import { createFieldFocus, createGalleryPreviewHandlers, createTextFieldEditHandler, formTickSignal } from '../shared/preview-page-helpers';
```

- Dans le tableau `imports` du décorateur : retirer `A11yModule`, ajouter `AdminPreviewShellComponent, ShellPreviewDirective`.

- [ ] **Step 3.2 : Template — remplacer le bloc `admin-split`**

Remplacer tout le bloc `<div class="admin-split">…</div>` (lignes 50–259, de l'ouverture du div jusqu'à sa fermeture juste avant `</div>` final de `.grid-admin`) par :

```html
      <app-admin-preview-shell
        [active]="previewActive()"
        [(viewMode)]="mobilierViewMode"
        modeBarAriaLabel="Mode d'édition de la pièce"
        formTabLabel="✏ Modifier la pièce"
        previewDialogLabel="Aperçu de la fiche"
        [showSave]="true"
        [saveDisabled]="furnitureForm.invalid"
        [saving]="saving()"
        [hidePreviewOnMobile]="true"
        (save)="saveFurniture()">
        <form class="form" [formGroup]="furnitureForm" (ngSubmit)="saveFurniture()">
          <!-- … contenu du <form> existant (lignes 72–218) inchangé, déplacé tel quel … -->
        </form>
        <ng-template shellPreview>
          <app-furniture-preview
            [form]="furnitureForm"
            [gallery]="furnitureGallery.asReadonly()"
            [story]="currentStories()[0] ?? null"
            [displaySlides]="previewDisplaySlides()"
            (coverEdit)="onPreviewCoverEdit($event)"
            (galleryItemEdit)="onPreviewGalleryItemEdit($event)"
            (galleryReorder)="onPreviewGalleryReorder($event)"
            (galleryAdd)="onPreviewGalleryAdd()"
            (textFieldClick)="focusField($event)"
            (textFieldEdit)="onPreviewTextFieldEdit($event)"
            (galleryItemResize)="onPreviewGalleryItemResize($event)" />
        </ng-template>
      </app-admin-preview-shell>
```

Concrètement : la mode-bar (51–68), l'ouverture/fermeture du `<section class="admin-form">` (69–71 et 219), et tout l'aside preview avec sa toolbar (221–258) disparaissent ; le `<form>` complet (72–218) est conservé à l'identique comme contenu projeté ; le `<app-furniture-preview>` (245–256) est conservé à l'identique dans le `<ng-template shellPreview>`.

- [ ] **Step 3.3 : Styles — supprimer le CSS migré dans le shell**

Supprimer du tableau `styles` les règles suivantes (désormais dans le shell) :
`.admin-split`, `.admin-mode-bar`, `.admin-mode-tab` (+ `:hover`, `.active`), `.admin-form`, le commentaire « En mode preview : form rendue… » + `.admin-form.is-hidden`, le commentaire « L'override pointer-events… » (le déplacer en commentaire au-dessus du shell ou le supprimer — l'info vit déjà dans styles.css), `.admin-preview`, `.admin-preview-toolbar`, `.admin-preview-label`, `.btn-preview-toggle` (+ `:hover`), `.admin-preview-actions`, `.btn-preview-save` (+ `:hover`, `:disabled`), `.admin-preview.fullscreen` (+ toolbar), et dans les media queries : la règle `.admin-split { grid-template-columns: 1fr; }` (1280px, déjà sans effet sur un flex), `.admin-preview { position: static; max-height: 60vh; }` (1280px), `.admin-preview { display: none; }` (768px — remplacé par `hidePreviewOnMobile`). Si une media query devient vide, la supprimer.

Restent dans la page : `.grid-admin`, `.list*`, `.row*`, `.form*`, `.dim-*`, `.actions`, `.btn-primary`, `.btn-link`, `.status`, `.slides-hint`, `.stories-*`, `.cover-editor*`, `.btn-mini*`, `.story-*`, `.reorder-btn*`, `.readonly-row`, `.row-2`, `.view-link`, `.form-head`, checkbox, et les media queries 960px/600px.

- [ ] **Step 3.4 : Classe — remplacer les membres migrés**

1. Supprimer `implements OnInit, OnDestroy` (la classe n'implémente plus rien), les méthodes `ngOnInit`/`ngOnDestroy` (455–463), le champ `formTickSub` (411), `private readonly _formTick = signal(0);` (410), `previewFullscreen` (403), `togglePreviewFullscreen` (406), `previewFullscreenLabel` (407–409), et les méthodes `focusField` (651–656), `onPreviewCoverEdit` (658–664), `onPreviewGalleryItemEdit` (666–676), `onPreviewGalleryAdd` (678–680), `onPreviewTextFieldEdit` (682–685), `onPreviewGalleryReorder` (687–690), `onPreviewGalleryItemResize` (692–696).

2. Ajouter, **après** la déclaration de `furnitureForm` (l'ordre d'initialisation des champs compte : `formTickSignal` lit `this.furnitureForm`) :

```typescript
  /** Whitelist des champs admissibles depuis le preview (défense en profondeur). */
  private static readonly FOCUSABLE_FIELDS = new Set([
    'title', 'category', 'material', 'shortDescription', 'description',
  ]);

  protected readonly previewActive = computed(() =>
    this.editingFurnitureSlug() !== null || this.editingFurnitureId() !== null || this.creatingFurniture()
  );

  private readonly _formTick = formTickSignal(this.furnitureForm, inject(DestroyRef));

  focusField = createFieldFocus(MobilierComponent.FOCUSABLE_FIELDS);
  onPreviewTextFieldEdit = createTextFieldEditHandler(this.furnitureForm, MobilierComponent.FOCUSABLE_FIELDS);

  private readonly galleryHandlers = createGalleryPreviewHandlers({
    gallery: this.furnitureGallery,
    galleryEditor: () => this.galleryEditor,
    coverField: () => this.coverImageField,
  });
  onPreviewCoverEdit = this.galleryHandlers.onCoverEdit;
  onPreviewGalleryItemEdit = this.galleryHandlers.onGalleryItemEdit;
  onPreviewGalleryAdd = this.galleryHandlers.onGalleryAdd;
  onPreviewGalleryReorder = this.galleryHandlers.onGalleryReorder;
  onPreviewGalleryItemResize = this.galleryHandlers.onGalleryItemResize;
```

`previewDisplaySlides` (computed existant) doit être déclaré **après** `_formTick` — déplacer sa déclaration si nécessaire. `mobilierViewMode` reste tel quel (le shell s'y lie en two-way).

- [ ] **Step 3.5 : Spec — supprimer les 2 tests fullscreen**

Dans `mobilier.component.spec.ts` : supprimer les tests `'togglePreviewFullscreen bascule le signal'` (~657–669) et `'previewFullscreenLabel reflete l'etat fullscreen'` (~671–682), et toute entrée `previewFullscreen`/`togglePreviewFullscreen`/`previewFullscreenLabel` du type `MobilierInternals`. Ce comportement est couvert par `admin-preview-shell.component.spec.ts`.

- [ ] **Step 3.6 : Vérifier le vert (suite mobilier + shell + helpers)**

```powershell
cd frontend
npx ng test --watch=false --include='**/mobilier/**/*.spec.ts'
```

Attendu : PASS. En cas d'échec sur un test existant : c'est un bug de migration, corriger la migration, pas le test.

- [ ] **Step 3.7 : Validation visuelle manuelle**

Lancer `npm start` (ou la stack docker) et vérifier sur `/admin/mobilier` : toggle Modifier/Aperçu, form intact, preview riche (cover, galerie, drag, resize), plein écran + Échap clavier piégé, boutons 💾/⤢, modales photo/crop par-dessus le preview, click-to-focus depuis le preview. Comparer à `/admin/expositions` (non migré) pour vérifier l'iso-rendu.

- [ ] **Step 3.8 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/
git commit -m "refactor(admin): mobilier migre vers <app-admin-preview-shell> + composables"
```

---

### Task 4 : Migration `ExpositionsComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

Même mécanique que Task 3. Spécificités expo : whitelist plus large (dates incluses), handler `onPreviewDateFieldEdit` réimplémenté via `createTextFieldEditHandler` avec une whitelist `{startDate, endDate}`, libellés propres.

- [ ] **Step 4.1 : Imports**

Comme Step 3.1 (mêmes retraits `OnInit`/`OnDestroy`/`Subscription`/`A11yModule`, mêmes ajouts `DestroyRef`, shell, helpers) dans `expositions.component.ts`.

- [ ] **Step 4.2 : Template**

Remplacer le bloc `<div class="admin-split">…</div>` (lignes 50–219) par :

```html
      <app-admin-preview-shell
        [active]="previewActive()"
        [(viewMode)]="expoViewMode"
        modeBarAriaLabel="Mode d'édition de l'exposition"
        formTabLabel="✏ Modifier l'exposition"
        previewDialogLabel="Aperçu de l’exposition"
        [showSave]="true"
        [saveDisabled]="exhibitionForm.invalid"
        [saving]="saving()"
        (save)="saveExhibition()">
        <form class="form" [formGroup]="exhibitionForm" (ngSubmit)="saveExhibition()">
          <!-- … contenu du <form> existant (lignes 73–177) inchangé, déplacé tel quel … -->
        </form>
        <ng-template shellPreview>
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
        </ng-template>
      </app-admin-preview-shell>
```

Note : pas de `[hidePreviewOnMobile]` (expo affiche le preview à 60vh sur mobile — comportement actuel conservé). Attention au libellé dialog : apostrophe typographique `’` comme dans la constante actuelle `previewDialogLabel`.

- [ ] **Step 4.3 : Styles**

Supprimer les mêmes sélecteurs qu'au Step 3.3 (`.admin-split`, `.admin-mode-bar`, `.admin-mode-tab*`, `.admin-form` + commentaire + `.is-hidden`, `.admin-preview*`, `.btn-preview-*`, fullscreen, et dans les media queries 1280px/768px les règles `.admin-split`, `.admin-preview`, `.admin-mode-tab`). Restent : `.grid-admin`, `.list*`, `.row*`, `.form*`, `.actions`, `.btn-*`, `.stories-*`, `.story-*`, `.cover-editor*`, `.reorder-btn*`, `.slides-hint`, `.status`, media query 960px.

- [ ] **Step 4.4 : Classe**

1. Supprimer : `implements OnInit, OnDestroy`, `ngOnInit`/`ngOnDestroy` (380–388), `formTickSub` (338), `private readonly _formTick = signal(0);` (337), `previewFullscreen` (334), `togglePreviewFullscreen`/`previewFullscreenLabel` (390–393), la constante `previewDialogLabel` (394–395), `FOCUSABLE_FIELDS` + `focusField` (581–593), `onPreviewCoverEdit` (595–601), `onPreviewGalleryItemEdit` (603–613), `onPreviewGalleryReorder` (615–618), `onPreviewGalleryAdd` (620–622), `onPreviewGalleryItemResize` (624–628), `onPreviewTextFieldEdit` (630–634), `onPreviewDateFieldEdit` (636–640).

2. Ajouter après la déclaration de `exhibitionForm` :

```typescript
  /** Whitelist des champs admissibles depuis le preview (défense en profondeur). */
  private static readonly FOCUSABLE_FIELDS = new Set([
    'title', 'venue', 'city', 'country', 'startDate', 'endDate',
    'curator', 'shortDescription', 'description',
  ]);
  private static readonly DATE_FIELDS = new Set(['startDate', 'endDate']);

  protected readonly previewActive = computed(() =>
    this.editingExhibitionSlug() !== null || this.editingExhibitionId() !== null || this.creatingExhibition()
  );

  private readonly _formTick = formTickSignal(this.exhibitionForm, inject(DestroyRef));

  focusField = createFieldFocus(ExpositionsComponent.FOCUSABLE_FIELDS);
  onPreviewTextFieldEdit = createTextFieldEditHandler(this.exhibitionForm, ExpositionsComponent.FOCUSABLE_FIELDS);
  onPreviewDateFieldEdit = createTextFieldEditHandler(this.exhibitionForm, ExpositionsComponent.DATE_FIELDS);

  private readonly galleryHandlers = createGalleryPreviewHandlers({
    gallery: this.exhibitionGallery,
    galleryEditor: () => this.galleryEditor,
    coverField: () => this.coverImageField,
  });
  onPreviewCoverEdit = this.galleryHandlers.onCoverEdit;
  onPreviewGalleryItemEdit = this.galleryHandlers.onGalleryItemEdit;
  onPreviewGalleryAdd = this.galleryHandlers.onGalleryAdd;
  onPreviewGalleryReorder = this.galleryHandlers.onGalleryReorder;
  onPreviewGalleryItemResize = this.galleryHandlers.onGalleryItemResize;
```

`previewDisplaySlides` déclaré après `_formTick`. Note de typage : `onPreviewDateFieldEdit` accepte désormais `{ field: string; value: string }` (plus large que `{ field: 'startDate' | 'endDate' }`) — compatible avec l'output du preview et avec le test existant ligne 682 qui passe `field: 'foo'`.

- [ ] **Step 4.5 : Spec — supprimer les 3 tests fullscreen**

Dans `expositions.component.spec.ts` : supprimer `'togglePreviewFullscreen bascule le signal'` (~606–616), `'previewFullscreenLabel reflete l'etat fullscreen'` (~755–766), et les entrées `previewFullscreen` (29) / `togglePreviewFullscreen` (44) / `previewFullscreenLabel` du type interne. Les tests whitelist (632–682) restent : ils passent avec les composables.

- [ ] **Step 4.6 : Vérifier le vert**

```powershell
cd frontend
npx ng test --watch=false --include='**/expositions/**/*.spec.ts'
```

Attendu : PASS.

- [ ] **Step 4.7 : Validation visuelle manuelle**

`/admin/expositions` : mêmes vérifications qu'au Step 3.7 + édition inline des dates (double-clic → input date) + eyebrow décomposé cliquable.

- [ ] **Step 4.8 : Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/
git commit -m "refactor(admin): expositions migre vers <app-admin-preview-shell> + composables"
```

---

### Task 5 : Migration `AccueilComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/accueil/accueil.component.ts`
- Modify: `frontend/src/app/pages/admin/accueil/accueil.component.spec.ts`

Spécificités accueil : pas de FormGroup central → pas de composables form ; `active` toujours vrai ; pas de bouton 💾 (`showSave` par défaut false) ; le crop-picker modal sort du wrapper et devient un sibling du shell.

- [ ] **Step 5.1 : Imports**

Dans `accueil.component.ts` : supprimer `import { A11yModule } from '@angular/cdk/a11y';` et ajouter :

```typescript
import { AdminPreviewShellComponent, ShellPreviewDirective } from '../shared/admin-preview-shell.component';
```

Dans le tableau `imports` : retirer `A11yModule`, ajouter `AdminPreviewShellComponent, ShellPreviewDirective`.

- [ ] **Step 5.2 : Template**

Remplacer tout le template par :

```html
    <app-admin-preview-shell
      [(viewMode)]="accueilViewMode"
      modeBarAriaLabel="Mode d'édition de l'accueil"
      formTabLabel="✏ Modifier l'accueil"
      previewDialogLabel="Aperçu de l’accueil">
      <div class="home-editor">
        <!-- … bloc « Ordre éditorial du masonry » existant (lignes 50–73) inchangé … -->
      </div>
      <div id="admin-sliders-anchor" class="home-editor sliders-section">
        <app-admin-sliders />
      </div>
      <ng-template shellPreview>
        <app-home-preview
          [data]="homeData"
          [content]="content"
          [sliders]="sliders"
          [includedSlugs]="includedSlugs"
          (feedReorder)="onPreviewFeedReorder($event)"
          (feedItemToggleInclude)="onPreviewFeedItemToggleInclude($event)"
          (textFieldEdit)="onPreviewTextFieldEdit($event)"
          (sliderEditRequested)="onSliderEditRequested($event)"
          (feedItemCropEdit)="onPreviewFeedItemCropEdit($event)" />
      </ng-template>
    </app-admin-preview-shell>

    @if (cropEditOpen() && cropEditItem(); as ctx) {
      <app-image-crop-picker
        [imageUrl]="ctx.imageUrl"
        [initialCrop]="ctx.initialCrop"
        (validated)="onCropEditSave($event)"
        (cancelled)="onCropEditCancel()" />
    }
```

Note : les deux blocs `home-editor` (form-side) sont projetés ensemble dans le `<ng-content>` du shell — le `<section class="admin-form">` qui les entourait vit désormais dans le shell. Le crop-picker (position fixed, z-index 1400) devient sibling du shell : rendu identique.

- [ ] **Step 5.3 : Styles**

Supprimer : `.admin-split`, `.admin-mode-bar`, `.admin-mode-tab*`, `.admin-form` + commentaire + `.is-hidden`, `.admin-preview*`, `.btn-preview-toggle*`, `.admin-preview.fullscreen*`, et dans la media query 768px les règles `.admin-mode-tab` et `.admin-preview`. Restent : `.home-editor*`, `.ordering-list`, `.home-row*`, `.reorder-btn*`, `.status`, `.sliders-section`.

- [ ] **Step 5.4 : Classe**

Supprimer : `previewFullscreen` (169), `togglePreviewFullscreen`/`previewFullscreenLabel` (271–274), la constante `previewDialogLabel` (275–276). Tout le reste est inchangé (`accueilViewMode` reste — `onSliderEditRequested` l'utilise).

- [ ] **Step 5.5 : Spec — supprimer le test fullscreen**

Dans `accueil.component.spec.ts` : supprimer `'togglePreviewFullscreen bascule'` (~335–349) et les entrées `previewFullscreen` (13) / `togglePreviewFullscreen` (24) / `previewFullscreenLabel` (25) du type interne.

- [ ] **Step 5.6 : Vérifier le vert**

```powershell
cd frontend
npx ng test --watch=false --include='**/accueil/**/*.spec.ts'
```

Attendu : PASS.

- [ ] **Step 5.7 : Validation visuelle manuelle**

`/admin/accueil` : toggle, ordre éditorial + sliders dans le form-side, preview home (hero inline, cards overlay, sliders cartouche [i]), crop card → modale par-dessus, plein écran, retour form via cartouche [i] avec scroll vers les sliders.

- [ ] **Step 5.8 : Commit**

```powershell
git add frontend/src/app/pages/admin/accueil/
git commit -m "refactor(admin): accueil migre vers <app-admin-preview-shell>"
```

---

### Task 6 : Adoption `formTickSignal` dans les composants preview

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts`

Le pattern `_formTick` + `Subscription` y est dupliqué une 3e et 4e fois. Le `form` étant un `@Input` (indisponible à la construction), l'appel se fait en `ngOnInit` avec un `DestroyRef` injecté — même séquencement qu'aujourd'hui (le computed n'est lu par le template qu'après `ngOnInit`).

- [ ] **Step 6.1 : Migrer `furniture-preview.component.ts`**

1. Imports : retirer `OnDestroy` et `Subscription` ; ajouter `DestroyRef` et `inject` à l'import `@angular/core` ; ajouter :

```typescript
import { formTickSignal } from '../../shared/preview-page-helpers';
```

2. Remplacer les membres `_formTick` (52), `formSub` (53), `ngOnInit` (81–85), `ngOnDestroy` (87–89) par :

```typescript
  private readonly destroyRef = inject(DestroyRef);
  private formTick?: Signal<number>;

  ngOnInit(): void {
    if (this.form) {
      this.formTick = formTickSignal(this.form, this.destroyRef);
    }
  }
```

3. Dans le computed `previewItem`, remplacer la ligne `this._formTick();` par `this.formTick?.();` (le commentaire de dépendance signal reste valable). La classe n'implémente plus `OnDestroy` : `implements OnInit`.

- [ ] **Step 6.2 : Migrer `exhibition-preview.component.ts`**

Mêmes changements (le fichier a la même structure : `_formTick`, `formSub`, `ngOnInit`, `ngOnDestroy`, computed `previewItem`).

- [ ] **Step 6.3 : Vérifier le vert**

```powershell
cd frontend
npx ng test --watch=false --include='**/preview/*.spec.ts'
```

Attendu : PASS (les specs des previews testent la réactivité form → previewItem, inchangée).

- [ ] **Step 6.4 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts
git commit -m "refactor(admin): previews mobilier/expo adoptent formTickSignal"
```

---

### Task 7 : Suite complète, couverture, documentation

**Files:**
- Modify: `docs/SPECIFICATION_TECHNIQUE.md`
- Modify: `docs/superpowers/specs/2026-06-10-wysiwyg-socle-factorise-design.md`

- [ ] **Step 7.1 : Suite frontend complète + couverture**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test
```

Attendu : PASS, seuils de couverture karma respectés (80 % global / 75 % branches). En cas d'échec de seuil : la couverture doit être rattrapée par des tests (shell/helpers), PAS par une baisse de seuil.

- [ ] **Step 7.2 : Mettre à jour `docs/SPECIFICATION_TECHNIQUE.md`**

1. Section 5.4 (`AccueilComponent`/`MobilierComponent`/`ExpositionsComponent`) : remplacer dans chacune les bullets « Toggle Modifier / Aperçu », « Le form reste dans le DOM », « Toolbar preview », « Toggle plein écran » par une référence au shell, ex. pour mobilier :

```markdown
- **Squelette WYSIWYG** : délégué à `<app-admin-preview-shell>` (§5.5) — mode-bar tablist, panel form hors-écran, toolbar 💾/⤢, plein écran. Inputs : `active=previewActive()`, two-way `viewMode`, `showSave=true`, `hidePreviewOnMobile=true`.
- **Handlers preview** : `focusField`/`onPreviewTextFieldEdit` (whitelist `FOCUSABLE_FIELDS`) et handlers galerie créés via les composables `preview-page-helpers` (§5.5).
```

(adapter pour expo : pas de `hidePreviewOnMobile`, + `onPreviewDateFieldEdit` ; pour accueil : `showSave` absent, handlers spécifiques inchangés).

2. Section 5.5 : ajouter deux sous-sections après les composants partagés existants :

```markdown
#### `<app-admin-preview-shell>` (`AdminPreviewShellComponent`)

Chemin : `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts`

Squelette partagé des 3 pages admin à preview WYSIWYG. Possède : mode-bar `role=tablist` (✏/👁), panel form `#panel-form` projeté par `ng-content` (maintenu hors-écran `is-hidden` + `inert` en mode preview — préserve ViewChild et modales fixed), panel preview `#panel-preview` rendu par `ngTemplateOutlet` d'un `<ng-template shellPreview>` (détruit/recréé au toggle), toolbar (💾 si `showSave`, ⤢/⤡), plein écran (`role=dialog` + `aria-modal` + `cdkTrapFocus`, z-index 1200), CSS partagé + media queries.

| Membre | Type | Description |
| --- | --- | --- |
| `active` | input `boolean` (défaut `true`) | Affiche mode-bar et panel preview |
| `modeBarAriaLabel` / `formTabLabel` / `previewDialogLabel` | input `string` requis | Libellés par page |
| `showSave` / `saveDisabled` / `saving` | input `boolean` | Bouton 💾 toolbar |
| `hidePreviewOnMobile` | input `boolean` | Préserve le comportement mobilier (preview masqué ≤768px) |
| `viewMode` | `model<'form' \| 'preview'>` | Two-way avec le signal de la page |
| `save` | output `void` | Clic 💾 |

#### Composables `preview-page-helpers.ts`

Chemin : `frontend/src/app/pages/admin/shared/preview-page-helpers.ts`

- `formTickSignal(form, destroyRef)` — tick signal sur `valueChanges` (remplace le pattern `_formTick` dupliqué, pages + previews).
- `createFieldFocus(whitelist)` — click-to-focus avec guard whitelist (généralisé à mobilier, qui ne l'avait pas).
- `createTextFieldEditHandler(form, whitelist)` — patch + markAsDirty derrière whitelist (sert aussi `onPreviewDateFieldEdit` expo avec whitelist `{startDate, endDate}`).
- `createGalleryPreviewHandlers({gallery, galleryEditor, coverField})` — les 5 handlers galerie communs mobilier/expo (getters pour les ViewChild).
```

3. Tableau d'historique en fin de fichier : ajouter une ligne version (incrément mineur de la dernière version, date 10/06/2026) :

```markdown
| 2.x.y | 10/06/2026 | Socle factorisé previews WYSIWYG (chantier v2, sous-projet 1/6) : `<app-admin-preview-shell>` + composables `preview-page-helpers` ; migration accueil/mobilier/expositions ; whitelist focus généralisée à mobilier |
```

- [ ] **Step 7.3 : Amender la spec design**

Dans `docs/superpowers/specs/2026-06-10-wysiwyg-socle-factorise-design.md` :
- Remplacer la ligne API `entityLabel` par les 3 inputs `modeBarAriaLabel` / `formTabLabel` / `previewDialogLabel` (libellés non composables depuis un libellé unique).
- Ajouter à la section « Décisions architecturales » un paragraphe « Écarts assumés » reprenant les 3 harmonisations CSS/DOM listées en tête de ce plan + l'input `hidePreviewOnMobile`.

- [ ] **Step 7.4 : Commit**

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md docs/superpowers/specs/2026-06-10-wysiwyg-socle-factorise-design.md
git commit -m "docs(spec-tech): socle factorise previews WYSIWYG (sous-projet 1/6 chantier v2)"
```

---

## Critères de fin

- [ ] Suite frontend complète verte (docker compose), seuils de couverture inchangés (80 %/75 %).
- [ ] Validation visuelle manuelle des 3 pages admin par l'utilisateur (Steps 3.7, 4.7, 5.7).
- [ ] Baselines Playwright **non régénérées** — un échec visuel = bug de migration à corriger ou écart assumé à faire valider explicitement par l'utilisateur.
- [ ] Doc à jour (spec-tech + amendement spec design).
- [ ] Aucun nouveau comportement introduit (dirty state, raccourcis… = sous-projets 2-6).
