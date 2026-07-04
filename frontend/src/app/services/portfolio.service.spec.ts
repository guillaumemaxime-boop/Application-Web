import { TestBed } from '@angular/core/testing';
import { PortfolioService } from './portfolio.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Furniture } from '../models/furniture.model';
import { Exhibition } from '../models/exhibition.model';
import { Profile } from '../models/profile.model';
import { Photo } from '../models/photo.model';
import { HomePageData } from '../models/home.model';

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
        gallery: [{ url: 'https://example.com/onde-1.jpg' }],
        shortDescription: 'Une silhouette inspirée du mouvement de la mer',
        description: 'Description détaillée',
        dimensions: ['Hauteur 92 cm'],
        designer: 'Milo GUILLAUME Design',
        featured: true,
        showStoryLink: true,
        showStoryButton: true,
        slides: [],
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

    it('should create a furniture via POST', () => {
      const payload: Partial<Furniture> = {
        title: 'Nouvelle pièce',
        category: 'Sièges',
        year: 2026,
        featured: false,
      };

      service.createFurniture(payload).subscribe((created) => {
        expect(created).toEqual(mockFurniture);
      });

      const req = httpMock.expectOne('/api/furniture');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockFurniture);
    });

    it('should update a furniture via PUT', () => {
      const slug = 'onde-fauteuil-sculpte';
      const payload: Partial<Furniture> = { title: 'Onde — Édition limitée', featured: true };

      service.updateFurniture(slug, payload).subscribe((updated) => {
        expect(updated).toEqual(mockFurniture);
      });

      const req = httpMock.expectOne(`/api/furniture/${slug}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(mockFurniture);
    });

    it('should delete a furniture via DELETE', () => {
      const slug = 'onde-fauteuil-sculpte';
      let completed = false;

      service.deleteFurniture(slug).subscribe({
        next: () => { completed = true; },
      });

      const req = httpMock.expectOne(`/api/furniture/${slug}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(completed).toBe(true);
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
        gallery: [{ url: 'https://example.com/matieres-1.jpg' }],
        curator: 'Léa Bornand',
        shortDescription: 'Une exploration du silence comme matière première',
        description: 'Description détaillée',
        tags: ['Mobilier', 'Sculpture'],
        featured: true,
        showStoryLink: true,
        showStoryButton: true,
        slides: [],
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

    it('should create an exhibition via POST', () => {
      const payload: Partial<Exhibition> = {
        title: 'Nouvelle exposition',
        startDate: '2026-06-01',
        endDate: '2026-08-30',
        featured: false,
      };

      service.createExhibition(payload).subscribe((created) => {
        expect(created).toEqual(mockExhibition);
      });

      const req = httpMock.expectOne('/api/exhibitions');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockExhibition);
    });

    it('should update an exhibition via PUT', () => {
      const slug = 'matieres-silencieuses';
      const payload: Partial<Exhibition> = { title: 'Matières — édition 2', featured: true };

      service.updateExhibition(slug, payload).subscribe((updated) => {
        expect(updated).toEqual(mockExhibition);
      });

      const req = httpMock.expectOne(`/api/exhibitions/${slug}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(mockExhibition);
    });

    it('should delete an exhibition via DELETE', () => {
      const slug = 'matieres-silencieuses';
      let completed = false;

      service.deleteExhibition(slug).subscribe({
        next: () => { completed = true; },
      });

      const req = httpMock.expectOne(`/api/exhibitions/${slug}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(completed).toBe(true);
    });
  });

  describe('Profile API', () => {
    const mockProfile: Profile = {
      studio: 'Milo GUILLAUME Design',
      tagline: 'Mobilier sculpté & scénographies sensibles',
      bio: 'Fondé en 2017 dans une ancienne menuiserie parisienne...',
      contactEmail: 'studio@atelier-lumen.fr',
      location: 'Paris, France',
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

  describe('Site Content API', () => {
    const mockContent = {
      'home.hero.eyebrow': 'Milo GUILLAUME Design — Paris, France',
      'home.hero.title': 'Mobilier sculpté',
      'profile.studio': 'Milo GUILLAUME Design',
    };

    it('should retrieve all site content', () => {
      service.getContent().subscribe((content) => {
        expect(content).toEqual(mockContent);
      });

      const req = httpMock.expectOne('/api/content');
      expect(req.request.method).toBe('GET');
      req.flush(mockContent);
    });

    it('should share a single HTTP request across multiple subscribers (cache)', () => {
      let firstResult: any = null;
      let secondResult: any = null;

      service.getContent().subscribe(c => firstResult = c);
      service.getContent().subscribe(c => secondResult = c);

      // expectOne() échouerait si plusieurs requêtes étaient émises
      const req = httpMock.expectOne('/api/content');
      req.flush(mockContent);

      expect(firstResult).toEqual(mockContent);
      expect(secondResult).toEqual(mockContent);
    });

    it('should serve subsequent subscribers from cache without new HTTP call', () => {
      service.getContent().subscribe();
      const req = httpMock.expectOne('/api/content');
      req.flush(mockContent);

      let lateResult: any = null;
      service.getContent().subscribe(c => lateResult = c);

      // Aucune nouvelle requête : expectNone n'échoue pas
      httpMock.expectNone('/api/content');
      expect(lateResult).toEqual(mockContent);
    });

    it('should invalidate the cache when updateContent succeeds', () => {
      service.getContent().subscribe();
      httpMock.expectOne('/api/content').flush(mockContent);

      const updates = { 'home.hero.eyebrow': 'Nouveau titre' };
      service.updateContent(updates).subscribe();
      httpMock.expectOne('/api/admin/content').flush(mockContent);

      // Après update, un nouveau getContent doit refaire une requête GET
      service.getContent().subscribe();
      const refreshReq = httpMock.expectOne('/api/content');
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush(mockContent);
    });

    it('should update site content via PUT on /api/admin/content', () => {
      const updates = { 'home.hero.eyebrow': 'Nouveau titre' };

      service.updateContent(updates).subscribe((result) => {
        expect(result).toEqual(mockContent);
      });

      const req = httpMock.expectOne('/api/admin/content');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush(mockContent);
    });
  });

  describe('Photos API', () => {
    const mockPhoto: Photo = {
      id: 'ph-abc12345',
      filename: '8f3a1b2c-uuid.jpg',
      originalName: 'portrait-studio.jpg',
      url: '/api/photos/files/8f3a1b2c-uuid.jpg',
      uploadedAt: '2026-05-10T18:47:54.746Z',
      tags: [],
    };

    it('should retrieve all photos', () => {
      service.getPhotos().subscribe((photos) => {
        expect(photos.length).toBe(1);
        expect(photos[0]).toEqual(mockPhoto);
      });

      const req = httpMock.expectOne('/api/photos');
      expect(req.request.method).toBe('GET');
      req.flush([mockPhoto]);
    });

    it('should return an empty list when no photos exist', () => {
      service.getPhotos().subscribe((photos) => {
        expect(photos).toEqual([]);
      });

      const req = httpMock.expectOne('/api/photos');
      req.flush([]);
    });

    it('should upload a photo via POST on /api/admin/photos with FormData', () => {
      const file = new File([new Uint8Array([1, 2, 3])], 'portrait-studio.jpg', { type: 'image/jpeg' });

      service.uploadPhoto(file).subscribe((photo) => {
        expect(photo).toEqual(mockPhoto);
      });

      const req = httpMock.expectOne('/api/admin/photos');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      expect(req.request.body.get('file')).toBe(file);
      req.flush(mockPhoto);
    });

    it('optimizeAllPhotos appelle POST /api/admin/photos/optimize et retourne le rapport', () => {
      let result: any = null;
      service.optimizeAllPhotos().subscribe(r => { result = r; });
      const req = httpMock.expectOne('/api/admin/photos/optimize');
      expect(req.request.method).toBe('POST');
      req.flush({ count: 5, optimized: 3, bytesSaved: 1500000 });
      expect(result).toEqual({ count: 5, optimized: 3, bytesSaved: 1500000 });
    });

    it('should delete a photo via DELETE on /api/admin/photos/:id', () => {
      let completed = false;

      service.deletePhoto('ph-abc12345').subscribe({
        next: () => { completed = true; },
      });

      const req = httpMock.expectOne('/api/admin/photos/ph-abc12345');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(completed).toBe(true);
    });

    it('should handle 413 error when file is too large', () => {
      const file = new File([], 'huge.jpg', { type: 'image/jpeg' });

      service.uploadPhoto(file).subscribe({
        next: () => fail('should have failed'),
        error: (err) => expect(err.status).toBe(413),
      });

      const req = httpMock.expectOne('/api/admin/photos');
      req.flush('Payload Too Large', { status: 413, statusText: 'Payload Too Large' });
    });

    it('should update photo tags via PUT on /api/admin/photos/:id/tags', () => {
      const updated: Photo = { ...mockPhoto, tags: ['studio', 'atelier'] };

      service.updatePhotoTags('ph-abc12345', ['Studio', 'Atelier']).subscribe((photo) => {
        expect(photo).toEqual(updated);
      });

      const req = httpMock.expectOne('/api/admin/photos/ph-abc12345/tags');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ tags: ['Studio', 'Atelier'] });
      req.flush(updated);
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

  describe('Home API', () => {
    it('should fetch home data', () => {
      const mock: HomePageData = { categories: [], exhibitions: [], feed: [] };

      service.getHome().subscribe(data => expect(data).toEqual(mock as any));

      const req = httpMock.expectOne('/api/home');
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

  });

  describe('Stories & Sliders API', () => {
    it('getStories appelle GET /api/stories avec query params', () => {
      service.getStories('furniture', 'f-001').subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/stories' && r.params.get('ownerKind') === 'furniture' && r.params.get('ownerId') === 'f-001');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('createSlider appelle POST /api/admin/sliders', () => {
      service.createSlider({ title: 'Test', zoneKey: 'home-top' }).subscribe();
      const req = httpMock.expectOne('/api/admin/sliders');
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'sld-x', slug: 'test', title: 'Test', zoneKey: 'home-top', storyIds: [] });
    });

    it('replaceSliderStories appelle PUT /api/admin/sliders/:id/stories avec body', () => {
      service.replaceSliderStories('sld-1', ['st-a', 'st-b']).subscribe();
      const req = httpMock.expectOne('/api/admin/sliders/sld-1/stories');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ storyIds: ['st-a', 'st-b'] });
      req.flush({ id: 'sld-1', slug: '', title: '', zoneKey: null, storyIds: ['st-a', 'st-b'] });
    });

    it('getAllAdminStories appelle GET /api/admin/stories/all', () => {
      service.getAllAdminStories().subscribe();
      const req = httpMock.expectOne('/api/admin/stories/all');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getStoriesForManagement appelle GET /api/admin/stories/manage', () => {
      service.getStoriesForManagement().subscribe();
      const req = httpMock.expectOne('/api/admin/stories/manage');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getPublicSliders appelle GET /api/sliders', () => {
      service.getPublicSliders().subscribe();
      const req = httpMock.expectOne('/api/sliders');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('getAdminSliders appelle GET /api/admin/sliders', () => {
      service.getAdminSliders().subscribe();
      const req = httpMock.expectOne('/api/admin/sliders');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('updateSlider appelle PUT /api/admin/sliders/:id', () => {
      service.updateSlider('sld-1', { title: 'T', zoneKey: null }).subscribe();
      const req = httpMock.expectOne('/api/admin/sliders/sld-1');
      expect(req.request.method).toBe('PUT');
      req.flush({ id: 'sld-1', slug: 't', title: 'T', zoneKey: null, storyIds: [] });
    });

    it('deleteSlider appelle DELETE /api/admin/sliders/:id', () => {
      service.deleteSlider('sld-1').subscribe();
      const req = httpMock.expectOne('/api/admin/sliders/sld-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('Tags API', () => {
    it('getAllTags appelle GET /api/tags', () => {
      service.getAllTags().subscribe(tags => {
        expect(tags).toEqual(['bois', 'sculpture']);
      });
      const req = httpMock.expectOne('/api/tags');
      expect(req.request.method).toBe('GET');
      req.flush(['bois', 'sculpture']);
    });
  });

  describe('Admin Feed API', () => {
    it('getAdminFeed appelle GET /api/admin/home/feed', () => {
      service.getAdminFeed().subscribe(entries => {
        expect(entries).toEqual([{ kind: 'furniture', slug: 'onde' }]);
      });
      const req = httpMock.expectOne('/api/admin/home/feed');
      expect(req.request.method).toBe('GET');
      req.flush([{ kind: 'furniture', slug: 'onde' }]);
    });

    it('replaceAdminFeed appelle PUT /api/admin/home/feed et invalide le cache home', () => {
      const entries = [{ kind: 'furniture' as const, slug: 'onde' }];
      service.replaceAdminFeed(entries).subscribe(result => {
        expect(result).toEqual(entries);
      });
      const req = httpMock.expectOne('/api/admin/home/feed');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(entries);
      req.flush(entries);
    });
  });

  describe('Admin Categories API', () => {
    it('getAdminCategories appelle GET /api/admin/categories', () => {
      service.getAdminCategories().subscribe(cats => {
        expect(cats.length).toBe(1);
      });
      const req = httpMock.expectOne('/api/admin/categories');
      expect(req.request.method).toBe('GET');
      req.flush([{ category: 'Sièges', visible: true, position: 0 }]);
    });

    it('updateAdminCategory appelle PUT /api/admin/categories/:cat et invalide le cache home', () => {
      const view = { category: 'Sièges', visible: false, position: 1, coverImage: 'c.jpg' };
      service.updateAdminCategory('Sièges', view).subscribe(result => {
        expect(result.category).toBe('Sièges');
      });
      const req = httpMock.expectOne(r => r.url === '/api/admin/categories/Si%C3%A8ges');
      expect(req.request.method).toBe('PUT');
      req.flush(view);
    });
  });

  describe('Admin Exhibitions Meta API', () => {
    it('getAdminExhibitionsMeta appelle GET /api/admin/exhibitions-meta', () => {
      service.getAdminExhibitionsMeta().subscribe(meta => {
        expect(meta.length).toBe(1);
      });
      const req = httpMock.expectOne('/api/admin/exhibitions-meta');
      expect(req.request.method).toBe('GET');
      req.flush([{ slug: 'salon', visible: true, position: 0 }]);
    });

    it('updateAdminExhibitionMeta appelle PUT /api/admin/exhibitions-meta/:slug et invalide le cache home', () => {
      const view = { slug: 'salon', visible: false, position: 2 };
      service.updateAdminExhibitionMeta('salon', view).subscribe(result => {
        expect(result.slug).toBe('salon');
      });
      const req = httpMock.expectOne(r => r.url === '/api/admin/exhibitions-meta/salon');
      expect(req.request.method).toBe('PUT');
      req.flush(view);
    });
  });

  describe('Contact API', () => {
    it('submitContact appelle POST /api/contact et renvoie un accusé de réception', () => {
      const input = {
        name: 'Alice', email: 'a@b.fr', phone: '0600000000',
        interest: 'other' as const, message: 'Bonjour',
        furnitureId: '', furnitureSlug: '', furnitureTitle: '',
      };
      const ack = { id: 'c-1', createdAt: '2026-01-01T00:00:00Z', status: 'NEW' };
      service.submitContact(input).subscribe(result => {
        expect(result.id).toBe('c-1');
      });
      const req = httpMock.expectOne('/api/contact');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      req.flush(ack);
    });
  });

  describe('Videos API', () => {
    it('getVideos GET /api/admin/videos', () => {
      service.getVideos().subscribe(v => expect(v.length).toBe(1));
      const req = httpMock.expectOne('/api/admin/videos');
      expect(req.request.method).toBe('GET');
      req.flush([{
        id: 'vid-1', status: 'READY', originalName: 'a.mp4', url: null, poster: null,
        hls: null, durationSeconds: null, width: null, height: null, createdAt: null,
        errorMessage: null, usedBy: [],
      }]);
    });

    it('deleteVideoById DELETE /api/admin/videos/:id', () => {
      service.deleteVideoById('vid-1').subscribe();
      const req = httpMock.expectOne('/api/admin/videos/vid-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
