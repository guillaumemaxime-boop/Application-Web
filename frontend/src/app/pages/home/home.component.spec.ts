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
      { kind: 'furniture', slug: 'onde-fauteuil-sculpte', title: 'Onde', cover: 'f.jpg', subtitle: 'Sièges · 2024', description: 'Fauteuil en chêne massif sculpté.' },
      { kind: 'exhibition', slug: 'matieres-silencieuses', title: 'Matières', cover: 'e.jpg', subtitle: 'Galerie Joseph · mars 2025', description: 'Sept pièces taillées dans le calcaire.' },
    ],
  };

  const mockFurniture: Furniture = {
    id: 'f-001', title: 'Onde', slug: 'onde-fauteuil-sculpte', category: 'Sièges',
    material: 'Chêne', year: 2024, coverImage: 'f.jpg', gallery: [],
    shortDescription: '', description: '', dimensions: [], designer: '',
    featured: true,
    showStoryLink: true,
    slides: [{ type: 'cover', id: 's1', position: 0, src: 'cover.jpg' }] as any,
  };

  const mockExhibition: Exhibition = {
    id: 'e-001', title: 'Matières', slug: 'matieres-silencieuses',
    venue: 'Galerie Joseph', city: 'Paris', country: 'France',
    startDate: '2025-03-14', endDate: '2025-05-18',
    coverImage: 'e.jpg', gallery: [], curator: '',
    shortDescription: '', description: '', tags: [],
    featured: true,
    showStoryLink: true,
    slides: [{ type: 'cover', id: 's2', position: 0, src: 'cover2.jpg' }] as any,
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', [
      'getHome', 'getFurniture', 'getExhibition', 'getContent',
    ]);
    spy.getHome.and.returnValue(of(mockHome));
    spy.getFurniture.and.returnValue(of(mockFurniture));
    spy.getExhibition.and.returnValue(of(mockExhibition));
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

  it('cardLink returns furniture detail route', () => {
    expect((component as any).cardLink(mockHome.feed[0])).toBe('/mobilier/onde-fauteuil-sculpte');
  });

  it('cardLink returns exhibition detail route', () => {
    expect((component as any).cardLink(mockHome.feed[1])).toBe('/expositions/matieres-silencieuses');
  });

  it('hides the stories section when no categories and no exhibitions are visible', () => {
    portfolioServiceSpy.getHome.and.returnValue(of({ categories: [], exhibitions: [], feed: mockHome.feed }));
    const f = TestBed.createComponent(HomeComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.stories')).toBeNull();
  });

  it('shows the stories section when at least one slider is visible', () => {
    expect(fixture.nativeElement.querySelector('.stories')).not.toBeNull();
  });

  it('renders feed card excerpt when description is provided', () => {
    const excerpts = fixture.nativeElement.querySelectorAll('.feed .card .excerpt') as NodeListOf<HTMLElement>;
    expect(excerpts.length).toBe(2);
    expect(excerpts[0].textContent).toContain('Fauteuil en chêne');
    expect(excerpts[1].textContent).toContain('calcaire');
  });

  it('closeViewer empties the queue', () => {
    (component as any).viewerQueue.set([{ title: 't', subtitle: 's', slides: [] }]);
    (component as any).closeViewer();
    expect((component as any).viewerQueue().length).toBe(0);
  });
});
