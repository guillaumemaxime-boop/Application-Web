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

  it('pré-remplit la présentation studio depuis profile.bio', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({ 'profile.bio': 'Fondé en 2017…' });
    fixture.detectChanges();
    const bio = fixture.debugElement.query(By.css('textarea[formControlName="profile_bio"]'));
    expect(bio.nativeElement.value).toBe('Fondé en 2017…');
  });

  it('saveTexts() inclut profile.bio dans le payload', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({ 'profile.bio': 'Texte initial' });
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { textsForm: { patchValue: (v: Record<string, unknown>) => void }; saveTexts: () => void };
    cmp.textsForm.patchValue({ profile_bio: 'Nouvelle présentation' });
    cmp.saveTexts();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/content');
    expect((put.request.body as Record<string, string>)['profile.bio']).toBe('Nouvelle présentation');
    put.flush({});
  });

  it('pré-remplit les distinctions depuis profile.awards et les inclut au save', () => {
    const fixture = TestBed.createComponent(TextesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/content').flush({ 'profile.awards': 'Prix A — 2024\nNomination B — 2023' });
    fixture.detectChanges();
    const awards = fixture.debugElement.query(By.css('textarea[formControlName="profile_awards"]'));
    expect(awards.nativeElement.value).toBe('Prix A — 2024\nNomination B — 2023');
    const cmp = fixture.componentInstance as unknown as { textsForm: { patchValue: (v: Record<string, unknown>) => void }; saveTexts: () => void };
    cmp.textsForm.patchValue({ profile_awards: 'Prix C — 2025' });
    cmp.saveTexts();
    const put = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/content');
    expect((put.request.body as Record<string, string>)['profile.awards']).toBe('Prix C — 2025');
    put.flush({});
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
