import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NavigationComponent } from './navigation.component';
import { ToastService } from '../shared/toast.service';

describe('NavigationComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge les 4 toggles de visibilité depuis getContent', () => {
    const fixture = TestBed.createComponent(NavigationComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/content');
    req.flush({
      'nav.mobilier.visible': 'true',
      'nav.expositions.visible': 'false',
      'nav.creations.visible': 'false',
      'nav.studio.visible': 'true',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      navMobilierVisible: () => boolean;
      navExpositionsVisible: () => boolean;
      navCreationsVisible: () => boolean;
      navStudioVisible: () => boolean;
    };
    expect(cmp.navMobilierVisible()).toBeTrue();
    expect(cmp.navExpositionsVisible()).toBeFalse();
    expect(cmp.navCreationsVisible()).toBeFalse();
    expect(cmp.navStudioVisible()).toBeTrue();
  });

  it('toggleNavSection() PUT et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(NavigationComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { toggleNavSection: (section: string, event: Event) => void };
    cmp.toggleNavSection('mobilier', { target: { checked: false } } as unknown as Event);
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content');
    expect(put.request.body).toEqual({ 'nav.mobilier.visible': 'false' });
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('toggleNavSection() gère la section creations', () => {
    const fixture = TestBed.createComponent(NavigationComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({ 'nav.creations.visible': 'true' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      toggleNavSection: (section: string, event: Event) => void;
      navCreationsVisible: () => boolean;
    };
    expect(cmp.navCreationsVisible()).toBeTrue();
    cmp.toggleNavSection('creations', { target: { checked: false } } as unknown as Event);
    expect(cmp.navCreationsVisible()).toBeFalse();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content');
    expect(put.request.body).toEqual({ 'nav.creations.visible': 'false' });
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });
});
