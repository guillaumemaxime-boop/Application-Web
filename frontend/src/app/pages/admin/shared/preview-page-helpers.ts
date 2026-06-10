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
