import { DestroyRef, Signal, WritableSignal, computed, signal } from '@angular/core';
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
  onCoverEdit: (action: 'crop' | 'replace') => void;
  onGalleryItemEdit: (e: { index: number; action: 'crop' | 'replace' | 'remove' }) => void;
  onGalleryAdd: () => void;
  onGalleryReorder: (order: number[]) => void;
  onGalleryItemResize: (e: { index: number; colSpan: number; rowSpan: number }) => void;
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
  /** Invoqué après chaque mutation du signal galerie (remove/reorder/resize) — ex. markAsDirty. */
  onMutate?: () => void;
  /** Annonces lecteur d'écran des opérations galerie (reorder/resize). */
  announcer?: AnnouncerLike;
  /** Invoqué AVANT chaque mutation du signal galerie (remove/reorder/resize) — point d'enregistrement de l'historique undo. */
  onBeforeMutate?: () => void;
}): GalleryPreviewHandlers {
  const { gallery, galleryEditor, coverField, onMutate, announcer, onBeforeMutate } = opts;
  return {
    onCoverEdit: (action) => {
      if (action === 'crop') coverField()?.openCrop();
      else coverField()?.openPicker();
    },
    onGalleryItemEdit: (e) => {
      if (e.action === 'remove') {
        onBeforeMutate?.();
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
      onBeforeMutate?.();
      const items = gallery();
      gallery.set(order.map(i => items[i]));
      onMutate?.();
      if (announcer && order.length > 0) {
        // L'item glissé = celui au plus grand déplacement. Limite : un
        // déplacement adjacent est indiscernable dans `order` (les deux
        // permutations sont identiques) ; l'annonce peut alors désigner
        // l'image voisine (±1).
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
      onBeforeMutate?.();
      gallery.update(arr => arr.map((it, i) =>
        i === e.index ? { ...it, colSpan: e.colSpan, rowSpan: e.rowSpan } : it
      ));
      onMutate?.();
      announcer?.announce(`Image redimensionnée : ${e.colSpan} colonne${e.colSpan > 1 ? 's' : ''} sur ${e.rowSpan} ligne${e.rowSpan > 1 ? 's' : ''}`);
    },
  };
}

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
