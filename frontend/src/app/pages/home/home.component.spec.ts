import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

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
      designer: 'Milo GUILLAUME Design',
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
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', [
      'getFeaturedFurniture',
      'getFeaturedExhibitions',
      'getContent',
    ]);
    spy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    spy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    spy.getContent.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
  });

  it('should create', () => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call PortfolioService methods on init', () => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(portfolioServiceSpy.getFeaturedFurniture).toHaveBeenCalled();
    expect(portfolioServiceSpy.getFeaturedExhibitions).toHaveBeenCalled();
  });

  it('should handle error when loading featured furniture', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(
      throwError(() => new Error('Failed'))
    );

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(portfolioServiceSpy.getFeaturedFurniture).toHaveBeenCalled();
    expect(component).toBeTruthy();
  });

  it('should handle error when loading featured exhibitions', () => {
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(
      throwError(() => new Error('Failed'))
    );

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(portfolioServiceSpy.getFeaturedExhibitions).toHaveBeenCalled();
    expect(component).toBeTruthy();
  });

  it('should remain functional when getContent errors', () => {
    portfolioServiceSpy.getContent.and.returnValue(throwError(() => new Error('Failed')));

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect((component as any).content()).toEqual({});
  });

  it('should load and expose content values via txt()', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({
      'home.hero.eyebrow': 'Mon Studio',
      'home.quote.cite': '— Auteur',
    }));

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect((component as any).txt('home.hero.eyebrow')).toBe('Mon Studio');
    expect((component as any).txt('home.quote.cite')).toBe('— Auteur');
    expect((component as any).txt('missing.key')).toBe('');
  });

  it('should call getContent on init', () => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(portfolioServiceSpy.getContent).toHaveBeenCalled();
  });
});
