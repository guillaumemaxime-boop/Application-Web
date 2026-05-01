import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { PortfolioService } from '../../services/portfolio.service';
import { RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockFeaturedFurniture: Furniture[] = [
    {
      id: 'f-001',
      title: 'Onde — Fauteuil sculpté',
      slug: 'onde-fauteuil-sculpte',
      category: 'Sièges',
      material: 'Chêne massif & cuir tanné',
      year: 2024,
      coverImage: 'https://example.com/onde.jpg',
      gallery: ['https://example.com/onde-1.jpg'],
      shortDescription: 'Une silhouette inspirée du mouvement de la mer',
      description: 'Description détaillée',
      dimensions: ['Hauteur 92 cm'],
      designer: 'Atelier Lumen',
      featured: true,
    },
  ];

  const mockFeaturedExhibitions: Exhibition[] = [
    {
      id: 'e-001',
      title: 'Matières silencieuses',
      slug: 'matieres-silencieuses',
      venue: 'Galerie Joseph',
      city: 'Paris',
      country: 'France',
      startDate: '2025-03-14',
      endDate: '2025-05-18',
      coverImage: 'https://example.com/matieres.jpg',
      gallery: ['https://example.com/matieres-1.jpg'],
      curator: 'Léa Bornand',
      shortDescription: 'Une exploration du silence comme matière première',
      description: 'Description détaillée',
      tags: ['Mobilier', 'Sculpture'],
      featured: true,
    },
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('PortfolioService', [
      'getFeaturedFurniture',
      'getFeaturedExhibitions',
    ]);

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterLink],
      providers: [
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load featured furniture on init', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    expect(portfolioServiceSpy.getFeaturedFurniture).toHaveBeenCalled();
    expect(component.featuredFurniture()).toEqual(mockFeaturedFurniture);
    expect(component.loadingFurniture()).toBe(false);
    expect(component.errorFurniture()).toBe(false);
  });

  it('should load featured exhibitions on init', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    expect(portfolioServiceSpy.getFeaturedExhibitions).toHaveBeenCalled();
    expect(component.featuredExhibitions()).toEqual(mockFeaturedExhibitions);
    expect(component.loadingExhibitions()).toBe(false);
  });

  it('should handle error when loading featured furniture', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(throwError(() => new Error('Failed')));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    expect(component.errorFurniture()).toBe(true);
    expect(component.loadingFurniture()).toBe(false);
  });

  it('should show loading state initially', () => {
    fixture.detectChanges();
    expect(component.loadingFurniture()).toBe(true);
    expect(component.loadingExhibitions()).toBe(true);
  });

  it('should format date range correctly', () => {
    const startDate = '2025-03-14';
    const endDate = '2025-05-18';
    const formatted = component.formatRange(startDate, endDate);
    expect(formatted).toContain('→');
  });
});
