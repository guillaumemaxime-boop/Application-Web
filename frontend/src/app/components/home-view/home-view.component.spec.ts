import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeViewComponent } from './home-view.component';
import { HomePageData } from '../../models/home.model';

describe('HomeViewComponent', () => {
  let fixture: ComponentFixture<HomeViewComponent>;

  const mockData: HomePageData = {
    feed: [],
    sliders: [],
  } as unknown as HomePageData;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeViewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeViewComponent);
  });

  it('affiche le hero eyebrow par defaut quand content vide', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .eyebrow')).toBeTruthy();
  });

  it('affiche le hero title par defaut quand content vide', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .hero-title')).toBeTruthy();
  });

  it('affiche les overrides quand content fournit eyebrow/title/lead', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('content', {
      'home.hero.eyebrow': 'Mon eyebrow',
      'home.hero.title': 'Mon titre',
      'home.hero.lead': 'Mon lead',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero .eyebrow').textContent).toContain('Mon eyebrow');
    expect(fixture.nativeElement.querySelector('.hero .hero-title').textContent).toContain('Mon titre');
    expect(fixture.nativeElement.querySelector('.hero .lead').textContent).toContain('Mon lead');
  });

  it('rend null state quand data est null', () => {
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero')).toBeNull();
  });

  it('rend une card par item du feed', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'Mobilier · 2025', cover: '/a.jpg', coverCrop: null, description: '' },
      { kind: 'exhibition', slug: 'b', title: 'B', subtitle: 'Galerie X', cover: '/b.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.feed .card').length).toBe(2);
  });

  it('affiche le badge Exposition sur les items kind=exhibition', () => {
    const data = { feed: [
      { kind: 'exhibition', slug: 'b', title: 'B', subtitle: 'X', cover: '/b.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.feed .badge').textContent).toContain('Exposition');
  });

  it('rend les news sliders dans les bonnes zones', () => {
    const data = { feed: [] } as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('sliders', [
      { id: 's-top', zoneKey: 'home-top', title: 'Top', stories: [] },
      { id: 's-bottom', zoneKey: 'home-bottom', title: 'Bottom', stories: [] },
    ]);
    fixture.detectChanges();
    const sliders = fixture.nativeElement.querySelectorAll('app-news-slider');
    expect(sliders.length).toBe(2);
  });

  it('emet storyOpen quand un slider emet', () => {
    const data = { feed: [] } as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.storyOpen.subscribe(s => emitted = s);
    (fixture.componentInstance as any).onSliderStoryOpen({ id: 'st-1' } as any);
    expect(emitted).toEqual({ id: 'st-1' } as any);
  });

  it('rend le story-viewer quand viewerQueue non vide', () => {
    const data = { feed: [] } as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('viewerQueue', [{ id: 'q1', title: 'T', subtitle: 'S', slides: [], kind: 'furniture', slug: 'q1' } as any]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-viewer')).toBeTruthy();
  });

  it('emet viewerClosed depuis le story-viewer', () => {
    const data = { feed: [] } as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.viewerClosed.subscribe(() => emitted = true);
    (fixture.componentInstance as any).onViewerClosed();
    expect(emitted).toBeTrue();
  });
});
