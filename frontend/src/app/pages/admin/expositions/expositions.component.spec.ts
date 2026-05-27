import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ExpositionsComponent } from './expositions.component';
import { ToastService } from '../shared/toast.service';

describe('ExpositionsComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [ExpositionsComponent],
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

  // Note: getAllExhibitions() utilise shareReplay(1), donc UN seul GET /api/exhibitions
  // sera émis même si le composant l'appelle deux fois (refreshExhibitions + refreshExhibitionsMeta).

  it('charge expos et metadata', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('saveExhibition() POST quand nouveau', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { exhibitionForm: { patchValue: (v: Record<string, unknown>) => void }; saveExhibition: () => void };
    cmp.exhibitionForm.patchValue({ title: 'T', startDate: '2024-01-01', endDate: '2024-02-01' });
    cmp.saveExhibition();
    const post = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/exhibitions');
    post.flush({});
    // createExhibition() invalide le cache, donc 1 nouvel appel GET /api/exhibitions
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('ajoute et retire un tag', () => {
    configure();
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as {
      newExhibitionTag: { set: (v: string) => void };
      addExhibitionTag: (e: Event) => void;
      removeExhibitionTag: (t: string) => void;
      exhibitionTags: () => string[];
    };
    cmp.newExhibitionTag.set('moderne');
    const fakeEvent = { preventDefault: () => {} } as Event;
    cmp.addExhibitionTag(fakeEvent);
    expect(cmp.exhibitionTags()).toEqual(['moderne']);
    cmp.removeExhibitionTag('moderne');
    expect(cmp.exhibitionTags()).toEqual([]);
  });

  it('ouvre formulaire vierge si ?new=1', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(ExpositionsComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/exhibitions').flush([]);
    httpMock.expectOne('/api/admin/exhibitions-meta').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { editingExhibitionSlug: () => string | null };
    expect(cmp.editingExhibitionSlug()).toBeNull();
  });
});
