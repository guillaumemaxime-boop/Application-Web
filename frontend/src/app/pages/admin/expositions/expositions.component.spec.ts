import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ExpositionsComponent } from './expositions.component';
import { ToastService } from '../shared/toast.service';

type ExpoInternals = {
  exhibitionForm: {
    patchValue: (v: Record<string, unknown>) => void;
    getRawValue: () => Record<string, unknown>;
    reset: (v?: Record<string, unknown>) => void;
    invalid: boolean;
    get: (name: string) => { value: unknown; dirty: boolean } | null;
  };
  exhibitions: () => unknown[];
  loadingExhibitions: () => boolean;
  editingExhibitionSlug: () => string | null;
  editingExhibitionId: () => string | null;
  exhibitionGallery: { (): Array<{ url: string; crop?: unknown; colSpan?: number; rowSpan?: number }>; set: (v: Array<{ url: string; crop?: unknown }>) => void; update: (fn: (arr: unknown[]) => unknown[]) => void };
  allTags: () => string[];
  currentStories: { (): Array<{ id: string; title: string; position: number; ownerId: string; ownerKind: string; coverImage: string }>; set: (v: unknown[]) => void };
  editingStoryId: { (): string | null; set: (v: string | null) => void };
  editingStoryCoverCrop: { (): { x: number; y: number; w: number; h: number } | null; set: (v: { x: number; y: number; w: number; h: number } | null) => void };
  coverEditCtrl: { value: string | null; setValue: (v: string) => void };
  saving: () => boolean;
  creatingExhibition: { (): boolean; set: (v: boolean) => void };
  expoViewMode: { (): 'form' | 'preview'; set: (v: 'form' | 'preview') => void };
  loadExhibition: (item: unknown) => void;
  newExhibition: () => void;
  saveExhibition: () => void;
  removeExhibition: (item: unknown) => void;
  editStory: (s: unknown) => void;
  newStory: () => void;
  renameStory: (s: unknown) => void;
  deleteStory: (s: unknown) => void;
  openCoverEditor: (s: unknown) => void;
  saveCover: (s: unknown) => void;
  onCoverCropChange: (crop: { x: number; y: number; w: number; h: number } | null) => void;
  onStoryCoverCropChange: (crop: { x: number; y: number; w: number; h: number } | null) => void;
  focusField: (name: string) => void;
  onPreviewGalleryItemEdit: (e: { index: number; action: 'crop' | 'replace' | 'remove' }) => void;
  onPreviewGalleryReorder: (order: number[]) => void;
  onPreviewGalleryItemResize: (e: { index: number; colSpan: number; rowSpan: number }) => void;
  onPreviewTextFieldEdit: (e: { field: string; value: string }) => void;
  onPreviewDateFieldEdit: (e: { field: 'startDate' | 'endDate'; value: string }) => void;
  onPreviewTagsChange: (tags: string[]) => void;
  history: { canUndo: () => boolean; canRedo: () => boolean; undo: () => boolean; redo: () => boolean; record: () => void; clear: () => void };
};

describe('ExpositionsComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [ExpositionsComponent],
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
    httpMock.expectOne('/api/exhibitions').flush(items);
    httpMock.expectOne('/api/tags').flush([]);
  }

  afterEach(() => httpMock?.verify());

  it('charge expos et metadata', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('saveExhibition() POST quand nouveau', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionForm.patchValue({ title: 'T', startDate: '2024-01-01', endDate: '2024-02-01' });
    cmp.saveExhibition();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/exhibitions').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('ouvre formulaire vierge si ?new=1', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    expect(cmp.editingExhibitionSlug()).toBeNull();
  });

  it('loadExhibition() populate le form', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    const item = {
      id: 'e1', slug: 'salon', title: 'Salon', venue: 'Lieu', city: 'Paris', country: 'FR',
      startDate: '2024-05-01', endDate: '2024-05-30', curator: 'Cu', coverImage: '/c.jpg',
      gallery: [{ url: '/g.jpg' }], tags: ['art', 'design'],
      shortDescription: 's', description: 'd',
    };
    cmp.loadExhibition(item);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    expect(cmp.editingExhibitionSlug()).toBe('salon');
    expect(cmp.editingExhibitionId()).toBe('e1');
    expect(cmp.exhibitionForm.getRawValue()['tags']).toEqual(['art', 'design']);
    expect(cmp.exhibitionGallery()).toEqual([{ url: '/g.jpg' }]);
    const v = cmp.exhibitionForm.getRawValue();
    expect(v['title']).toBe('Salon');
  });

  it('loadExhibition() supporte les champs optionnels manquants', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: undefined, slug: 'x', title: 'X' });
    expect(cmp.editingExhibitionId()).toBeNull();
    expect(cmp.exhibitionForm.getRawValue()['tags']).toEqual([]);
    expect(cmp.exhibitionGallery()).toEqual([]);
  });

  it('saveExhibition() ne fait rien quand le form est invalid', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.saveExhibition();
    expect(cmp.saving()).toBe(false);
  });

  it('saveExhibition() PUT quand slug est édité', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial([
      { id: '1', slug: 'salon', title: 'Salon', venue: '', city: '', country: '', startDate: '2024-01-01', endDate: '2024-02-01', curator: '', coverImage: '', gallery: [], tags: [], featured: true, shortDescription: '', description: '' },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: '1', slug: 'salon', title: 'Salon', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    cmp.exhibitionForm.patchValue({ title: 'Salon 2' });
    cmp.saveExhibition();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/exhibitions/salon').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveExhibition() POST error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionForm.patchValue({ title: 'T', startDate: '2024-01-01', endDate: '2024-02-01' });
    cmp.saveExhibition();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/exhibitions').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
    expect(cmp.saving()).toBe(false);
  });

  it('removeExhibition() ne supprime rien si confirm cancel', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(false);
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.removeExhibition({ slug: 'x', title: 'X' });
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(window.confirm).toHaveBeenCalled();
  });

  it('removeExhibition() DELETE + toast success', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.removeExhibition({ slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/exhibitions/salon').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('removeExhibition() reset le form si on supprime l\'item en cours d\'édition', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: '1', slug: 'salon', title: 'Salon', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    expect(cmp.editingExhibitionSlug()).toBe('salon');
    cmp.removeExhibition({ slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/exhibitions/salon').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    expect(cmp.editingExhibitionSlug()).toBeNull();
  });

  it('removeExhibition() DELETE error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.removeExhibition({ slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/exhibitions/salon').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('loadExhibition() peuple currentStories avec la liste retournée (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'exhibition', ownerId: 'e1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
      { id: 'st-2', ownerKind: 'exhibition', ownerId: 'e1', title: 'S2', coverImage: '', slug: 's2', position: 1, createdAt: '' },
    ]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    expect(cmp.currentStories().length).toBe(2);
    expect(cmp.editingStoryId()).toBeNull();
  });

  it('loadExhibition() crée une story par défaut quand liste vide (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon', coverImage: '/c.jpg', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([]);
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/stories').flush({
      id: 'new-st', ownerKind: 'exhibition', ownerId: 'e1', title: 'Salon', coverImage: '/c.jpg', slug: 'salon', position: 0, createdAt: '',
    });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/new-st/slides').flush([]);
    expect(cmp.currentStories().length).toBe(1);
    expect(cmp.editingStoryId()).toBe('new-st');
  });

  it('editStory() définit editingStoryId (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.editStory({ id: 'st-42' });
    expect(cmp.editingStoryId()).toBe('st-42');
  });

  it('newStory() POST et ouvre la nouvelle story (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial([
      { id: 'e1', slug: 'salon', title: 'Salon', venue: '', city: '', country: '', startDate: '2024-01-01', endDate: '2024-02-01', curator: '', coverImage: '/c.jpg', gallery: [], tags: [], featured: false, shortDescription: '', description: '' },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon', coverImage: '/c.jpg', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'exhibition', ownerId: 'e1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
    ]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    spyOn(window, 'prompt').and.returnValue('Ma nouvelle story');
    cmp.newStory();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/stories').flush({
      id: 'st-2', ownerKind: 'exhibition', ownerId: 'e1', title: 'Ma nouvelle story', coverImage: '/c.jpg', slug: 'ma-nouvelle-story', position: 1, createdAt: '',
    });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-2/slides').flush([]);
    expect(cmp.currentStories().length).toBe(2);
    expect(cmp.editingStoryId()).toBe('st-2');
    expect(toast.success).toHaveBeenCalled();
  });

  it('deleteStory() retire la story de la liste (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'exhibition', ownerId: 'e1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
      { id: 'st-2', ownerKind: 'exhibition', ownerId: 'e1', title: 'S2', coverImage: '', slug: 's2', position: 1, createdAt: '' },
    ]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.deleteStory({ id: 'st-1', title: 'S1' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/stories/st-1').flush({});
    expect(cmp.currentStories().length).toBe(1);
    expect(cmp.currentStories()[0].id).toBe('st-2');
  });

  it('charge les tags via getAllTags au constructeur', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush(['bois', 'sculpture']);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    expect(cmp.allTags()).toEqual(['bois', 'sculpture']);
  });

  it('saveExhibition envoie tags dans le payload', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionForm.patchValue({ title: 'T', startDate: '2024-01-01', endDate: '2024-02-01', tags: ['art'] });
    cmp.saveExhibition();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/exhibitions');
    expect(req.request.body['tags']).toEqual(['art']);
    req.flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
  });

  it('newStory() ne fait rien si ownerId est null', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    // editingExhibitionId est null par défaut
    cmp.newStory();
    httpMock.expectNone(r => r.method === 'POST' && r.url === '/api/admin/stories');
  });

  it('newStory() ne fait rien si le prompt est annulé', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial([
      { id: 'e1', slug: 'salon', title: 'Salon', venue: '', city: '', country: '', startDate: '2024-01-01', endDate: '2024-02-01', curator: '', coverImage: '/c.jpg', gallery: [], tags: [], featured: false, shortDescription: '', description: '' },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon', startDate: '2024-01-01', endDate: '2024-02-01' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'exhibition', ownerId: 'e1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
    ]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    spyOn(window, 'prompt').and.returnValue(null);
    cmp.newStory();
    httpMock.expectNone(r => r.method === 'POST' && r.url === '/api/admin/stories');
  });

  it('renameStory() ne fait rien si le prompt est annulé', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    spyOn(window, 'prompt').and.returnValue(null);
    cmp.renameStory({ id: 'st-1', title: 'S1', ownerKind: 'exhibition', ownerId: 'e1', coverImage: '', position: 0 });
    httpMock.expectNone(r => r.method === 'PUT');
  });

  it('renameStory() ne fait rien si le titre est inchangé', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    spyOn(window, 'prompt').and.returnValue('S1');
    cmp.renameStory({ id: 'st-1', title: 'S1', ownerKind: 'exhibition', ownerId: 'e1', coverImage: '', position: 0 });
    httpMock.expectNone(r => r.method === 'PUT');
  });

  it('deleteStory() ne fait rien si confirm est annulé', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    spyOn(window, 'confirm').and.returnValue(false);
    cmp.deleteStory({ id: 'st-1', title: 'S1' });
    httpMock.expectNone(r => r.method === 'DELETE');
  });

  it('deleteStory() remet editingStoryId à null si c\'est la story en cours d\'édition', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.editingStoryId.set('st-1');
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.deleteStory({ id: 'st-1', title: 'S1' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/stories/st-1').flush({});
    expect(cmp.editingStoryId()).toBeNull();
  });

  it('refreshExhibitions() error -> toast error (branche erreur du réseau)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').error(new ProgressEvent('network'));
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    expect(toast.error).toHaveBeenCalled();
  });

  it('onCoverCropChange patche coverCrop dans le form (exposition)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.onCoverCropChange({ x: 10, y: 20, w: 50, h: 40 });
    expect(cmp.exhibitionForm.getRawValue()['coverCrop']).toEqual({ x: 10, y: 20, w: 50, h: 40 });
  });

  it('saveExhibition envoie coverCrop dans le payload POST', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionForm.patchValue({
      title: 'T', startDate: '2024-01-01', endDate: '2024-02-01',
      coverCrop: { x: 10, y: 20, w: 50, h: 40 },
    });
    cmp.saveExhibition();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/exhibitions');
    expect(req.request.body['coverCrop']).toEqual({ x: 10, y: 20, w: 50, h: 40 });
    req.flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
  });

  it('saveCover envoie coverCrop dans le payload PUT story (Task 13)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    // Entrer en édition du cover d'une story existante
    const story = { id: 'st-1', ownerKind: 'exhibition', ownerId: 'e1', title: 'S1', coverImage: '/old.jpg', coverCrop: null, slug: 's1', position: 0, createdAt: '' };
    cmp.openCoverEditor(story);
    cmp.editingStoryCoverCrop.set({ x: 10, y: 10, w: 80, h: 80 });
    cmp.coverEditCtrl.setValue('/new-cover.jpg');
    cmp.saveCover(story);
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url.includes('/api/admin/stories/st-1'));
    expect(req.request.body['coverCrop']).toEqual({ x: 10, y: 10, w: 80, h: 80 });
    expect(req.request.body['coverImage']).toBe('/new-cover.jpg');
    req.flush({ ...story, coverImage: '/new-cover.jpg', coverCrop: { x: 10, y: 10, w: 80, h: 80 } });
  });

  it('openCoverEditor peuple editingStoryCoverCrop depuis story.coverCrop (Task 13)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    const story = { id: 'st-1', ownerKind: 'exhibition', ownerId: 'e1', title: 'S1', coverImage: '/c.jpg', coverCrop: { x: 5, y: 5, w: 90, h: 90 }, slug: 's1', position: 0, createdAt: '' };
    cmp.openCoverEditor(story);
    expect(cmp.editingStoryCoverCrop()).toEqual({ x: 5, y: 5, w: 90, h: 90 });
  });

  it('focusField scroll + focus l\'input field-title', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    // L'input avec id="field-title" est rendu dans le template du composant
    const input = document.getElementById('field-title') as HTMLInputElement;
    expect(input).toBeTruthy();
    spyOn(input, 'scrollIntoView');
    spyOn(input, 'focus');
    cmp.focusField('title');
    expect(input.scrollIntoView).toHaveBeenCalled();
    expect(input.focus).toHaveBeenCalled();
  });

  it('onPreviewGalleryItemEdit remove enleve l\'item du signal', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
    cmp.onPreviewGalleryItemEdit({ index: 0, action: 'remove' });
    expect(cmp.exhibitionGallery()).toEqual([{ url: 'b', crop: null }]);
  });

  it('onPreviewGalleryReorder remet le signal dans le bon ordre', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }, { url: 'c', crop: null }]);
    cmp.onPreviewGalleryReorder([2, 0, 1]);
    expect(cmp.exhibitionGallery().map((i: any) => i.url)).toEqual(['c', 'a', 'b']);
  });

  it('onPreviewGalleryItemResize patche colSpan/rowSpan', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.exhibitionGallery.set([{ url: 'a', crop: null }, { url: 'b', crop: null }]);
    cmp.onPreviewGalleryItemResize({ index: 1, colSpan: 2, rowSpan: 3 });
    expect(cmp.exhibitionGallery()[1]).toEqual({ url: 'b', crop: null, colSpan: 2, rowSpan: 3 } as any);
  });

  it('onPreviewTextFieldEdit patche form value + dirty', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'Nouveau titre' });
    expect(cmp.exhibitionForm.get('title')?.value).toBe('Nouveau titre');
    expect(cmp.exhibitionForm.get('title')?.dirty).toBeTrue();
  });

  it('onPreviewDateFieldEdit patche date dans le form', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.onPreviewDateFieldEdit({ field: 'startDate', value: '2026-03-01' });
    expect(cmp.exhibitionForm.get('startDate')?.value).toBe('2026-03-01');
  });

  it('expoViewMode default form, switche preview', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    expect(cmp.expoViewMode()).toBe('form');
    cmp.expoViewMode.set('preview');
    expect(cmp.expoViewMode()).toBe('preview');
  });

  it('focusField no-op pour champ hors whitelist', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const input = document.createElement('input');
    input.id = 'field-featured';
    document.body.appendChild(input);
    spyOn(input, 'focus');
    cmp.focusField('featured');
    expect(input.focus).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('focusField no-op quand id absent', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(() => cmp.focusField('title')).not.toThrow();
  });

  it('onPreviewTextFieldEdit ignore champ hors whitelist', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    // showStoryLink est dans le form (boolean true par defaut) mais HORS whitelist
    cmp.onPreviewTextFieldEdit({ field: 'showStoryLink', value: 'attack' });
    expect(cmp.exhibitionForm.get('showStoryLink')?.value).toBe(true);  // pas patche
    expect(cmp.exhibitionForm.get('showStoryLink')?.dirty).toBeFalse();
  });

  it('onPreviewDateFieldEdit ignore champ autre que start/endDate', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(() => cmp.onPreviewDateFieldEdit({ field: 'foo', value: '2026-01-01' })).not.toThrow();
  });

  it('onPreviewGalleryAdd ouvre picker via galleryEditor', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openPicker: jasmine.createSpy('openPicker') };
    cmp.galleryEditor = stub;
    cmp.onPreviewGalleryAdd();
    expect(stub.openPicker).toHaveBeenCalled();
  });

  it('onPreviewCoverEdit crop appelle coverField.openCrop', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCrop: jasmine.createSpy('openCrop'), openPicker: jasmine.createSpy('openPicker') };
    cmp.coverImageField = stub;
    cmp.onPreviewCoverEdit('crop');
    expect(stub.openCrop).toHaveBeenCalled();
  });

  it('onPreviewCoverEdit replace appelle coverField.openPicker', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCrop: jasmine.createSpy('openCrop'), openPicker: jasmine.createSpy('openPicker') };
    cmp.coverImageField = stub;
    cmp.onPreviewCoverEdit('replace');
    expect(stub.openPicker).toHaveBeenCalled();
  });

  it('onPreviewGalleryItemEdit crop appelle galleryEditor.openCropFor', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCropFor: jasmine.createSpy('openCropFor'), openReplaceFor: jasmine.createSpy('openReplaceFor') };
    cmp.galleryEditor = stub;
    cmp.onPreviewGalleryItemEdit({ index: 2, action: 'crop' });
    expect(stub.openCropFor).toHaveBeenCalledWith(2);
  });

  it('onPreviewGalleryItemEdit replace appelle galleryEditor.openReplaceFor', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const stub = { openCropFor: jasmine.createSpy('openCropFor'), openReplaceFor: jasmine.createSpy('openReplaceFor') };
    cmp.galleryEditor = stub;
    cmp.onPreviewGalleryItemEdit({ index: 0, action: 'replace' });
    expect(stub.openReplaceFor).toHaveBeenCalledWith(0);
  });

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
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
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

  it('ouvrir le crop depuis le preview suspend inert sur le panel form (regression 7075927)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.newExhibition();
    cmp.expoViewMode.set('preview');
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

  it('onCoverCropChange sans changement réel : aucune entrée d\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onCoverCropChange(null);   // coverCrop déjà null à l'init
    expect(cmp.history.canUndo()).toBeFalse();
  });

  it('loadExhibition vide l\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: 'X' });
    expect(cmp.history.canUndo()).toBeTrue();
    cmp.loadExhibition({ id: 'e1', slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/st-1/slides').flush([]);
    expect(cmp.history.canUndo()).toBeFalse();
  });

  it('édition inline sans modification : aucune entrée d\'historique', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTextFieldEdit({ field: 'title', value: '' });
    expect(cmp.history.canUndo()).toBeFalse();
    expect(cmp.exhibitionForm.dirty).toBeFalse();
  });

  it('onPreviewTagsChange patche les tags, marque dirty et enregistre un snapshot undo', () => {
    const { cmp } = setupHistoryFixture();
    cmp.onPreviewTagsChange(['design', 'moderne']);
    expect(cmp.exhibitionForm.getRawValue().tags).toEqual(['design', 'moderne']);
    expect(cmp.exhibitionForm.dirty).toBeTrue();
    cmp.history.undo();
    expect(cmp.exhibitionForm.getRawValue().tags).toEqual([]);
  });

  it('onPreviewStorySelect change activeStoryId et recharge les slides actifs', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.currentStories.set([{ id: 'a', ownerKind: 'exhibition', ownerId: 'e1', title: 'A', coverImage: '', coverCrop: null, slug: 'a', position: 0, createdAt: '' }]);
    cmp.onPreviewStorySelect('a');
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/a/slides').flush([]);
    expect(cmp.activeStoryId()).toBe('a');
  });

  it('onPreviewStorySlidesEdit ouvre la modale slides', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.onPreviewStorySlidesEdit('a');
    expect(cmp.previewSlidesStoryId()).toBe('a');
  });

  it('onPreviewStoryRename appelle updateStory', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.currentStories.set([{ id: 'a', ownerKind: 'exhibition', ownerId: 'e1', title: 'A', coverImage: 'c.jpg', coverCrop: null, slug: 'a', position: 0, createdAt: '' }]);
    cmp.onPreviewStoryRename({ id: 'a', title: 'Nouveau' });
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/stories/a').flush({ id: 'a', ownerKind: 'exhibition', ownerId: 'e1', title: 'Nouveau', coverImage: 'c.jpg', coverCrop: null, slug: 'a', position: 0, createdAt: '' });
  });

  it('ne rend plus les cases showStoryLink/showStoryButton (obsolètes)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="showStoryLink"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="showStoryButton"]')).toBeNull();
  });

  it('créer une story la rend active dans le preview', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial([
      { id: 'e1', slug: 'salon', title: 'Salon', venue: '', city: '', country: '', startDate: '2024-01-01', endDate: '2024-02-01', curator: '', coverImage: '/c.jpg', gallery: [], tags: [], featured: false, shortDescription: '', description: '' },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.currentStories.set([{ id: 'old', ownerKind: 'exhibition', ownerId: 'e1', title: 'Ancienne', coverImage: '', coverCrop: null, slug: 'old', position: 0, createdAt: '' }]);
    cmp.editingExhibitionId.set('e1');
    cmp.editingExhibitionSlug.set('salon');
    cmp.activeStoryId.set('old');
    spyOn(window, 'prompt').and.returnValue('Nouvelle');
    cmp.onPreviewStoryCreate();
    const created = { id: 'new', ownerKind: 'exhibition', ownerId: 'e1', title: 'Nouvelle', coverImage: '', coverCrop: null, slug: 'new', position: 1, createdAt: '' };
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/stories').flush(created);
    expect(cmp.activeStoryId()).toBe('new');
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/new/slides').flush([]);
  });

  it('onPreviewViewerOpen remplit la file et onStoryViewerClosed la vide', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const fakeQueue = [{ title: 'T', subtitle: 'S', slides: [] }];
    cmp.onPreviewViewerOpen(fakeQueue);
    expect(cmp.storyViewerQueue().length).toBe(1);
    cmp.onStoryViewerClosed();
    expect(cmp.storyViewerQueue().length).toBe(0);
  });

  it('storyViewerQueue non vide rend app-story-viewer dans le DOM', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(fixture.nativeElement.querySelector('app-story-viewer')).toBeNull();
    cmp.onPreviewViewerOpen([{ title: 'T', subtitle: 'S', slides: [] }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-viewer')).toBeTruthy();
  });

});

