import { TestBed } from '@angular/core/testing';
import { FurnitureDetailComponent } from './furniture-detail.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, Subject, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Slide } from '../../models/slide.model';
import { DisplaySlide } from '../../models/display-slide.model';
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
    gallery: ['https://example.com/onde-1.jpg'],
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
    expect(fixture.nativeElement.textContent).toContain(mockFurniture.title);
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

  it('should not render the story-inline section when slides are empty and no cover image', () => {
    setup('onde', of({ ...mockFurniture, coverImage: '', slides: [] }));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Voir en plein écran');
  });

  it('should render the story-inline section and the viewer link when slides are present', () => {
    setup('onde', of({ ...mockFurniture, slides }));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Voir en plein écran');
  });

  it('should open the viewer with a single furniture story when the link is clicked', () => {
    setup('onde', of({ ...mockFurniture, slides }));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();

    const c = fixture.componentInstance as any;
    expect(c.viewerQueue().length).toBe(0);

    const button = fixture.nativeElement.querySelector('.viewer-link') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();

    const queue = c.viewerQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].title).toBe('Onde');
    // cover prefix + 2 narrative slides + link suffix = 4
    expect(queue[0].slides.length).toBe(4);
    expect(queue[0].slides[0].type).toBe('cover');
    expect(queue[0].slides[queue[0].slides.length - 1].type).toBe('link');
    expect(queue[0].kind).toBe('furniture');
    expect(queue[0].slug).toBe('onde');
    expect(fixture.nativeElement.querySelector('app-story-viewer')).not.toBeNull();
  });

  it('should close the viewer by emptying the queue', () => {
    setup('onde', of({ ...mockFurniture, slides }));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.openViewer();
    fixture.detectChanges();
    expect(c.viewerQueue().length).toBe(1);
    c.closeViewer();
    fixture.detectChanges();
    expect(c.viewerQueue().length).toBe(0);
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

  it('enrichit la liste de slides avec cover prefix + link suffix', () => {
    const furniture: Furniture = {
      ...mockFurniture,
      slug: 'chaise-bois',
      coverImage: '/uploads/cover.jpg',
      slides: [
        { id: 's1', position: 0, type: 'image', src: '/uploads/photo.jpg', caption: 'détail' },
      ],
    };
    setup('chaise-bois', of(furniture));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const display: DisplaySlide[] = (fixture.componentInstance as any).displaySlides();
    expect(display.length).toBe(3);
    expect(display[0].type).toBe('cover');
    expect((display[0] as any).src).toBe('/uploads/cover.jpg');
    expect(display[1].type).toBe('image');
    expect(display[display.length - 1].type).toBe('link');
    expect((display[display.length - 1] as any).href).toBe('/mobilier/chaise-bois');
  });

  it('filtre les slides legacy de type cover/link recues de l API', () => {
    const furniture: Furniture = {
      ...mockFurniture,
      slug: 'x',
      coverImage: '/c.jpg',
      slides: [
        { id: 'legacy-c', position: 0, type: 'cover', src: '/legacy.jpg' },
        { id: 's1', position: 1, type: 'image', src: '/photo.jpg', caption: null },
        { id: 'legacy-l', position: 2, type: 'link', label: 'old', description: null, href: '/old' },
      ] as any,
    };
    setup('x', of(furniture));
    const fixture = TestBed.createComponent(FurnitureDetailComponent);
    fixture.detectChanges();
    const display: DisplaySlide[] = (fixture.componentInstance as any).displaySlides();
    expect(display.length).toBe(3);
    expect(display.filter((s: DisplaySlide) => s.type === 'cover').length).toBe(1);
    expect((display[0] as any).src).toBe('/c.jpg');
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
});
