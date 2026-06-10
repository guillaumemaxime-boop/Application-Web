# UX socle + a11y des previews WYSIWYG — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garde-fou dirty, Ctrl+S, plein écran conforme (Échap + focus + neutralisation), roving tabindex APG, annonces lecteur d'écran et feedback visuel du drag-reorder — implémentés une fois dans le socle du sous-projet 1.

**Architecture:** Les capacités clavier/ARIA vivent dans `<app-admin-preview-shell>` (les 3 pages en héritent) ; le garde-fou et les annonces galerie sont des extensions des composables `preview-page-helpers` ; le feedback drag (classes + FLIP) vit dans `ReorderableDirective` avec styles globaux dans `styles.css`. Mobilier/expositions reçoivent un câblage léger (wrappers gardés, `markAsPristine`, `inert` liste) ; l'accueil ne change pas.

**Tech Stack:** Angular 21 standalone, signals, `@angular/cdk/a11y` (`LiveAnnouncer`, déjà en dépendance), HTML5 Drag & Drop, Karma + Jasmine.

**Spec:** [docs/superpowers/specs/2026-06-10-wysiwyg-ux-socle-a11y-design.md](../specs/2026-06-10-wysiwyg-ux-socle-a11y-design.md)
**Branche:** `feat/wysiwyg-ux-socle-a11y` (créée, spec déjà commitée)

---

## Structure de fichiers

| Fichier | Rôle |
| --- | --- |
| Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.ts` | + `confirmIfDirty`, + interface `AnnouncerLike`, + options `onMutate`/`announcer` de `createGalleryPreviewHandlers` |
| Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts` | Tests des ajouts |
| Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts` | Roving tabindex, Ctrl+S, Échap + focus, aria-controls conditionnel, mode-bar inert fullscreen, output `fullscreenChange`, annonces |
| Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts` | Tests clavier/ARIA/annonces |
| Modify: `frontend/src/app/directives/reorderable.directive.ts` | Classes drag + FLIP + reduced-motion |
| Create: `frontend/src/app/directives/reorderable.directive.spec.ts` | Tests classes/ordre (si le fichier existe déjà : y ajouter les describes) |
| Modify: `frontend/src/styles.css` | Styles globaux `.reorder-dragging` / `.reorder-drag-over` |
| Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` + spec | Wrappers gardés, pristine post-save, onMutate/announcer, inert liste, dirty galerie |
| Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` + spec | Idem |
| Modify: `docs/SPECIFICATION_TECHNIQUE.md`, spec design | Doc finale |

## Commandes de test

- Suite complète (chaque fin de task) : `docker compose -f docker-compose.test.yml run --rm frontend-test` depuis la racine (Firefox absent en local). État de départ : **801 SUCCESS**.

---

### Task 1 : Composables — `confirmIfDirty` + options `onMutate`/`announcer`

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.ts`
- Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts`

- [ ] **Step 1.1 : Écrire les tests (échec attendu)**

Dans `preview-page-helpers.spec.ts` : ajouter `AnnouncerLike` et `confirmIfDirty` à l'import existant depuis `./preview-page-helpers`, puis ajouter ces describes à la fin du `describe('preview-page-helpers', ...)` (avant sa fermeture) :

```typescript
  describe('confirmIfDirty', () => {
    it('true sans confirm quand le form est pristine', () => {
      const form = new FormBuilder().group({ title: [''] });
      const confirmSpy = spyOn(window, 'confirm');
      expect(confirmIfDirty(form, 'Continuer ?')).toBeTrue();
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('suit la réponse du confirm quand le form est dirty', () => {
      const form = new FormBuilder().group({ title: [''] });
      form.get('title')!.markAsDirty();
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
      expect(confirmIfDirty(form, 'Continuer ?')).toBeFalse();
      expect(confirmSpy).toHaveBeenCalledWith('Continuer ?');
      confirmSpy.and.returnValue(true);
      expect(confirmIfDirty(form, 'Continuer ?')).toBeTrue();
    });
  });

  describe('createGalleryPreviewHandlers — onMutate et announcer', () => {
    function setupWithOptions() {
      const gallery = signal<GalleryItem[]>([
        { url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' },
      ]);
      const onMutate = jasmine.createSpy('onMutate');
      const announcer = jasmine.createSpyObj<AnnouncerLike>('AnnouncerLike', ['announce']);
      const handlers = createGalleryPreviewHandlers({
        gallery,
        galleryEditor: () => undefined,
        coverField: () => undefined,
        onMutate,
        announcer,
      });
      return { gallery, onMutate, announcer, handlers };
    }

    it('onMutate est invoqué par remove, reorder et resize', () => {
      const { onMutate, handlers } = setupWithOptions();
      handlers.onGalleryItemEdit({ index: 0, action: 'remove' });
      handlers.onGalleryReorder([1, 0]);
      handlers.onGalleryItemResize({ index: 0, colSpan: 2, rowSpan: 1 });
      expect(onMutate).toHaveBeenCalledTimes(3);
    });

    it('onMutate n\'est PAS invoqué par crop/replace/add (ouvertures d\'éditeurs)', () => {
      const { onMutate, handlers } = setupWithOptions();
      handlers.onCoverEdit('crop');
      handlers.onGalleryItemEdit({ index: 0, action: 'crop' });
      handlers.onGalleryItemEdit({ index: 0, action: 'replace' });
      handlers.onGalleryAdd();
      expect(onMutate).not.toHaveBeenCalled();
    });

    it('reorder annonce la position du plus grand déplacement', () => {
      const { announcer, handlers } = setupWithOptions();
      // [2,0,1] : l'ancien item 2 arrive en position 1 (déplacement 2) → « position 1 sur 3 »
      handlers.onGalleryReorder([2, 0, 1]);
      expect(announcer.announce).toHaveBeenCalledWith('Image déplacée en position 1 sur 3');
    });

    it('resize annonce colonnes et lignes', () => {
      const { announcer, handlers } = setupWithOptions();
      handlers.onGalleryItemResize({ index: 1, colSpan: 2, rowSpan: 3 });
      expect(announcer.announce).toHaveBeenCalledWith('Image redimensionnée : 2 colonnes sur 3 lignes');
    });

    it('sans options, les handlers restent silencieux et sans erreur', () => {
      const gallery = signal<GalleryItem[]>([{ url: 'a.jpg' }, { url: 'b.jpg' }]);
      const handlers = createGalleryPreviewHandlers({
        gallery, galleryEditor: () => undefined, coverField: () => undefined,
      });
      expect(() => {
        handlers.onGalleryReorder([1, 0]);
        handlers.onGalleryItemResize({ index: 0, colSpan: 1, rowSpan: 1 });
      }).not.toThrow();
      expect(gallery()[0].url).toBe('b.jpg');
    });
  });
```

- [ ] **Step 1.2 : Vérifier l'échec**

Run : `docker compose -f docker-compose.test.yml run --rm frontend-test`
Attendu : échec de compilation (`confirmIfDirty`/`AnnouncerLike` non exportés).

- [ ] **Step 1.3 : Implémenter**

Dans `preview-page-helpers.ts` :

1. Ajouter après `createTextFieldEditHandler` :

```typescript
/**
 * Garde-fou perte de saisie : true si le form n'a pas de modifications non
 * enregistrées, sinon délègue à window.confirm. À appeler dans les wrappers
 * UI (clic liste / « + Nouvelle ») — jamais dans les flux internes (reload
 * post-save, suppression d'item), qui restent sans garde.
 */
export function confirmIfDirty(form: FormGroup, message: string): boolean {
  if (!form.dirty) return true;
  return window.confirm(message);
}

/** Vue structurelle de LiveAnnouncer (évite le couplage direct au CDK). */
export interface AnnouncerLike {
  announce(message: string): void | Promise<void>;
}
```

2. Étendre `createGalleryPreviewHandlers` — nouvelle signature et handlers mutateurs :

```typescript
export function createGalleryPreviewHandlers(opts: {
  gallery: WritableSignal<GalleryItem[]>;
  galleryEditor: () => GalleryEditorLike | undefined;
  coverField: () => CoverFieldLike | undefined;
  /** Invoqué après chaque mutation du signal galerie (remove/reorder/resize) — ex. markAsDirty. */
  onMutate?: () => void;
  /** Annonces lecteur d'écran des opérations galerie (reorder/resize). */
  announcer?: AnnouncerLike;
}): GalleryPreviewHandlers {
  const { gallery, galleryEditor, coverField, onMutate, announcer } = opts;
  return {
    onCoverEdit: (action) => {
      if (action === 'crop') coverField()?.openCrop();
      else coverField()?.openPicker();
    },
    onGalleryItemEdit: (e) => {
      if (e.action === 'remove') {
        gallery.update(arr => arr.filter((_, i) => i !== e.index));
        onMutate?.();
        return;
      }
      if (e.action === 'crop') galleryEditor()?.openCropFor(e.index);
      else galleryEditor()?.openReplaceFor(e.index);
    },
    onGalleryAdd: () => {
      galleryEditor()?.openPicker();
    },
    onGalleryReorder: (order) => {
      const items = gallery();
      gallery.set(order.map(i => items[i]));
      onMutate?.();
      if (announcer && order.length > 0) {
        // L'item glissé = celui au plus grand déplacement (heuristique :
        // pour un déplacement adjacent les deux candidats sont équivalents).
        let newPos = 0;
        let maxDelta = -1;
        order.forEach((oldIdx, i) => {
          const delta = Math.abs(oldIdx - i);
          if (delta > maxDelta) { maxDelta = delta; newPos = i; }
        });
        announcer.announce(`Image déplacée en position ${newPos + 1} sur ${order.length}`);
      }
    },
    onGalleryItemResize: (e) => {
      gallery.update(arr => arr.map((it, i) =>
        i === e.index ? { ...it, colSpan: e.colSpan, rowSpan: e.rowSpan } : it
      ));
      onMutate?.();
      announcer?.announce(`Image redimensionnée : ${e.colSpan} colonnes sur ${e.rowSpan} lignes`);
    },
  };
}
```

- [ ] **Step 1.4 : Vérifier le vert**

Run : suite Docker. Attendu : **808 SUCCESS** (801 + 7).

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/preview-page-helpers.ts frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts
git commit -m "feat(admin): confirmIfDirty + options onMutate/announcer des handlers galerie"
```

---

### Task 2 : Shell — clavier & ARIA

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts`

- [ ] **Step 2.1 : Écrire les tests (échec attendu)**

Dans `admin-preview-shell.component.spec.ts` :

1. Dans le template du `HostComponent`, ajouter le binding `(fullscreenChange)="lastFullscreen = $event"` parmi ceux du `<app-admin-preview-shell>`, et le champ `lastFullscreen: boolean | null = null;` dans la classe.
2. Ajouter les imports : `import { LiveAnnouncer } from '@angular/cdk/a11y';`
3. Ajouter ces tests à la fin du describe :

```typescript
  it('roving tabindex : l\'onglet actif est tabbable, l\'autre non', () => {
    const fixture = create();
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(tabs[0].attributes['tabindex']).toBe('0');
    expect(tabs[1].attributes['tabindex']).toBe('-1');
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(tabs[0].attributes['tabindex']).toBe('-1');
    expect(tabs[1].attributes['tabindex']).toBe('0');
  });

  it('flèches sur la tablist : activation automatique + focus suit', () => {
    const fixture = create();
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]'));
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('preview');
    expect(document.activeElement?.id).toBe('tab-preview');
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('form');
    expect(document.activeElement?.id).toBe('tab-form');
  });

  it('Home/End sur la tablist sélectionnent form/preview', () => {
    const fixture = create();
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]'));
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('preview');
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('form');
  });

  it('Ctrl+S émet save et bloque le navigateur quand showSave', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(1);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+S avec saveDisabled : preventDefault mais pas d\'émission', () => {
    const fixture = create();
    fixture.componentInstance.saveDisabled.set(true);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(0);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+S sans showSave : non capturé', () => {
    const fixture = create();
    fixture.componentInstance.showSave.set(false);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Échap réduit le plein écran, émet fullscreenChange et rend le focus au bouton ⤢', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const toggle = fixture.debugElement.query(By.css('.btn-preview-toggle'));
    toggle.nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.lastFullscreen).toBeTrue();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeFalse();
    expect(fixture.componentInstance.lastFullscreen).toBeFalse();
    expect(document.activeElement).toBe(toggle.nativeElement);
  });

  it('Échap est inactif quand une modale form-side est ouverte', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.btn-preview-toggle')).nativeElement.click();
    fixture.componentInstance.formModalOpen.set(true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeTrue();
  });

  it('aria-controls du tab Aperçu n\'existe que quand le panel preview est rendu', () => {
    const fixture = create();
    const tabPreview = fixture.debugElement.queryAll(By.css('[role="tab"]'))[1];
    expect(tabPreview.nativeElement.hasAttribute('aria-controls')).toBeFalse();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(tabPreview.attributes['aria-controls']).toBe('panel-preview');
  });

  it('la mode-bar devient inert en plein écran', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const modeBar = fixture.debugElement.query(By.css('.admin-mode-bar'));
    expect(modeBar.nativeElement.hasAttribute('inert')).toBeFalse();
    fixture.debugElement.query(By.css('.btn-preview-toggle')).nativeElement.click();
    fixture.detectChanges();
    expect(modeBar.nativeElement.hasAttribute('inert')).toBeTrue();
  });

  it('annonce SR le changement de mode et le plein écran', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const announcer = TestBed.inject(LiveAnnouncer);
    const announceSpy = spyOn(announcer, 'announce');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled(); // pas d'annonce à l'init
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(announceSpy).toHaveBeenCalledWith('Mode aperçu');
    fixture.debugElement.query(By.css('.btn-preview-toggle')).nativeElement.click();
    fixture.detectChanges();
    expect(announceSpy).toHaveBeenCalledWith('Aperçu plein écran');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(announceSpy).toHaveBeenCalledWith('Aperçu réduit');
  });
```

- [ ] **Step 2.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échec de compilation (`fullscreenChange` inconnu) ou tests rouges.

- [ ] **Step 2.3 : Implémenter dans le shell**

Dans `admin-preview-shell.component.ts` :

1. Imports : ajouter `ElementRef` et `effect` à l'import `@angular/core` ; remplacer l'import CDK par `import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';`

2. Host : ajouter le listener clavier global :

```typescript
  host: {
    '[class.hide-preview-mobile]': 'hidePreviewOnMobile()',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
```

3. Template — mode-bar : ajouter sur le `<div class="admin-mode-bar" …>` les attributs `(keydown)="onTablistKeydown($event)"` et `[attr.inert]="previewFullscreen() ? '' : null"`. Sur le bouton tab-form, ajouter `[attr.tabindex]="viewMode() === 'form' ? 0 : -1"`. Sur le bouton tab-preview, ajouter `[attr.tabindex]="viewMode() === 'preview' ? 0 : -1"` et **remplacer** `aria-controls="panel-preview"` par `[attr.aria-controls]="viewMode() === 'preview' ? 'panel-preview' : null"`.

4. Classe — ajouter les membres et remplacer `togglePreviewFullscreen` :

```typescript
  /** Émis à chaque entrée/sortie du plein écran. Les pages s'en servent
   *  pour rendre `inert` leur liste latérale (neutralisation aria-modal). */
  readonly fullscreenChange = output<boolean>();

  private readonly announcer = inject(LiveAnnouncer);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Annonce SR du changement de mode (l'état initial n'est pas annoncé).
    let firstMode = true;
    effect(() => {
      const mode = this.viewMode();
      if (firstMode) { firstMode = false; return; }
      this.announcer.announce(mode === 'preview' ? 'Mode aperçu' : 'Mode édition');
    });
  }

  protected togglePreviewFullscreen(): void {
    this.setFullscreen(!this.previewFullscreen());
  }

  private setFullscreen(value: boolean): void {
    if (this.previewFullscreen() === value) return;
    this.previewFullscreen.set(value);
    this.fullscreenChange.emit(value);
    this.announcer.announce(value ? 'Aperçu plein écran' : 'Aperçu réduit');
  }

  /** Pattern APG Tabs : flèches cycliques + Home/End, activation automatique. */
  protected onTablistKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next: 'form' | 'preview' =
      event.key === 'Home' ? 'form'
      : event.key === 'End' ? 'preview'
      : this.viewMode() === 'form' ? 'preview' : 'form';
    if (next !== this.viewMode()) this.viewMode.set(next);
    this.elementRef.nativeElement
      .querySelector<HTMLButtonElement>(next === 'form' ? '#tab-form' : '#tab-preview')
      ?.focus();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      if (!this.showSave()) return;
      event.preventDefault();
      if (!this.saveDisabled() && !this.saving()) this.save.emit();
      return;
    }
    // Échap réduit le plein écran — sauf si une modale form-side est ouverte
    // (son propre handler Escape la ferme ; le plein écran reste).
    if (event.key === 'Escape' && this.previewFullscreen() && !this.formModalOpen()) {
      this.setFullscreen(false);
      this.elementRef.nativeElement.querySelector<HTMLButtonElement>('.btn-preview-toggle')?.focus();
    }
  }
```

(Le `effect` exige le contexte d'injection : il vit dans le constructeur. `previewFullscreenLabel()` existant inchangé.)

- [ ] **Step 2.4 : Vérifier le vert**

Run : suite Docker. Attendu : **819 SUCCESS** (808 + 11). Si le test d'annonces échoue sur l'ordre des appels : vérifier que `viewMode.set` du host déclenche bien l'effect (un `fixture.detectChanges()` est nécessaire après le set pour flusher les effects).

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts
git commit -m "feat(admin): shell preview - roving tabindex, Ctrl+S, Echap plein ecran, annonces SR"
```

---

### Task 3 : `ReorderableDirective` — classes drag + FLIP

**Files:**
- Modify: `frontend/src/app/directives/reorderable.directive.ts`
- Create: `frontend/src/app/directives/reorderable.directive.spec.ts` (si déjà existant : ajouter les tests au describe existant)
- Modify: `frontend/src/styles.css`

- [ ] **Step 3.1 : Écrire les tests (échec attendu)**

`reorderable.directive.spec.ts` :

```typescript
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReorderableDirective } from './reorderable.directive';

@Component({
  standalone: true,
  imports: [ReorderableDirective],
  template: `
    <ul appReorderable (reordered)="lastOrder = $event">
      @for (it of items(); track it) {
        <li class="row">{{ it }}</li>
      }
      <li data-no-drag class="add">+</li>
    </ul>
  `,
})
class HostComponent {
  readonly items = signal(['a', 'b', 'c']);
  lastOrder: number[] | null = null;
}

function dispatchDrag(el: HTMLElement, type: string): void {
  el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true }));
}

describe('ReorderableDirective', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function rows(fixture: ReturnType<typeof create>): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li.row'));
  }

  it('pose reorder-dragging sur la source au dragstart, retirée au dragend', () => {
    const fixture = create();
    const [a] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    expect(a.classList.contains('reorder-dragging')).toBeTrue();
    dispatchDrag(a, 'dragend');
    expect(a.classList.contains('reorder-dragging')).toBeFalse();
  });

  it('pose reorder-drag-over sur la cible au dragenter, retirée au dragleave', () => {
    const fixture = create();
    const [a, b] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(b, 'dragenter');
    expect(b.classList.contains('reorder-drag-over')).toBeTrue();
    dispatchDrag(b, 'dragleave');
    expect(b.classList.contains('reorder-drag-over')).toBeFalse();
    dispatchDrag(a, 'dragend');
  });

  it('dragenter/dragleave imbriqués : la classe tient tant que le compteur > 0', () => {
    const fixture = create();
    const [a, b] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(b, 'dragenter');
    dispatchDrag(b, 'dragenter'); // enfant de b
    dispatchDrag(b, 'dragleave');
    expect(b.classList.contains('reorder-drag-over')).toBeTrue();
    dispatchDrag(b, 'dragleave');
    expect(b.classList.contains('reorder-drag-over')).toBeFalse();
    dispatchDrag(a, 'dragend');
  });

  it('la source ne reçoit pas reorder-drag-over', () => {
    const fixture = create();
    const [a] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(a, 'dragenter');
    expect(a.classList.contains('reorder-drag-over')).toBeFalse();
    dispatchDrag(a, 'dragend');
  });

  it('drop émet le bon ordre et nettoie les classes', () => {
    const fixture = create();
    const [a, , c] = rows(fixture);
    dispatchDrag(a, 'dragstart');
    dispatchDrag(c, 'dragenter');
    dispatchDrag(c, 'drop');
    expect(fixture.componentInstance.lastOrder).toEqual([1, 2, 0]);
    expect(a.classList.contains('reorder-dragging')).toBeFalse();
    expect(c.classList.contains('reorder-drag-over')).toBeFalse();
  });

  it('la tuile data-no-drag n\'est pas draggable', () => {
    const fixture = create();
    const add: HTMLElement = fixture.nativeElement.querySelector('li.add');
    expect(add.draggable).toBeFalse();
  });
});
```

- [ ] **Step 3.2 : Vérifier l'échec**

Run : suite Docker. Attendu : les tests de classes échouent (la directive actuelle ne pose aucune classe).

- [ ] **Step 3.3 : Implémenter la directive**

Remplacer le contenu de `reorderable.directive.ts` par (le commentaire « Order construit… » et la logique d'ordre existants sont conservés) :

```typescript
import { AfterViewInit, ApplicationRef, Directive, ElementRef, EventEmitter, inject, NgZone, OnDestroy, Output } from '@angular/core';

@Directive({
  selector: '[appReorderable]',
  standalone: true,
})
export class ReorderableDirective implements AfterViewInit, OnDestroy {
  @Output() reordered = new EventEmitter<number[]>();

  private readonly zone = inject(NgZone);
  private readonly appRef = inject(ApplicationRef);
  private dragSrcIndex: number | null = null;
  private observer: MutationObserver | null = null;
  private listeners: Array<{ el: HTMLElement; type: string; fn: EventListener }> = [];
  /** Rects capturés au drop pour l'animation FLIP (null si aucune en attente). */
  private flipRects: Map<Element, DOMRect> | null = null;
  private flipCapturedAt = 0;
  /** Compteurs dragenter/dragleave par cible (les events des enfants bouillonnent). */
  private dragOverCounts = new WeakMap<HTMLElement, number>();

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.attach();
    this.observer = new MutationObserver(() => {
      this.attach();
      this.playFlip();
    });
    this.observer.observe(this.host.nativeElement, { childList: true });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.detachListeners();
  }

  private detachListeners() {
    for (const { el, type, fn } of this.listeners) {
      el.removeEventListener(type, fn);
    }
    this.listeners = [];
  }

  private draggableChildren(): HTMLElement[] {
    return (Array.from(this.host.nativeElement.children) as HTMLElement[])
      .filter(el => el.dataset['noDrag'] === undefined);
  }

  private attach() {
    this.detachListeners();
    this.draggableChildren().forEach((el, idx) => {
      el.draggable = true;
      el.dataset['idx'] = String(idx);

      const onDragStart = (e: Event) => this.onDragStart(e as DragEvent, idx, el);
      const onDragOver = (e: Event) => e.preventDefault();
      const onDragEnter = () => this.onDragEnter(el);
      const onDragLeave = () => this.onDragLeave(el);
      const onDrop = (e: Event) => this.onDrop(e as DragEvent, idx);
      const onDragEnd = () => this.clearDragState();

      el.addEventListener('dragstart', onDragStart);
      el.addEventListener('dragover', onDragOver);
      el.addEventListener('dragenter', onDragEnter);
      el.addEventListener('dragleave', onDragLeave);
      el.addEventListener('drop', onDrop);
      el.addEventListener('dragend', onDragEnd);

      this.listeners.push(
        { el, type: 'dragstart', fn: onDragStart },
        { el, type: 'dragover', fn: onDragOver },
        { el, type: 'dragenter', fn: onDragEnter },
        { el, type: 'dragleave', fn: onDragLeave },
        { el, type: 'drop', fn: onDrop },
        { el, type: 'dragend', fn: onDragEnd },
      );
    });
  }

  private onDragStart(e: DragEvent, index: number, el: HTMLElement) {
    this.dragSrcIndex = index;
    e.dataTransfer?.setData('text/plain', String(index));
    el.classList.add('reorder-dragging');
  }

  private onDragEnter(el: HTMLElement) {
    if (this.dragSrcIndex === null) return;
    const count = (this.dragOverCounts.get(el) ?? 0) + 1;
    this.dragOverCounts.set(el, count);
    if (Number(el.dataset['idx']) !== this.dragSrcIndex) {
      el.classList.add('reorder-drag-over');
    }
  }

  private onDragLeave(el: HTMLElement) {
    const count = (this.dragOverCounts.get(el) ?? 0) - 1;
    this.dragOverCounts.set(el, Math.max(0, count));
    if (count <= 0) el.classList.remove('reorder-drag-over');
  }

  private clearDragState() {
    this.dragSrcIndex = null;
    for (const el of Array.from(this.host.nativeElement.children) as HTMLElement[]) {
      el.classList.remove('reorder-dragging', 'reorder-drag-over');
      this.dragOverCounts.delete(el);
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private onDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const src = this.dragSrcIndex;
    this.clearDragState();
    if (src === null || src === targetIndex) return;
    // Order construit a partir des SEULS enfants draggables (filtres par data-no-drag),
    // pour rester aligne sur les index utilises dans dragSrcIndex / targetIndex et
    // ne pas reinjecter l'index d'une tuile non-draggable (ex: "+ Ajouter") dans
    // l'ordre emis a l'application — qui produirait un items[N]=undefined cote parent.
    const draggableCount = this.draggableChildren().length;
    const order = Array.from({ length: draggableCount }, (_, i) => i);
    const [moved] = order.splice(src, 1);
    order.splice(targetIndex, 0, moved);
    // FLIP : capturer les positions avant le re-render declenche par le parent.
    if (!this.prefersReducedMotion()) {
      this.flipRects = new Map(this.draggableChildren().map(el => [el, el.getBoundingClientRect()]));
      this.flipCapturedAt = performance.now();
    }
    // Listeners drag natifs sont hors NgZone : re-enter pour que les
    // bindings du parent (preview) se reevaluent immediatement apres le drop.
    this.zone.run(() => {
      this.reordered.emit(order);
    });
  }

  /** Anime les enfants de leur ancienne position vers la nouvelle (FLIP). */
  private playFlip() {
    const rects = this.flipRects;
    this.flipRects = null;
    // Garde anti-rects perimes : le re-render doit suivre immediatement le drop.
    if (!rects || performance.now() - this.flipCapturedAt > 300) return;
    for (const el of this.draggableChildren()) {
      const prev = rects.get(el);
      if (!prev) continue;
      const now = el.getBoundingClientRect();
      const dx = prev.left - now.left;
      const dy = prev.top - now.top;
      if (!dx && !dy) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 180ms ease';
        el.style.transform = '';
        const cleanup = () => {
          el.style.transition = '';
          el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
      });
    }
  }
}
```

- [ ] **Step 3.4 : Styles globaux**

Dans `frontend/src/styles.css`, juste après le bloc « Les modales picker/crop ouvertes depuis un form cache… » (règle `.picker-backdrop, … { pointer-events: auto; }`), ajouter :

```css
/* Feedback visuel du drag-reorder (ReorderableDirective) — global car les
   zones reordonnables vivent dans des composants a view encapsulation
   differente (galeries des fiches, feed accueil, liste editoriale). */
.reorder-dragging { opacity: 0.4; }
.reorder-drag-over { outline: 2px solid var(--color-accent); outline-offset: -2px; translate: 0 2px; }
@media (prefers-reduced-motion: reduce) {
  .reorder-drag-over { translate: none; }
}
```

- [ ] **Step 3.5 : Vérifier le vert**

Run : suite Docker. Attendu : **825 SUCCESS** (819 + 6).

- [ ] **Step 3.6 : Commit**

```powershell
git add frontend/src/app/directives/reorderable.directive.ts frontend/src/app/directives/reorderable.directive.spec.ts frontend/src/styles.css
git commit -m "feat(admin): feedback visuel drag-reorder - classes drag + animation FLIP + reduced-motion"
```

---

### Task 4 : Câblage `MobilierComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`

- [ ] **Step 4.1 : Écrire les tests (échec attendu)**

Ajouter à la fin du describe de `mobilier.component.spec.ts` :

```typescript
  it('onSelectFurniture avec form dirty : confirm refusé = pas de chargement', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.furnitureForm.patchValue({ title: 'Brouillon' });
    cmp.furnitureForm.markAsDirty();
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    cmp.onSelectFurniture({ id: 'x', slug: 'chaise', title: 'Chaise' });
    expect(confirmSpy).toHaveBeenCalled();
    expect(cmp.editingFurnitureSlug()).toBeNull();
    expect(cmp.furnitureForm.getRawValue().title).toBe('Brouillon');
  });

  it('onSelectFurniture avec form pristine : charge sans confirm', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const confirmSpy = spyOn(window, 'confirm');
    cmp.onSelectFurniture({ id: 'x', slug: 'chaise', title: 'Chaise' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(cmp.editingFurnitureSlug()).toBe('chaise');
  });

  it('onNewFurniture avec form dirty : confirm accepté = form vierge', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.furnitureForm.patchValue({ title: 'Brouillon' });
    cmp.furnitureForm.markAsDirty();
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.onNewFurniture();
    expect(cmp.furnitureForm.getRawValue().title).toBe('');
  });

  it('saveFurniture marque le form pristine après succès', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.furnitureForm.markAsDirty();
    cmp.saveFurniture();
    // flush(null) : pas de reload post-save, markAsPristine est le seul mécanisme testé
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture').flush(null);
    httpMock.expectOne('/api/furniture').flush([]);
    expect(cmp.furnitureForm.dirty).toBeFalse();
  });

  it('les mutations galerie depuis le preview marquent le form dirty', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.furnitureGallery.set([{ url: 'a.jpg' }, { url: 'b.jpg' }]);
    expect(cmp.furnitureForm.dirty).toBeFalse();
    cmp.onPreviewGalleryReorder([1, 0]);
    expect(cmp.furnitureForm.dirty).toBeTrue();
  });
```

- [ ] **Step 4.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échecs (`onSelectFurniture` inexistant, pristine non marqué, dirty non marqué).

- [ ] **Step 4.3 : Implémenter dans `mobilier.component.ts`**

1. Imports : ajouter `confirmIfDirty` à l'import depuis `../shared/preview-page-helpers` ; ajouter `import { LiveAnnouncer } from '@angular/cdk/a11y';` (import du service seul — PAS `A11yModule`, le composant n'utilise pas de directive CDK).

2. Injections (avec les autres `inject` en tête de classe) :

```typescript
  private readonly announcer = inject(LiveAnnouncer);
```

3. Signal d'état fullscreen (avec les autres signaux) :

```typescript
  /** Reflète le plein écran du shell — rend la liste latérale inert (neutralisation aria-modal). */
  protected readonly previewFullscreenActive = signal(false);
```

4. Étendre les options de `galleryHandlers` :

```typescript
  private readonly galleryHandlers = createGalleryPreviewHandlers({
    gallery: this.furnitureGallery,
    galleryEditor: () => this.galleryEditor,
    coverField: () => this.coverImageField,
    onMutate: () => this.furnitureForm.markAsDirty(),
    announcer: this.announcer,
  });
```

5. Wrappers gardés (à placer près de `newFurniture`/`loadFurniture`) :

```typescript
  /** Message du garde-fou perte de saisie. */
  private static readonly DIRTY_MESSAGE = 'Des modifications ne sont pas enregistrées. Continuer sans enregistrer ?';

  /** Wrapper UI gardé — le template l'appelle ; les flux internes appellent loadFurniture directement. */
  protected onSelectFurniture(item: Furniture): void {
    if (!confirmIfDirty(this.furnitureForm, MobilierComponent.DIRTY_MESSAGE)) return;
    this.loadFurniture(item);
  }

  /** Wrapper UI gardé — idem pour « + Nouvelle pièce ». */
  protected onNewFurniture(): void {
    if (!confirmIfDirty(this.furnitureForm, MobilierComponent.DIRTY_MESSAGE)) return;
    this.newFurniture();
  }
```

6. `saveFurniture()` — dans le callback `next`, ajouter `markAsPristine` après le toast :

```typescript
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(slug ? 'Pièce mise à jour.' : 'Pièce créée.');
        // L'état sauvegardé devient la référence : le garde-fou dirty
        // ne doit pas se déclencher sur le reload post-save.
        this.furnitureForm.markAsPristine();
        this.refreshFurniture();
```

7. `onCoverCropChange` — le patch d'un crop est une modification sauvegardable :

```typescript
  protected onCoverCropChange(crop: Crop | null): void {
    this.furnitureForm.patchValue({ coverCrop: crop });
    this.furnitureForm.markAsDirty();
  }
```

8. Template — 4 retouches ciblées :
   - Liste : `(click)="loadFurniture(item)"` → `(click)="onSelectFurniture(item)"` (bouton `.row` uniquement).
   - En-tête de liste : `(click)="newFurniture()"` → `(click)="onNewFurniture()"` (bouton « + Nouvelle pièce » uniquement — le bouton « Annuler » du form garde `newFurniture()` : son intention d'abandon est explicite).
   - `<aside class="list">` → `<aside class="list" [attr.inert]="previewFullscreenActive() ? '' : null">`.
   - Sur `<app-admin-preview-shell …>` : ajouter `(fullscreenChange)="previewFullscreenActive.set($event)"`.
   - Sur `<app-gallery-editor #galleryEditor …>` : `(imagesChange)="furnitureGallery.set($event)"` → `(imagesChange)="furnitureGallery.set($event); furnitureForm.markAsDirty()"`.

- [ ] **Step 4.4 : Vérifier le vert**

Run : suite Docker. Attendu : **830 SUCCESS** (825 + 5).

- [ ] **Step 4.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/
git commit -m "feat(admin): mobilier - garde-fou dirty, pristine post-save, annonces galerie, inert liste en plein ecran"
```

---

### Task 5 : Câblage `ExpositionsComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

Miroir exact de la Task 4 (lire `mobilier.component.ts` migré comme modèle).

- [ ] **Step 5.1 : Écrire les tests (échec attendu)**

Ajouter à la fin du describe de `expositions.component.spec.ts` (mêmes 5 tests que Task 4 transposés) :

```typescript
  it('onSelectExhibition avec form dirty : confirm refusé = pas de chargement', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.exhibitionForm.patchValue({ title: 'Brouillon' });
    cmp.exhibitionForm.markAsDirty();
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    cmp.onSelectExhibition({ id: 'x', slug: 'salon', title: 'Salon' });
    expect(confirmSpy).toHaveBeenCalled();
    expect(cmp.editingExhibitionSlug()).toBeNull();
    expect(cmp.exhibitionForm.getRawValue().title).toBe('Brouillon');
  });

  it('onSelectExhibition avec form pristine : charge sans confirm', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const confirmSpy = spyOn(window, 'confirm');
    cmp.onSelectExhibition({ id: 'x', slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(cmp.editingExhibitionSlug()).toBe('salon');
  });

  it('onNewExhibition avec form dirty : confirm accepté = form vierge', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.exhibitionForm.patchValue({ title: 'Brouillon' });
    cmp.exhibitionForm.markAsDirty();
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.onNewExhibition();
    expect(cmp.exhibitionForm.getRawValue().title).toBe('');
  });

  it('saveExhibition marque le form pristine après succès', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.exhibitionForm.patchValue({ title: 'T', startDate: '2024-01-01', endDate: '2024-02-01' });
    cmp.exhibitionForm.markAsDirty();
    cmp.saveExhibition();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/exhibitions').flush(null);
    httpMock.expectOne('/api/exhibitions').flush([]);
    expect(cmp.exhibitionForm.dirty).toBeFalse();
  });

  it('les mutations galerie depuis le preview marquent le form dirty', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.exhibitionGallery.set([{ url: 'a.jpg' }, { url: 'b.jpg' }]);
    expect(cmp.exhibitionForm.dirty).toBeFalse();
    cmp.onPreviewGalleryReorder([1, 0]);
    expect(cmp.exhibitionForm.dirty).toBeTrue();
  });
```

- [ ] **Step 5.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échecs symétriques à la Task 4.

- [ ] **Step 5.3 : Implémenter dans `expositions.component.ts`**

Mêmes 8 retouches que le Step 4.3, transposées :
- imports `confirmIfDirty` + `LiveAnnouncer` (service seul) ;
- `private readonly announcer = inject(LiveAnnouncer);` ;
- `protected readonly previewFullscreenActive = signal(false);` (même JSDoc) ;
- options `onMutate: () => this.exhibitionForm.markAsDirty(), announcer: this.announcer` dans `createGalleryPreviewHandlers` ;
- `DIRTY_MESSAGE` (même chaîne), wrappers `onSelectExhibition(item: Exhibition)` / `onNewExhibition()` gardés par `confirmIfDirty(this.exhibitionForm, ExpositionsComponent.DIRTY_MESSAGE)` qui délèguent à `loadExhibition`/`newExhibition` ;
- `saveExhibition()` : `this.exhibitionForm.markAsPristine();` après le toast du `next` ;
- `onCoverCropChange` : ajout `this.exhibitionForm.markAsDirty();` après le patch ;
- Template : `(click)="loadExhibition(item)"` → `onSelectExhibition(item)` ; `(click)="newExhibition()"` (en-tête liste) → `onNewExhibition()` (le « Annuler » du form garde `newExhibition()`) ; `<aside class="list" [attr.inert]="previewFullscreenActive() ? '' : null">` ; `(fullscreenChange)="previewFullscreenActive.set($event)"` sur le shell ; `(imagesChange)="exhibitionGallery.set($event); exhibitionForm.markAsDirty()"`.

- [ ] **Step 5.4 : Vérifier le vert**

Run : suite Docker. Attendu : **835 SUCCESS** (830 + 5).

- [ ] **Step 5.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/
git commit -m "feat(admin): expositions - garde-fou dirty, pristine post-save, annonces galerie, inert liste en plein ecran"
```

---

### Task 6 : Suite complète, couverture, documentation

**Files:**
- Modify: `docs/SPECIFICATION_TECHNIQUE.md`
- Modify: `docs/superpowers/specs/2026-06-10-wysiwyg-ux-socle-a11y-design.md`

- [ ] **Step 6.1 : Suite complète + couverture**

Run : `docker compose -f docker-compose.test.yml run --rm frontend-test` — attendu **835 SUCCESS**, exit 0. La commande Docker n'active pas `--code-coverage` : lancer aussi la vérification de seuils dans le conteneur :
`docker compose -f docker-compose.test.yml run --rm frontend-test ng test --watch=false --browsers=ChromeHeadless --code-coverage` (si la syntaxe de surcharge de commande échoue, consigner les chiffres du run CI à venir). Seuils : 80 % global / 75 % branches — en cas d'échec, compléter par des tests, ne PAS baisser les seuils.

- [ ] **Step 6.2 : Mettre à jour `docs/SPECIFICATION_TECHNIQUE.md`**

1. §5.5, tableau API de `<app-admin-preview-shell>` : ajouter la ligne :

```markdown
| `fullscreenChange` | output `boolean` | Entrée/sortie plein écran — les pages rendent `inert` leur liste latérale |
```

2. §5.5, sous la description du shell, ajouter un paragraphe :

```markdown
Clavier & annonces (sous-projet 2/6) : tablist au pattern APG (roving tabindex, flèches ←/→ cycliques + Home/End, activation automatique) ; Ctrl+S/Cmd+S émet `save` quand `showSave` (preventDefault systématique) ; Échap réduit le plein écran et rend le focus au bouton ⤢ (inactif si `formModalOpen`) ; mode-bar `inert` en plein écran ; `aria-controls` du tab Aperçu conditionnel au panel rendu ; annonces `LiveAnnouncer` : « Mode aperçu/édition », « Aperçu plein écran/réduit ».
```

3. §5.5, liste des composables `preview-page-helpers.ts` : ajouter :

```markdown
- `confirmIfDirty(form, message)` — garde-fou perte de saisie (wrappers UI `onSelectFurniture`/`onNewFurniture` et équivalents expo ; `markAsPristine()` après save réussi).
- Options `onMutate` (markAsDirty sur remove/reorder/resize galerie) et `announcer` (annonces SR reorder/resize) de `createGalleryPreviewHandlers`.
```

4. §5.4 mobilier et expositions : ajouter à chaque sous-section la bullet :

```markdown
- **Garde-fou dirty** : sélection liste / « + Nouvelle » passent par des wrappers gardés (`confirmIfDirty`) ; les flux internes (reload post-save, suppression, `?new=1`) restent sans garde. Liste latérale `inert` quand l'aperçu est en plein écran (`fullscreenChange`).
```

5. Chercher la documentation existante de `ReorderableDirective` dans le fichier (grep `ReorderableDirective`) ; si une sous-section existe, y ajouter, sinon créer une sous-section dans §5.6 :

```markdown
Feedback visuel (sous-projet 2/6) : classe `reorder-dragging` sur la source, `reorder-drag-over` sur la cible (compteur dragenter/dragleave), animation FLIP au drop (~180 ms, désactivée par `prefers-reduced-motion`), styles globaux dans `styles.css`.
```

6. Tableau d'historique : nouvelle ligne (incrément mineur de la dernière version, ex. 2.7.0 → 2.8.0, date du jour) :

```markdown
| 2.8.0 | 10/06/2026 | UX socle + a11y previews WYSIWYG (chantier v2, sous-projet 2/6) : garde-fou dirty (`confirmIfDirty` + pristine post-save) · Ctrl+S · roving tabindex APG · Échap plein écran + restitution focus · mode-bar/liste `inert` en fullscreen · annonces `LiveAnnouncer` (mode, fullscreen, galerie) · drag-reorder : classes + FLIP + reduced-motion |
```

- [ ] **Step 6.3 : Statut de la spec design**

Dans `docs/superpowers/specs/2026-06-10-wysiwyg-ux-socle-a11y-design.md` : passer `**Statut**` à `Implémenté — feat/wysiwyg-ux-socle-a11y`. Si l'implémentation a dévié de la spec sur un point, l'amender dans la section concernée.

- [ ] **Step 6.4 : Commit**

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md docs/superpowers/specs/2026-06-10-wysiwyg-ux-socle-a11y-design.md
git commit -m "docs(spec-tech): UX socle + a11y previews WYSIWYG (sous-projet 2/6 chantier v2)"
```

---

## Critères de fin

- [ ] Suite frontend complète verte (835 attendus), seuils de couverture inchangés (80 %/75 %).
- [ ] Validation visuelle manuelle par l'utilisateur : garde-fou (sélection liste avec brouillon), Ctrl+S, flèches sur les onglets, Échap plein écran (focus visible sur ⤢), drag avec classes + glissement FLIP, `prefers-reduced-motion` (DevTools → Rendering) sans animation.
- [ ] Baselines Playwright **non régénérées** (aucun changement d'état au repos).
- [ ] Doc à jour (spec-tech 2.8.0 + statut spec design).
- [ ] Hors périmètre intact : pas d'undo/redo, pas de réordonnancement clavier, pas de badge dirty, accueil non modifié.
