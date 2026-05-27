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
