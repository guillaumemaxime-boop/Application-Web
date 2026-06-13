# Undo/redo des previews WYSIWYG — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Annuler/rétablir les opérations WYSIWYG (galerie, crop, éditions inline) sur mobilier et expositions — Ctrl+Z/Ctrl+Y + boutons ↶/↷ dans la toolbar du preview.

**Architecture:** Mécanisme snapshots (memento) : composable `createUndoHistory` dans `preview-page-helpers` (piles undo/redo de `{ form, gallery }`, limite 50) ; enregistrement AVANT chaque opération discrète via une nouvelle option `onBeforeMutate` des composables existants + appels explicites (crop cover, `imagesChange`) ; boutons et raccourcis dans le shell (outputs `undoRequested`/`redoRequested`), avec l'undo natif du navigateur préservé quand le focus est dans un champ de saisie. L'accueil n'est pas modifié.

**Tech Stack:** Angular 21 standalone, signals (`computed`), Karma + Jasmine, suite Docker.

**Spec:** [docs/superpowers/specs/2026-06-11-wysiwyg-undo-redo-design.md](../specs/2026-06-11-wysiwyg-undo-redo-design.md)
**Branche:** `feat/wysiwyg-undo-redo` (créée, spec déjà commitée)

---

## Structure de fichiers

| Fichier | Rôle |
| --- | --- |
| Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.ts` | + `UndoHistory`/`createUndoHistory`, + option `onBeforeMutate` sur `createGalleryPreviewHandlers` et `createTextFieldEditHandler` (+ garde anti-bruit) |
| Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts` | Tests des ajouts |
| Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts` | Inputs `historyEnabled`/`canUndo`/`canRedo`, outputs `undoRequested`/`redoRequested`, boutons ↶/↷, raccourcis Ctrl+Z/Y |
| Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts` | Tests boutons + clavier |
| Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` + spec | Champ `history`, options `onBeforeMutate`, `record()` crop/imagesChange, `clear()` load/new, bindings shell |
| Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts` + spec | Miroir |
| Modify: `docs/SPECIFICATION_TECHNIQUE.md`, spec design | Doc finale |

## Commandes de test

- Suite complète (chaque fin de task) : `docker compose -f docker-compose.test.yml run --rm frontend-test` depuis la racine. État de départ : **838 SUCCESS**.
- Couverture (Task 5) : `docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --code-coverage` (seuils 80 %/75 %).

## Garde-fous d'exécution

- AUCUNE normalisation de caractères : apostrophes typographiques `’` et tirets `—` existants intacts (3 régressions déjà attrapées sur ce point — vérifier le diff au niveau caractère).
- Les compteurs de tests attendus supposent la baseline 838 ; si elle diffère, ajuster d'autant.

---

### Task 1 : Composable `createUndoHistory` + option `onBeforeMutate`

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.ts`
- Modify: `frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts`

- [ ] **Step 1.1 : Écrire les tests (échec attendu)**

Dans `preview-page-helpers.spec.ts` : ajouter `createUndoHistory` à l'import depuis `./preview-page-helpers`, puis ajouter ces describes à la fin du describe principal :

```typescript
  describe('createUndoHistory', () => {
    interface S { v: number; }
    function setup(opts: { limit?: number; withAnnouncer?: boolean } = {}) {
      let state: S = { v: 1 };
      const announcer = jasmine.createSpyObj<AnnouncerLike>('AnnouncerLike', ['announce']);
      const history = createUndoHistory<S>({
        capture: () => ({ ...state }),
        restore: s => { state = { ...s }; },
        limit: opts.limit,
        announcer: opts.withAnnouncer ? announcer : undefined,
      });
      return { history, announcer, get: () => state, set: (v: number) => { state = { v }; } };
    }

    it('cycle nominal : record avant mutation, undo restaure, redo rétablit', () => {
      const { history, get, set } = setup();
      expect(history.canUndo()).toBeFalse();
      history.record();   // snapshot v=1
      set(2);
      expect(history.canUndo()).toBeTrue();
      expect(history.undo()).toBeTrue();
      expect(get().v).toBe(1);
      expect(history.canRedo()).toBeTrue();
      expect(history.redo()).toBeTrue();
      expect(get().v).toBe(2);
      expect(history.canRedo()).toBeFalse();
    });

    it('un record vide la pile redo', () => {
      const { history, set } = setup();
      history.record(); set(2);
      history.undo();
      expect(history.canRedo()).toBeTrue();
      history.record(); set(3);
      expect(history.canRedo()).toBeFalse();
    });

    it('la limite est appliquée en FIFO', () => {
      const { history, get, set } = setup({ limit: 2 });
      history.record(); set(2);   // snapshot v=1
      history.record(); set(3);   // snapshot v=2
      history.record(); set(4);   // snapshot v=3 → v=1 éjecté
      expect(history.undo()).toBeTrue();  // → v=3
      expect(history.undo()).toBeTrue();  // → v=2
      expect(history.canUndo()).toBeFalse();
      expect(get().v).toBe(2);
    });

    it('clear vide les deux piles', () => {
      const { history, set } = setup();
      history.record(); set(2);
      history.undo();
      history.clear();
      expect(history.canUndo()).toBeFalse();
      expect(history.canRedo()).toBeFalse();
    });

    it('undo/redo sur piles vides : false et état intact', () => {
      const { history, get } = setup();
      expect(history.undo()).toBeFalse();
      expect(history.redo()).toBeFalse();
      expect(get().v).toBe(1);
    });

    it('annonce SR « Action annulée » / « Action rétablie »', () => {
      const { history, announcer, set } = setup({ withAnnouncer: true });
      history.record(); set(2);
      history.undo();
      expect(announcer.announce).toHaveBeenCalledWith('Action annulée');
      history.redo();
      expect(announcer.announce).toHaveBeenCalledWith('Action rétablie');
    });

    it('sans announcer : pas d\'erreur', () => {
      const { history, set } = setup();
      history.record(); set(2);
      expect(() => { history.undo(); history.redo(); }).not.toThrow();
    });
  });

  describe('onBeforeMutate', () => {
    it('handlers galerie : invoqué AVANT la mutation, pour remove/reorder/resize', () => {
      const gallery = signal<GalleryItem[]>([{ url: 'a.jpg' }, { url: 'b.jpg' }]);
      const seen: string[][] = [];
      const handlers = createGalleryPreviewHandlers({
        gallery,
        galleryEditor: () => undefined,
        coverField: () => undefined,
        onBeforeMutate: () => seen.push(gallery().map(g => g.url)),
      });
      handlers.onGalleryReorder([1, 0]);
      expect(seen[0]).toEqual(['a.jpg', 'b.jpg']);   // état AVANT le reorder
      handlers.onGalleryItemEdit({ index: 0, action: 'remove' });
      handlers.onGalleryItemResize({ index: 0, colSpan: 2, rowSpan: 1 });
      expect(seen.length).toBe(3);
    });

    it('édition texte : invoqué AVANT le patch, avec l\'ancienne valeur encore en place', () => {
      const form = new FormBuilder().group({ title: ['Ancien'] });
      const seen: unknown[] = [];
      const handler = createTextFieldEditHandler(form, new Set(['title']), {
        onBeforeMutate: () => seen.push(form.get('title')!.value),
      });
      handler({ field: 'title', value: 'Nouveau' });
      expect(seen).toEqual(['Ancien']);
      expect(form.value.title).toBe('Nouveau');
    });

    it('édition texte sans modification : ni onBeforeMutate, ni patch, ni dirty', () => {
      const form = new FormBuilder().group({ title: ['Pareil'] });
      const onBeforeMutate = jasmine.createSpy('onBeforeMutate');
      const handler = createTextFieldEditHandler(form, new Set(['title']), { onBeforeMutate });
      handler({ field: 'title', value: 'Pareil' });
      expect(onBeforeMutate).not.toHaveBeenCalled();
      expect(form.get('title')!.dirty).toBeFalse();
    });
  });
```

- [ ] **Step 1.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échec de compilation (`createUndoHistory` non exporté, option `onBeforeMutate` inconnue).

- [ ] **Step 1.3 : Implémenter dans `preview-page-helpers.ts`**

1. Ajouter `computed` à l'import `@angular/core` (actuellement `DestroyRef, Signal, WritableSignal, signal`).

2. Remplacer `createTextFieldEditHandler` (lignes ~55-68) par :

```typescript
/**
 * Édition inline depuis le preview : patche le FormControl + markAsDirty,
 * derrière la même whitelist que le focus. `onBeforeMutate` (optionnel) est
 * invoqué AVANT le patch — point d'enregistrement de l'historique undo.
 * Garde anti-bruit : un blur sans modification ne fait rien (ni historique,
 * ni patch, ni dirty).
 */
export function createTextFieldEditHandler(
  form: FormGroup,
  allowedFields: ReadonlySet<string>,
  opts?: { onBeforeMutate?: () => void },
): (e: { field: string; value: string }) => void {
  return (e) => {
    if (!allowedFields.has(e.field)) return;
    if (form.get(e.field)?.value === e.value) return;
    opts?.onBeforeMutate?.();
    form.patchValue({ [e.field]: e.value });
    form.get(e.field)?.markAsDirty();
  };
}
```

3. Dans `createGalleryPreviewHandlers` : ajouter à `opts` (après `announcer`) :

```typescript
  /** Invoqué AVANT chaque mutation du signal galerie (remove/reorder/resize) — point d'enregistrement de l'historique undo. */
  onBeforeMutate?: () => void;
```

le destructurer, puis insérer `onBeforeMutate?.();` en PREMIÈRE instruction des trois chemins mutateurs :
- dans `onGalleryItemEdit`, branche `remove` (avant le `gallery.update`) ;
- dans `onGalleryReorder` (avant `const items = gallery();`) ;
- dans `onGalleryItemResize` (avant le `gallery.update`).

(`onMutate` reste invoqué APRÈS, inchangé.)

4. Ajouter à la fin du fichier :

```typescript
/** Contrat de l'historique undo/redo à snapshots. */
export interface UndoHistory<S> {
  /** Capture l'état courant AVANT une mutation ; vide la pile redo. */
  record(): void;
  /** Restaure le snapshot précédent. False si la pile est vide. */
  undo(): boolean;
  /** Rétablit le snapshot annulé. False si la pile est vide. */
  redo(): boolean;
  /** Vide les deux piles (changement d'item). */
  clear(): void;
  canUndo: Signal<boolean>;
  canRedo: Signal<boolean>;
}

/**
 * Historique undo/redo à snapshots (memento) : l'état complet est capturé
 * avant chaque opération discrète et restauré tel quel. Pas d'inverse par
 * type d'opération (voir spec 2026-06-11-wysiwyg-undo-redo-design.md).
 */
export function createUndoHistory<S>(opts: {
  capture: () => S;
  restore: (snapshot: S) => void;
  limit?: number;
  announcer?: AnnouncerLike;
}): UndoHistory<S> {
  const { capture, restore, announcer } = opts;
  const limit = opts.limit ?? 50;
  const undoStack = signal<S[]>([]);
  const redoStack = signal<S[]>([]);
  return {
    record: () => {
      undoStack.update(stack => {
        const next = [...stack, capture()];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
      redoStack.set([]);
    },
    undo: () => {
      const stack = undoStack();
      if (stack.length === 0) return false;
      const snapshot = stack[stack.length - 1];
      redoStack.update(r => [...r, capture()]);
      undoStack.set(stack.slice(0, -1));
      restore(snapshot);
      announcer?.announce('Action annulée');
      return true;
    },
    redo: () => {
      const stack = redoStack();
      if (stack.length === 0) return false;
      const snapshot = stack[stack.length - 1];
      undoStack.update(u => [...u, capture()]);
      redoStack.set(stack.slice(0, -1));
      restore(snapshot);
      announcer?.announce('Action rétablie');
      return true;
    },
    clear: () => {
      undoStack.set([]);
      redoStack.set([]);
    },
    canUndo: computed(() => undoStack().length > 0),
    canRedo: computed(() => redoStack().length > 0),
  };
}
```

- [ ] **Step 1.4 : Vérifier le vert**

Run : suite Docker. Attendu : **848 SUCCESS** (838 + 10).

- [ ] **Step 1.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/preview-page-helpers.ts frontend/src/app/pages/admin/shared/preview-page-helpers.spec.ts
git commit -m "feat(admin): composable createUndoHistory + option onBeforeMutate (snapshots undo/redo)"
```

---

### Task 2 : Shell — boutons ↶/↷ et raccourcis Ctrl+Z / Ctrl+Y

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts`

- [ ] **Step 2.1 : Écrire les tests (échec attendu)**

Dans la spec du shell :

1. `HostComponent` : ajouter dans le template du `<app-admin-preview-shell>` les bindings `[historyEnabled]="historyEnabled()"`, `[canUndo]="canUndo()"`, `[canRedo]="canRedo()"`, `(undoRequested)="undoCount = undoCount + 1"`, `(redoRequested)="redoCount = redoCount + 1"` ; dans le contenu projeté form, ajouter `<input class="form-input" />` après le `<p class="form-marker">FORM</p>` ; dans la classe : `readonly historyEnabled = signal(true);`, `readonly canUndo = signal(true);`, `readonly canRedo = signal(true);`, `undoCount = 0;`, `redoCount = 0;`.

2. Ajouter ces 8 tests à la fin du describe :

```typescript
  it('boutons undo/redo absents quand historyEnabled=false', () => {
    const fixture = create();
    fixture.componentInstance.historyEnabled.set(false);
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.btn-preview-undo'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-preview-redo'))).toBeNull();
  });

  it('boutons undo/redo : disabled selon canUndo/canRedo, clic émet', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const undoBtn = fixture.debugElement.query(By.css('.btn-preview-undo'));
    const redoBtn = fixture.debugElement.query(By.css('.btn-preview-redo'));
    expect(undoBtn.nativeElement.disabled).toBeFalse();
    undoBtn.nativeElement.click();
    redoBtn.nativeElement.click();
    expect(fixture.componentInstance.undoCount).toBe(1);
    expect(fixture.componentInstance.redoCount).toBe(1);
    fixture.componentInstance.canUndo.set(false);
    fixture.componentInstance.canRedo.set(false);
    fixture.detectChanges();
    expect(undoBtn.nativeElement.disabled).toBeTrue();
    expect(redoBtn.nativeElement.disabled).toBeTrue();
  });

  it('Ctrl+Z hors champ de saisie émet undoRequested et preventDefault', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(1);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+Z avec focus dans un input : non intercepté (undo natif)', () => {
    const fixture = create();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.form-input');
    input.focus();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+Shift+Z émet redoRequested', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.redoCount).toBe(1);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+Y émet redoRequested', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.redoCount).toBe(1);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+Z non intercepté quand une modale form-side est ouverte', () => {
    const fixture = create();
    fixture.componentInstance.formModalOpen.set(true);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+Z non intercepté quand historyEnabled=false', () => {
    const fixture = create();
    fixture.componentInstance.historyEnabled.set(false);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });
```

- [ ] **Step 2.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échec de compilation (`historyEnabled` inconnu).

- [ ] **Step 2.3 : Implémenter dans le shell**

1. Classe — ajouter après `formModalOpen` :

```typescript
  /** Active les boutons ↶/↷ et les raccourcis Ctrl+Z / Ctrl+Y (mobilier/expo ; l'accueil reste sans historique). */
  readonly historyEnabled = input(false);
  readonly canUndo = input(false);
  readonly canRedo = input(false);
```

et après `fullscreenChange` :

```typescript
  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();
```

2. Template — dans `.admin-preview-actions`, AVANT le bloc `@if (showSave())` :

```html
              @if (historyEnabled()) {
                <button type="button" class="btn-preview-toggle btn-preview-undo"
                        [disabled]="!canUndo()"
                        aria-label="Annuler la dernière action"
                        (click)="undoRequested.emit()">↶</button>
                <button type="button" class="btn-preview-toggle btn-preview-redo"
                        [disabled]="!canRedo()"
                        aria-label="Rétablir l'action annulée"
                        (click)="redoRequested.emit()">↷</button>
              }
```

3. Styles — compléter `.btn-preview-toggle` d'un état disabled (après la règle `:hover` existante) :

```css
    .btn-preview-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
```

4. `onDocumentKeydown` — insérer ce bloc ENTRE le bloc Ctrl+S et le bloc Échap :

```typescript
    // Undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y). Hors champ de saisie :
    // l'undo natif du navigateur garde la main sur la frappe en cours.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && this.historyEnabled()
        && !this.formModalOpen() && !this.isEditableTarget()) {
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey);
      if (isUndo || isRedo) {
        event.preventDefault();
        if (isUndo) this.undoRequested.emit();
        else this.redoRequested.emit();
        return;
      }
    }
```

5. Méthode privée (après `onDocumentKeydown`) :

```typescript
  /** Vrai quand le focus est dans un champ de saisie (l'undo natif prime). */
  private isEditableTarget(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  }
```

- [ ] **Step 2.4 : Vérifier le vert**

Run : suite Docker. Attendu : **856 SUCCESS** (848 + 8).

- [ ] **Step 2.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/admin-preview-shell.component.ts frontend/src/app/pages/admin/shared/admin-preview-shell.component.spec.ts
git commit -m "feat(admin): shell preview - boutons undo/redo + raccourcis Ctrl+Z/Ctrl+Y"
```

---

### Task 3 : Câblage `MobilierComponent`

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`

- [ ] **Step 3.1 : Écrire les tests (échec attendu)**

Ajouter à la fin du describe de `mobilier.component.spec.ts` (les helpers `configure`/`flushInitial` existent) :

```typescript
  function setupHistoryFixture() {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance as any };
  }

  it('reorder galerie depuis le preview : undo restaure l\'ordre et marque dirty', () => {
    const { cmp } = setupHistoryFixture();
    cmp.furnitureGallery.set([{ url: 'a.jpg' }, { url: 'b.jpg' }]);
    cmp.onPreviewGalleryReorder([1, 0]);
    expect(cmp.furnitureGallery().map((g: { url: string }) => g.url)).toEqual(['b.jpg', 'a.jpg']);
    expect(cmp.history.undo()).toBeTrue();
    expect(cmp.furnitureGallery().map((g: { url: string }) => g.url)).toEqual(['a.jpg', 'b.jpg']);
    expect(cmp.furnitureForm.dirty).toBeTrue();
  });

  it('édition inline : undo restaure la valeur, redo la rétablit', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'Nouveau titre' });
    expect(cmp.furnitureForm.getRawValue().title).toBe('Nouveau titre');
    cmp.history.undo();
    expect(cmp.furnitureForm.getRawValue().title).toBe('');
    cmp.history.redo();
    expect(cmp.furnitureForm.getRawValue().title).toBe('Nouveau titre');
  });

  it('onCoverCropChange enregistre un snapshot (undo restaure le crop)', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onCoverCropChange({ x: 10, y: 10, w: 50, h: 50 });
    expect(cmp.history.canUndo()).toBeTrue();
    cmp.history.undo();
    expect(cmp.furnitureForm.getRawValue().coverCrop).toBeNull();
  });

  it('loadFurniture vide l\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'X' });
    expect(cmp.history.canUndo()).toBeTrue();
    cmp.loadFurniture({ id: 'id-1', slug: 'chaise', title: 'Chaise' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(cmp.history.canUndo()).toBeFalse();
  });

  it('édition inline sans modification : aucune entrée d\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: '' });
    expect(cmp.history.canUndo()).toBeFalse();
    expect(cmp.furnitureForm.dirty).toBeFalse();
  });
```

- [ ] **Step 3.2 : Vérifier l'échec**

Run : suite Docker. Attendu : échecs (`cmp.history` undefined, no-op non gardé).

- [ ] **Step 3.3 : Implémenter dans `mobilier.component.ts`**

1. Import : ajouter `createUndoHistory` à l'import depuis `../shared/preview-page-helpers`.

2. Champ `history` — à déclarer APRÈS `galleryHandlers` (les closures `capture`/`restore` sont lazy, l'ordre exact importe peu, mais le bloc « câblage preview » reste groupé) :

```typescript
  /** Historique undo/redo des opérations WYSIWYG (snapshots form + galerie). */
  readonly history = createUndoHistory({
    capture: () => ({ form: this.furnitureForm.getRawValue(), gallery: [...this.furnitureGallery()] }),
    restore: s => {
      this.furnitureForm.patchValue(s.form);
      this.furnitureGallery.set(s.gallery);
      this.furnitureForm.markAsDirty();
    },
    announcer: this.announcer,
  });
```

3. `galleryHandlers` — ajouter l'option (après `announcer: this.announcer,`) :

```typescript
    onBeforeMutate: () => this.history.record(),
```

4. `onPreviewTextFieldEdit` — passer l'option en 3e argument :

```typescript
  protected readonly onPreviewTextFieldEdit = createTextFieldEditHandler(
    this.furnitureForm,
    MobilierComponent.FOCUSABLE_FIELDS,
    { onBeforeMutate: () => this.history.record() },
  );
```

5. `onCoverCropChange` — enregistrer avant le patch :

```typescript
  protected onCoverCropChange(crop: Crop | null): void {
    this.history.record();
    this.furnitureForm.patchValue({ coverCrop: crop });
    this.furnitureForm.markAsDirty();
  }
```

6. `loadFurniture` et `newFurniture` — ajouter `this.history.clear();` en première ligne de chacune.

7. Template :
   - Sur `<app-admin-preview-shell …>` ajouter :
     ```html
        [historyEnabled]="true"
        [canUndo]="history.canUndo()"
        [canRedo]="history.canRedo()"
        (undoRequested)="history.undo()"
        (redoRequested)="history.redo()"
     ```
   - Binding galerie form-side : `(imagesChange)="furnitureGallery.set($event); furnitureForm.markAsDirty()"` → `(imagesChange)="history.record(); furnitureGallery.set($event); furnitureForm.markAsDirty()"` (le `record()` lit l'ancienne galerie, encore dans le signal).

- [ ] **Step 3.4 : Vérifier le vert**

Run : suite Docker. Attendu : **861 SUCCESS** (856 + 5).

- [ ] **Step 3.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/
git commit -m "feat(admin): mobilier - historique undo/redo des operations WYSIWYG"
```

---

### Task 4 : Câblage `ExpositionsComponent` (miroir)

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

LIS `mobilier.component.ts` migré (Task 3) comme modèle exact.

- [ ] **Step 4.1 : Écrire les tests (échec attendu)**

Ajouter à la fin du describe de `expositions.component.spec.ts` :

```typescript
  function setupHistoryFixture() {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance as any };
  }

  it('reorder galerie depuis le preview : undo restaure l\'ordre et marque dirty', () => {
    const { cmp } = setupHistoryFixture();
    cmp.exhibitionGallery.set([{ url: 'a.jpg' }, { url: 'b.jpg' }]);
    cmp.onPreviewGalleryReorder([1, 0]);
    expect(cmp.exhibitionGallery().map((g: { url: string }) => g.url)).toEqual(['b.jpg', 'a.jpg']);
    expect(cmp.history.undo()).toBeTrue();
    expect(cmp.exhibitionGallery().map((g: { url: string }) => g.url)).toEqual(['a.jpg', 'b.jpg']);
    expect(cmp.exhibitionForm.dirty).toBeTrue();
  });

  it('édition de date inline : undo restaure la valeur, redo la rétablit', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewDateFieldEdit({ field: 'startDate', value: '2026-03-01' });
    expect(cmp.exhibitionForm.getRawValue().startDate).toBe('2026-03-01');
    cmp.history.undo();
    expect(cmp.exhibitionForm.getRawValue().startDate).toBe('');
    cmp.history.redo();
    expect(cmp.exhibitionForm.getRawValue().startDate).toBe('2026-03-01');
  });

  it('onCoverCropChange enregistre un snapshot (undo restaure le crop)', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onCoverCropChange({ x: 10, y: 10, w: 50, h: 50 });
    expect(cmp.history.canUndo()).toBeTrue();
    cmp.history.undo();
    expect(cmp.exhibitionForm.getRawValue().coverCrop).toBeNull();
  });

  it('loadExhibition vide l\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'X' });
    expect(cmp.history.canUndo()).toBeTrue();
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(cmp.history.canUndo()).toBeFalse();
  });

  it('édition inline sans modification : aucune entrée d\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: '' });
    expect(cmp.history.canUndo()).toBeFalse();
    expect(cmp.exhibitionForm.dirty).toBeFalse();
  });
```

- [ ] **Step 4.2 : Vérifier l'échec** — suite Docker, échecs symétriques à la Task 3.

- [ ] **Step 4.3 : Implémenter dans `expositions.component.ts`** — mêmes 7 retouches que le Step 3.3, transposées :
- import `createUndoHistory` ;
- champ `history` après `galleryHandlers` (capture/restore sur `exhibitionForm`/`exhibitionGallery`, même JSDoc) ;
- `onBeforeMutate: () => this.history.record()` dans `galleryHandlers` ;
- 3e argument `{ onBeforeMutate: () => this.history.record() }` sur `onPreviewTextFieldEdit` **ET** sur `onPreviewDateFieldEdit` (les deux passent par `createTextFieldEditHandler`) ;
- `onCoverCropChange` : `this.history.record();` avant le patch ;
- `this.history.clear();` en première ligne de `loadExhibition` et `newExhibition` ;
- template : les 5 bindings shell + `history.record();` en tête du binding `(imagesChange)`.

- [ ] **Step 4.4 : Vérifier le vert** — suite Docker. Attendu : **866 SUCCESS** (861 + 5).

- [ ] **Step 4.5 : Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/
git commit -m "feat(admin): expositions - historique undo/redo des operations WYSIWYG"
```

---

### Task 5 : Suite complète, couverture, documentation

**Files:**
- Modify: `docs/SPECIFICATION_TECHNIQUE.md`
- Modify: `docs/superpowers/specs/2026-06-11-wysiwyg-undo-redo-design.md`

- [ ] **Step 5.1 : Suite + couverture**

Run : `docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --code-coverage`
Attendu : **866 SUCCESS**, exit 0, seuils 80 %/75 % respectés (en cas d'échec : compléter par des tests, ne PAS baisser les seuils).

- [ ] **Step 5.2 : `docs/SPECIFICATION_TECHNIQUE.md`**

1. §5.5, tableau API du shell — ajouter :

```markdown
| `historyEnabled` / `canUndo` / `canRedo` | input `boolean` | Boutons ↶/↷ + raccourcis Ctrl+Z/Ctrl+Y (mobilier/expo ; accueil sans historique) |
| `undoRequested` / `redoRequested` | output `void` | Clic ↶/↷ ou raccourci clavier |
```

2. §5.5, paragraphe « Clavier & annonces » du shell — compléter avec :

```markdown
Undo/redo (sous-projet 3/6) : Ctrl+Z → `undoRequested`, Ctrl+Shift+Z ou Ctrl+Y → `redoRequested`, uniquement si `historyEnabled`, hors modale (`formModalOpen`) et hors champ de saisie (input/textarea/contenteditable : l'undo natif du navigateur prime).
```

3. §5.5, liste des composables — ajouter :

```markdown
- `createUndoHistory({capture, restore, limit=50, announcer})` — historique undo/redo à snapshots (piles bornées FIFO, signaux `canUndo`/`canRedo`, annonces « Action annulée/rétablie »). Consommé par mobilier/expo : snapshot `{form, gallery}`, restore = patchValue + set + markAsDirty.
- Option `onBeforeMutate` de `createGalleryPreviewHandlers` (avant remove/reorder/resize) et `createTextFieldEditHandler` (avant patch, avec garde anti-bruit : blur sans modification = no-op complet) — point d'enregistrement de l'historique.
```

4. §5.4 mobilier et expositions — ajouter à chaque sous-section :

```markdown
- **Undo/redo** : champ `history` (`createUndoHistory`), snapshots avant chaque opération discrète (galerie via `onBeforeMutate`, éditions inline, crop cover, `imagesChange`), vidé au changement d'item, conservé après save (un undo au-delà du save re-marque dirty).
```

5. Tableau d'historique : nouvelle ligne (incrément mineur, ex. 2.8.0 → 2.9.0, date du jour) :

```markdown
| 2.9.0 | 11/06/2026 | Undo/redo previews WYSIWYG (chantier v2, sous-projet 3/6) : `createUndoHistory` (snapshots form+galerie, limite 50) · option `onBeforeMutate` des composables · boutons ↶/↷ + Ctrl+Z/Ctrl+Y dans le shell (undo natif préservé dans les champs) · annonces SR « Action annulée/rétablie » · garde anti-bruit blur sans modification |
```

- [ ] **Step 5.3 : Statut spec design**

Dans `docs/superpowers/specs/2026-06-11-wysiwyg-undo-redo-design.md` : `**Statut**` → `Implémenté — feat/wysiwyg-undo-redo`. Amender la spec si l'implémentation a dévié.

- [ ] **Step 5.4 : Commit**

```powershell
git add docs/SPECIFICATION_TECHNIQUE.md docs/superpowers/specs/2026-06-11-wysiwyg-undo-redo-design.md
git commit -m "docs(spec-tech): undo/redo previews WYSIWYG (sous-projet 3/6 chantier v2)"
```

---

## Critères de fin

- [ ] Suite frontend complète verte (866 attendus), couverture ≥ seuils 80 %/75 %.
- [ ] Validation visuelle manuelle par l'utilisateur : reorder galerie → Ctrl+Z restaure ; éditions inline + crop annulables ; boutons ↶/↷ activés/désactivés correctement ; Ctrl+Z dans un champ de texte = undo natif de la frappe ; historique vidé au changement de fiche ; accueil inchangé (pas de boutons).
- [ ] Baselines Playwright non régénérées.
- [ ] Doc à jour (spec-tech 2.9.0, statut spec design).
- [ ] Hors périmètre intact : accueil non modifié, pas d'entrées nommées, pas de persistance.
