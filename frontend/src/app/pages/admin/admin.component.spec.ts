import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

  const mockFurniture: Furniture = {
    id: 'f-001',
    title: 'Onde — Fauteuil sculpté',
    slug: 'onde-fauteuil-sculpte',
    category: 'Sièges',
    material: 'Chêne massif & cuir tanné',
    year: 2024,
    coverImage: 'https://example.com/onde.jpg',
    gallery: ['https://example.com/onde-1.jpg', 'https://example.com/onde-2.jpg'],
    shortDescription: 'Une silhouette inspirée du mouvement de la mer',
    description: 'Description détaillée',
    dimensions: ['Hauteur 92 cm', 'Largeur 78 cm'],
    designer: 'Atelier Lumen',
    featured: true,
  };

  const mockExhibition: Exhibition = {
    id: 'e-001',
    title: 'Matières silencieuses',
    slug: 'matieres-silencieuses',
    venue: 'Galerie Joseph',
    city: 'Paris',
    country: 'France',
    startDate: '2025-03-14',
    endDate: '2025-05-18',
    coverImage: 'https://example.com/matieres.jpg',
    gallery: ['https://example.com/matieres-1.jpg'],
    curator: 'Léa Bornand',
    shortDescription: 'Une exploration du silence comme matière première',
    description: 'Description détaillée',
    tags: ['Mobilier', 'Sculpture'],
    featured: true,
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj<PortfolioService>('PortfolioService', [
      'getAllFurniture',
      'getAllExhibitions',
      'createFurniture',
      'updateFurniture',
      'deleteFurniture',
      'createExhibition',
      'updateExhibition',
      'deleteExhibition',
    ]);
    spy.getAllFurniture.and.returnValue(of([mockFurniture]));
    spy.getAllExhibitions.and.returnValue(of([mockExhibition]));
    spy.createFurniture.and.returnValue(of(mockFurniture));
    spy.updateFurniture.and.returnValue(of(mockFurniture));
    spy.deleteFurniture.and.returnValue(of(void 0));
    spy.createExhibition.and.returnValue(of(mockExhibition));
    spy.updateExhibition.and.returnValue(of(mockExhibition));
    spy.deleteExhibition.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortfolioService, useValue: spy },
      ],
    }).compileComponents();

    portfolioServiceSpy = TestBed.inject(PortfolioService) as jasmine.SpyObj<PortfolioService>;
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load furniture and exhibitions on init', () => {
    expect(portfolioServiceSpy.getAllFurniture).toHaveBeenCalled();
    expect(portfolioServiceSpy.getAllExhibitions).toHaveBeenCalled();
  });

  it('should display the furniture tab by default', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.tabs button');
    expect(tabs.length).toBe(2);
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
  });

  it('should switch to the exhibitions tab', () => {
    component.switchTab('exhibitions');
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('.tabs button');
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
  });

  describe('Furniture form', () => {
    it('should reset the form when calling newFurniture', () => {
      component.loadFurniture(mockFurniture);
      expect(component['editingFurnitureSlug']()).toBe(mockFurniture.slug);

      component.newFurniture();
      expect(component['editingFurnitureSlug']()).toBeNull();
      expect(component['furnitureForm'].value.title).toBe('');
    });

    it('should populate the form when loading an existing furniture', () => {
      component.loadFurniture(mockFurniture);
      const v = component['furnitureForm'].value;

      expect(component['editingFurnitureSlug']()).toBe(mockFurniture.slug);
      expect(v.title).toBe(mockFurniture.title);
      expect(v.category).toBe(mockFurniture.category);
      expect(v.year).toBe(mockFurniture.year);
      expect(v.gallery).toBe(mockFurniture.gallery.join('\n'));
      expect(v.dimensions).toBe(mockFurniture.dimensions.join('\n'));
      expect(v.featured).toBe(true);
    });

    it('should call createFurniture when saving without an editing slug', () => {
      component.newFurniture();
      component['furnitureForm'].patchValue({
        title: 'Nouvelle pièce',
        category: 'Tables',
        year: 2026,
        gallery: 'https://img/1.jpg\nhttps://img/2.jpg',
        dimensions: 'H 80\nL 60',
      });

      component.saveFurniture();

      expect(portfolioServiceSpy.createFurniture).toHaveBeenCalled();
      const payload = portfolioServiceSpy.createFurniture.calls.mostRecent().args[0];
      expect(payload.title).toBe('Nouvelle pièce');
      expect(payload.category).toBe('Tables');
      expect(payload.gallery).toEqual(['https://img/1.jpg', 'https://img/2.jpg']);
      expect(payload.dimensions).toEqual(['H 80', 'L 60']);
    });

    it('should call updateFurniture when saving an editing slug', () => {
      component.loadFurniture(mockFurniture);
      component['furnitureForm'].patchValue({ title: 'Onde — édition 2' });

      component.saveFurniture();

      expect(portfolioServiceSpy.updateFurniture).toHaveBeenCalled();
      const [slug, payload] = portfolioServiceSpy.updateFurniture.calls.mostRecent().args;
      expect(slug).toBe(mockFurniture.slug);
      expect(payload.title).toBe('Onde — édition 2');
    });

    it('should not save furniture when the form is invalid', () => {
      component.newFurniture();
      component.saveFurniture();

      expect(portfolioServiceSpy.createFurniture).not.toHaveBeenCalled();
    });

    it('should call deleteFurniture when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.removeFurniture(mockFurniture);

      expect(portfolioServiceSpy.deleteFurniture).toHaveBeenCalledWith(mockFurniture.slug);
    });

    it('should not call deleteFurniture when not confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.removeFurniture(mockFurniture);

      expect(portfolioServiceSpy.deleteFurniture).not.toHaveBeenCalled();
    });

    it('should refresh the furniture list after creation', () => {
      portfolioServiceSpy.getAllFurniture.calls.reset();
      component.newFurniture();
      component['furnitureForm'].patchValue({ title: 'X', category: 'Tables', year: 2026 });

      component.saveFurniture();

      expect(portfolioServiceSpy.getAllFurniture).toHaveBeenCalled();
    });
  });

  describe('Exhibition form', () => {
    it('should populate the form when loading an existing exhibition', () => {
      component.loadExhibition(mockExhibition);
      const v = component['exhibitionForm'].value;

      expect(component['editingExhibitionSlug']()).toBe(mockExhibition.slug);
      expect(v.title).toBe(mockExhibition.title);
      expect(v.startDate).toBe(mockExhibition.startDate);
      expect(v.endDate).toBe(mockExhibition.endDate);
      expect(v.tags).toBe(mockExhibition.tags.join('\n'));
    });

    it('should call createExhibition when saving without an editing slug', () => {
      component.newExhibition();
      component['exhibitionForm'].patchValue({
        title: 'Nouvelle expo',
        startDate: '2026-06-01',
        endDate: '2026-08-30',
        tags: 'Sculpture\nLumière',
      });

      component.saveExhibition();

      expect(portfolioServiceSpy.createExhibition).toHaveBeenCalled();
      const payload = portfolioServiceSpy.createExhibition.calls.mostRecent().args[0];
      expect(payload.title).toBe('Nouvelle expo');
      expect(payload.tags).toEqual(['Sculpture', 'Lumière']);
    });

    it('should call updateExhibition when saving an editing slug', () => {
      component.loadExhibition(mockExhibition);
      component['exhibitionForm'].patchValue({ title: 'Matières — édition 2' });

      component.saveExhibition();

      expect(portfolioServiceSpy.updateExhibition).toHaveBeenCalled();
      const [slug, payload] = portfolioServiceSpy.updateExhibition.calls.mostRecent().args;
      expect(slug).toBe(mockExhibition.slug);
      expect(payload.title).toBe('Matières — édition 2');
    });

    it('should not save exhibition when the form is invalid', () => {
      component.newExhibition();
      component.saveExhibition();

      expect(portfolioServiceSpy.createExhibition).not.toHaveBeenCalled();
    });

    it('should call deleteExhibition when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.removeExhibition(mockExhibition);

      expect(portfolioServiceSpy.deleteExhibition).toHaveBeenCalledWith(mockExhibition.slug);
    });
  });

  describe('Error handling', () => {
    it('should display an error when furniture loading fails', () => {
      portfolioServiceSpy.getAllFurniture.and.returnValue(throwError(() => new Error('boom')));

      const fix = TestBed.createComponent(AdminComponent);
      fix.detectChanges();

      expect(fix.componentInstance['message']()).toContain('Impossible');
      expect(fix.componentInstance['messageType']()).toBe('error');
    });

    it('should display an error when furniture save fails', () => {
      portfolioServiceSpy.createFurniture.and.returnValue(throwError(() => new Error('boom')));

      component.newFurniture();
      component['furnitureForm'].patchValue({ title: 'X', category: 'Tables', year: 2026 });
      component.saveFurniture();

      expect(component['messageType']()).toBe('error');
      expect(component['saving']()).toBe(false);
    });

    it('should display an error when exhibition delete fails', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      portfolioServiceSpy.deleteExhibition.and.returnValue(throwError(() => new Error('boom')));

      component.removeExhibition(mockExhibition);

      expect(component['messageType']()).toBe('error');
    });
  });
});
