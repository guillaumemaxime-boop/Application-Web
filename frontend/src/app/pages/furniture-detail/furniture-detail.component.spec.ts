import { TestBed } from '@angular/core/testing';
import { FurnitureDetailComponent } from './furniture-detail.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Slide } from '../../models/slide.model';
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
    gallery: [{ url: 'https://example.com/onde-1.jpg' }],
    shortDescription: 's',
    description: 'd',
    dimensions: ['H 90 cm'],
    designer: 'Lumen',
    featured: true,
    showStoryLink: true,
    showStoryButton: true,
    slides: [],
  };

  const slides: Slide[] = [
    { id: 's1', position: 1, type: 'image', src: 'https://example.com/s1.jpg', caption: 'Détail' },
    { id: 's2', position: 2, type: 'quote', body: 'Belle pièce.', cite: null },
  ];

  function setup(slug: string, returnValue: ReturnType<PortfolioService['getFurniture']>) {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getFurniture', 'getContent']);
    spy.getFurniture.and.returnValue(returnValue);
    spy.getContent.and.returnValue(of({}));

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
    expect(fixture.nativeElement.querySelector('app-furniture-detail-view')).not.toBeNull();
  });

  it('should render the not-found state when service errors', () => {
    setup('missing', throwError(() => new Error('404')));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('introuvable');
  });

  it('should fallback to empty slug when route param is missing', () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['getFurniture', 'getContent']);
    spy.getFurniture.and.returnValue(of(mockFurniture));
    spy.getContent.and.returnValue(of({}));

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

  it('ne rend plus le story-viewer en public (gestion stories déplacée sur /admin/stories)', () => {
    setup('onde', of({ ...mockFurniture, slides }));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-viewer')).toBeNull();
  });

  it('should open the contact form when the CTA button is clicked', () => {
    setup('onde', of(mockFurniture));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    expect(c.contactOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-contact-form')).toBeNull();

    const button = fixture.nativeElement.querySelector('.cta-btn') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();

    expect(c.contactOpen()).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-contact-form')).not.toBeNull();
  });

  it('should close the contact form on close event', () => {
    setup('onde', of(mockFurniture));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.openContact();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-contact-form')).not.toBeNull();
    c.closeContact();
    fixture.detectChanges();
    expect(c.contactOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-contact-form')).toBeNull();
  });

  it('galleryImageOpen ouvre la lightbox avec les images mappées et le bon startIndex', () => {
    const furnitureWithGallery: Furniture = {
      ...mockFurniture,
      gallery: [{ url: '/a.jpg', crop: null }, { url: '/b.jpg', crop: null }],
    };
    setup('onde', of(furnitureWithGallery));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.onGalleryImageOpen(1);
    fixture.detectChanges();
    expect(cmp.lightboxIndex()).toBe(1);
    expect(fixture.nativeElement.querySelector('app-image-lightbox')).toBeTruthy();
    expect(cmp.galleryImages().length).toBe(2);
    expect(cmp.galleryImages()[0].alt).toContain('vue 1');
  });

  it('closed referme la lightbox', () => {
    setup('onde', of(mockFurniture));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.lightboxIndex.set(0);
    fixture.detectChanges();
    cmp.lightboxIndex.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-image-lightbox')).toBeNull();
  });

});
