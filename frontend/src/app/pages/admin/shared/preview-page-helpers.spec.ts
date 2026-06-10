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
  override get destroyed(): boolean { return false; }
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
