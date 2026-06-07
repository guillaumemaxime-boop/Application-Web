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

  const mockFurniture: Furniture = {
    id: 'f-001', title: 'Onde', slug: 'onde-fauteuil-sculpte', category: 'Sièges',
    material: 'Chêne', year: 2024, coverImage: 'f.jpg', gallery: [],
    shortDescription: '', description: '', dimensions: [], designer: '',
    featured: true,
    showStoryLink: true, showStoryButton: true, slides: [{ type: 'cover', id: 's1', position: 0, src: 'cover.jpg' }] as any,
  };

  const mockExhibition: Exhibition = {
    id: 'e-001', title: 'Matières', slug: 'matieres-silencieuses',
    venue: 'Galerie Joseph', city: 'Paris', country: 'France',
    startDate: '2025-03-14', endDate: '2025-05-18',
    coverImage: 'e.jpg', gallery: [], curator: '',
    shortDescription: '', description: '', tags: [],
    featured: true,
    showStoryLink: true, showStoryButton: true, slides: [{ type: 'cover', id: 's2', position: 0, src: 'cover2.jpg' }] as any,
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

  const mockExhibitionStory: Story = {
    id: 'st-e-001',
    ownerKind: 'exhibition',
    ownerId: 'e-001',
    title: 'Matières',
    coverImage: 'e.jpg',
    slug: 'matieres-silencieuses-principale',
    position: 0,
    createdAt: '2025-01-01T00:00:00Z',
  };

  const mockFurnitureStoryWithSlides: StoryWithSlides = {
    story: mockFurnitureStory,
    slides: [{ type: 'cover', id: 's1', position: 0, src: 'cover.jpg' }] as any,
    ownerShowStoryLink: true,
    ownerSlug: 'onde-fauteuil-sculpte',
  };

  const mockExhibitionStoryWithSlides: StoryWithSlides = {
    story: mockExhibitionStory,
    slides: [{ type: 'cover', id: 's2', position: 0, src: 'cover2.jpg' }] as any,
    ownerShowStoryLink: true,
    ownerSlug: 'matieres-silencieuses',
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', [
      'getHome', 'getFurniture', 'getExhibition', 'getContent', 'getPublicSliders',
      'getStoryBySlug', 'getStories',
    ]);
    spy.getHome.and.returnValue(of(mockHome));
    spy.getFurniture.and.returnValue(of(mockFurniture));
    spy.getExhibition.and.returnValue(of(mockExhibition));
    spy.getContent.and.returnValue(of({}));
    spy.getPublicSliders.and.returnValue(of([]));
    spy.getStories.and.callFake((kind, _ownerId) =>
      of(kind === 'furniture' ? [mockFurnitureStory] : [mockExhibitionStory])
    );
    spy.getStoryBySlug.and.callFake((slug) =>
      of(slug === mockFurnitureStory.slug ? mockFurnitureStoryWithSlides : mockExhibitionStoryWithSlides)
    );

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

  it('cardLink returns furniture detail route', () => {
    expect((component as any).cardLink(mockHome.feed[0])).toBe('/mobilier/onde-fauteuil-sculpte');
  });

  it('cardLink returns exhibition detail route', () => {
    expect((component as any).cardLink(mockHome.feed[1])).toBe('/expositions/matieres-silencieuses');
  });

  it('renders feed card excerpt when description is provided', () => {
    const excerpts = fixture.nativeElement.querySelectorAll('.feed .card .excerpt') as NodeListOf<HTMLElement>;
    expect(excerpts.length).toBe(2);
    expect(excerpts[0].textContent).toContain('Fauteuil en chêne');
    expect(excerpts[1].textContent).toContain('calcaire');
  });

  it('heroTitle returns the default text when content is empty', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({}));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect((f.componentInstance as any).heroTitle()).toContain('Mobilier');
  });

  it('heroTitle uses the configured value when content provides a non-empty title', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({ 'home.hero.title': 'Atelier\nLumen' }));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const title = (f.componentInstance as any).heroTitle();
    expect(title).toContain('Atelier');
    expect(title).toContain('\n');
    // XSS: la chaine ne doit JAMAIS contenir de <br/> brut ni d'HTML injecte.
    expect(title).not.toContain('<br/>');
    expect(title).not.toContain('<');
  });

  it('renders heroTitle as plain text without injecting HTML', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({
      'home.hero.title': 'Innocent<script>alert(1)</script>\nLigne 2',
    }));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    const h1 = f.nativeElement.querySelector('.hero h1.hero-title') as HTMLElement;
    expect(h1).not.toBeNull();
    // textContent contient le texte litteral (incluant les < > non-interpretes)
    expect(h1.textContent).toContain('<script>');
    // innerHTML est encode (les < sont &lt;), donc aucune balise script reelle
    expect(h1.querySelector('script')).toBeNull();
    expect(h1.querySelector('br')).toBeNull();
  });

  it('heroTitle falls back to the default when content has a whitespace-only title', () => {
    portfolioServiceSpy.getContent.and.returnValue(of({ 'home.hero.title': '   ' }));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect((f.componentInstance as any).heroTitle()).toContain('Mobilier');
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
});
