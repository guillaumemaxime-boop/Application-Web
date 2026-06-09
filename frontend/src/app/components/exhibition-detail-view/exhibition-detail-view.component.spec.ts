import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExhibitionDetailViewComponent } from './exhibition-detail-view.component';
import { Exhibition } from '../../models/exhibition.model';
import { DisplaySlide } from '../../models/display-slide.model';

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
    await TestBed.configureTestingModule({ imports: [ExhibitionDetailViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ExhibitionDetailViewComponent);
  });

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

  it('rend le bouton viewer quand displaySlides + showStoryButton', () => {
    const e = { ...mockExhibition, showStoryButton: true };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as unknown as DisplaySlide]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.viewer-link')).toBeTruthy();
  });

  it('ne rend pas le bouton viewer si showStoryButton=false', () => {
    const e = { ...mockExhibition, showStoryButton: false };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as unknown as DisplaySlide]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.viewer-link')).toBeNull();
  });

  it('emet viewerOpen au clic sur le bouton', () => {
    const e = { ...mockExhibition, showStoryButton: true };
    fixture.componentRef.setInput('item', e);
    fixture.componentRef.setInput('displaySlides', [{ kind: 'image' } as unknown as DisplaySlide]);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.viewerOpen.subscribe(() => emitted = true);
    (fixture.nativeElement.querySelector('.viewer-link') as HTMLButtonElement).click();
    expect(emitted).toBeTrue();
  });
});
