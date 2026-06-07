import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TypographieComponent } from './typographie.component';
import { ToastService } from '../shared/toast.service';

describe('TypographieComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypographieComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('crée le composant et charge les contenus typo', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/content');
    expect(req.request.method).toBe('GET');
    req.flush({ 'typo.title.font': 'serif', 'typo.title.style': 'italic' });
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche une carte par rôle typo', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('.typo-card'));
    expect(cards.length).toBeGreaterThan(0);
  });

  it('saveTypo() persiste la sélection et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTypo();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content');
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveTypo() affiche un toast d\'erreur si l\'API échoue', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTypo();
    httpMock.expectOne('/api/admin/content').flush({}, { status: 500, statusText: 'fail' });
    expect(toast.error).toHaveBeenCalled();
  });

  it('hydrate puis persiste la taille (size) pour chaque rôle', () => {
    const fixture = TestBed.createComponent(TypographieComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({
      'typo.section-title.size': 'grand',
      'typo.card-title.size': 'moyen',
    });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(cmp.typoForm.value['section-title_size']).toBe('grand');
    expect(cmp.typoForm.value['card-title_size']).toBe('moyen');
    cmp.typoForm.patchValue({ 'title_size': 'hero' });
    cmp.saveTypo();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/content');
    expect(put.request.body['typo.title.size']).toBe('hero');
    expect(put.request.body['typo.section-title.size']).toBe('grand');
    put.flush({});
  });
});
