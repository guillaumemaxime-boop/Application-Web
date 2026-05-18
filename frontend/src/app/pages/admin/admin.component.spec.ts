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
    expect(tabs.length).toBe(7);
    expect(tabs[0].classList.contains('active')).toBe(true);
    for (let i = 1; i < tabs.length; i++) {
      expect(tabs[i].classList.contains('active')).toBe(false);
    }
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
      expect(component['furnitureGallery']()).toEqual(mockFurniture.gallery);
      // mockFurniture.dimensions = ['Hauteur 92 cm', 'Largeur 78 cm']
      expect(v.dimH).toBe(92);
      expect(v.dimW).toBe(78);
      expect(v.dimD).toBeNull();
      expect(v.dimNotes).toBe('');
    });

    it('should call createFurniture when saving without an editing slug', () => {
      component.newFurniture();
      component['furnitureForm'].patchValue({
        title: 'Nouvelle pièce',
        category: 'Tables',
        year: 2026,
        dimW: 60,
        dimH: 80,
      });
      component['furnitureGallery'].set(['https://img/1.jpg', 'https://img/2.jpg']);

      component.saveFurniture();

      expect(portfolioServiceSpy.createFurniture).toHaveBeenCalled();
      const payload = portfolioServiceSpy.createFurniture.calls.mostRecent().args[0];
      expect(payload.title).toBe('Nouvelle pièce');
      expect(payload.category).toBe('Tables');
      expect(payload.gallery).toEqual(['https://img/1.jpg', 'https://img/2.jpg']);
      expect(payload.dimensions).toEqual(['L 60 cm', 'H 80 cm']);
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
      expect(component['exhibitionTags']()).toEqual(mockExhibition.tags);
    });

    it('should call createExhibition when saving without an editing slug', () => {
      component.newExhibition();
      component['exhibitionForm'].patchValue({
        title: 'Nouvelle expo',
        startDate: '2026-06-01',
        endDate: '2026-08-30',
      });
      component['exhibitionTags'].set(['Sculpture', 'Lumière']);

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

  describe('Exhibition tags (chips input)', () => {
    function evt(value = ''): Event {
      return { preventDefault: () => {}, target: { value } } as unknown as Event;
    }

    it('addExhibitionTag pushes the trimmed value and clears the input', () => {
      component.newExhibition();
      component['newExhibitionTag'].set('  Sculpture  ');
      component.addExhibitionTag(evt());
      expect(component['exhibitionTags']()).toEqual(['Sculpture']);
      expect(component['newExhibitionTag']()).toBe('');
    });

    it('addExhibitionTag ignores empty values', () => {
      component.newExhibition();
      component['newExhibitionTag'].set('   ');
      component.addExhibitionTag(evt());
      expect(component['exhibitionTags']()).toEqual([]);
    });

    it('addExhibitionTag dedupes existing tags', () => {
      component.newExhibition();
      component['exhibitionTags'].set(['Bois']);
      component['newExhibitionTag'].set('Bois');
      component.addExhibitionTag(evt());
      expect(component['exhibitionTags']()).toEqual(['Bois']);
      expect(component['newExhibitionTag']()).toBe('');
    });

    it('removeExhibitionTag removes the matching tag', () => {
      component['exhibitionTags'].set(['Bois', 'Lumière']);
      component.removeExhibitionTag('Bois');
      expect(component['exhibitionTags']()).toEqual(['Lumière']);
    });

    it('onTagBackspace pops the last tag when input is empty', () => {
      component['exhibitionTags'].set(['A', 'B']);
      component['newExhibitionTag'].set('');
      component.onTagBackspace(evt());
      expect(component['exhibitionTags']()).toEqual(['A']);
    });

    it('onTagBackspace does nothing when input has text', () => {
      component['exhibitionTags'].set(['A']);
      component['newExhibitionTag'].set('foo');
      component.onTagBackspace(evt());
      expect(component['exhibitionTags']()).toEqual(['A']);
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
      expect(component['furnitureGallery']()).toEqual([]);
      expect(v.dimW).toBeNull();
      expect(v.dimD).toBeNull();
      expect(v.dimH).toBeNull();
      expect(v.dimNotes).toBe('');
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
      expect(component['exhibitionGallery']()).toEqual([]);
      expect(component['exhibitionTags']()).toEqual([]);
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

    it('should append url to furniture gallery signal when selecting photo for furniture-gallery', () => {
      component['furnitureGallery'].set(['https://existing.com/img.jpg']);
      component.openPicker('furniture-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['furnitureGallery']()).toEqual(['https://existing.com/img.jpg', mockPhoto.url]);
      expect(component['photoPicker']()).toBe('furniture-gallery');
    });

    it('should push url to furniture gallery when empty', () => {
      component['furnitureGallery'].set([]);
      component.openPicker('furniture-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['furnitureGallery']()).toEqual([mockPhoto.url]);
    });

    it('should not duplicate when same url is selected twice for furniture-gallery', () => {
      component['furnitureGallery'].set([mockPhoto.url]);
      component.openPicker('furniture-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['furnitureGallery']()).toEqual([mockPhoto.url]);
    });

    it('should set coverImage when selecting photo for exhibition-cover', () => {
      component.openPicker('exhibition-cover');
      component.selectPhoto(mockPhoto);

      expect(component['exhibitionForm'].get('coverImage')!.value).toBe(mockPhoto.url);
      expect(component['photoPicker']()).toBeNull();
    });

    it('should append url to exhibition gallery signal when selecting photo for exhibition-gallery', () => {
      component['exhibitionGallery'].set([]);
      component.openPicker('exhibition-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['exhibitionGallery']()).toEqual([mockPhoto.url]);
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

    it('should append url to exhibition gallery when it already has content', () => {
      component['exhibitionGallery'].set(['https://existing.com/img.jpg']);
      component.openPicker('exhibition-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['exhibitionGallery']()).toEqual(['https://existing.com/img.jpg', mockPhoto.url]);
    });
  });

  describe('Dimensions parsing & serialization', () => {
    it('parses Largeur / Profondeur / Hauteur formats', () => {
      component.loadFurniture({
        ...mockFurniture,
        dimensions: ['Largeur 78 cm', 'Profondeur 60 cm', 'Hauteur 92 cm'],
      });
      const v = component['furnitureForm'].value;
      expect(v.dimW).toBe(78);
      expect(v.dimD).toBe(60);
      expect(v.dimH).toBe(92);
      expect(v.dimNotes).toBe('');
    });

    it('parses L / P / H short formats', () => {
      component.loadFurniture({
        ...mockFurniture,
        dimensions: ['L 50', 'P 40', 'H 60'],
      });
      const v = component['furnitureForm'].value;
      expect(v.dimW).toBe(50);
      expect(v.dimD).toBe(40);
      expect(v.dimH).toBe(60);
    });

    it('puts unrecognized lines into dimNotes', () => {
      component.loadFurniture({
        ...mockFurniture,
        dimensions: ['L 50', 'Diamètre assise 45 cm', 'Empilable jusqu\'à 5'],
      });
      const v = component['furnitureForm'].value;
      expect(v.dimW).toBe(50);
      expect(v.dimNotes).toBe('Diamètre assise 45 cm\nEmpilable jusqu\'à 5');
    });

    it('serializes L / P / H values into "L X cm" format and appends notes', () => {
      component.newFurniture();
      component['furnitureForm'].patchValue({
        title: 'X', category: 'Tables', year: 2026,
        dimW: 80, dimD: 60, dimH: 75,
        dimNotes: 'Diamètre 45 cm\nEmpilable',
      });
      component.saveFurniture();
      const payload = portfolioServiceSpy.createFurniture.calls.mostRecent().args[0];
      expect(payload.dimensions).toEqual(['L 80 cm', 'P 60 cm', 'H 75 cm', 'Diamètre 45 cm', 'Empilable']);
    });

    it('omits absent dimensions from serialization', () => {
      component.newFurniture();
      component['furnitureForm'].patchValue({
        title: 'X', category: 'Tables', year: 2026,
        dimW: 80, dimH: 75,
      });
      component.saveFurniture();
      const payload = portfolioServiceSpy.createFurniture.calls.mostRecent().args[0];
      expect(payload.dimensions).toEqual(['L 80 cm', 'H 75 cm']);
    });

    it('handles decimal values with comma in source', () => {
      component.loadFurniture({
        ...mockFurniture,
        dimensions: ['L 80,5 cm'],
      });
      expect(component['furnitureForm'].value.dimW).toBe(80.5);
    });
  });

  describe('Gallery thumbnails (reorder & remove)', () => {
    it('removeFurnitureGalleryImage removes the matching url', () => {
      component['furnitureGallery'].set(['a.jpg', 'b.jpg', 'c.jpg']);
      component.removeFurnitureGalleryImage('b.jpg');
      expect(component['furnitureGallery']()).toEqual(['a.jpg', 'c.jpg']);
    });

    it('onFurnitureGalleryReorder reorders by the given index list', () => {
      component['furnitureGallery'].set(['a.jpg', 'b.jpg', 'c.jpg']);
      component.onFurnitureGalleryReorder([2, 0, 1]);
      expect(component['furnitureGallery']()).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
    });

    it('removeExhibitionGalleryImage removes the matching url', () => {
      component['exhibitionGallery'].set(['x.jpg', 'y.jpg']);
      component.removeExhibitionGalleryImage('x.jpg');
      expect(component['exhibitionGallery']()).toEqual(['y.jpg']);
    });

    it('onExhibitionGalleryReorder reorders by the given index list', () => {
      component['exhibitionGallery'].set(['x.jpg', 'y.jpg']);
      component.onExhibitionGalleryReorder([1, 0]);
      expect(component['exhibitionGallery']()).toEqual(['y.jpg', 'x.jpg']);
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
        'profile.contactEmail': 'studio@test.fr',
      }));

      const fix = TestBed.createComponent(AdminComponent);
      fix.detectChanges();
      await fix.whenStable();

      expect(fix.componentInstance['textsForm'].value.home_hero_eyebrow).toBe('Mon Studio');
      expect(fix.componentInstance['textsForm'].value.profile_contactEmail).toBe('studio@test.fr');
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

  describe('analytics tab', () => {
    afterEach(() => {
      delete (window as any).__UMAMI__;
    });

    it('rend une iframe Umami quand websiteId et shareToken sont definis', () => {
      (window as any).__UMAMI__ = { websiteId: 'wid-123', shareToken: 'tok-abc' };
      component['tab'].set('analytics');
      fixture.detectChanges();

      const iframe = fixture.nativeElement.querySelector('iframe.umami-frame') as HTMLIFrameElement | null;
      expect(iframe).withContext('iframe rendue').not.toBeNull();
      expect(iframe!.src).toContain('/umami/share/tok-abc/wid-123');
    });

    it('affiche un message de fallback si la config Umami est absente', () => {
      (window as any).__UMAMI__ = undefined;
      component['tab'].set('analytics');
      fixture.detectChanges();

      const iframe = fixture.nativeElement.querySelector('iframe.umami-frame');
      const fallback = fixture.nativeElement.querySelector('.umami-fallback');
      expect(iframe).toBeNull();
      expect(fallback).withContext('message de fallback rendu').not.toBeNull();
      expect(fallback!.textContent).toContain('Configuration analytics manquante');
    });

    it('affiche un message de fallback si shareToken est manquant', () => {
      (window as any).__UMAMI__ = { websiteId: 'wid-123', shareToken: '' };
      component['tab'].set('analytics');
      fixture.detectChanges();

      const iframe = fixture.nativeElement.querySelector('iframe.umami-frame');
      const fallback = fixture.nativeElement.querySelector('.umami-fallback');
      expect(iframe).toBeNull();
      expect(fallback).not.toBeNull();
    });
  });

  describe('Home tab', () => {
    beforeEach(() => {
      portfolioServiceSpy.getAdminFeed = jasmine.createSpy('getAdminFeed').and.returnValue(of([
        { kind: 'furniture', slug: 'onde-fauteuil-sculpte', position: 0 },
      ])) as any;
      portfolioServiceSpy.getAdminCategories = jasmine.createSpy('getAdminCategories').and.returnValue(of([
        { category: 'Sièges', coverImage: 'cat.jpg', position: 0, visible: true },
        { category: 'Tables', coverImage: 'tbl.jpg', position: 1, visible: true },
      ])) as any;
      portfolioServiceSpy.getAdminExhibitionsMeta = jasmine.createSpy('getAdminExhibitionsMeta').and.returnValue(of([
        { slug: 'matieres-silencieuses', position: 0, visible: true },
      ])) as any;
      portfolioServiceSpy.replaceAdminFeed = jasmine.createSpy('replaceAdminFeed').and.returnValue(of([])) as any;
      portfolioServiceSpy.updateAdminCategory = jasmine.createSpy('updateAdminCategory').and.returnValue(of({} as any)) as any;
      portfolioServiceSpy.updateAdminExhibitionMeta = jasmine.createSpy('updateAdminExhibitionMeta').and.returnValue(of({} as any)) as any;

      component['switchTab']('home');
      fixture.detectChanges();
    });

    it('loadHomeTab() builds the feed items mixing included furniture and exhibitions', () => {
      const items = component['homeItems']();
      expect(items).not.toBeNull();
      expect(items!.length).toBe(2);
      expect(items!.some(i => i.included)).toBeTrue();
    });

    it('onFeedReorder reorders the items and persists the new feed', () => {
      const initial = component['homeItems']()!;
      component['onFeedReorder']([1, 0]);
      const reordered = component['homeItems']()!;
      expect(reordered[0]).toBe(initial[1]);
      expect(portfolioServiceSpy.replaceAdminFeed).toHaveBeenCalled();
    });

    it('onFeedReorder is a no-op when homeItems is null', () => {
      component['homeItems'].set(null as any);
      component['onFeedReorder']([0, 1]);
      expect(portfolioServiceSpy.replaceAdminFeed).not.toHaveBeenCalled();
    });

    it('toggleIncluded flips the included flag and persists', () => {
      const item = component['homeItems']()![0];
      const event = { target: { checked: !item.included } } as unknown as Event;
      component['toggleIncluded'](item, event);
      const after = component['homeItems']()!.find(x => x.slug === item.slug)!;
      expect(after.included).toBe(!item.included);
      expect(portfolioServiceSpy.replaceAdminFeed).toHaveBeenCalled();
    });

    it('toggleNavSection updates the corresponding signal and persists content', () => {
      const event = { target: { checked: false } } as unknown as Event;
      component['toggleNavSection']('mobilier', event);
      expect(component['navMobilierVisible']()).toBeFalse();
      expect(portfolioServiceSpy.updateContent).toHaveBeenCalledWith(jasmine.objectContaining({ 'nav.mobilier.visible': 'false' }));

      component['toggleNavSection']('expositions', { target: { checked: false } } as unknown as Event);
      expect(component['navExpositionsVisible']()).toBeFalse();

      component['toggleNavSection']('studio', { target: { checked: false } } as unknown as Event);
      expect(component['navStudioVisible']()).toBeFalse();
    });

    it('toggleNavSection flashes an error when updateContent fails', () => {
      portfolioServiceSpy.updateContent.and.returnValue(throwError(() => new Error('fail')));
      const event = { target: { checked: false } } as unknown as Event;
      component['toggleNavSection']('mobilier', event);
      expect(component['message']()).toContain('Impossible');
    });

    it('onCategoryReorder reorders categories with new positions and persists', () => {
      const before = component['categoryMeta']()!;
      component['onCategoryReorder']([1, 0]);
      const after = component['categoryMeta']()!;
      expect(after[0].category).toBe(before[1].category);
      expect(after[0].position).toBe(0);
      expect(after[1].position).toBe(1);
      expect(portfolioServiceSpy.updateAdminCategory).toHaveBeenCalled();
    });

    it('onCategoryReorder is a no-op when categoryMeta is null', () => {
      component['categoryMeta'].set(null as any);
      component['onCategoryReorder']([0, 1]);
      expect(portfolioServiceSpy.updateAdminCategory).not.toHaveBeenCalled();
    });

    it('toggleCategoryVisibility flips the visibility flag and persists', () => {
      const cat = component['categoryMeta']()![0];
      const event = { target: { checked: false } } as unknown as Event;
      component['toggleCategoryVisibility'](cat, event);
      const after = component['categoryMeta']()!.find(c => c.category === cat.category)!;
      expect(after.visible).toBeFalse();
      expect(portfolioServiceSpy.updateAdminCategory).toHaveBeenCalled();
    });

    it('onExhibitionMetaReorder reorders exhibitions with new positions and persists', () => {
      portfolioServiceSpy.getAdminExhibitionsMeta = jasmine.createSpy().and.returnValue(of([
        { slug: 'a', position: 0, visible: true },
        { slug: 'b', position: 1, visible: true },
      ])) as any;
      (portfolioServiceSpy.getAllExhibitions as jasmine.Spy).and.returnValue(of([
        { ...mockExhibition, slug: 'a' },
        { ...mockExhibition, slug: 'b' },
      ]));
      component['loadHomeTab']();
      const before = component['exhibitionsMeta']()!;
      expect(before.length).toBe(2);
      component['onExhibitionMetaReorder']([1, 0]);
      const after = component['exhibitionsMeta']()!;
      expect(after[0].slug).toBe(before[1].slug);
      expect(portfolioServiceSpy.updateAdminExhibitionMeta).toHaveBeenCalled();
    });

    it('onExhibitionMetaReorder is a no-op when exhibitionsMeta is null', () => {
      component['exhibitionsMeta'].set(null as any);
      component['onExhibitionMetaReorder']([0]);
      expect(portfolioServiceSpy.updateAdminExhibitionMeta).not.toHaveBeenCalled();
    });

    it('toggleExhibitionVisibility flips the visibility and persists', () => {
      const row = component['exhibitionsMeta']()![0];
      const event = { target: { checked: false } } as unknown as Event;
      component['toggleExhibitionVisibility'](row, event);
      const after = component['exhibitionsMeta']()!.find(r => r.slug === row.slug)!;
      expect(after.visible).toBeFalse();
      expect(portfolioServiceSpy.updateAdminExhibitionMeta).toHaveBeenCalled();
    });
  });

  describe('Typography tab', () => {
    beforeEach(() => {
      component['switchTab']('typography');
      fixture.detectChanges();
    });

    it('saveTypo sends a flat typo.* payload and flashes success', () => {
      component['typoForm'].patchValue({ title_font: 'serif', title_style: 'italic' });
      component['saveTypo']();
      expect(portfolioServiceSpy.updateContent).toHaveBeenCalledWith(jasmine.objectContaining({
        'typo.title.font': 'serif',
        'typo.title.style': 'italic',
      }));
      expect(component['message']()).toContain('Typographie');
    });

    it('saveTypo flashes an error and clears the savingTypo flag on failure', () => {
      portfolioServiceSpy.updateContent.and.returnValue(throwError(() => new Error('boom')));
      component['saveTypo']();
      expect(component['savingTypo']()).toBeFalse();
      expect(component['message']()).toContain('Erreur');
    });

    it('previewStyleFor returns a style map for the given role', () => {
      component['typoForm'].patchValue({ eyebrow_font: 'sans', eyebrow_style: 'caps' });
      const style = component['previewStyleFor']('eyebrow');
      expect(style).toBeDefined();
      expect(typeof style).toBe('object');
    });
  });
});
