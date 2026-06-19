import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ExhibitionDetailViewComponent } from './exhibition-detail-view.component';
import { Exhibition } from '../../models/exhibition.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { StoryInlineComponent } from '../story-inline/story-inline.component';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

describe('ExhibitionDetailViewComponent', () => {
  let fixture: ComponentFixture<ExhibitionDetailViewComponent>;

  const mockExhibition: Exhibition = {
    id: 'e-001', slug: 'lumen-2025', title: 'Lumen 2025',
    venue: 'Galerie Lumière', city: 'Paris', country: 'France',
    startDate: '2025-09-15', endDate: '2025-11-30',
    coverImage: 'https://example.com/cover.jpg', coverCrop: null,
    gallery: [], curator: 'Marie Dubois',
    shortDescription: 'Une exposition lumineuse.', description: 'Description longue.',
    tags: [], featured: false, showStoryLink: false, showStoryButton: false, slides: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExhibitionDetailViewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ExhibitionDetailViewComponent);
  });

  // --- Tests Task 1 (4 tests) ---

  it('affiche le titre de l\'exposition', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Lumen 2025');
  });

  it('affiche l\'eyebrow venue · city, country', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    const eyebrow = fixture.nativeElement.querySelector('.hero-content .eyebrow');
    expect(eyebrow.textContent).toContain('Galerie Lumière');
    expect(eyebrow.textContent).toContain('Paris');
    expect(eyebrow.textContent).toContain('France');
  });

  it('rend le canvas cover dans .hero-bg', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-bg app-cropped-image-canvas')).toBeTruthy();
  });

  it('rend null state quand item est null', () => {
    fixture.componentRef.setInput('item', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero')).toBeNull();
  });

  // --- Tests Task 2 (7 tests) ---

  it('affiche la lead et la description', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.intro .lead').textContent).toContain('Une exposition');
    expect(fixture.nativeElement.querySelector('.intro .body').textContent).toContain('Description longue');
  });

  it('affiche l\'eyebrow Commissariat — curator', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    const eyebrows = fixture.nativeElement.querySelectorAll('.eyebrow');
    expect(Array.from(eyebrows).some((el: any) => el.textContent.includes('Commissariat — Marie Dubois'))).toBeTrue();
  });

  it('ne rend pas la section galerie quand gallery est vide', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery')).toBeNull();
  });

  it('rend une figure par item de galerie', () => {
    const e = { ...mockExhibition, gallery: [
      { url: 'https://e.com/a.jpg', crop: null },
      { url: 'https://e.com/b.jpg', crop: null },
    ]};
    fixture.componentRef.setInput('item', e);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.gallery figure').length).toBe(2);
  });

  it('mode public ne rend pas de story (pas de bouton viewer)', () => {
    const e = { ...mockExhibition, showStoryButton: true };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as unknown as DisplaySlide]);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.viewer-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
  });

  it('mode editable rend le bloc d\'auteur (badge + story-manager-bar)', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-admin-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-story-manager-bar')).toBeTruthy();
  });

  it('mode editable rend le bloc story-inline même sans slide (pour pouvoir ajouter)', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('displaySlides', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeTruthy();
  });

  // --- Tests Task 3 (9 tests) ---

  it('decompose l\'eyebrow en 3 spans editable en mode editable', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const segments = fixture.nativeElement.querySelectorAll('.eyebrow-segment');
    expect(segments.length).toBe(3);
  });

  it('emet coverEdit=crop au clic sur Cadrer', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.coverEdit.subscribe((a: any) => emitted = a);
    const btn = fixture.nativeElement.querySelector('.hero-bg .edit-btn[aria-label="Cadrer la cover"]') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe('crop');
  });

  it('emet textFieldClick au clic sur le titre', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.textFieldClick.subscribe((n: any) => emitted = n);
    (fixture.nativeElement.querySelector('h1.editable-text') as HTMLElement).click();
    expect(emitted).toBe('title');
  });

  it('emet textFieldClick au clic sur startDate', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.textFieldClick.subscribe((n: any) => emitted = n);
    (fixture.nativeElement.querySelector('.date-segment') as HTMLElement).click();
    expect(emitted).toBe('startDate');
  });

  it('startDateEdit affiche un input type=date', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.startDateEdit({ preventDefault: () => {}, stopPropagation: () => {} } as any, 'startDate');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeTruthy();
  });

  it('commitDateEdit emet dateFieldEdit avec valeur du input', (done) => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingDateField = 'startDate';
    cmp.dateFieldEdit.subscribe((e: any) => {
      expect(e).toEqual({ field: 'startDate', value: '2026-01-15' });
      done();
    });
    const input = document.createElement('input');
    input.type = 'date';
    input.value = '2026-01-15';
    cmp.commitDateEdit({ target: input } as any, 'startDate');
  });

  it('emet galleryItemEdit remove au clic sur ×', () => {
    const e = { ...mockExhibition, gallery: [{ url: 'a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    let emitted: any = null;
    fixture.componentInstance.galleryItemEdit.subscribe((ev: any) => emitted = ev);
    const btn = fixture.nativeElement.querySelector('.gallery-img-wrap .edit-btn[aria-label="Retirer cette image"]') as HTMLButtonElement;
    btn.click();
    expect(emitted).toEqual({ index: 0, action: 'remove' });
  });

  it('emet galleryAdd au clic sur la tuile +', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.galleryAdd.subscribe(() => emitted = true);
    (fixture.nativeElement.querySelector('.gallery-add-btn') as HTMLButtonElement).click();
    expect(emitted).toBeTrue();
  });

  it('overlays absents quand editable=false', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-bg .edit-overlay')).toBeNull();
  });

  // --- Tests Task 4 (4 tests) ---

  it('mode editable : rend <app-tag-editor> au lieu des routerLinks', () => {
    fixture.componentRef.setInput('item', { ...mockExhibition, tags: ['design'] });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.tags-list a.tag-chip')).toBeNull();
  });

  it('mode public : rend les routerLinks, pas de tag-editor', () => {
    fixture.componentRef.setInput('item', { ...mockExhibition, tags: ['design'] });
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tags-list a.tag-chip')).toBeTruthy();
  });

  it('mode editable : tag-editor visible même si tags vide', () => {
    fixture.componentRef.setInput('item', { ...mockExhibition, tags: [] });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeTruthy();
  });

  it('tagsChange du tag-editor est réémis par la vue', () => {
    fixture.componentRef.setInput('item', { ...mockExhibition, tags: [] });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.tagsChange.subscribe((v: string[]) => emitted = v);
    const editor = fixture.debugElement.query(By.css('app-tag-editor'));
    editor.triggerEventHandler('tagsChange', ['neuf']);
    expect(emitted).toEqual(['neuf']);
  });

  it('le bloc story-inline est en mode editable et relaie slidesChange', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('displaySlides', [{ type: 'image', id: 's1', position: 0, src: 'https://e.com/a.jpg', caption: null } as DisplaySlide]);
    fixture.detectChanges();
    const si = fixture.debugElement.query(By.directive(StoryInlineComponent)).componentInstance as StoryInlineComponent;
    expect(si.editable).toBeTrue();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let received: any = null;
    fixture.componentInstance.storySlidesChange.subscribe((s: any[]) => received = s);
    si.slidesChange.emit([{ id: 'x' } as any]);
    expect(received).toEqual([{ id: 'x' }]);
  });

  it('relaie imageReplaceRequest depuis story-inline', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('displaySlides', [{ type: 'image', id: 's1', position: 0, src: 'https://e.com/a.jpg', caption: null } as DisplaySlide]);
    fixture.detectChanges();
    const si = fixture.debugElement.query(By.directive(StoryInlineComponent)).componentInstance as StoryInlineComponent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let id: any = null;
    fixture.componentInstance.storyImageReplaceRequest.subscribe((v: string) => id = v);
    si.imageReplaceRequest.emit('s1');
    expect(id).toBe('s1');
  });

  it('relaie imageCropRequest depuis story-inline via storyImageCropRequest', () => {
    fixture.componentRef.setInput('item', mockExhibition);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('displaySlides', [{ type: 'image', id: 's1', position: 0, src: 'https://e.com/a.jpg', caption: null } as DisplaySlide]);
    fixture.detectChanges();
    const si = fixture.debugElement.query(By.directive(StoryInlineComponent)).componentInstance as StoryInlineComponent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let id: any = null;
    (fixture.componentInstance as any).storyImageCropRequest.subscribe((v: string) => id = v);
    si.imageCropRequest.emit('s1');
    expect(id).toBe('s1');
  });

  // --- Tests Task lightbox galerie expo ---

  it('galerie publique : chaque image est un bouton qui émet galleryImageOpen avec l\'index', () => {
    const e = { ...mockExhibition, gallery: [
      { url: 'https://e.com/a.jpg', crop: null },
      { url: 'https://e.com/b.jpg', crop: null },
    ]};
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('.gallery-open-btn');
    expect(btns.length).toBe(2);
    let received: any = null;
    fixture.componentInstance.galleryImageOpen.subscribe((i: number) => received = i);
    (btns[1] as HTMLButtonElement).click();
    expect(received).toBe(1);
  });

  it('mode editable : pas de bouton lightbox', () => {
    const e = { ...mockExhibition, gallery: [
      { url: 'https://e.com/a.jpg', crop: null },
    ]};
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery-open-btn')).toBeNull();
  });

  it('cover hero : canvas en priority, pas lazy', () => {
    const e = { ...mockExhibition, gallery: [{ url: 'https://e.com/a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    const hero = canvases.find(c => c.componentInstance.priority === true);
    expect(hero).toBeTruthy();
    expect(hero!.componentInstance.lazy).toBeFalse();
  });

  it('galerie publique : canvas en lazy', () => {
    const e = { ...mockExhibition, gallery: [{ url: 'https://e.com/a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    expect(canvases.some(c => c.componentInstance.lazy === true)).toBeTrue();
  });
});
