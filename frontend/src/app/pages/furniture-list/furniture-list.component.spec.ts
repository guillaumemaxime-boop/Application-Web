import { TestBed } from '@angular/core/testing';
import { FurnitureListComponent } from './furniture-list.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { provideRouter } from '@angular/router';

describe('FurnitureListComponent', () => {
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockFurniture: Furniture[] = [
    {
      id: 'f-001',
      title: 'Onde',
      slug: 'onde',
      category: 'Sièges',
      material: 'Chêne',
      year: 2024,
      coverImage: 'https://example.com/onde.jpg',
      gallery: [],
      shortDescription: 's',
      description: 'd',
      dimensions: [],
      designer: 'Lumen',
      featured: true,
      slides: [],
    },
    {
      id: 'f-002',
      title: 'Table',
      slug: 'table',
      category: 'Tables',
      material: 'Marbre',
      year: 2023,
      coverImage: 'https://example.com/table.jpg',
      gallery: [],
      shortDescription: 's',
      description: 'd',
      dimensions: [],
      designer: 'Lumen',
      featured: false,
      slides: [],
    },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getAllFurniture']);
    spy.getAllFurniture.and.returnValue(of(mockFurniture));

    await TestBed.configureTestingModule({
      imports: [FurnitureListComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
  });

  it('should create and load all furniture', () => {
    const fixture = TestBed.createComponent(FurnitureListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(portfolioServiceSpy.getAllFurniture).toHaveBeenCalled();
  });

  it('should expose distinct sorted categories', () => {
    const fixture = TestBed.createComponent(FurnitureListComponent);
    fixture.detectChanges();
    const cats = (fixture.componentInstance as any).categories();
    expect(cats).toEqual(['Sièges', 'Tables']);
  });

  it('should filter by active category', () => {
    const fixture = TestBed.createComponent(FurnitureListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;

    expect(c.filtered().length).toBe(2);

    c.active.set('Sièges');
    expect(c.filtered().length).toBe(1);
    expect(c.filtered()[0].slug).toBe('onde');

    c.active.set('all');
    expect(c.filtered().length).toBe(2);
  });

  it('should render loading then loaded state', () => {
    const subject = new Subject<Furniture[]>();
    portfolioServiceSpy.getAllFurniture.and.returnValue(subject.asObservable());

    const fixture = TestBed.createComponent(FurnitureListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.loading()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Chargement');

    subject.next(mockFurniture);
    subject.complete();
    fixture.detectChanges();
    expect(c.loading()).toBeFalse();
  });

  it('should render empty-filter message when filter matches nothing', () => {
    portfolioServiceSpy.getAllFurniture.and.returnValue(of(mockFurniture));
    const fixture = TestBed.createComponent(FurnitureListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.active.set('Inexistant');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune pièce');
  });

  it('should set error flag when service fails', () => {
    portfolioServiceSpy.getAllFurniture.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(FurnitureListComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.error()).toBeTrue();
    expect(c.loading()).toBeFalse();
  });
});
