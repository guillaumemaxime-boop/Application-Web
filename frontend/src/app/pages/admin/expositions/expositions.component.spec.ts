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
  exhibitionGallery: { (): string[]; set: (v: string[]) => void };
  exhibitionTags: () => string[];
  newExhibitionTag: { (): string; set: (v: string) => void };
  exhibitionsMeta: { (): unknown[] | null; set: (v: unknown[]) => void };
  saving: () => boolean;
  loadExhibition: (item: unknown) => void;
  newExhibition: () => void;
  saveExhibition: () => void;
  removeExhibition: (item: unknown) => void;
  addExhibitionTag: (e: Event) => void;
  removeExhibitionTag: (tag: string) => void;
  onTagBackspace: (e: Event) => void;
  onExhibitionMetaReorder: (order: number[]) => void;
  toggleExhibitionVisibility: (row: unknown, event: Event) => void;
  persistExhibitionsMeta: () => void;
  moveExhibitionUp: (i: number) => void;
  moveExhibitionDown: (i: number) => void;
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

  function flushInitial(items: unknown[] = [], metas: unknown[] = []) {
    // shareReplay(1) -> un seul GET /api/exhibitions
    httpMock.expectOne('/api/exhibitions').flush(items);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush(metas);
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
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('ajoute et retire un tag', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.newExhibitionTag.set('moderne');
    const fakeEvent = { preventDefault: () => {} } as Event;
    cmp.addExhibitionTag(fakeEvent);
    expect(cmp.exhibitionTags()).toEqual(['moderne']);
    cmp.removeExhibitionTag('moderne');
    expect(cmp.exhibitionTags()).toEqual([]);
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
      gallery: ['/g.jpg'], tags: ['art', 'design'],
      shortDescription: 's', description: 'd',
    };
    cmp.loadExhibition(item);
    expect(cmp.editingExhibitionSlug()).toBe('salon');
    expect(cmp.editingExhibitionId()).toBe('e1');
    expect(cmp.exhibitionTags()).toEqual(['art', 'design']);
    expect(cmp.exhibitionGallery()).toEqual(['/g.jpg']);
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
    expect(cmp.exhibitionTags()).toEqual([]);
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
    cmp.exhibitionForm.patchValue({ title: 'Salon 2' });
    cmp.saveExhibition();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/exhibitions/salon').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
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
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
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
    expect(cmp.editingExhibitionSlug()).toBe('salon');
    cmp.removeExhibition({ slug: 'salon', title: 'Salon' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/exhibitions/salon').flush({});
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
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

  it('addExhibitionTag() ignore valeur vide', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.newExhibitionTag.set('   ');
    cmp.addExhibitionTag({ preventDefault: () => {} } as Event);
    expect(cmp.exhibitionTags()).toEqual([]);
  });

  it('addExhibitionTag() ignore doublons', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.newExhibitionTag.set('art');
    cmp.addExhibitionTag({ preventDefault: () => {} } as Event);
    cmp.newExhibitionTag.set('art');
    cmp.addExhibitionTag({ preventDefault: () => {} } as Event);
    expect(cmp.exhibitionTags()).toEqual(['art']);
    expect(cmp.newExhibitionTag()).toBe('');
  });

  it('onTagBackspace() ne fait rien si input non vide', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.newExhibitionTag.set('art');
    cmp.addExhibitionTag({ preventDefault: () => {} } as Event);
    cmp.newExhibitionTag.set('design'); // input non vide
    let prevented = false;
    cmp.onTagBackspace({ preventDefault: () => { prevented = true; } } as Event);
    expect(prevented).toBe(false);
    expect(cmp.exhibitionTags()).toEqual(['art']);
  });

  it('onTagBackspace() retire dernier tag si input vide', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.newExhibitionTag.set('art');
    cmp.addExhibitionTag({ preventDefault: () => {} } as Event);
    cmp.newExhibitionTag.set('design');
    cmp.addExhibitionTag({ preventDefault: () => {} } as Event);
    expect(cmp.exhibitionTags()).toEqual(['art', 'design']);
    cmp.newExhibitionTag.set('');
    cmp.onTagBackspace({ preventDefault: () => {} } as Event);
    expect(cmp.exhibitionTags()).toEqual(['art']);
  });

  it('onExhibitionMetaReorder() met à jour positions et persiste', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial(
      [
        { id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' },
        { id: '2', slug: 'b', title: 'B', coverImage: '/b.jpg' },
      ],
      [
        { slug: 'a', position: 0, visible: true },
        { slug: 'b', position: 1, visible: true },
      ],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.onExhibitionMetaReorder([1, 0]);
    const rows = cmp.exhibitionsMeta() as Array<{ slug: string; position: number }>;
    expect(rows[0].slug).toBe('b');
    expect(rows[0].position).toBe(0);
    expect(rows[1].position).toBe(1);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/b').flush({});
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/a').flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('onExhibitionMetaReorder() ne fait rien quand meta est null', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    // Ne pas flush -> garder l'état null sur exhibitionsMeta
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.onExhibitionMetaReorder([0]);
    expect(cmp.exhibitionsMeta()).toBeNull();
    // Cleanup HTTP
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
  });

  it('moveExhibitionUp() echange avec la precedente (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial(
      [
        { id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' },
        { id: '2', slug: 'b', title: 'B', coverImage: '/b.jpg' },
      ],
      [
        { slug: 'a', position: 0, visible: true },
        { slug: 'b', position: 1, visible: true },
      ],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.moveExhibitionUp(1);
    const rows = cmp.exhibitionsMeta() as Array<{ slug: string }>;
    expect(rows[0].slug).toBe('b');
    expect(rows[1].slug).toBe('a');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/b').flush({});
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/a').flush({});
  });

  it('moveExhibitionUp(0) ne fait rien (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial(
      [{ id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' }],
      [{ slug: 'a', position: 0, visible: true }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.moveExhibitionUp(0);
    // pas de PUT
  });

  it('moveExhibitionUp() ne fait rien quand meta null (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.moveExhibitionUp(1);
    expect(cmp.exhibitionsMeta()).toBeNull();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
  });

  it('moveExhibitionDown() echange avec la suivante (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial(
      [
        { id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' },
        { id: '2', slug: 'b', title: 'B', coverImage: '/b.jpg' },
      ],
      [
        { slug: 'a', position: 0, visible: true },
        { slug: 'b', position: 1, visible: true },
      ],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.moveExhibitionDown(0);
    const rows = cmp.exhibitionsMeta() as Array<{ slug: string }>;
    expect(rows[0].slug).toBe('b');
    expect(rows[1].slug).toBe('a');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/b').flush({});
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/a').flush({});
  });

  it('moveExhibitionDown(last) ne fait rien (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial(
      [{ id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' }],
      [{ slug: 'a', position: 0, visible: true }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.moveExhibitionDown(0);
    // pas de PUT
  });

  it('moveExhibitionDown() ne fait rien quand meta null (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.moveExhibitionDown(0);
    expect(cmp.exhibitionsMeta()).toBeNull();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
  });

  it('toggleExhibitionVisibility() change visible et persiste', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial(
      [{ id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' }],
      [{ slug: 'a', position: 0, visible: true }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    const row = { slug: 'a', title: 'A', cover: '/a.jpg', position: 0, visible: true };
    cmp.toggleExhibitionVisibility(row, { target: { checked: false } } as unknown as Event);
    const rows = cmp.exhibitionsMeta() as Array<{ visible: boolean }>;
    expect(rows[0].visible).toBe(false);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/a').flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('persistExhibitionsMeta() ne fait rien quand rows vide', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    cmp.persistExhibitionsMeta();
    // verify() à la fin garantit aucun appel HTTP supplémentaire
    expect(cmp.exhibitionsMeta()).toEqual([]);
  });

  it('persistExhibitionsMeta() error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial(
      [{ id: '1', slug: 'a', title: 'A', coverImage: '/a.jpg' }],
      [{ slug: 'a', position: 0, visible: true }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as ExpoInternals;
    const row = { slug: 'a', title: 'A', cover: '/a.jpg', position: 0, visible: true };
    cmp.toggleExhibitionVisibility(row, { target: { checked: false } } as unknown as Event);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/exhibitions-meta/a').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });

});
