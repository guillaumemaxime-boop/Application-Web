import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MobilierComponent } from './mobilier.component';
import { ToastService } from '../shared/toast.service';

type GalleryItem = { url: string; crop?: unknown };

type MobilierInternals = {
  furnitureForm: {
    patchValue: (v: Record<string, unknown>) => void;
    getRawValue: () => Record<string, unknown>;
    reset: (v?: Record<string, unknown>) => void;
    invalid: boolean;
  };
  furniture: () => unknown[];
  loadingFurniture: () => boolean;
  editingFurnitureSlug: () => string | null;
  editingFurnitureId: () => string | null;
  furnitureGallery: { (): GalleryItem[]; set: (v: GalleryItem[]) => void; update: (fn: (v: GalleryItem[]) => GalleryItem[]) => void };
  saving: () => boolean;
  allTags: () => string[];
  loadFurniture: (item: unknown) => void;
  newFurniture: () => void;
  saveFurniture: () => void;
  removeFurniture: (item: unknown) => void;
  parseDimensions: (list: string[]) => { w: number | null; d: number | null; h: number | null; notes: string };
  serializeDimensions: (w: number | null, d: number | null, h: number | null, notesText: string) => string[];
  onCoverCropChange: (crop: { x: number; y: number; w: number; h: number } | null) => void;
  focusField: (name: string) => void;
  onPreviewCoverEdit: (action: 'crop' | 'replace') => void;
  onPreviewGalleryItemEdit: (e: { index: number; action: 'crop' | 'replace' | 'remove' }) => void;
  onPreviewGalleryReorder: (order: number[]) => void;
  onPreviewGalleryItemResize: (e: { index: number; colSpan: number; rowSpan: number }) => void;
  onPreviewTagsChange: (tags: string[]) => void;
  history: { undo: () => boolean; redo: () => boolean; canUndo: () => boolean; canRedo: () => boolean; record: () => void; clear: () => void };
};

describe('MobilierComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [MobilierComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  function flushInitial(items: unknown[] = []) {
    httpMock.expectOne('/api/furniture').flush(items);
    httpMock.expectOne('/api/tags').flush([]);
  }

  afterEach(() => httpMock?.verify());

  it('charge la liste des pièces', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'chaise', title: 'Chaise', category: 'Sièges', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.list li')).length).toBe(1);
  });

  it('ouvre un formulaire vierge si ?new=1', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.editingFurnitureSlug()).toBeNull();
  });

  it('saveFurniture() POST quand nouveau', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('loadFurniture() populate le form avec les valeurs de l\'item', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const item = {
      id: 'id-1', slug: 'tabouret', title: 'Tabouret', category: 'Sièges', year: 2023,
      material: 'chêne', designer: 'Designer X', coverImage: '/c.jpg',
      gallery: [{ url: '/g1.jpg' }, { url: '/g2.jpg' }],
      dimensions: ['L 50 cm', 'H 80 cm', 'Note libre'],
      shortDescription: 'short', description: 'long', featured: false,
    };
    cmp.loadFurniture(item);
    expect(cmp.editingFurnitureSlug()).toBe('tabouret');
    expect(cmp.editingFurnitureId()).toBe('id-1');
    const v = cmp.furnitureForm.getRawValue();
    expect(v['title']).toBe('Tabouret');
    expect(v['slug']).toBe('tabouret');
    expect(v['dimW']).toBe(50);
    expect(v['dimH']).toBe(80);
    expect(v['dimNotes']).toBe('Note libre');
    expect(cmp.furnitureGallery()).toEqual([{ url: '/g1.jpg' }, { url: '/g2.jpg' }]);
  });

  it('loadFurniture() supporte les champs optionnels manquants', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: undefined, slug: 'x', title: 'X', category: 'C', year: 2024 });
    expect(cmp.editingFurnitureId()).toBeNull();
    expect(cmp.furnitureGallery()).toEqual([]);
  });

  it('parseDimensions() extrait L/P/H depuis différents formats', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const parsed = cmp.parseDimensions(['Largeur: 60', 'Prof. 40,5', 'H 80', 'Note libre', '']);
    expect(parsed.w).toBe(60);
    expect(parsed.d).toBe(40.5);
    expect(parsed.h).toBe(80);
    expect(parsed.notes).toBe('Note libre');
  });

  it('parseDimensions() ignore les doublons après une valeur trouvée', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const parsed = cmp.parseDimensions(['L 50', 'L 99', 'autre']);
    expect(parsed.w).toBe(50);
    expect(parsed.notes).toBe('L 99\nautre');
  });

  it('serializeDimensions() produit une liste correcte', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const ser = cmp.serializeDimensions(50, 40, 80, 'note1\nnote2');
    expect(ser).toEqual(['L 50 cm', 'P 40 cm', 'H 80 cm', 'note1', 'note2']);
  });

  it('serializeDimensions() omet les valeurs nulles et lignes vides', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const ser = cmp.serializeDimensions(null, null, 80, '');
    expect(ser).toEqual(['H 80 cm']);
  });

  it('saveFurniture() ne fait rien quand le form est invalid', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    // Form is invalid by default (title required)
    cmp.saveFurniture();
    // Pas d'appel HTTP attendu — httpMock.verify() à la fin garantit
    expect(cmp.saving()).toBe(false);
  });

  it('saveFurniture() PUT quand slug est édité', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial([
      { id: '1', slug: 'existing', title: 'E', category: 'C', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: true },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: '1', slug: 'existing', title: 'E', category: 'C', year: 2024 });
    cmp.furnitureForm.patchValue({ title: 'E2' });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/furniture/existing').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveFurniture() POST error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
    expect(cmp.saving()).toBe(false);
  });

  it('removeFurniture() ne supprime rien si confirm cancel', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(false);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.removeFurniture({ slug: 'x', title: 'X' });
    // pas d'appel DELETE
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(window.confirm).toHaveBeenCalled();
  });

  it('removeFurniture() DELETE + toast success quand OK', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.removeFurniture({ slug: 'chair', title: 'Chair' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/furniture/chair').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('removeFurniture() reset le form si on supprimait l\'item en cours d\'édition', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: '1', slug: 'chair', title: 'Chair', category: 'C', year: 2024 });
    expect(cmp.editingFurnitureSlug()).toBe('chair');
    cmp.removeFurniture({ slug: 'chair', title: 'Chair' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/furniture/chair').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(cmp.editingFurnitureSlug()).toBeNull();
  });

  it('removeFurniture() DELETE error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.removeFurniture({ slug: 'chair', title: 'Chair' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/furniture/chair').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('newFurniture() reset form et galerie', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: '1', slug: 'x', title: 'X', category: 'C', year: 2024, gallery: [{ url: '/a.jpg' }] });
    expect(cmp.furnitureGallery().length).toBe(1);
    cmp.newFurniture();
    expect(cmp.editingFurnitureSlug()).toBeNull();
    expect(cmp.editingFurnitureId()).toBeNull();
    expect(cmp.furnitureGallery()).toEqual([]);
  });

  it('affiche un lien « Gérer les stories » vers /admin/stories avec les query params owner quand la pièce est enregistrée', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: 'f1', slug: 'chair', title: 'Chair', category: 'C', year: 2024 });
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.stories-block a[href]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Gérer les stories');
    expect(link.getAttribute('href')).toContain('/admin/stories');
    expect(link.getAttribute('href')).toContain('ownerKind=furniture');
    expect(link.getAttribute('href')).toContain('ownerId=f1');
  });

  it('n\'affiche pas le lien stories tant que la pièce n\'est pas enregistrée', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stories-block a[href]')).toBeNull();
  });

  it('charge les tags via getAllTags au constructeur', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush(['bois', 'sculpture']);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.allTags()).toEqual(['bois', 'sculpture']);
  });

  it('saveFurniture envoie tags dans le payload', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024, tags: ['bois'] });
    cmp.saveFurniture();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture');
    expect(req.request.body['tags']).toEqual(['bois']);
    req.flush({});
    httpMock.expectOne('/api/furniture').flush([]);
  });

  it('refreshFurniture() error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').error(new ProgressEvent('err'));
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    expect(toast.error).toHaveBeenCalled();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.loadingFurniture()).toBe(false);
  });

  it('onCoverCropChange patche coverCrop dans le form', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.onCoverCropChange({ x: 10, y: 20, w: 50, h: 40 });
    expect(cmp.furnitureForm.getRawValue()['coverCrop']).toEqual({ x: 10, y: 20, w: 50, h: 40 });
  });

  it('saveFurniture envoie coverCrop dans le payload POST', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({
      title: 'T', category: 'C', year: 2024,
      coverCrop: { x: 10, y: 20, w: 50, h: 40 },
    });
    cmp.saveFurniture();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture');
    expect(req.request.body['coverCrop']).toEqual({ x: 10, y: 20, w: 50, h: 40 });
    req.flush({});
    httpMock.expectOne('/api/furniture').flush([]);
  });

  it('focusField scroll + focus l\'input field-title', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;

    // L'input avec id="field-title" est rendu dans le template du composant
    const input = document.getElementById('field-title') as HTMLInputElement;
    expect(input).toBeTruthy();
    spyOn(input, 'scrollIntoView');
    spyOn(input, 'focus');

    cmp.focusField('title');

    expect(input.scrollIntoView).toHaveBeenCalled();
    expect(input.focus).toHaveBeenCalled();
  });

  it('focusField no-op quand id introuvable', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(() => cmp.focusField('inexistant')).not.toThrow();
  });

  it('onPreviewGalleryItemEdit remove enleve l\'item du signal galerie', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
    cmp.onPreviewGalleryItemEdit({ index: 0, action: 'remove' });
    expect(cmp.furnitureGallery()).toEqual([{ url: 'b', crop: null }]);
  });

  it('onPreviewGalleryReorder remet le signal galerie dans le bon ordre', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }, { url: 'c', crop: null }]);
    cmp.onPreviewGalleryReorder([2, 0, 1]);
    expect(cmp.furnitureGallery().map((i: GalleryItem) => i.url)).toEqual(['c', 'a', 'b']);
  });

  it('onPreviewGalleryItemResize patche colSpan/rowSpan sur l\'item du signal', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
    cmp.onPreviewGalleryItemResize({ index: 1, colSpan: 2, rowSpan: 3 });
    expect(cmp.furnitureGallery()[1]).toEqual({ url: 'b', crop: null, colSpan: 2, rowSpan: 3 } as any);
  });

  it('mobilierViewMode default form, switche preview', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(cmp.mobilierViewMode()).toBe('form');
    cmp.mobilierViewMode.set('preview');
    expect(cmp.mobilierViewMode()).toBe('preview');
  });

  it('onPreviewTextFieldEdit patche form value + marque dirty', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'Nouveau titre' });
    expect(cmp.furnitureForm.get('title').value).toBe('Nouveau titre');
    expect(cmp.furnitureForm.get('title').dirty).toBeTrue();
  });

  it('onPreviewGalleryAdd no-op quand galleryEditor absent', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.galleryEditor = undefined;
    expect(() => cmp.onPreviewGalleryAdd()).not.toThrow();
  });

  it('onPreviewCoverEdit crop appelle coverImageField.openCrop', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCrop: jasmine.createSpy('openCrop'), openPicker: jasmine.createSpy('openPicker') };
    cmp.coverImageField = stub;
    cmp.onPreviewCoverEdit('crop');
    expect(stub.openCrop).toHaveBeenCalled();
    expect(stub.openPicker).not.toHaveBeenCalled();
  });

  it('onPreviewCoverEdit replace appelle coverImageField.openPicker', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCrop: jasmine.createSpy('openCrop'), openPicker: jasmine.createSpy('openPicker') };
    cmp.coverImageField = stub;
    cmp.onPreviewCoverEdit('replace');
    expect(stub.openPicker).toHaveBeenCalled();
    expect(stub.openCrop).not.toHaveBeenCalled();
  });

  it('onPreviewGalleryItemEdit crop appelle galleryEditor.openCropFor', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCropFor: jasmine.createSpy('openCropFor'), openReplaceFor: jasmine.createSpy('openReplaceFor') };
    cmp.galleryEditor = stub;
    cmp.onPreviewGalleryItemEdit({ index: 2, action: 'crop' });
    expect(stub.openCropFor).toHaveBeenCalledWith(2);
  });

  it('onPreviewGalleryItemEdit replace appelle galleryEditor.openReplaceFor', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCropFor: jasmine.createSpy('openCropFor'), openReplaceFor: jasmine.createSpy('openReplaceFor') };
    cmp.galleryEditor = stub;
    cmp.onPreviewGalleryItemEdit({ index: 0, action: 'replace' });
    expect(stub.openReplaceFor).toHaveBeenCalledWith(0);
  });

  it('saveFurniture toast error quand l\'API echoue', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.saveFurniture();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture');
    req.error(new ProgressEvent('error'));
    expect(toast.error).toHaveBeenCalled();
  });

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

  it('ouvrir le crop depuis le preview suspend inert sur le panel form (regression 7075927)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.newFurniture();
    cmp.mobilierViewMode.set('preview');
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('#panel-form');
    expect(panel.hasAttribute('inert')).toBeTrue();

    // Flux utilisateur : bouton Cadrer de l'overlay cover du preview
    cmp.onPreviewCoverEdit('crop');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.crop-backdrop')).toBeTruthy();
    // La modale est descendante du panel form : inert doit etre suspendu
    // sinon elle est infocusable et incliquable (lecon du commit 7075927).
    expect(panel.hasAttribute('inert')).toBeFalse();

    // Fermeture de la modale : inert revient proteger le form cache
    cmp.coverImageField.cropOpen.set(false);
    fixture.detectChanges();
    expect(panel.hasAttribute('inert')).toBeTrue();
  });

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

  it('onCoverCropChange sans changement réel : aucune entrée d\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onCoverCropChange(null);   // coverCrop est déjà null à l'init
    expect(cmp.history.canUndo()).toBeFalse();
  });

  it('loadFurniture vide l\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'X' });
    expect(cmp.history.canUndo()).toBeTrue();
    cmp.loadFurniture({ id: 'id-1', slug: 'chaise', title: 'Chaise' });
    expect(cmp.history.canUndo()).toBeFalse();
  });

  it('édition inline sans modification : aucune entrée d\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: '' });
    expect(cmp.history.canUndo()).toBeFalse();
    expect(cmp.furnitureForm.dirty).toBeFalse();
  });

  it('onPreviewTagsChange patche les tags, marque dirty et enregistre un snapshot undo', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTagsChange(['bois', 'frene']);
    expect(cmp.furnitureForm.getRawValue().tags).toEqual(['bois', 'frene']);
    expect(cmp.furnitureForm.dirty).toBeTrue();
    cmp.history.undo();
    expect(cmp.furnitureForm.getRawValue().tags).toEqual([]);
  });

  it('ne rend plus les cases showStoryLink/showStoryButton (obsolètes)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="showStoryLink"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="showStoryButton"]')).toBeNull();
  });

});
