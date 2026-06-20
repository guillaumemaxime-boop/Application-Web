import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { FurnitureDetailViewComponent } from './furniture-detail-view.component';
import { Furniture } from '../../models/furniture.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { StoryInlineComponent } from '../story-inline/story-inline.component';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

describe('FurnitureDetailViewComponent', () => {
  let fixture: ComponentFixture<FurnitureDetailViewComponent>;

  const mockFurniture: Furniture = {
    id: 'f-001', slug: 'tabouret-aurore', title: 'Tabouret Aurore',
    category: 'Sièges', year: 2024, material: 'Chêne et cuir',
    coverImage: 'https://example.com/cover.jpg', coverCrop: null,
    description: 'Description du tabouret.',
    shortDescription: '',
    designer: '',
    dimensions: ['H 45cm', 'L 30cm'],
    gallery: [], tags: [],
    featured: false, showStoryLink: false, showStoryButton: false,
    slides: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FurnitureDetailViewComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
    fixture = TestBed.createComponent(FurnitureDetailViewComponent);
  });

  it('affiche le titre du mobilier', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Tabouret Aurore');
  });

  it('affiche l\'eyebrow categorie · annee', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    const eyebrow = fixture.nativeElement.querySelector('.eyebrow');
    expect(eyebrow.textContent).toContain('Sièges');
    expect(eyebrow.textContent).toContain('2024');
  });

  it('rend le canvas cover dans .hero-bg', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-bg app-cropped-image-canvas')).toBeTruthy();
  });

  it('rend null state quand item est null', () => {
    fixture.componentRef.setInput('item', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero')).toBeNull();
  });

  it('affiche la description', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.description .body').textContent).toContain('Description du tabouret.');
  });

  it('ne rend pas la section galerie quand gallery est vide', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery')).toBeNull();
  });

  it('rend une figure par item de galerie', () => {
    const f = { ...mockFurniture, gallery: [
      { url: 'https://e.com/a.jpg', crop: null },
      { url: 'https://e.com/b.jpg', crop: { x: 0, y: 0, w: 50, h: 50 } },
    ]};
    fixture.componentRef.setInput('item', f);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.gallery figure').length).toBe(2);
  });

  it('mode public ne rend plus la story (story-inline ni bouton plein écran)', () => {
    fixture.componentRef.setInput('item', { ...mockFurniture, showStoryButton: true });
    fixture.componentRef.setInput('displaySlides', [{ type: 'cover', id: 's1', position: 0, src: 'https://e.com/a.jpg' } as DisplaySlide]);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
    expect(fixture.nativeElement.querySelector('.viewer-link')).toBeNull();
  });

  it('ne rend pas story-inline quand displaySlides est vide (mode non-editable)', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
  });

  it('mode editable rend le bloc story-inline même sans slide (pour pouvoir ajouter)', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('displaySlides', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeTruthy();
  });

  it('mode editable rend le bloc d\'auteur (badge + story-manager-bar)', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-admin-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-story-manager-bar')).toBeTruthy();
  });

  it('n\'affiche pas les overlays par defaut (editable=false)', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.edit-overlay')).toBeNull();
  });

  it('affiche l\'overlay hero quand editable=true', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-bg .edit-overlay')).toBeTruthy();
  });

  it('emet coverEdit=crop au clic sur Cadrer', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
    const btn = fixture.nativeElement.querySelector('.hero-bg .edit-btn[aria-label="Cadrer la cover"]') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe('crop');
  });

  it('emet coverEdit=replace au clic sur Remplacer', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.coverEdit.subscribe(a => emitted = a);
    const btn = fixture.nativeElement.querySelector('.hero-bg .edit-btn[aria-label="Remplacer la cover"]') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBe('replace');
  });

  it('emet textFieldClick au clic sur le titre', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
    const h1 = fixture.nativeElement.querySelector('h1.editable-text') as HTMLElement;
    h1.click();
    expect(emitted).toBe('title');
  });

  it('emet textFieldClick=title au keydown Enter sur le titre', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.textFieldClick.subscribe(n => emitted = n);
    const h1 = fixture.nativeElement.querySelector('h1.editable-text') as HTMLElement;
    h1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(emitted).toBe('title');
  });

  it('emet galleryItemEdit avec index + action remove', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }, { url: 'b.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.galleryItemEdit.subscribe(e => emitted = e);
    const btns = fixture.nativeElement.querySelectorAll('.gallery-img-wrap .edit-btn[aria-label="Retirer cette image"]') as NodeListOf<HTMLButtonElement>;
    btns[1].click();
    expect(emitted).toEqual({ index: 1, action: 'remove' });
  });

  it('overlays galerie absents quand editable=false', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery-img-wrap .edit-overlay')).toBeNull();
  });

  it('applique le style du role title sur le h1 quand content fournit l\'override', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('content', {
      'typo.title.font': 'helvetica',
      'typo.title.style': 'bold',
    });
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.style.fontFamily).toContain('Helvetica');
    expect(h1.style.fontWeight).toBe('600');
  });

  it('applique le style du role eyebrow sur le span eyebrow quand content fournit l\'override', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('content', {
      'typo.eyebrow.font': 'sans',
      'typo.eyebrow.style': 'italic',
    });
    fixture.detectChanges();
    const eyebrow = fixture.nativeElement.querySelector('.eyebrow') as HTMLElement;
    expect(eyebrow.style.fontFamily).toContain('Inter');
    expect(eyebrow.style.fontStyle).toBe('italic');
  });

  it('applique grid-column/grid-row depuis item.colSpan/rowSpan', () => {
    const f = { ...mockFurniture, gallery: [
      { url: 'a.jpg', crop: null, colSpan: 2, rowSpan: 3 },
    ]};
    fixture.componentRef.setInput('item', f);
    fixture.detectChanges();
    const fig = fixture.nativeElement.querySelector('.gallery figure') as HTMLElement;
    expect(fig.style.gridColumn).toBe('span 2');
    expect(fig.style.gridRow).toBe('span 3');
  });

  it('applique grid-column/grid-row avec valeur par defaut 1 si colSpan/rowSpan absent', () => {
    const f = { ...mockFurniture, gallery: [
      { url: 'a.jpg', crop: null },
    ]};
    fixture.componentRef.setInput('item', f);
    fixture.detectChanges();
    const fig = fixture.nativeElement.querySelector('.gallery figure') as HTMLElement;
    expect(fig.style.gridColumn).toBe('span 1');
    expect(fig.style.gridRow).toBe('span 1');
  });

  it('emet galleryItemResize lors du drag', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emitted: any = null;
    fixture.componentInstance.galleryItemResize.subscribe(e => emitted = e);

    const handle = fixture.nativeElement.querySelector('.resize-handle') as HTMLElement;
    expect(handle).toBeTruthy();

    const pdown = new PointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, bubbles: true });
    handle.dispatchEvent(pdown);
    const pmove = new PointerEvent('pointermove', { clientX: 400, clientY: 100, pointerId: 1, bubbles: true });
    window.dispatchEvent(pmove);

    expect(emitted).not.toBeNull();
    expect(emitted.index).toBe(0);
    expect(emitted.colSpan).toBeGreaterThanOrEqual(1);
  });

  it('resize handle absent quand editable=false', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.resize-handle')).toBeNull();
  });

  it('isEditingField renvoie true uniquement pour le champ en edition', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = 'title';
    expect(cmp.isEditingField('title')).toBeTrue();
    expect(cmp.isEditingField('description')).toBeNull();
  });

  it('startInlineEdit no-op sur category (champ combine)', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const fake = { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: document.createElement('span') };
    cmp.startInlineEdit(fake as any, 'category');
    expect(cmp.editingField).toBeNull();
  });

  it('startInlineEdit met editingField pour title', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const el = document.createElement('h1');
    el.textContent = 'Vieux titre';
    document.body.appendChild(el);
    const fake = { preventDefault: () => {}, stopPropagation: () => {}, currentTarget: el };
    cmp.startInlineEdit(fake as any, 'title');
    expect(cmp.editingField).toBe('title');
    document.body.removeChild(el);
  });

  it('commitInlineEdit emet textFieldEdit avec value trim', (done) => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = 'title';
    cmp.textFieldEdit.subscribe((e: any) => {
      expect(e).toEqual({ field: 'title', value: 'Nouveau' });
      expect(cmp.editingField).toBeNull();
      done();
    });
    const el = document.createElement('h1');
    el.textContent = '  Nouveau  ';
    cmp.commitInlineEdit({ target: el } as any, 'title');
  });

  it('commitInlineEdit no-op quand editingField different', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = 'title';
    let emitted = false;
    cmp.textFieldEdit.subscribe(() => emitted = true);
    const el = document.createElement('p');
    el.textContent = 'X';
    cmp.commitInlineEdit({ target: el } as any, 'description');
    expect(emitted).toBeFalse();
  });

  it('onInlineEnter blur quand editingField actif', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = 'title';
    const el = document.createElement('h1');
    const fake = { preventDefault: jasmine.createSpy('preventDefault'), target: el };
    cmp.onInlineEnter(fake as any, 'title');
    expect(fake.preventDefault).toHaveBeenCalled();
  });

  it('onInlineEnter emet textFieldClick quand pas en edition', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    let emitted: any = null;
    cmp.textFieldClick.subscribe((n: string) => emitted = n);
    cmp.onInlineEnter({ preventDefault: () => {}, target: document.createElement('h1') } as any, 'title');
    expect(emitted).toBe('title');
  });

  it('cancelInlineEdit reset editingField', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = 'title';
    const el = document.createElement('h1');
    cmp.cancelInlineEdit({ preventDefault: () => {}, target: el } as any);
    expect(cmp.editingField).toBeNull();
  });

  it('cancelInlineEdit no-op quand pas en edition', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = null;
    expect(() => cmp.cancelInlineEdit({ preventDefault: () => {}, target: document.createElement('h1') } as any)).not.toThrow();
  });

  it('onSpaceWhenNotEditing emet textFieldClick quand pas en edition', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    let emitted: any = null;
    cmp.textFieldClick.subscribe((n: string) => emitted = n);
    cmp.onSpaceWhenNotEditing({ preventDefault: () => {}, target: document.createElement('h1') } as any, 'title');
    expect(emitted).toBe('title');
  });

  it('onSpaceWhenNotEditing no-op quand champ en edition', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    cmp.editingField = 'title';
    let emitted = false;
    cmp.textFieldClick.subscribe(() => emitted = true);
    cmp.onSpaceWhenNotEditing({ preventDefault: () => {}, target: document.createElement('h1') } as any, 'title');
    expect(emitted).toBeFalse();
  });

  it('onResizeStart no-op quand pas dans une grille', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(() => cmp.onResizeStart({
      preventDefault: () => {}, stopPropagation: () => {},
      clientX: 0, clientY: 0, pointerId: 1, target: el,
    } as any, 0)).not.toThrow();
    document.body.removeChild(el);
  });

  it('emet galleryAdd au clic sur la tuile +Ajouter', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.galleryAdd.subscribe(() => emitted = true);
    const btn = fixture.nativeElement.querySelector('.gallery-add-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(emitted).toBeTrue();
  });

  it('section galerie editable rendue meme avec gallery vide', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.gallery-add-tile')).toBeTruthy();
  });

  it('mode editable : rend <app-tag-editor> au lieu des routerLinks', () => {
    fixture.componentRef.setInput('item', { ...mockFurniture, tags: ['bois'] });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.tags-list a.tag-chip')).toBeNull();
  });

  it('mode public : rend les routerLinks, pas de tag-editor', () => {
    fixture.componentRef.setInput('item', { ...mockFurniture, tags: ['bois'] });
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.tags-list a.tag-chip')).toBeTruthy();
  });

  it('mode editable : tag-editor visible même si tags vide', () => {
    fixture.componentRef.setInput('item', { ...mockFurniture, tags: [] });
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-tag-editor')).toBeTruthy();
  });

  it('tagsChange du tag-editor est réémis par la vue', () => {
    fixture.componentRef.setInput('item', { ...mockFurniture, tags: [] });
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
    fixture.componentRef.setInput('item', mockFurniture);
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
    fixture.componentRef.setInput('item', mockFurniture);
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
    fixture.componentRef.setInput('item', mockFurniture);
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

  it('galerie publique : chaque image est un bouton qui émet galleryImageOpen avec l\'index', () => {
    const f = { ...mockFurniture, gallery: [
      { url: 'https://e.com/a.jpg', crop: null },
      { url: 'https://e.com/b.jpg', crop: null },
    ]};
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const btns = fixture.nativeElement.querySelectorAll('.gallery-open-btn');
    expect(btns.length).toBe(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let received: any = null;
    fixture.componentInstance.galleryImageOpen.subscribe((i: number) => received = i);
    (btns[1] as HTMLButtonElement).click();
    expect(received).toBe(1);
  });

  it('mode editable : pas de bouton lightbox', () => {
    const f = { ...mockFurniture, gallery: [
      { url: 'https://e.com/a.jpg', crop: null },
      { url: 'https://e.com/b.jpg', crop: null },
    ]};
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.gallery-open-btn')).toBeNull();
  });

  it('cover hero : canvas en priority, pas lazy', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'https://e.com/a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    const hero = canvases.find(c => c.componentInstance.priority === true);
    expect(hero).toBeTruthy();
    expect(hero!.componentInstance.lazy).toBeFalse();
  });

  it('galerie publique : canvas en lazy', () => {
    const f = { ...mockFurniture, gallery: [{ url: 'https://e.com/a.jpg', crop: null }] };
    fixture.componentRef.setInput('item', f);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    const canvases = fixture.debugElement.queryAll(By.directive(CroppedImageCanvasComponent));
    expect(canvases.some(c => c.componentInstance.lazy === true)).toBeTrue();
  });

  // --- Tests bloc vidéo ---

  it('affiche le bloc vidéo en public si videoUrl', () => {
    fixture.componentRef.setInput('item', { ...mockFurniture, videoUrl: '/api/videos/files/clip.mp4' });
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.video-block app-video-player')).toBeTruthy();
  });

  it('masque le bloc vidéo si pas de videoUrl (public)', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-video-player')).toBeNull();
  });

  it('rend <app-video-field> en mode editable', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('editable', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.video-block app-video-field')).toBeTruthy();
  });
});
