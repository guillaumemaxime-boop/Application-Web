import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExhibitionDetailViewComponent } from './exhibition-detail-view.component';
import { Exhibition } from '../../models/exhibition.model';

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
});
