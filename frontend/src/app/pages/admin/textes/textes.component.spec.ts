import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TextesComponent } from './textes.component';
import { ToastService } from '../shared/toast.service';

describe('TextesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('charge le contenu site au démarrage', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/content');
    req.flush({ 'home.hero.eyebrow': 'Atelier' });
    fixture.detectChanges();
    const eyebrowInput = fixture.debugElement.query(By.css('input[formControlName="home_hero_eyebrow"]'));
    expect(eyebrowInput.nativeElement.value).toBe('Atelier');
  });

  it('affiche les 3 grandes sections (Accueil / Studio / Contact)', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.texts-section-title'));
    expect(titles.length).toBe(3);
  });

  it('saveTexts() envoie un PUT et notifie via ToastService', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTexts();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/content');
    put.flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveTexts() affiche un toast d\'erreur en cas d\'échec API', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({});
    fixture.detectChanges();
    (fixture.componentInstance as any).saveTexts();
    httpMock.expectOne('/api/content').flush({}, { status: 500, statusText: 'fail' });
    expect(toast.error).toHaveBeenCalled();
  });
});
