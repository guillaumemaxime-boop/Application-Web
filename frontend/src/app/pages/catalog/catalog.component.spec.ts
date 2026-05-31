import { TestBed } from '@angular/core/testing';
import { CatalogComponent } from './catalog.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { provideRouter } from '@angular/router';

describe('CatalogComponent', () => {
  const items: Furniture[] = [
    {
      id: '1', title: 'Onde', slug: 'onde', category: 'Sièges', material: 'Chêne',
      year: 2024, coverImage: 'a.jpg', gallery: [], shortDescription: '',
      description: '', dimensions: [], designer: 'Lumen', featured: false, showStoryLink: true, showStoryButton: true, slides: [],
    },
    {
      id: '2', title: 'Volume', slug: 'volume', category: 'Tables', material: 'Noyer',
      year: 2025, coverImage: 'b.jpg', gallery: [], shortDescription: '',
      description: '', dimensions: [], designer: 'Lumen', featured: false, showStoryLink: true, showStoryButton: true, slides: [],
    },
    {
      id: '3', title: 'Aube', slug: 'aube', category: 'Sièges', material: 'Laiton',
      year: 2025, coverImage: 'c.jpg', gallery: [], shortDescription: '',
      description: '', dimensions: [], designer: 'Lumen', featured: false, showStoryLink: true, showStoryButton: true, slides: [],
    },
  ];

  function setup(returnValue: ReturnType<PortfolioService['getAllFurniture']>) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getAllFurniture', 'getContent']);
    spy.getAllFurniture.and.returnValue(returnValue);
    spy.getContent.and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
      ],
    });
    return spy;
  }

  it('should group by category by default, sorted alphabetically (fr)', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    const groups = c.groups();
    expect(groups.length).toBe(2);
    expect(groups[0].label).toBe('Sièges');
    expect(groups[1].label).toBe('Tables');
    expect(groups[0].items.map((f: Furniture) => f.slug)).toEqual(['aube', 'onde']);
  });

  it('should switch to grouping by year and sort years descending', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.setGroupBy('year');
    fixture.detectChanges();
    const groups = c.groups();
    expect(groups.length).toBe(2);
    expect(groups[0].label).toBe('2025');
    expect(groups[1].label).toBe('2024');
    expect(groups[0].items.length).toBe(2);
    expect(groups[1].items.length).toBe(1);
  });

  it('should render a loading state then the grid', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    const titles = Array.from(fixture.nativeElement.querySelectorAll('.card .title'))
      .map((el: any) => el.textContent.trim());
    expect(titles).toContain('Onde');
    expect(titles).toContain('Volume');
    expect(titles).toContain('Aube');
  });

  it('should show empty state when no items', () => {
    setup(of([]));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune pièce');
  });

  it('should handle service errors gracefully', () => {
    setup(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.loading()).toBeFalse();
    expect(c.items().length).toBe(0);
  });

  it('should activate the right toggle button visually', () => {
    setup(of(items));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.toggle button');
    expect(buttons[0].classList.contains('active')).toBeTrue();
    expect(buttons[1].classList.contains('active')).toBeFalse();
    buttons[1].click();
    fixture.detectChanges();
    expect(buttons[0].classList.contains('active')).toBeFalse();
    expect(buttons[1].classList.contains('active')).toBeTrue();
  });

  it('groups undated items under year 0 when sorting by year', () => {
    const undated: Furniture[] = [
      {
        id: 'x', title: 'Sans date', slug: 'sans-date', category: 'Divers',
        material: 'Acier', year: null as unknown as number, coverImage: 'x.jpg',
        gallery: [], shortDescription: '', description: '', dimensions: [],
        designer: 'Lumen', featured: false, showStoryLink: true, showStoryButton: true, slides: [],
      },
    ];
    setup(of(undated));
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.setGroupBy('year');
    fixture.detectChanges();
    const groups = c.groups();
    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe('Sans date');
  });
});
