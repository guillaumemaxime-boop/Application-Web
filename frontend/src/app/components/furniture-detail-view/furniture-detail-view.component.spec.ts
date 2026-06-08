import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FurnitureDetailViewComponent } from './furniture-detail-view.component';
import { Furniture } from '../../models/furniture.model';
import { DisplaySlide } from '../../models/display-slide.model';

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
    await TestBed.configureTestingModule({ imports: [FurnitureDetailViewComponent] }).compileComponents();
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

  it('rend story-inline quand displaySlides non vides', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.componentRef.setInput('displaySlides', [{ type: 'cover', id: 's1', position: 0, src: 'https://e.com/a.jpg' } as DisplaySlide]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeTruthy();
  });

  it('ne rend pas story-inline quand displaySlides est vide', () => {
    fixture.componentRef.setInput('item', mockFurniture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
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
});
