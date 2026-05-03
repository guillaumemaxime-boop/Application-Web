import { TestBed } from '@angular/core/testing';
import { FurnitureDetailComponent } from './furniture-detail.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';

describe('FurnitureDetailComponent', () => {
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockFurniture: Furniture = {
    id: 'f-001',
    title: 'Onde',
    slug: 'onde',
    category: 'Sièges',
    material: 'Chêne',
    year: 2024,
    coverImage: 'https://example.com/onde.jpg',
    gallery: ['https://example.com/onde-1.jpg'],
    shortDescription: 's',
    description: 'd',
    dimensions: ['H 90 cm'],
    designer: 'Lumen',
    featured: true,
  };

  function setup(slug: string, returnValue: ReturnType<PortfolioService['getFurniture']>) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getFurniture']);
    spy.getFurniture.and.returnValue(returnValue);

    TestBed.configureTestingModule({
      imports: [FurnitureDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug }) } },
        },
      ],
    });
    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
  }

  it('should load the furniture matching the slug', () => {
    setup('onde', of(mockFurniture));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(portfolioServiceSpy.getFurniture).toHaveBeenCalledWith('onde');
    expect(c.item()).toEqual(mockFurniture);
    expect(c.loading()).toBeFalse();
    expect(c.notFound()).toBeFalse();
  });

  it('should mark notFound when service errors', () => {
    setup('missing', throwError(() => new Error('404')));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.notFound()).toBeTrue();
    expect(c.loading()).toBeFalse();
    expect(c.item()).toBeNull();
  });

  it('should render loading state then the loaded item', () => {
    const subject = new Subject<Furniture>();
    setup('onde', subject.asObservable());

    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.loading()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Chargement');

    subject.next(mockFurniture);
    subject.complete();
    fixture.detectChanges();
    expect(c.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain(mockFurniture.title);
  });

  it('should render the not-found state when service errors', () => {
    setup('missing', throwError(() => new Error('404')));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('introuvable');
  });

  it('should fallback to empty slug when route param is missing', () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getFurniture']);
    spy.getFurniture.and.returnValue(of(mockFurniture));

    TestBed.configureTestingModule({
      imports: [FurnitureDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: spy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    expect(spy.getFurniture).toHaveBeenCalledWith('');
  });
});
