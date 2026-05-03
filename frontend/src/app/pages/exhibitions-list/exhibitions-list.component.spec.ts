import { TestBed } from '@angular/core/testing';
import { ExhibitionsListComponent } from './exhibitions-list.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Exhibition } from '../../models/exhibition.model';
import { provideRouter } from '@angular/router';

describe('ExhibitionsListComponent', () => {
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockExhibitions: Exhibition[] = [
    {
      id: 'e-001',
      title: 'Matières silencieuses',
      slug: 'matieres-silencieuses',
      venue: 'Galerie Joseph',
      city: 'Paris',
      country: 'France',
      startDate: '2025-03-14',
      endDate: '2025-05-18',
      coverImage: 'https://example.com/m.jpg',
      gallery: [],
      curator: 'Léa Bornand',
      shortDescription: 's',
      description: 'd',
      tags: ['Mobilier'],
      featured: true,
    },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getAllExhibitions']);
    spy.getAllExhibitions.and.returnValue(of(mockExhibitions));

    await TestBed.configureTestingModule({
      imports: [ExhibitionsListComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
  });

  it('should load exhibitions on init', () => {
    const fixture = TestBed.createComponent(ExhibitionsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(portfolioServiceSpy.getAllExhibitions).toHaveBeenCalled();
    expect(c.items().length).toBe(1);
    expect(c.loading()).toBeFalse();
  });

  it('should format year and short month from a date string', () => {
    const fixture = TestBed.createComponent(ExhibitionsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.year('2025-03-14')).toBe('2025');
    expect(c.month('2025-03-14')).not.toContain('.');
    expect(typeof c.month('2025-03-14')).toBe('string');
  });

  it('should render loading state then the timeline once loaded', () => {
    const subject = new Subject<Exhibition[]>();
    portfolioServiceSpy.getAllExhibitions.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(ExhibitionsListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chargement');

    subject.next(mockExhibitions);
    subject.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(mockExhibitions[0].title);
  });

  it('should render the error message when loading fails', () => {
    portfolioServiceSpy.getAllExhibitions.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(ExhibitionsListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Impossible');
  });

  it('should set error flag when loading fails', () => {
    portfolioServiceSpy.getAllExhibitions.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(ExhibitionsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.error()).toBeTrue();
    expect(c.loading()).toBeFalse();
  });
});
