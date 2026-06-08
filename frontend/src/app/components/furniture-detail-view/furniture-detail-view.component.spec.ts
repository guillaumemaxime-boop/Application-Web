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
});
