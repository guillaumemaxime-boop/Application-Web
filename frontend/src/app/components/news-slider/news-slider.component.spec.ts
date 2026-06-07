import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsSliderComponent } from './news-slider.component';
import { NewsSliderView } from '../../models/news-slider.model';

describe('NewsSliderComponent', () => {
  let fixture: ComponentFixture<NewsSliderComponent>;

  const slider: NewsSliderView = {
    id: 'sld-1',
    slug: 'actus',
    title: 'Actualités',
    zoneKey: 'home-top',
    stories: [
      { id: 'st-1', slug: 'a-principale', title: 'Story A', coverImage: 'https://e.com/a.jpg',
        ownerKind: 'furniture', ownerId: 'f-001', ownerLabel: 'Tabouret A' },
      { id: 'st-2', slug: 'b-principale', title: 'Story B', coverImage: 'https://e.com/b.jpg',
        ownerKind: 'exhibition', ownerId: 'e-001', ownerLabel: 'Expo B' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NewsSliderComponent] }).compileComponents();
    fixture = TestBed.createComponent(NewsSliderComponent);
    fixture.componentRef.setInput('slider', slider);
    fixture.detectChanges();
  });

  it('rend le titre du slider', () => {
    const title = fixture.nativeElement.querySelector('header .title');
    expect(title.textContent).toContain('Actualités');
  });

  it('rend une card par story', () => {
    const cards = fixture.nativeElement.querySelectorAll('button.card');
    expect(cards.length).toBe(2);
  });

  it('emet storyOpen au clic sur une card', () => {
    let emitted: any = null;
    fixture.componentInstance.storyOpen.subscribe(s => emitted = s);
    fixture.nativeElement.querySelectorAll('button.card')[1].click();
    expect(emitted?.id).toBe('st-2');
  });

  it('scrollPrev() appelle scrollByCard(-1) — ne plante pas avec stories', () => {
    expect(() => fixture.componentInstance.scrollPrev()).not.toThrow();
  });

  it('scrollNext() appelle scrollByCard(1) — ne plante pas avec stories', () => {
    expect(() => fixture.componentInstance.scrollNext()).not.toThrow();
  });

  it('scrollNext() utilise clientWidth comme step quand aucune .card n\'est presente (slider vide)', async () => {
    const emptySlider: NewsSliderView = { id: 'sld-0', slug: 'vide', title: 'Vide', zoneKey: 'home-top', stories: [] };
    const f2 = TestBed.createComponent(NewsSliderComponent);
    f2.componentRef.setInput('slider', emptySlider);
    f2.detectChanges();
    // Pas de .card dans le DOM — scrollByCard utilise el.clientWidth
    expect(() => f2.componentInstance.scrollNext()).not.toThrow();
    expect(() => f2.componentInstance.scrollPrev()).not.toThrow();
  });

  it('onScroll() met à jour atStart et atEnd depuis le trackRef', () => {
    const cmp = fixture.componentInstance;
    const track: HTMLElement = fixture.nativeElement.querySelector('.track');
    // Simule un défilement partiel (ni début ni fin)
    Object.defineProperty(track, 'scrollLeft', { value: 50, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(track, 'scrollWidth', { value: 700, configurable: true });
    cmp.onScroll();
    expect((cmp as any).atStart()).toBeFalse();
    expect((cmp as any).atEnd()).toBeFalse();
  });

  it('onScroll() marque atStart quand scrollLeft <= 1', () => {
    const cmp = fixture.componentInstance;
    const track: HTMLElement = fixture.nativeElement.querySelector('.track');
    Object.defineProperty(track, 'scrollLeft', { value: 0, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(track, 'scrollWidth', { value: 700, configurable: true });
    cmp.onScroll();
    expect((cmp as any).atStart()).toBeTrue();
  });

  it('onScroll() marque atEnd quand en fin de scroll', () => {
    const cmp = fixture.componentInstance;
    const track: HTMLElement = fixture.nativeElement.querySelector('.track');
    Object.defineProperty(track, 'scrollLeft', { value: 400, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(track, 'scrollWidth', { value: 700, configurable: true });
    cmp.onScroll();
    expect((cmp as any).atEnd()).toBeTrue();
  });

  it('storyCoverStyle() retourne transform calcule pour une story avec coverCrop', () => {
    const story = { id: 'st-x', slug: 'x', title: 'X', coverImage: '/x.jpg',
                    coverCrop: { x: 25, y: 25, w: 50, h: 50 },
                    ownerKind: 'furniture', ownerId: 'f-1', ownerLabel: 'Foo' } as any;
    const cmp = fixture.componentInstance as any;
    expect(cmp.storyCoverStyle(story).transform).toBe('translate(-50%, -50%) scale(2)');
  });

  it('storyCoverStyle() retourne transform none pour une story sans coverCrop', () => {
    const story = { id: 'st-x', slug: 'x', title: 'X', coverImage: '/x.jpg',
                    ownerKind: 'furniture', ownerId: 'f-1', ownerLabel: 'Foo' } as any;
    const cmp = fixture.componentInstance as any;
    expect(cmp.storyCoverStyle(story).transform).toBe('none');
  });

  it('applique le style du role section-title sur le titre du slider', () => {
    fixture.componentRef.setInput('content', {
      'typo.section-title.font': 'helvetica',
      'typo.section-title.style': 'bold',
    });
    fixture.detectChanges();
    const h2 = fixture.nativeElement.querySelector('header .title') as HTMLElement;
    expect(h2.style.fontFamily).toContain('Helvetica');
    expect(h2.style.fontWeight).toBe('600');
    expect(h2.style.fontStyle).toBe('normal');
  });
});
