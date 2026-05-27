import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { AccueilComponent } from './accueil.component';
import { ToastService } from '../shared/toast.service';

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
    const cmp = fixture.componentInstance as unknown as { homeItems: () => Array<{ kind: string; slug: string; title: string; cover: string; included: boolean }>; toggleIncluded: (item: unknown, event: Event) => void };
    const items = cmp.homeItems();
    cmp.toggleIncluded(items[0], { target: { checked: true } } as unknown as Event);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/home/feed').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });
});
