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

  it('should have hero section with correct content', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero');
    expect(hero).toBeTruthy();

    const eyebrow = hero.querySelector('.eyebrow');
    expect(eyebrow?.textContent).toContain('Atelier Lumen — Lyon, France');

    const h1 = hero.querySelector('h1');
    expect(h1?.textContent).toContain('Mobilier sculpté');
    expect(h1?.textContent).toContain('scénographies sensibles');

    const lead = hero.querySelector('.lead');
    expect(lead?.textContent).toContain('Depuis 2017');

    const actions = hero.querySelector('.hero-actions');
    expect(actions).toBeTruthy();
    const links = actions.querySelectorAll('.btn-link');
    expect(links.length).toBe(2);
  });

  it('should have featured furniture section', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    const featuredSection = fixture.nativeElement.querySelector('.section.featured');
    expect(featuredSection).toBeTruthy();

    const sectionHead = featuredSection.querySelector('.section-head');
    expect(sectionHead).toBeTruthy();
    expect(sectionHead.querySelector('.eyebrow')?.textContent).toContain('Pièces phares');
    expect(sectionHead.querySelector('h2')?.textContent).toContain('Une sélection d\'éditions récentes');
  });

  it('should display furniture cards when data is loaded', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('h3')?.textContent).toContain('Onde — Fauteuil sculpté');
  });

  it('should have exhibitions section', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    const exhibitionsSection = fixture.nativeElement.querySelector('.section.exhibitions');
    expect(exhibitionsSection).toBeTruthy();

    const sectionHead = exhibitionsSection.querySelector('.section-head');
    expect(sectionHead).toBeTruthy();
    expect(sectionHead.querySelector('.eyebrow')?.textContent).toContain('Expositions à l\'affiche');
    expect(sectionHead.querySelector('h2')?.textContent).toContain('Là où nos pièces prennent vie');
  });

  it('should display exhibition rows when data is loaded', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    const exhRows = fixture.nativeElement.querySelectorAll('.exh-row');
    expect(exhRows.length).toBe(1);
    expect(exhRows[0].querySelector('h3')?.textContent).toContain('Matières silencieuses');
  });

  it('should have quote section', () => {
    portfolioServiceSpy.getFeaturedFurniture.and.returnValue(of(mockFeaturedFurniture));
    portfolioServiceSpy.getFeaturedExhibitions.and.returnValue(of(mockFeaturedExhibitions));
    fixture.detectChanges();

    const quoteSection = fixture.nativeElement.querySelector('.section.quote');
    expect(quoteSection).toBeTruthy();

    const blockquote = quoteSection.querySelector('blockquote');
    expect(blockquote).toBeTruthy();
    expect(blockquote?.textContent).toContain('Le mobilier juste');

    const cite = quoteSection.querySelector('cite');
    expect(cite?.textContent).toContain('Atelier Lumen');
  });

  it('should format date range correctly', () => {
    const startDate = '2025-03-14';
    const endDate = '2025-05-18';
    const formatted = component.formatRange(startDate, endDate);

    // The exact format depends on the locale, but it should contain the dates
    expect(formatted).toContain('14');
    expect(formatted).toContain('18');
    expect(formatted).toContain('→');
  });

  it('should show loading state initially', () => {
    // Don't mock the service calls to test loading state
    fixture.detectChanges();

    expect(component.loadingFurniture()).toBe(true);
    expect(component.loadingExhibitions()).toBe(true);
  });
});
