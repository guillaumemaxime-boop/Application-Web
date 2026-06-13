import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { AccueilComponent } from './accueil.component';
import { ToastService } from '../shared/toast.service';

type HomeItem = { kind: 'furniture' | 'exhibition'; slug: string; title: string; cover: string; included: boolean };

type AccueilInternals = {
  homeItems: { (): HomeItem[] | null; set: (v: HomeItem[]) => void };
  accueilViewMode: { (): 'form' | 'preview'; set: (v: 'form' | 'preview') => void };
  homeData: { (): any; set: (v: any) => void };
  content: { (): any; set: (v: any) => void };
  sliders: { (): any[]; set: (v: any[]) => void };
  adminSliders: { (): any[]; set: (v: any[]) => void };
  disabledSliders: () => { id: string; title: string }[];
  editingSliderId: { (): string | null; set: (v: string | null) => void };
  allStories: { (): any[]; set: (v: any[]) => void };
  includedSlugs: () => Set<string>;
  toggleIncluded: (item: HomeItem, event: Event) => void;
  onFeedReorder: (order: number[]) => void;
  saveFeed: () => import('rxjs').Observable<unknown>;
  persistFeed: () => void;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  onPreviewTextFieldEdit: (e: { key: string; value: string }) => void;
  onSliderCreate: (zone: 'home-top' | 'home-middle' | 'home-bottom') => void;
  onSliderDelete: (id: string) => void;
  onSliderTitleEdit: (e: { id: string; title: string }) => void;
  onSliderZoneChange: (e: { id: string; zoneKey: 'home-top' | 'home-middle' | 'home-bottom' | null }) => void;
  onSliderAssign: (e: { id: string; zoneKey: 'home-top' | 'home-middle' | 'home-bottom' }) => void;
  onSliderCompositionRequested: (id: string) => void;
  onSliderCompositionSave: (storyIds: string[]) => void;
  onPreviewFeedReorder: (order: number[]) => void;
  onPreviewFeedItemToggleInclude: (e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }) => void;
  cropEditOpen: { (): boolean; set: (v: boolean) => void };
  cropEditItem: { (): any; set: (v: any) => void };
  onPreviewFeedItemCropEdit: (e: { kind: 'furniture' | 'exhibition'; slug: string }) => void;
  onCropEditSave: (crop: any) => void;
  onCropEditCancel: () => void;
};

/** Flush les requêtes émises par SlidersComponent.ngOnInit() ET AccueilComponent.constructor() (getAdminSliders). */
function flushSliders(httpMock: HttpTestingController): void {
  // Deux GET /api/admin/sliders : un depuis AccueilComponent.getAdminSliders(), un depuis SlidersComponent.ngOnInit()
  const adminSliderReqs = httpMock.match('/api/admin/sliders');
  adminSliderReqs.forEach(r => r.flush([]));
  httpMock.expectOne('/api/admin/stories/all').flush([]);
}

/** Flush les trois requêtes de preview (home, content, sliders publics). */
function flushPreview(httpMock: HttpTestingController): void {
  httpMock.expectOne('/api/home').flush({ categories: [], exhibitions: [], feed: [] });
  httpMock.expectOne('/api/content').flush({});
  httpMock.expectOne('/api/sliders').flush([]);
}

describe('AccueilComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccueilComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge mobilier, expositions et feed', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([{ id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false }]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.home-row')).length).toBe(1);
  });

  it('rend le composant app-admin-sliders', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-admin-sliders'))).toBeTruthy();
  });

  it('toggleIncluded() persiste le feed et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([{ id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false }]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    const items = cmp.homeItems()!;
    cmp.toggleIncluded(items[0], { target: { checked: true } } as unknown as Event);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('construit le feed avec items inclus et exclus mélangés', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'fur-incl', title: 'FInc', category: '', year: 2024, coverImage: '/fi.jpg', dimensions: [], gallery: [], featured: false },
      { id: '2', slug: 'fur-excl', title: 'FExc', category: '', year: 2024, coverImage: '/fe.jpg', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([
      { id: 'e1', slug: 'exh-incl', title: 'EInc', coverImage: '/ei.jpg' },
      { id: 'e2', slug: 'exh-excl', title: 'EExc', coverImage: '/ee.jpg' },
    ]);
    httpMock.expectOne('/api/admin/home/feed').flush([
      { kind: 'furniture', slug: 'fur-incl' },
      { kind: 'exhibition', slug: 'exh-incl' },
    ]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    const items = cmp.homeItems()!;
    // 2 inclus (en tête) + 2 exclus
    expect(items.length).toBe(4);
    expect(items[0]).toEqual(jasmine.objectContaining({ slug: 'fur-incl', kind: 'furniture', included: true }));
    expect(items[1]).toEqual(jasmine.objectContaining({ slug: 'exh-incl', kind: 'exhibition', included: true }));
    expect(items.filter(i => !i.included).map(i => i.slug).sort()).toEqual(['exh-excl', 'fur-excl']);
  });

  it('onFeedReorder() réordonne et persiste', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
      { id: '2', slug: 'b', title: 'B', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([
      { kind: 'furniture', slug: 'a' },
      { kind: 'furniture', slug: 'b' },
    ]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.onFeedReorder([1, 0]);
    const items = cmp.homeItems()!;
    expect(items[0].slug).toBe('b');
    expect(items[1].slug).toBe('a');
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed');
    expect(put.request.body).toEqual([{ kind: 'furniture', slug: 'b' }, { kind: 'furniture', slug: 'a' }]);
    put.flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('onFeedReorder() ne fait rien si homeItems null', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    // Ne pas flush -> homeItems reste null
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.onFeedReorder([0]);
    expect(cmp.homeItems()).toBeNull();
    // Cleanup
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
  });

  it('persistFeed() filtre les items non inclus', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
      { id: '2', slug: 'b', title: 'B', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([
      { kind: 'furniture', slug: 'a' }, // a inclus, b exclus
    ]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.persistFeed();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed');
    expect(put.request.body).toEqual([{ kind: 'furniture', slug: 'a' }]);
    put.flush([]);
  });

  it('moveUp() echange avec le precedent et persiste (A-04)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
      { id: '2', slug: 'b', title: 'B', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([
      { kind: 'furniture', slug: 'a' },
      { kind: 'furniture', slug: 'b' },
    ]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.moveUp(1);
    const items = cmp.homeItems()!;
    expect(items[0].slug).toBe('b');
    expect(items[1].slug).toBe('a');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').flush([]);
  });

  it('moveUp(0) ne fait rien (A-04)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.moveUp(0);
    // Aucun PUT attendu
  });

  it('moveUp() ne fait rien quand homeItems est null (A-04)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.moveUp(1);
    expect(cmp.homeItems()).toBeNull();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
  });

  it('moveDown() echange avec le suivant et persiste (A-04)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
      { id: '2', slug: 'b', title: 'B', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([
      { kind: 'furniture', slug: 'a' },
      { kind: 'furniture', slug: 'b' },
    ]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.moveDown(0);
    const items = cmp.homeItems()!;
    expect(items[0].slug).toBe('b');
    expect(items[1].slug).toBe('a');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').flush([]);
  });

  it('moveDown(last) ne fait rien (A-04)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.moveDown(0); // dernier index, on ne bouge pas
  });

  it('moveDown() ne fait rien quand homeItems est null (A-04)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.moveDown(0);
    expect(cmp.homeItems()).toBeNull();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
  });

  it('persistFeed() error -> toast error', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([{ kind: 'furniture', slug: 'a' }]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.persistFeed();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });

  // ---- Tests Task 6 : toggle + handlers preview ----

  it('accueilViewMode default form, switche preview', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    expect(cmp.accueilViewMode()).toBe('form');
    cmp.accueilViewMode.set('preview');
    expect(cmp.accueilViewMode()).toBe('preview');
  });

  it('includedSlugs reflete les items inclus', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.homeItems.set([
      { kind: 'furniture', slug: 'a', title: 'A', cover: '', included: true },
      { kind: 'exhibition', slug: 'b', title: 'B', cover: '', included: false },
    ]);
    expect(cmp.includedSlugs().has('furniture:a')).toBeTrue();
    expect(cmp.includedSlugs().has('exhibition:b')).toBeFalse();
  });

  it('onPreviewTextFieldEdit appelle updateContent avec map mergee', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.content.set({ 'home.hero.eyebrow': 'Ancien' });
    cmp.onPreviewTextFieldEdit({ key: 'home.hero.title', value: 'Nouveau titre' });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content');
    expect(req.request.body).toEqual({ 'home.hero.eyebrow': 'Ancien', 'home.hero.title': 'Nouveau titre' });
    req.flush({ 'home.hero.eyebrow': 'Ancien', 'home.hero.title': 'Nouveau titre' });
    expect(cmp.content()['home.hero.title']).toBe('Nouveau titre');
    expect(toast.success).toHaveBeenCalled();
  });

  it('onPreviewTextFieldEdit ignore les cles hors whitelist', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.onPreviewTextFieldEdit({ key: 'home.hero.evil', value: 'x' });
    // Aucune requête PUT attendue
    httpMock.expectNone(r => r.method === 'PUT' && r.url === '/api/admin/content');
  });

  it('onPreviewTextFieldEdit error -> toast error', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.onPreviewTextFieldEdit({ key: 'home.hero.lead', value: 'test' });
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('onSliderTitleEdit met à jour le slider via updateSlider et rafraîchit', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'Vieux', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderTitleEdit({ id: 'sl1', title: 'Neuf' });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl1');
    expect(req.request.body).toEqual({ title: 'Neuf', zoneKey: 'home-top' });
    req.flush({ id: 'sl1', slug: 'a', title: 'Neuf', zoneKey: 'home-top', storyIds: [] });
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });

  it('onSliderZoneChange refuse une zone déjà occupée (toast erreur, pas d\'appel)', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    cmp.sliders.set([
      { id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] },
      { id: 'sl2', slug: 'b', title: 'B', zoneKey: 'home-bottom', stories: [] },
    ]);
    cmp.onSliderZoneChange({ id: 'sl1', zoneKey: 'home-bottom' });
    expect(toast.error).toHaveBeenCalled();
    httpMock.expectNone(r => r.url.startsWith('/api/admin/sliders/'));
  });

  it('onSliderZoneChange vers une zone libre appelle updateSlider', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderZoneChange({ id: 'sl1', zoneKey: 'home-bottom' });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl1');
    expect(req.request.body).toEqual({ title: 'A', zoneKey: 'home-bottom' });
    req.flush({ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-bottom', storyIds: [] });
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });

  it('onSliderDelete confirmé appelle deleteSlider', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderDelete('sl1');
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/sliders/sl1').flush(null);
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });

  it('onSliderDelete refusé ne fait rien', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    spyOn(window, 'confirm').and.returnValue(false);
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderDelete('sl1');
    httpMock.expectNone(r => r.url === '/api/admin/sliders/sl1');
  });

  it('onSliderCreate avec titre crée le slider', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    spyOn(window, 'prompt').and.returnValue('Nouveau');
    cmp.onSliderCreate('home-middle');
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/sliders');
    expect(req.request.body).toEqual({ title: 'Nouveau', zoneKey: 'home-middle' });
    req.flush({ id: 'sl9', slug: 'n', title: 'Nouveau', zoneKey: 'home-middle', storyIds: [] });
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });

  it('onSliderCreate sans titre (prompt annulé) ne fait rien', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    spyOn(window, 'prompt').and.returnValue(null);
    cmp.onSliderCreate('home-middle');
    httpMock.expectNone(r => r.method === 'POST' && r.url === '/api/admin/sliders');
  });

  it('composition : requested charge les stories et ouvre l\'éditeur ; save appelle replaceSliderStories', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [{ id: 'st1' }] }]);
    cmp.onSliderCompositionRequested('sl1');
    httpMock.expectOne('/api/admin/stories/all').flush([{ id: 'st1', title: 'S1' }, { id: 'st2', title: 'S2' }]);
    expect(cmp.editingSliderId()).toBe('sl1');
    cmp.onSliderCompositionSave(['st1', 'st2']);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl1/stories').flush({ id: 'sl1', storyIds: ['st1', 'st2'] });
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
    expect(cmp.editingSliderId()).toBeNull();
  });

  it('Échap ferme la modale de composition ouverte depuis le preview', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.editingSliderId.set('sl1');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(cmp.editingSliderId()).toBeNull();
  });

  // ---- Tests Task 6bis.3 : crop card feed ----

  function setupWithFeed(httpMock: HttpTestingController): { fixture: any; cmp: AccueilInternals } {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    httpMock.expectOne('/api/home').flush({
      categories: [],
      exhibitions: [],
      feed: [{ kind: 'furniture', slug: 'table', title: 'Table', cover: '/t.jpg', coverCrop: null, subtitle: '' }],
    });
    httpMock.expectOne('/api/content').flush({});
    httpMock.expectOne('/api/sliders').flush([]);
    flushSliders(httpMock);
    fixture.detectChanges();
    return { fixture, cmp: fixture.componentInstance as unknown as AccueilInternals };
  }

  it('onPreviewFeedItemCropEdit set cropEditItem et ouvre modale', () => {
    const { cmp } = setupWithFeed(httpMock);
    expect(cmp.cropEditOpen()).toBeFalse();
    cmp.onPreviewFeedItemCropEdit({ kind: 'furniture', slug: 'table' });
    expect(cmp.cropEditOpen()).toBeTrue();
    const ctx = cmp.cropEditItem();
    expect(ctx).toBeTruthy();
    expect(ctx.slug).toBe('table');
    expect(ctx.kind).toBe('furniture');
    expect(ctx.imageUrl).toBe('/t.jpg');
    expect(ctx.initialCrop).toBeNull();
  });

  it('onCropEditSave appelle updateHomeFeedCoverCrop + refresh homeData', () => {
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    const { cmp } = setupWithFeed(httpMock);
    cmp.cropEditItem.set({ kind: 'furniture', slug: 'table', imageUrl: '/t.jpg', initialCrop: null });
    cmp.cropEditOpen.set(true);
    cmp.onCropEditSave({ x: 0.1, y: 0.2, w: 0.5, h: 0.6 });
    const putReq = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed/cover-crop');
    expect(putReq.request.body).toEqual({ kind: 'furniture', slug: 'table', crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 } });
    putReq.flush(null);
    // Après le flush du PUT, un GET /api/home est attendu pour le refresh
    httpMock.expectOne('/api/home').flush({ categories: [], exhibitions: [], feed: [] });
    expect(cmp.cropEditOpen()).toBeFalse();
    expect(cmp.cropEditItem()).toBeNull();
    expect(toast.success).toHaveBeenCalled();
  });

  it('onCropEditCancel ferme modale sans appeler API', () => {
    const { cmp } = setupWithFeed(httpMock);
    cmp.cropEditOpen.set(true);
    cmp.cropEditItem.set({ kind: 'furniture', slug: 'table', imageUrl: '/t.jpg', initialCrop: null });
    cmp.onCropEditCancel();
    expect(cmp.cropEditOpen()).toBeFalse();
    expect(cmp.cropEditItem()).toBeNull();
    httpMock.expectNone(r => r.method === 'PUT' && r.url === '/api/admin/home/feed/cover-crop');
  });

  it('onPreviewFeedItemCropEdit ignore si item absent du feed', () => {
    const { cmp } = setupWithFeed(httpMock);
    cmp.onPreviewFeedItemCropEdit({ kind: 'furniture', slug: 'absent' });
    expect(cmp.cropEditOpen()).toBeFalse();
    expect(cmp.cropEditItem()).toBeNull();
  });

  it('onSliderZoneChange vers Désactivé (null) appelle updateSlider avec zoneKey null sans garde d\'occupation', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'A', zoneKey: 'home-top', stories: [] }]);
    cmp.onSliderZoneChange({ id: 'sl1', zoneKey: null });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl1');
    expect(req.request.body).toEqual({ title: 'A', zoneKey: null });
    req.flush({ id: 'sl1', slug: 'a', title: 'A', zoneKey: null, storyIds: [] });
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });

  it('onPreviewFeedReorder ne supprime pas les items exclus du homeItems', () => {
    const { cmp } = setupWithFeed(httpMock);
    cmp.homeItems.set([
      { kind: 'furniture', slug: 'A', title: 'A', cover: '', included: true },
      { kind: 'furniture', slug: 'B', title: 'B', cover: '', included: true },
      { kind: 'furniture', slug: 'C', title: 'C', cover: '', included: true },
      { kind: 'furniture', slug: 'D', title: 'D', cover: '', included: false },
      { kind: 'exhibition', slug: 'E', title: 'E', cover: '', included: false },
    ]);
    // Drag : preview reordre les inclus [A,B,C] en [B,A,C] -> order=[1,0,2]
    cmp.onPreviewFeedReorder([1, 0, 2]);
    const items = cmp.homeItems();
    expect(items?.length).toBe(5);
    expect(items?.[0].slug).toBe('B');
    expect(items?.[1].slug).toBe('A');
    expect(items?.[2].slug).toBe('C');
    expect(items?.[3].slug).toBe('D');
    expect(items?.[4].slug).toBe('E');
    // Flush requests pour eviter les leaks
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed');
    put.flush([{ kind: 'furniture', slug: 'B' }, { kind: 'furniture', slug: 'A' }, { kind: 'furniture', slug: 'C' }]);
    const get = httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/home');
    get.flush({ hero: {}, feed: [], sliders: [] });
  });

  // --- Tests TDD: adminSliders, disabledSliders, onSliderAssign ---

  it('disabledSliders() ne retourne que les sliders avec zoneKey === null', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.adminSliders.set([
      { id: 'sl1', slug: 'a', title: 'Actif', zoneKey: 'home-top', storyIds: [] },
      { id: 'sl9', slug: 'b', title: 'Désactivé', zoneKey: null, storyIds: [] },
    ]);
    const disabled = cmp.disabledSliders();
    expect(disabled.length).toBe(1);
    expect(disabled[0]).toEqual({ id: 'sl9', title: 'Désactivé' });
  });

  it('onSliderAssign appelle updateSlider avec le bon titre tiré de adminSliders, puis refresh les deux listes', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.sliders.set([]);
    cmp.adminSliders.set([{ id: 'sl9', slug: 'b', title: 'Désactivé', zoneKey: null, storyIds: [] }]);
    cmp.onSliderAssign({ id: 'sl9', zoneKey: 'home-top' });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/sliders/sl9');
    expect(req.request.body).toEqual({ title: 'Désactivé', zoneKey: 'home-top' });
    req.flush({ id: 'sl9', slug: 'b', title: 'Désactivé', zoneKey: 'home-top', storyIds: [] });
    // refreshSliders doit appeler les DEUX : public + admin
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });

  it('onSliderAssign refuse si la zone cible est déjà occupée dans sliders() — toast erreur, pas d\'appel', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.sliders.set([{ id: 'sl1', slug: 'a', title: 'Actif', zoneKey: 'home-top', stories: [] }]);
    cmp.adminSliders.set([{ id: 'sl9', slug: 'b', title: 'Désactivé', zoneKey: null, storyIds: [] }]);
    cmp.onSliderAssign({ id: 'sl9', zoneKey: 'home-top' });
    expect(toast.error).toHaveBeenCalled();
    httpMock.expectNone(r => r.url.startsWith('/api/admin/sliders/sl9'));
  });

  it('onSliderAssign ignore si l\'id n\'existe pas dans adminSliders()', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.adminSliders.set([]);
    cmp.onSliderAssign({ id: 'inexistant', zoneKey: 'home-top' });
    httpMock.expectNone(r => r.url.startsWith('/api/admin/sliders/'));
  });

  it('refreshSliders appelle getPublicSliders ET getAdminSliders', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    // Déclenche refreshSliders via onSliderCreate (qui appelle refreshSliders en succès)
    spyOn(window, 'prompt').and.returnValue('Nouveau slider');
    cmp.onSliderCreate('home-bottom');
    const postReq = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/sliders');
    postReq.flush({ id: 'sl99', slug: 'x', title: 'Nouveau slider', zoneKey: 'home-bottom', storyIds: [] });
    // refreshSliders doit appeler les deux
    httpMock.expectOne('/api/sliders').flush([]);
    httpMock.expectOne('/api/admin/sliders').flush([]);
  });
});
