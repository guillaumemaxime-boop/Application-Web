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
  };
  exhibitions: () => unknown[];
  loadingExhibitions: () => boolean;
  editingExhibitionSlug: () => string | null;
  editingExhibitionId: () => string | null;
  exhibitionGallery: { (): Array<{ url: string; crop?: unknown }>; set: (v: Array<{ url: string; crop?: unknown }>) => void };
  allTags: () => string[];
  currentStories: { (): Array<{ id: string; title: string; position: number; ownerId: string; ownerKind: string; coverImage: string }>; set: (v: unknown[]) => void };
  editingStoryId: { (): string | null; set: (v: string | null) => void };
  editingStoryCoverCrop: { (): { x: number; y: number; w: number; h: number } | null; set: (v: { x: number; y: number; w: number; h: number } | null) => void };
  coverEditCtrl: { value: string | null; setValue: (v: string) => void };
  saving: () => boolean;
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
    spyOn(window, 'prompt').and.returnValue('Ma nouvelle story');
    cmp.newStory();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/stories').flush({
      id: 'st-2', ownerKind: 'exhibition', ownerId: 'e1', title: 'Ma nouvelle story', coverImage: '/c.jpg', slug: 'ma-nouvelle-story', position: 1, createdAt: '',
    });
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

});
