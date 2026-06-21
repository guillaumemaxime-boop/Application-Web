import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MediathequeComponent } from './mediatheque.component';
import { ToastService } from '../shared/toast.service';
import { Photo } from '../../../models/photo.model';

describe('MediathequeComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [MediathequeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  function makePhoto(overrides: Partial<Photo> = {}): Photo {
    return {
      id: '1',
      filename: 'a.jpg',
      originalName: 'A',
      url: '/uploads/a.jpg',
      uploadedAt: '',
      tags: [],
      ...overrides,
    };
  }

  afterEach(() => httpMock?.verify());

  it('affiche le format et la taille formatee dans la carte photo', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      makePhoto({ format: 'JPG', sizeBytes: 1572864 }),  // 1.5 Mo
    ]);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.photo-card');
    expect(card.textContent).toContain('JPG');
    expect(card.textContent).toContain('1.5 Mo');
  });

  it('formatSize() couvre o / Ko / Mo', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(cmp.formatSize(500)).toBe('500 o');
    expect(cmp.formatSize(12345)).toBe('12 Ko');
    expect(cmp.formatSize(2_500_000)).toBe('2.4 Mo');
  });

  it('n\'affiche pas la taille si sizeBytes est 0 ou absent', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      makePhoto({ format: 'PNG', sizeBytes: 0 }),
    ]);
    fixture.detectChanges();
    const meta = fixture.nativeElement.querySelector('.photo-meta');
    expect(meta.textContent).toContain('PNG');
    expect(meta.querySelector('.meta-size')).toBeNull();
  });

  it('charge la liste de photos au démarrage', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/photos');
    req.flush([makePhoto()]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.photo-card')).length).toBe(1);
  });

  it('affiche un message vide quand pas de photo', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.photos-empty'))).toBeTruthy();
  });

  it('optimizeAll() POST /api/admin/photos/optimize et affiche un toast succes avec le bilan', () => {
    configure();
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    (fixture.componentInstance as any).optimizeAll();
    const req = httpMock.expectOne('/api/admin/photos/optimize');
    expect(req.request.method).toBe('POST');
    req.flush({ count: 10, optimized: 7, bytesSaved: 5 * 1024 * 1024 });
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringContaining('7 / 10'));
    expect((fixture.componentInstance as any).optimizing()).toBeFalse();
  });

  it('optimizeAll() affiche un toast erreur si l\'API echoue', () => {
    configure();
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    (fixture.componentInstance as any).optimizeAll();
    httpMock.expectOne('/api/admin/photos/optimize').flush({}, { status: 500, statusText: 'err' });
    expect(toast.error).toHaveBeenCalled();
    expect((fixture.componentInstance as any).optimizing()).toBeFalse();
  });

  it('supprime une photo et notifie via toast', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([makePhoto()]);
    fixture.detectChanges();
    (fixture.componentInstance as any).removePhoto({ id: '1', originalName: 'A' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/photos/1').flush(null);
    expect(toast.success).toHaveBeenCalled();
  });

  function setupUploadAndFail(status: number, count = 1): { fixture: any; toast: ToastService } {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    spyOn(toast, 'success');
    spyOn(console, 'error'); // silence the [mediatheque] log
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();

    const files = Array.from({ length: count }, (_, i) =>
      new File(['x'], `photo-${i}.jpg`, { type: 'image/jpeg' })
    );
    const fakeInput = { files, value: '' } as unknown as HTMLInputElement;
    const event = { target: fakeInput } as unknown as Event;
    (fixture.componentInstance as any).uploadFiles(event);

    for (let i = 0; i < count; i++) {
      const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/photos');
      req.flush({ message: 'fail' }, { status, statusText: 'Error' });
    }
    return { fixture, toast };
  }

  it('toast erreur 413 → "fichier trop volumineux"', () => {
    const { toast } = setupUploadAndFail(413);
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/fichier trop volumineux/));
  });

  it('toast erreur 401 → "session expirée"', () => {
    const { toast } = setupUploadAndFail(401);
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/session expirée/));
  });

  it('toast erreur 403 → "session expirée" (même branche)', () => {
    const { toast } = setupUploadAndFail(403);
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/session expirée/));
  });

  it('toast erreur 0 → "pas de connexion au serveur"', () => {
    const { toast } = setupUploadAndFail(0);
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/pas de connexion/));
  });

  it('toast erreur HTTP 500 → "erreur HTTP 500"', () => {
    const { toast } = setupUploadAndFail(500);
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/erreur HTTP 500/));
  });

  it('toast success quand l\'upload reussit', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();

    const fakeInput = { files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })], value: '' } as unknown as HTMLInputElement;
    (fixture.componentInstance as any).uploadFiles({ target: fakeInput } as unknown as Event);
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/photos')
      .flush(makePhoto({ id: 'p1', filename: 'photo.jpg', originalName: 'photo.jpg', url: '/uploads/photo.jpg' }));
    expect(toast.success).toHaveBeenCalled();
  });

  it('uploadFiles est un no-op quand aucune photo n\'est sélectionnée', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    const fakeInput = { files: null, value: '' } as unknown as HTMLInputElement;
    (fixture.componentInstance as any).uploadFiles({ target: fakeInput } as unknown as Event);
    httpMock.expectNone(r => r.method === 'POST' && r.url === '/api/admin/photos');
  });

  it('déclenche le file input quand ?import=1 est présent', fakeAsync(() => {
    configure({ import: '1' });
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([]);
    fixture.detectChanges();
    const fileInput = fixture.debugElement.query(By.css('input[type="file"]')).nativeElement as HTMLInputElement;
    spyOn(fileInput, 'click');
    tick();
    fixture.detectChanges();
    expect(fileInput.click).toHaveBeenCalled();
  }));

  // --- Recherche + tags ---

  it('affiche un input de recherche', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([makePhoto()]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('input.photos-search'))).toBeTruthy();
  });

  it('filtre les photos par nom de fichier', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      makePhoto({ id: '1', originalName: 'portrait.jpg' }),
      makePhoto({ id: '2', originalName: 'paysage.jpg' }),
    ]);
    fixture.detectChanges();
    (fixture.componentInstance as any).search.set('port');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.photo-card')).length).toBe(1);
  });

  it('filtre les photos par tag (case-insensitive)', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      makePhoto({ id: '1', originalName: 'a.jpg', tags: ['studio'] }),
      makePhoto({ id: '2', originalName: 'b.jpg', tags: ['atelier'] }),
    ]);
    fixture.detectChanges();
    (fixture.componentInstance as any).search.set('Stud');
    fixture.detectChanges();
    const cards = fixture.debugElement.queryAll(By.css('.photo-card'));
    expect(cards.length).toBe(1);
  });

  it('affiche "X / Y photo(s)" quand une recherche est active', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      makePhoto({ id: '1', originalName: 'a.jpg' }),
      makePhoto({ id: '2', originalName: 'b.jpg' }),
    ]);
    fixture.detectChanges();
    (fixture.componentInstance as any).search.set('a.jpg');
    fixture.detectChanges();
    const count = fixture.debugElement.query(By.css('.photos-count')).nativeElement.textContent as string;
    expect(count).toMatch(/1\s*\/\s*2/);
  });

  it('ajoute un tag normalise et appelle updatePhotoTags', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: [] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    (fixture.componentInstance as any).addTag(photo, '  Studio  ');
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
    expect(req.request.body).toEqual({ tags: ['studio'] });
    req.flush(makePhoto({ id: '1', tags: ['studio'] }));
  });

  it('commitTag() valide le tag du champ et le vide (cas blur/mobile)', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: [] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    const input = { value: '  Studio  ' } as HTMLInputElement;
    (fixture.componentInstance as any).commitTag(photo, input);
    expect(input.value).toBe(''); // champ vidé
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
    expect(req.request.body).toEqual({ tags: ['studio'] });
    req.flush(makePhoto({ id: '1', tags: ['studio'] }));
  });

  it('commitTag() champ vide → aucun appel HTTP (blur sans saisie)', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: [] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    const input = { value: '   ' } as HTMLInputElement;
    (fixture.componentInstance as any).commitTag(photo, input);
    expect(input.value).toBe('');
    httpMock.expectNone(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
  });

  it('le champ tag valide au blur (DOM)', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([makePhoto({ id: '1', tags: [] })]);
    fixture.detectChanges();

    const inputDe = fixture.debugElement.query(By.css('input.tag-input'));
    const input = inputDe.nativeElement as HTMLInputElement;
    input.value = 'atelier';
    inputDe.triggerEventHandler('blur', { target: input });
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
    expect(req.request.body).toEqual({ tags: ['atelier'] });
    req.flush(makePhoto({ id: '1', tags: ['atelier'] }));
  });

  it('retire un tag', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: ['studio', 'atelier'] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    (fixture.componentInstance as any).removeTag(photo, 'studio');
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
    expect(req.request.body).toEqual({ tags: ['atelier'] });
    req.flush(makePhoto({ id: '1', tags: ['atelier'] }));
  });

  it('tag duplique est ignore (pas d\'appel HTTP)', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: ['studio'] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    (fixture.componentInstance as any).addTag(photo, 'STUDIO');
    httpMock.expectNone(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
  });

  it('tag vide est ignore (pas d\'appel HTTP)', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: [] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    (fixture.componentInstance as any).addTag(photo, '   ');
    httpMock.expectNone(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
  });

  it('revert local si le PUT echoue', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    const photo = makePhoto({ id: '1', tags: [] });
    httpMock.expectOne('/api/photos').flush([photo]);
    fixture.detectChanges();

    (fixture.componentInstance as any).addTag(photo, 'studio');
    const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/photos/1/tags');
    req.flush({ error: 'oops' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const photos = (fixture.componentInstance as any).photos() as Photo[];
    expect(photos[0].tags).toEqual([]);
    expect(toast.error).toHaveBeenCalled();
  });
});
