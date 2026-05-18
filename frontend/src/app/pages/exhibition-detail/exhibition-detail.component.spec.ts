console.log('[SPEC LOADED] pages/exhibition-detail/exhibition-detail.component.spec.ts');
import { TestBed } from '@angular/core/testing';
import { ExhibitionDetailComponent } from './exhibition-detail.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Exhibition } from '../../models/exhibition.model';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

describe('ExhibitionDetailComponent', () => {
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockExhibition: Exhibition = {
    id: 'e-001',
    title: 'Matières silencieuses',
    slug: 'matieres-silencieuses',
    venue: 'Galerie Joseph',
    city: 'Paris',
    country: 'France',
    startDate: '2025-03-14',
    endDate: '2025-05-18',
    coverImage: 'https://example.com/m.jpg',
    gallery: ['https://example.com/m-1.jpg'],
    curator: 'Léa Bornand',
    shortDescription: 's',
    description: 'd',
    tags: ['Mobilier'],
    featured: true,
    slides: [],
  };

  function setup(slug: string | undefined, returnValue: ReturnType<PortfolioService['getExhibition']>) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getExhibition', 'getContent']);
    spy.getExhibition.and.returnValue(returnValue);
    spy.getContent.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [ExhibitionDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(slug ? { slug } : {}) } },
        },
      ],
    });
    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
  }

  it('should load the exhibition matching the slug', () => {
    setup('matieres-silencieuses', of(mockExhibition));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(portfolioServiceSpy.getExhibition).toHaveBeenCalledWith('matieres-silencieuses');
    expect(c.item()).toEqual(mockExhibition);
    expect(c.loading()).toBeFalse();
    expect(c.notFound()).toBeFalse();
  });

  it('should mark notFound when service errors', () => {
    setup('missing', throwError(() => new Error('404')));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.notFound()).toBeTrue();
    expect(c.loading()).toBeFalse();
  });

  it('should fallback to empty slug when route param is missing', () => {
    setup(undefined, of(mockExhibition));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    expect(portfolioServiceSpy.getExhibition).toHaveBeenCalledWith('');
  });

  it('should render the loading state then the loaded item', () => {
    const subject = new Subject<Exhibition>();
    setup('matieres-silencieuses', subject.asObservable());

    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement');

    subject.next(mockExhibition);
    subject.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mockExhibition.title);
  });

  it('should render the not-found state when service errors', () => {
    setup('missing', throwError(() => new Error('404')));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('introuvable');
  });

  it('should format a French date range', () => {
    setup('matieres-silencieuses', of(mockExhibition));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    const range = (fixture.componentInstance as any).formatRange('2025-03-14', '2025-05-18');
    expect(range).toContain('—');
    expect(range).toContain('2025');
  });
});
