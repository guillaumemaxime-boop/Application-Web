import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { AccueilComponent } from './accueil.component';
import { ToastService } from '../shared/toast.service';

type HomeItem = { kind: 'furniture' | 'exhibition'; slug: string; title: string; cover: string; included: boolean };

type AccueilInternals = {
  homeItems: { (): HomeItem[] | null; set: (v: HomeItem[]) => void };
  toggleIncluded: (item: HomeItem, event: Event) => void;
  onFeedReorder: (order: number[]) => void;
  persistFeed: () => void;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
};

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
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.home-row')).length).toBe(1);
  });

  it('toggleIncluded() persiste le feed et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(AccueilComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([{ id: '1', slug: 'a', title: 'A', category: '', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false }]);
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/home/feed').flush([]);
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
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as AccueilInternals;
    cmp.persistFeed();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });
});
