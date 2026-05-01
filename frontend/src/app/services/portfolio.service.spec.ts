import { TestBed } from '@angular/core/testing';
import { PortfolioService } from './portfolio.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Furniture } from '../models/furniture.model';
import { Exhibition } from '../models/exhibition.model';
import { Profile } from '../models/profile.model';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PortfolioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Furniture API', () => {
    const mockFurnitureList: Furniture[] = [
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

    const mockFurniture: Furniture = mockFurnitureList[0];
    const mockCategories = ['Sièges', 'Tables', 'Rangements'];

    it('should retrieve all furniture', () => {
      service.getAllFurniture().subscribe((furniture) => {
        expect(furniture.length).toBe(1);
        expect(furniture).toEqual(mockFurnitureList);
      });

      const req = httpMock.expectOne('/api/furniture');
      expect(req.request.method).toBe('GET');
      req.flush(mockFurnitureList);
    });

    it('should retrieve featured furniture', () => {
      service.getFeaturedFurniture().subscribe((furniture) => {
        expect(furniture.length).toBe(1);
        expect(furniture[0].featured).toBe(true);
      });

      const req = httpMock.expectOne('/api/furniture/featured');
      expect(req.request.method).toBe('GET');
      req.flush(mockFurnitureList);
    });

    it('should retrieve furniture categories', () => {
      service.getFurnitureCategories().subscribe((categories) => {
        expect(categories).toEqual(mockCategories);
      });

      const req = httpMock.expectOne('/api/furniture/categories');
      expect(req.request.method).toBe('GET');
      req.flush(mockCategories);
    });

    it('should retrieve a single furniture by slug', () => {
      const slug = 'onde-fauteuil-sculpte';
      service.getFurniture(slug).subscribe((furniture) => {
        expect(furniture).toEqual(mockFurniture);
      });

      const req = httpMock.expectOne(`/api/furniture/${slug}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFurniture);
    });
  });

  describe('Exhibition API', () => {
    const mockExhibitionList: Exhibition[] = [
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

    const mockExhibition: Exhibition = mockExhibitionList[0];

    it('should retrieve all exhibitions', () => {
      service.getAllExhibitions().subscribe((exhibitions) => {
        expect(exhibitions.length).toBe(1);
        expect(exhibitions).toEqual(mockExhibitionList);
      });

      const req = httpMock.expectOne('/api/exhibitions');
      expect(req.request.method).toBe('GET');
      req.flush(mockExhibitionList);
    });

    it('should retrieve featured exhibitions', () => {
      service.getFeaturedExhibitions().subscribe((exhibitions) => {
        expect(exhibitions.length).toBe(1);
        expect(exhibitions[0].featured).toBe(true);
      });

      const req = httpMock.expectOne('/api/exhibitions/featured');
      expect(req.request.method).toBe('GET');
      req.flush(mockExhibitionList);
    });

    it('should retrieve a single exhibition by slug', () => {
      const slug = 'matieres-silencieuses';
      service.getExhibition(slug).subscribe((exhibition) => {
        expect(exhibition).toEqual(mockExhibition);
      });

      const req = httpMock.expectOne(`/api/exhibitions/${slug}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockExhibition);
    });
  });

  describe('Profile API', () => {
    const mockProfile: Profile = {
      studio: 'Atelier Lumen',
      tagline: 'Mobilier sculpté & scénographies sensibles',
      bio: 'Fondé en 2017 dans une ancienne menuiserie lyonnaise...',
      contactEmail: 'studio@atelier-lumen.fr',
      location: 'Lyon, France',
      press: [
        { title: 'AD Magazine — Portrait', year: '2024' },
        { title: 'Wallpaper* — Design Awards Nominee', year: '2024' },
      ],
      awards: [
        'Prix Liliane Bettencourt pour l\'intelligence de la main — 2023',
      ],
    };

    it('should retrieve profile', () => {
      service.getProfile().subscribe((profile) => {
        expect(profile).toEqual(mockProfile);
      });

      const req = httpMock.expectOne('/api/profile');
      expect(req.request.method).toBe('GET');
      req.flush(mockProfile);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 error for furniture', () => {
      const slug = 'non-existent';
      service.getFurniture(slug).subscribe({
        next: () => fail('should have failed with 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`/api/furniture/${slug}`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 error for exhibitions', () => {
      service.getAllExhibitions().subscribe({
        next: () => fail('should have failed with 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne('/api/exhibitions');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
