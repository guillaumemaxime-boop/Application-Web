import { TestBed } from '@angular/core/testing';
import { ExhibitionDetailComponent } from './exhibition-detail.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Exhibition } from '../../models/exhibition.model';
import { DisplaySlide } from '../../models/display-slide.model';
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

  it('enrichit la liste de slides avec cover prefix + link suffix', () => {
    const exhibition: Exhibition = {
      ...mockExhibition,
      slug: 'expo-test',
      coverImage: '/uploads/cover.jpg',
      slides: [
        { id: 's1', position: 0, type: 'image', src: '/uploads/photo.jpg', caption: 'détail' },
      ],
    };
    setup('expo-test', of(exhibition));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    const display: DisplaySlide[] = (fixture.componentInstance as any).displaySlides();
    expect(display.length).toBe(3);
    expect(display[0].type).toBe('cover');
    expect((display[0] as any).src).toBe('/uploads/cover.jpg');
    expect(display[1].type).toBe('image');
    expect(display[display.length - 1].type).toBe('link');
    expect((display[display.length - 1] as any).href).toBe('/expositions/expo-test');
    expect((display[display.length - 1] as any).label).toBe('Voir l\'exposition');
  });

  it('filtre les slides legacy de type cover/link recues de l API', () => {
    const exhibition: Exhibition = {
      ...mockExhibition,
      slug: 'x',
      coverImage: '/c.jpg',
      slides: [
        { id: 'legacy-c', position: 0, type: 'cover', src: '/legacy.jpg' },
        { id: 's1', position: 1, type: 'image', src: '/photo.jpg', caption: null },
        { id: 'legacy-l', position: 2, type: 'link', label: 'old', description: null, href: '/old' },
      ] as any,
    };
    setup('x', of(exhibition));
    const fixture = TestBed.createComponent(ExhibitionDetailComponent);
    fixture.detectChanges();
    const display: DisplaySlide[] = (fixture.componentInstance as any).displaySlides();
    expect(display.length).toBe(3);
    expect(display.filter((s: DisplaySlide) => s.type === 'cover').length).toBe(1);
    expect((display[0] as any).src).toBe('/c.jpg');
  });
});
