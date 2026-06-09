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

  // --- Task 3: 7 nouveaux tests mode editable ---

  it('startInlineEdit met editingKey pour title', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const el = document.createElement('h1');
    el.textContent = 'X';
    document.body.appendChild(el);
    const fake = { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: el };
    cmp.startInlineEdit(fake, 'home.hero.title');
    expect(cmp.editingKey).toBe('home.hero.title');
    document.body.removeChild(el);
  });

  it('commitInlineEdit emet textFieldEdit avec key+value trim', (done) => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingKey = 'home.hero.title';
    cmp.textFieldEdit.subscribe((e: any) => {
      expect(e).toEqual({ key: 'home.hero.title', value: 'Nouveau' });
      expect(cmp.editingKey).toBeNull();
      done();
    });
    const el = document.createElement('h1');
    el.textContent = '  Nouveau  ';
    cmp.commitInlineEdit({ target: el } as any, 'home.hero.title');
  });

  it('rend les cards en <ul.editable> avec overlay quand editable=true', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('includedSlugs', new Set(['furniture:a']));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.grid.editable')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.card.editable')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.card.editable .edit-overlay')).toBeTruthy();
  });

  it('emet feedItemToggleInclude au change checkbox', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('includedSlugs', new Set(['furniture:a']));
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.feedItemToggleInclude.subscribe(e => emitted = e);
    const checkbox = fixture.nativeElement.querySelector('.incl-toggle input') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(emitted).toEqual({ kind: 'furniture', slug: 'a', included: false });
  });

  it('badge Exclu sur les cards non incluses', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('includedSlugs', new Set());  // vide -> exclu
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.excluded-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.card.excluded')).toBeTruthy();
  });

  it('emet sliderEditRequested au clic sur cartouche', () => {
    const data = { feed: [] } as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [
      { id: 's-top', zoneKey: 'home-top', title: 'Top', stories: [] },
    ]);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderEditRequested.subscribe(z => emitted = z);
    const btn = fixture.nativeElement.querySelector('.slider-edit-badge') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe('home-top');
  });

  it('overlays cards absents quand editable=false', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.edit-overlay')).toBeNull();
  });

  it('emet feedItemCropEdit au clic sur Cadrer', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('includedSlugs', new Set(['furniture:a']));
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.feedItemCropEdit.subscribe(e => emitted = e);
    const btn = fixture.nativeElement.querySelector('.crop-btn') as HTMLButtonElement;
    btn.click();
    expect(emitted).toEqual({ kind: 'furniture', slug: 'a' });
  });

  it('pas de bouton Cadrer quand editable=false', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.crop-btn')).toBeNull();
  });
});
