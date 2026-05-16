import { TestBed } from '@angular/core/testing';
import { ExpositionsListComponent } from './expositions-list.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { Exhibition } from '../../models/exhibition.model';
import { provideRouter } from '@angular/router';

describe('ExpositionsListComponent', () => {
  const items: Exhibition[] = [
    {
      id: '1', title: 'Paris Nuit', slug: 'paris-nuit', venue: 'Galerie X',
      city: 'Paris', country: 'France', startDate: '2025-03-10', endDate: '2025-04-12',
      coverImage: 'a.jpg', gallery: [], curator: 'C', shortDescription: '',
      description: '', tags: [], featured: false, slides: [],
    },
    {
      id: '2', title: 'Bruges Hiver', slug: 'bruges', venue: 'Maison Y',
      city: 'Bruges', country: 'Belgique', startDate: '2024-12-01', endDate: '2025-01-30',
      coverImage: 'b.jpg', gallery: [], curator: 'C', shortDescription: '',
      description: '', tags: [], featured: false, slides: [],
    },
    {
      id: '3', title: 'Milan', slug: 'milan', venue: 'Salone',
      city: 'Milan', country: 'Italie', startDate: '2025-06-01', endDate: '2025-06-12',
      coverImage: 'c.jpg', gallery: [], curator: 'C', shortDescription: '',
      description: '', tags: [], featured: false, slides: [],
    },
  ];

  function setup(returnValue: ReturnType<PortfolioService['getAllExhibitions']>) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getAllExhibitions']);
    spy.getAllExhibitions.and.returnValue(returnValue);
    TestBed.configureTestingModule({
      imports: [ExpositionsListComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
      ],
    });
    return spy;
  }

  it('should group by year of start date, descending', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(ExpositionsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    const groups = c.groups();
    expect(groups.length).toBe(2);
    expect(groups[0].year).toBe(2025);
    expect(groups[1].year).toBe(2024);
  });

  it('should sort items within a year by startDate descending', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(ExpositionsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    const slugs2025 = c.groups()[0].items.map((e: Exhibition) => e.slug);
    expect(slugs2025).toEqual(['milan', 'paris-nuit']);
  });

  it('should render the cards with venue and city', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(ExpositionsListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Galerie X');
    expect(fixture.nativeElement.textContent).toContain('Paris');
    expect(fixture.nativeElement.textContent).toContain('Paris Nuit');
  });

  it('should show empty state when no exhibitions', () => {
    setup(of([]));
    const fixture = TestBed.createComponent(ExpositionsListComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune exposition');
  });

  it('should handle service errors gracefully', () => {
    setup(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(ExpositionsListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.loading()).toBeFalse();
    expect(c.items().length).toBe(0);
  });
});
