import { DestroyRef, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { GalleryItem } from '../../../models/gallery-item.model';
import {
  AnnouncerLike,
  CoverFieldLike,
  GalleryEditorLike,
  confirmIfDirty,
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
});
