import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { Photo } from '../../models/photo.model';
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
    designer: 'Milo GUILLAUME Design',
    featured: true,
    slides: [],
  };

  const mockPhoto: Photo = {
    id: 'ph-abc12345',
    filename: '8f3a1b2c-uuid.jpg',
    originalName: 'portrait-studio.jpg',
    url: '/api/photos/files/8f3a1b2c-uuid.jpg',
    uploadedAt: '2026-05-10T18:47:54.746Z',
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
    slides: [],
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
      'getContent',
      'updateContent',
      'getPhotos',
      'uploadPhoto',
      'deletePhoto',
    ]);
    spy.getAllFurniture.and.returnValue(of([mockFurniture]));
    spy.getAllExhibitions.and.returnValue(of([mockExhibition]));
    spy.createFurniture.and.returnValue(of(mockFurniture));
    spy.updateFurniture.and.returnValue(of(mockFurniture));
    spy.deleteFurniture.and.returnValue(of(void 0));
    spy.createExhibition.and.returnValue(of(mockExhibition));
    spy.updateExhibition.and.returnValue(of(mockExhibition));
    spy.deleteExhibition.and.returnValue(of(void 0));
    spy.getContent.and.returnValue(of({}));
    spy.updateContent.and.returnValue(of({}));
    spy.getPhotos.and.returnValue(of([]));
    spy.uploadPhoto.and.returnValue(of(mockPhoto));
    spy.deletePhoto.and.returnValue(of(void 0));

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
    expect(tabs.length).toBe(4);
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
    expect(tabs[2].classList.contains('active')).toBe(false);
    expect(tabs[3].classList.contains('active')).toBe(false);
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

    it('should display an error when exhibition loading fails', () => {
      portfolioServiceSpy.getAllExhibitions.and.returnValue(throwError(() => new Error('boom')));

      const fix = TestBed.createComponent(AdminComponent);
      fix.detectChanges();

      expect(fix.componentInstance['message']()).toContain('Impossible');
      expect(fix.componentInstance['messageType']()).toBe('error');
    });

    it('should display an error when exhibition save fails', () => {
      portfolioServiceSpy.createExhibition.and.returnValue(throwError(() => new Error('boom')));

      component.newExhibition();
      component['exhibitionForm'].patchValue({
        title: 'X', startDate: '2026-01-01', endDate: '2026-02-01',
      });
      component.saveExhibition();

      expect(component['messageType']()).toBe('error');
      expect(component['saving']()).toBe(false);
    });

    it('should display an error when furniture delete fails', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      portfolioServiceSpy.deleteFurniture.and.returnValue(throwError(() => new Error('boom')));

      component.removeFurniture(mockFurniture);

      expect(component['messageType']()).toBe('error');
    });

    it('should set loadingPhotos to false when refreshPhotos fails', () => {
      portfolioServiceSpy.getPhotos.and.returnValue(throwError(() => new Error('boom')));

      const fix = TestBed.createComponent(AdminComponent);
      fix.detectChanges();

      expect(fix.componentInstance['loadingPhotos']()).toBeFalse();
    });
  });

  describe('Edge cases for nullable fields', () => {
    it('should handle furniture with nullable optional fields', () => {
      const partial = {
        ...mockFurniture,
        material: undefined as any,
        designer: undefined as any,
        coverImage: undefined as any,
        gallery: undefined as any,
        dimensions: undefined as any,
        shortDescription: undefined as any,
        description: undefined as any,
      };
      component.loadFurniture(partial);
      const v = component['furnitureForm'].value;
      expect(v.material).toBe('');
      expect(v.designer).toBe('');
      expect(v.coverImage).toBe('');
      expect(v.gallery).toBe('');
      expect(v.dimensions).toBe('');
    });

    it('should handle exhibition with nullable optional fields', () => {
      const partial = {
        ...mockExhibition,
        venue: undefined as any,
        city: undefined as any,
        country: undefined as any,
        curator: undefined as any,
        coverImage: undefined as any,
        gallery: undefined as any,
        tags: undefined as any,
        shortDescription: undefined as any,
        description: undefined as any,
      };
      component.loadExhibition(partial);
      const v = component['exhibitionForm'].value;
      expect(v.venue).toBe('');
      expect(v.city).toBe('');
      expect(v.gallery).toBe('');
      expect(v.tags).toBe('');
    });

    it('should treat empty slug input as undefined when creating', () => {
      component.newFurniture();
      component['furnitureForm'].patchValue({
        title: 'New', category: 'Tables', year: 2026, slug: '',
      });
      component.saveFurniture();
      const payload = portfolioServiceSpy.createFurniture.calls.mostRecent().args[0];
      expect(payload.slug).toBeUndefined();
    });

    it('should reset editing form when removing the furniture currently being edited', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.loadFurniture(mockFurniture);
      expect(component['editingFurnitureSlug']()).toBe(mockFurniture.slug);

      component.removeFurniture(mockFurniture);

      expect(component['editingFurnitureSlug']()).toBeNull();
    });

    it('should reset editing form when removing the exhibition currently being edited', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.loadExhibition(mockExhibition);
      expect(component['editingExhibitionSlug']()).toBe(mockExhibition.slug);

      component.removeExhibition(mockExhibition);

      expect(component['editingExhibitionSlug']()).toBeNull();
    });
  });

  describe('Photos tab', () => {
    beforeEach(() => {
      portfolioServiceSpy.getPhotos.and.returnValue(of([mockPhoto]));
    });

    it('should switch to the photos tab', () => {
      component.switchTab('photos');
      fixture.detectChanges();

      const tabs = fixture.nativeElement.querySelectorAll('.tabs button');
      expect(tabs[3].classList.contains('active')).toBe(true);
      expect(tabs[0].classList.contains('active')).toBe(false);
    });

    it('should call getPhotos on init', () => {
      expect(portfolioServiceSpy.getPhotos).toHaveBeenCalled();
    });

    it('should display photos grid after loading', () => {
      component['photos'].set([mockPhoto]);
      component.switchTab('photos');
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('.photo-card');
      expect(cards.length).toBe(1);
    });

    it('should show empty state when no photos', () => {
      component['photos'].set([]);
      component.switchTab('photos');
      fixture.detectChanges();

      const empty = fixture.nativeElement.querySelector('.photos-empty');
      expect(empty).toBeTruthy();
    });

    it('should open viewer when openViewer is called', () => {
      component.openViewer(mockPhoto);

      expect(component['viewingPhoto']()).toEqual(mockPhoto);
    });

    it('should close viewer when closeViewer is called', () => {
      component.openViewer(mockPhoto);
      component.closeViewer();

      expect(component['viewingPhoto']()).toBeNull();
    });

    it('should close viewer on Escape key', () => {
      component.openViewer(mockPhoto);
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component['viewingPhoto']()).toBeNull();
    });

    it('should not close viewer on other keys', () => {
      component.openViewer(mockPhoto);
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(component['viewingPhoto']()).toEqual(mockPhoto);
    });

    it('should remove photo when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component['photos'].set([mockPhoto]);

      component.removePhoto(mockPhoto);

      expect(portfolioServiceSpy.deletePhoto).toHaveBeenCalledWith(mockPhoto.id);
    });

    it('should not remove photo when not confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.removePhoto(mockPhoto);

      expect(portfolioServiceSpy.deletePhoto).not.toHaveBeenCalled();
    });

    it('should remove photo from local list after deletion', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component['photos'].set([mockPhoto]);

      component.removePhoto(mockPhoto);

      expect(component['photos']()).toEqual([]);
    });

    it('should show error flash when deletePhoto fails', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      portfolioServiceSpy.deletePhoto.and.returnValue(throwError(() => new Error('boom')));

      component.removePhoto(mockPhoto);

      expect(component['messageType']()).toBe('error');
    });

    it('should do nothing when uploadFiles receives no files', () => {
      const event = { target: { files: null, value: '' } } as unknown as Event;

      component.uploadFiles(event);

      expect(portfolioServiceSpy.uploadPhoto).not.toHaveBeenCalled();
      expect(component['uploading']()).toBeFalse();
    });

    it('should show error flash and stop uploading when uploadPhoto fails', () => {
      portfolioServiceSpy.uploadPhoto.and.returnValue(throwError(() => new Error('upload failed')));

      const mockFile = new File([], 'fail.jpg', { type: 'image/jpeg' });
      const mockFileList = { 0: mockFile, length: 1, item: (_: number) => mockFile } as unknown as FileList;
      const event = { target: { files: mockFileList, value: '' } } as unknown as Event;

      component.uploadFiles(event);

      expect(component['messageType']()).toBe('error');
      expect(component['uploading']()).toBeFalse();
    });

    it('should do nothing on Escape when viewer and picker are both closed', () => {
      component.closeViewer();
      component.closePicker();

      component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component['viewingPhoto']()).toBeNull();
      expect(component['photoPicker']()).toBeNull();
    });
  });

  describe('Photo picker', () => {
    it('should open picker and set target', () => {
      component.openPicker('furniture-cover');

      expect(component['photoPicker']()).toBe('furniture-cover');
    });

    it('should close picker', () => {
      component.openPicker('furniture-cover');
      component.closePicker();

      expect(component['photoPicker']()).toBeNull();
    });

    it('should close picker on Escape key', () => {
      component.openPicker('furniture-gallery');
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component['photoPicker']()).toBeNull();
    });

    it('should set coverImage when selecting photo for furniture-cover', () => {
      component.openPicker('furniture-cover');
      component.selectPhoto(mockPhoto);

      expect(component['furnitureForm'].get('coverImage')!.value).toBe(mockPhoto.url);
      expect(component['photoPicker']()).toBeNull();
    });

    it('should append url to gallery when selecting photo for furniture-gallery', () => {
      component['furnitureForm'].patchValue({ gallery: 'https://existing.com/img.jpg' });
      component.openPicker('furniture-gallery');
      component.selectPhoto(mockPhoto);

      const gallery = component['furnitureForm'].get('gallery')!.value as string;
      expect(gallery).toContain('https://existing.com/img.jpg');
      expect(gallery).toContain(mockPhoto.url);
      expect(component['photoPicker']()).toBe('furniture-gallery');
    });

    it('should set gallery url directly when gallery field is empty', () => {
      component['furnitureForm'].patchValue({ gallery: '' });
      component.openPicker('furniture-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['furnitureForm'].get('gallery')!.value).toBe(mockPhoto.url);
    });

    it('should set coverImage when selecting photo for exhibition-cover', () => {
      component.openPicker('exhibition-cover');
      component.selectPhoto(mockPhoto);

      expect(component['exhibitionForm'].get('coverImage')!.value).toBe(mockPhoto.url);
      expect(component['photoPicker']()).toBeNull();
    });

    it('should append url to gallery when selecting photo for exhibition-gallery', () => {
      component.openPicker('exhibition-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['exhibitionForm'].get('gallery')!.value).toBe(mockPhoto.url);
      expect(component['photoPicker']()).toBe('exhibition-gallery');
    });

    it('pickerIsGallery should return true for gallery targets', () => {
      component.openPicker('furniture-gallery');
      expect(component['pickerIsGallery']()).toBe(true);

      component.openPicker('exhibition-gallery');
      expect(component['pickerIsGallery']()).toBe(true);
    });

    it('pickerIsGallery should return false for cover targets', () => {
      component.openPicker('furniture-cover');
      expect(component['pickerIsGallery']()).toBe(false);

      component.openPicker('exhibition-cover');
      expect(component['pickerIsGallery']()).toBe(false);
    });

    it('should not call getPhotos when photos are already loaded', () => {
      component['photos'].set([mockPhoto]);
      portfolioServiceSpy.getPhotos.calls.reset();

      component.openPicker('furniture-cover');

      expect(portfolioServiceSpy.getPhotos).not.toHaveBeenCalled();
    });

    it('should append url to exhibition-gallery when gallery field already has content', () => {
      component['exhibitionForm'].patchValue({ gallery: 'https://existing.com/img.jpg' });
      component.openPicker('exhibition-gallery');
      component.selectPhoto(mockPhoto);

      const gallery = component['exhibitionForm'].get('gallery')!.value as string;
      expect(gallery).toContain('https://existing.com/img.jpg');
      expect(gallery).toContain(mockPhoto.url);
    });
  });

  describe('Texts tab', () => {
    it('should switch to the texts tab', () => {
      component.switchTab('texts');
      fixture.detectChanges();

      const tabs = fixture.nativeElement.querySelectorAll('.tabs button');
      expect(tabs[2].classList.contains('active')).toBe(true);
      expect(tabs[0].classList.contains('active')).toBe(false);
    });

    it('should call getContent on init and populate the texts form', () => {
      expect(portfolioServiceSpy.getContent).toHaveBeenCalled();
      expect(component['textsForm'].value.home_hero_eyebrow).toBe('');
    });

    it('should populate texts form with content from the service', async () => {
      portfolioServiceSpy.getContent.and.returnValue(of({
        'home.hero.eyebrow': 'Mon Studio',
        'home.hero.title': 'Titre héro',
        'profile.studio': 'Studio Test',
      }));

      const fix = TestBed.createComponent(AdminComponent);
      fix.detectChanges();
      await fix.whenStable();

      expect(fix.componentInstance['textsForm'].value.home_hero_eyebrow).toBe('Mon Studio');
      expect(fix.componentInstance['textsForm'].value.profile_studio).toBe('Studio Test');
    });

    it('should call updateContent when saveTexts is invoked', () => {
      component.saveTexts();

      expect(portfolioServiceSpy.updateContent).toHaveBeenCalled();
      expect(component['saving']()).toBeFalse();
    });

    it('should show success flash after saveTexts succeeds', () => {
      component.saveTexts();

      expect(component['message']()).toContain('succès');
      expect(component['messageType']()).toBe('success');
    });

    it('should show error flash when saveTexts fails', () => {
      portfolioServiceSpy.updateContent.and.returnValue(throwError(() => new Error('boom')));

      component.saveTexts();

      expect(component['messageType']()).toBe('error');
      expect(component['saving']()).toBeFalse();
    });

    it('should show error flash when getContent fails on init', () => {
      portfolioServiceSpy.getContent.and.returnValue(throwError(() => new Error('boom')));

      const fix = TestBed.createComponent(AdminComponent);
      fix.detectChanges();

      expect(fix.componentInstance['loadingTexts']()).toBeFalse();
    });
  });
});
