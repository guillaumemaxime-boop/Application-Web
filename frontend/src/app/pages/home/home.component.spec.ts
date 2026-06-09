import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HomePageData } from '../../models/home.model';
import { Story, StoryWithSlides } from '../../models/story.model';

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
      { kind: 'furniture', slug: 'onde-fauteuil-sculpte', title: 'Onde', cover: 'f.jpg', subtitle: 'Sièges · 2024', description: 'Fauteuil en chêne massif sculpté.' },
      { kind: 'exhibition', slug: 'matieres-silencieuses', title: 'Matières', cover: 'e.jpg', subtitle: 'Galerie Joseph · mars 2025', description: 'Sept pièces taillées dans le calcaire.' },
    ],
  };

  const mockFurnitureStory: Story = {
    id: 'st-f-001',
    ownerKind: 'furniture',
    ownerId: 'f-001',
    title: 'Onde',
    coverImage: 'f.jpg',
    slug: 'onde-fauteuil-sculpte-principale',
    position: 0,
    createdAt: '2025-01-01T00:00:00Z',
  };

  const mockFurnitureStoryWithSlides: StoryWithSlides = {
    story: mockFurnitureStory,
    slides: [{ type: 'cover', id: 's1', position: 0, src: 'cover.jpg' }] as any,
    ownerShowStoryLink: true,
    ownerSlug: 'onde-fauteuil-sculpte',
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', [
      'getHome', 'getContent', 'getPublicSliders', 'getStoryBySlug',
    ]);
    spy.getHome.and.returnValue(of(mockHome));
    spy.getContent.and.returnValue(of({}));
    spy.getPublicSliders.and.returnValue(of([]));
    spy.getStoryBySlug.and.returnValue(of(mockFurnitureStoryWithSlides));

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

  it('passe data/content/sliders/viewerQueue a app-home-view', () => {
    const view = fixture.nativeElement.querySelector('app-home-view');
    expect(view).not.toBeNull();
  });

  it('closeViewer empties the queue', () => {
    (component as any).viewerQueue.set([{ title: 't', subtitle: 's', slides: [] }]);
    (component as any).closeViewer();
    expect((component as any).viewerQueue().length).toBe(0);
  });

  it('openStoryFromSlider ajoute une slide link quand ownerShowStoryLink est true', () => {
    const storyRef = { slug: mockFurnitureStory.slug, ownerLabel: 'Tabouret Aurore' };
    portfolioServiceSpy.getStoryBySlug.and.returnValue(of({
      story: mockFurnitureStory,
      slides: [],
      ownerShowStoryLink: true,
      ownerSlug: 'onde-fauteuil-sculpte',
    }));
    (component as any).openStoryFromSlider(storyRef);
    const queue = (component as any).viewerQueue();
    expect(queue.length).toBe(1);
    const slides = queue[0].slides as Array<{ type: string }>;
    expect(slides[slides.length - 1].type).toBe('link');
  });

  it('openStoryFromSlider n\'ajoute pas de slide link quand ownerShowStoryLink est false', () => {
    const storyRef = { slug: mockFurnitureStory.slug, ownerLabel: 'Tabouret Aurore' };
    portfolioServiceSpy.getStoryBySlug.and.returnValue(of({
      story: mockFurnitureStory,
      slides: [],
      ownerShowStoryLink: false,
      ownerSlug: 'onde-fauteuil-sculpte',
    }));
    (component as any).openStoryFromSlider(storyRef);
    const queue = (component as any).viewerQueue();
    expect(queue.length).toBe(1);
    const slides = queue[0].slides as Array<{ type: string }>;
    expect(slides.every(s => s.type !== 'link')).toBeTrue();
  });

  it('ngOnInit error callback stoppe le LoadingService sans planter', () => {
    portfolioServiceSpy.getHome.and.returnValue(throwError(() => new Error('réseau')));
    const f = TestBed.createComponent(HomeComponent);
    expect(() => f.detectChanges()).not.toThrow();
    expect((f.componentInstance as any).data()).toBeNull();
  });

  it('openStoryFromSlider utilise un tableau vide quand slides est null', () => {
    const storyRef = { slug: mockFurnitureStory.slug, ownerLabel: 'Tabouret Aurore' };
    portfolioServiceSpy.getStoryBySlug.and.returnValue(of({
      story: mockFurnitureStory,
      slides: null as any,
      ownerShowStoryLink: false,
      ownerSlug: 'onde-fauteuil-sculpte',
    }));
    (component as any).openStoryFromSlider(storyRef);
    const queue = (component as any).viewerQueue();
    expect(queue.length).toBe(1);
    expect(Array.isArray(queue[0].slides)).toBeTrue();
  });
});
