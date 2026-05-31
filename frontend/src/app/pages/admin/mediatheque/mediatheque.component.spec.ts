import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MediathequeComponent } from './mediatheque.component';
import { ToastService } from '../shared/toast.service';

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

  afterEach(() => httpMock?.verify());

  it('charge la liste de photos au démarrage', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/photos');
    req.flush([{ id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '' }]);
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

  it('supprime une photo et notifie via toast', () => {
    configure();
    const fixture = TestBed.createComponent(MediathequeComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.detectChanges();
    httpMock.expectOne('/api/photos').flush([
      { id: '1', filename: 'a.jpg', originalName: 'A', url: '/uploads/a.jpg', uploadedAt: '' }
    ]);
    fixture.detectChanges();
    (fixture.componentInstance as any).removePhoto({ id: '1', originalName: 'A' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/photos/1').flush(null);
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
      const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/photos');
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
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/photos')
      .flush({ id: 'p1', filename: 'photo.jpg', originalName: 'photo.jpg', url: '/uploads/photo.jpg', uploadedAt: '' });
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
    httpMock.expectNone(r => r.method === 'POST' && r.url === '/api/photos');
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
});
