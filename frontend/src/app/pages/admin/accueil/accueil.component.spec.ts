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
  previewFullscreen: { (): boolean; set: (v: boolean) => void; update: (fn: (v: boolean) => boolean) => void };
  homeData: { (): any; set: (v: any) => void };
  content: { (): any; set: (v: any) => void };
  sliders: { (): any[]; set: (v: any[]) => void };
  includedSlugs: () => Set<string>;
  toggleIncluded: (item: HomeItem, event: Event) => void;
  onFeedReorder: (order: number[]) => void;
  saveFeed: () => import('rxjs').Observable<unknown>;
  persistFeed: () => void;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  togglePreviewFullscreen: () => void;
  previewFullscreenLabel: () => string;
  onPreviewTextFieldEdit: (e: { key: string; value: string }) => void;
  onSliderEditRequested: (zone: 'home-top' | 'home-middle' | 'home-bottom') => void;
  onPreviewFeedReorder: (order: number[]) => void;
  onPreviewFeedItemToggleInclude: (e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }) => void;
  cropEditOpen: { (): boolean; set: (v: boolean) => void };
  cropEditItem: { (): any; set: (v: any) => void };
  onPreviewFeedItemCropEdit: (e: { kind: 'furniture' | 'exhibition'; slug: string }) => void;
  onCropEditSave: (crop: any) => void;
  onCropEditCancel: () => void;
};

/** Flush les deux requêtes émises par SlidersComponent.ngOnInit(). */
function flushSliders(httpMock: HttpTestingController): void {
  httpMock.expectOne('/api/admin/sliders').flush([]);
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

  it('togglePreviewFullscreen bascule', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    expect(cmp.previewFullscreen()).toBeFalse();
    cmp.togglePreviewFullscreen();
    expect(cmp.previewFullscreen()).toBeTrue();
    cmp.togglePreviewFullscreen();
    expect(cmp.previewFullscreen()).toBeFalse();
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

  it('onSliderEditRequested switch mode + scroll', (done) => {
    const fixture = TestBed.createComponent(AccueilComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
    flushPreview(httpMock);
    flushSliders(httpMock);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;

    // Spy sur le prototype pour intercepter scrollIntoView quel que soit l'élément retourné
    const scrollSpy = spyOn(HTMLElement.prototype, 'scrollIntoView');

    // Ajoute un div id=admin-sliders-anchor pour que getElementById le trouve
    const anchor = document.createElement('div');
    anchor.id = 'admin-sliders-anchor';
    document.body.appendChild(anchor);

    cmp.accueilViewMode.set('preview');
    expect(cmp.accueilViewMode()).toBe('preview');
    cmp.onSliderEditRequested('home-top');
    expect(cmp.accueilViewMode()).toBe('form');

    // queueMicrotask -> attendre la prochaine microtâche après celle du composant
    queueMicrotask(() => {
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
      document.body.removeChild(anchor);
      done();
    });
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
});
