import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { HomePageData } from '../../models/home.model';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockHome: HomePageData = {
    categories: [
      { category: 'Sièges', slug: 'sieges', cover: 'cat.jpg', itemSlugs: ['onde-fauteuil-sculpte'] },
    ],
    exhibitions: [
      { title: 'Matières silencieuses', slug: 'matieres-silencieuses', cover: 'exh.jpg', venue: 'Galerie Joseph', period: 'mars 2025 → mai 2025' },
    ],
    feed: [
      { kind: 'furniture', slug: 'onde-fauteuil-sculpte', title: 'Onde', cover: 'f.jpg', subtitle: 'Sièges · 2024' },
      { kind: 'exhibition', slug: 'matieres-silencieuses', title: 'Matières', cover: 'e.jpg', subtitle: 'Galerie Joseph · mars 2025' },
    ],
  };

  const mockFurniture: Furniture = {
    id: 'f-001', title: 'Onde', slug: 'onde-fauteuil-sculpte', category: 'Sièges',
    material: 'Chêne', year: 2024, coverImage: 'f.jpg', gallery: [],
    shortDescription: '', description: '', dimensions: [], designer: '',
    featured: true,
    slides: [{ type: 'cover', id: 's1', position: 0, src: 'cover.jpg' }],
  };

  const mockExhibition: Exhibition = {
    id: 'e-001', title: 'Matières', slug: 'matieres-silencieuses',
    venue: 'Galerie Joseph', city: 'Paris', country: 'France',
    startDate: '2025-03-14', endDate: '2025-05-18',
    coverImage: 'e.jpg', gallery: [], curator: '',
    shortDescription: '', description: '', tags: [],
    featured: true,
    slides: [{ type: 'cover', id: 's2', position: 0, src: 'cover2.jpg' }],
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', [
      'getHome', 'getFurniture', 'getExhibition',
    ]);
    spy.getHome.and.returnValue(of(mockHome));
    spy.getFurniture.and.returnValue(of(mockFurniture));
    spy.getExhibition.and.returnValue(of(mockExhibition));

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
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch home data on init', () => {
    expect(portfolioServiceSpy.getHome).toHaveBeenCalled();
    expect((component as any).data()).toEqual(mockHome);
  });

  it('openCategory loads each piece and fills the viewer queue', () => {
    (component as any).openCategory(mockHome.categories[0]);
    expect(portfolioServiceSpy.getFurniture).toHaveBeenCalledWith('onde-fauteuil-sculpte');
    const queue = (component as any).viewerQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].title).toBe('Onde');
  });

  it('openCategory ignores categories with no items', () => {
    portfolioServiceSpy.getFurniture.calls.reset();
    (component as any).openCategory({ category: 'Vide', slug: 'vide', cover: '', itemSlugs: [] });
    expect(portfolioServiceSpy.getFurniture).not.toHaveBeenCalled();
  });

  it('openExhibition loads the exhibition into the queue', () => {
    (component as any).openExhibition(mockHome.exhibitions[0]);
    expect(portfolioServiceSpy.getExhibition).toHaveBeenCalledWith('matieres-silencieuses');
    expect((component as any).viewerQueue().length).toBe(1);
  });

  it('openFeedItem handles furniture items', () => {
    (component as any).openFeedItem(mockHome.feed[0]);
    expect(portfolioServiceSpy.getFurniture).toHaveBeenCalledWith('onde-fauteuil-sculpte');
  });

  it('openFeedItem handles exhibition items', () => {
    (component as any).openFeedItem(mockHome.feed[1]);
    expect(portfolioServiceSpy.getExhibition).toHaveBeenCalledWith('matieres-silencieuses');
  });

  it('closeViewer empties the queue', () => {
    (component as any).viewerQueue.set([{ title: 't', subtitle: 's', slides: [] }]);
    (component as any).closeViewer();
    expect((component as any).viewerQueue().length).toBe(0);
  });
});
