import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { HomeViewComponent } from './home-view.component';
import { HomePageData } from '../../models/home.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

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

  it('mode editable : barre d\'édition du slider (titre, composition, supprimer, zone)', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [{ id: 'st1' } as any] }]);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('.slider-edit-bar');
    expect(bar).toBeTruthy();
    expect(bar.querySelector('.slider-title-edit')).toBeTruthy();
    expect(bar.querySelector('.slider-compose-btn')).toBeTruthy();
    expect(bar.querySelector('.slider-delete-btn')).toBeTruthy();
    expect(bar.querySelector('.slider-zone-select')).toBeTruthy();
  });

  it('clic composition émet sliderCompositionRequested avec l\'id', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }]);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderCompositionRequested.subscribe((v: string) => emitted = v);
    (fixture.nativeElement.querySelector('.slider-compose-btn') as HTMLButtonElement).click();
    expect(emitted).toBe('sl1');
  });

  it('clic supprimer émet sliderDelete avec l\'id', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }]);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderDelete.subscribe((v: string) => emitted = v);
    (fixture.nativeElement.querySelector('.slider-delete-btn') as HTMLButtonElement).click();
    expect(emitted).toBe('sl1');
  });

  it('zone vide en editable : placeholder créer émet sliderCreate avec la zone', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', []);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderCreate.subscribe((v: string) => emitted = v);
    const createBtn = fixture.nativeElement.querySelector('.slider-create-btn');
    expect(createBtn).toBeTruthy();
    (createBtn as HTMLButtonElement).click();
    expect(emitted).toBe('home-top');
  });

  it('changement de zone émet sliderZoneChange', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }]);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderZoneChange.subscribe((v: any) => emitted = v);
    const select = fixture.nativeElement.querySelector('.slider-zone-select') as HTMLSelectElement;
    select.value = 'home-bottom';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toEqual({ id: 'sl1', zoneKey: 'home-bottom' });
  });

  it('mode public : pas de barre d\'édition ni placeholder', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', false);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slider-edit-bar')).toBeNull();
    expect(fixture.nativeElement.querySelector('.slider-create-btn')).toBeNull();
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

  it('emet feedItemOpen au clic sur Ouvrir la fiche', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('includedSlugs', new Set(['furniture:a']));
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.feedItemOpen.subscribe(e => emitted = e);
    const btn = fixture.nativeElement.querySelector('.open-btn') as HTMLButtonElement;
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

  it('card publique : canvas en lazy', () => {
    const data = { feed: [
      { kind: 'furniture', slug: 'a', title: 'A', subtitle: 'X', cover: '/a.jpg', coverCrop: null, description: '' },
    ]} as unknown as HomePageData;
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    expect(canvases.some(c => c.componentInstance.lazy === true)).toBeTrue();
  });

  it('le sélecteur de zone propose une option Désactivé (valeur vide)', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }]);
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('.slider-zone-select option')) as HTMLOptionElement[];
    const disabledOpt = options.find(o => o.value === '');
    expect(disabledOpt).toBeTruthy();
    expect(disabledOpt!.textContent).toContain('ésactiv');   // « Désactivé »
  });

  it('choisir Désactivé émet sliderZoneChange avec zoneKey null', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-top', stories: [] }]);
    fixture.detectChanges();
    let emitted: { id: string; zoneKey: string | null } | null = null;
    fixture.componentInstance.sliderZoneChange.subscribe((v: any) => emitted = v);
    const select = fixture.nativeElement.querySelector('.slider-zone-select') as HTMLSelectElement;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(emitted as any).toEqual({ id: 'sl1', zoneKey: null });
  });

  it('le sélecteur de zone est positionné sur la zone courante du slider', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', [{ id: 'sl1', slug: 'a', title: 'Actus', zoneKey: 'home-middle', stories: [] }]);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('.slider-zone-select') as HTMLSelectElement;
    expect(select.value).toBe('home-middle');
  });

  // --- Tests TDD: insérer un slider désactivé dans une zone vide ---

  it('zone vide editable avec disabledSliders : affiche un select.slider-insert-select avec option pour chaque slider désactivé', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', []);
    fixture.componentRef.setInput('disabledSliders', [{ id: 'sl9', title: 'Slider X' }]);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('select.slider-insert-select');
    expect(selects.length).toBeGreaterThan(0);
    const firstSelect = selects[0] as HTMLSelectElement;
    const opt = firstSelect.querySelector('option[value="sl9"]');
    expect(opt).toBeTruthy();
    expect(opt!.textContent).toContain('Slider X');
  });

  it('zone vide editable sans disabledSliders : pas de select.slider-insert-select', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', []);
    fixture.componentRef.setInput('disabledSliders', []);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('select.slider-insert-select');
    expect(selects.length).toBe(0);
  });

  it('choisir un slider désactivé dans home-top émet sliderAssign avec { id, zoneKey: "home-top" }', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', []);
    fixture.componentRef.setInput('disabledSliders', [{ id: 'sl9', title: 'Slider X' }]);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderAssign.subscribe((v: any) => emitted = v);
    const select = fixture.nativeElement.querySelector('select.slider-insert-select[aria-label*="home-top"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    select.value = 'sl9';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toEqual({ id: 'sl9', zoneKey: 'home-top' });
  });

  it('choisir l\'option vide dans le select insert n\'émet pas sliderAssign', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('sliders', []);
    fixture.componentRef.setInput('disabledSliders', [{ id: 'sl9', title: 'Slider X' }]);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.sliderAssign.subscribe((v: any) => emitted = v);
    const select = fixture.nativeElement.querySelector('select.slider-insert-select') as HTMLSelectElement;
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(emitted).toBeNull();
  });
});
