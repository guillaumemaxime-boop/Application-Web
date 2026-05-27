import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { Exhibition } from '../../models/exhibition.model';
import { Photo } from '../../models/photo.model';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let portfolioServiceSpy: jasmine.SpyObj<PortfolioService>;

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
      'createExhibition',
      'updateExhibition',
      'deleteExhibition',
      'getContent',
      'updateContent',
      'getPhotos',
      'uploadPhoto',
      'deletePhoto',
      'getAdminFeed',
      'getAdminExhibitionsMeta',
      'replaceAdminFeed',
      'updateAdminExhibitionMeta',
    ]);
    spy.getAllFurniture.and.returnValue(of([]));
    spy.getAllExhibitions.and.returnValue(of([mockExhibition]));
    spy.createExhibition.and.returnValue(of(mockExhibition));
    spy.updateExhibition.and.returnValue(of(mockExhibition));
    spy.deleteExhibition.and.returnValue(of(void 0));
    spy.getContent.and.returnValue(of({}));
    spy.updateContent.and.returnValue(of({}));
    spy.getPhotos.and.returnValue(of([]));
    spy.uploadPhoto.and.returnValue(of(mockPhoto));
    spy.deletePhoto.and.returnValue(of(void 0));
    spy.getAdminFeed.and.returnValue(of([]));
    spy.getAdminExhibitionsMeta.and.returnValue(of([]));
    spy.replaceAdminFeed.and.returnValue(of([]));
    spy.updateAdminExhibitionMeta.and.returnValue(of({} as any));

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

  it('should load exhibitions on init', () => {
    expect(portfolioServiceSpy.getAllExhibitions).toHaveBeenCalled();
  });

  it('should display the exhibitions tab by default', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.tabs button');
    expect(tabs.length).toBe(3);
    expect(tabs[0].classList.contains('active')).toBe(true);
    for (let i = 1; i < tabs.length; i++) {
      expect(tabs[i].classList.contains('active')).toBe(false);
    }
  });

  it('should switch to the home tab', () => {
    component.switchTab('home');
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('.tabs button');
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].classList.contains('active')).toBe(true);
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
  });

  describe('Edge cases for nullable fields', () => {
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

    it('should reset editing form when removing the exhibition currently being edited', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.loadExhibition(mockExhibition);
      expect(component['editingExhibitionSlug']()).toBe(mockExhibition.slug);

      component.removeExhibition(mockExhibition);

      expect(component['editingExhibitionSlug']()).toBeNull();
    });
  });

  describe('Photo picker', () => {
    it('should open picker and set target', () => {
      component.openPicker('exhibition-cover');

      expect(component['photoPicker']()).toBe('exhibition-cover');
    });

    it('should close picker', () => {
      component.openPicker('exhibition-cover');
      component.closePicker();

      expect(component['photoPicker']()).toBeNull();
    });

    it('should close picker on Escape key', () => {
      component.openPicker('exhibition-gallery');
      component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component['photoPicker']()).toBeNull();
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
      component.openPicker('exhibition-gallery');
      expect(component['pickerIsGallery']()).toBe(true);
    });

    it('pickerIsGallery should return false for cover targets', () => {
      component.openPicker('exhibition-cover');
      expect(component['pickerIsGallery']()).toBe(false);
    });

    it('should not call getPhotos when photos are already loaded', () => {
      component['photos'].set([mockPhoto]);
      portfolioServiceSpy.getPhotos.calls.reset();

      component.openPicker('exhibition-cover');

      expect(portfolioServiceSpy.getPhotos).not.toHaveBeenCalled();
    });

    it('should append url to exhibition gallery when it already has content', () => {
      component['exhibitionGallery'].set(['https://existing.com/img.jpg']);
      component.openPicker('exhibition-gallery');
      component.selectPhoto(mockPhoto);

      expect(component['exhibitionGallery']()).toEqual(['https://existing.com/img.jpg', mockPhoto.url]);
    });
  });

  describe('Sidebar', () => {
    it('toggleSidebar flips the open state', () => {
      expect(component['sidebarOpen']()).toBeFalse();
      component['toggleSidebar']();
      expect(component['sidebarOpen']()).toBeTrue();
      component['toggleSidebar']();
      expect(component['sidebarOpen']()).toBeFalse();
    });

    it('switchTab auto-closes the sidebar (used on mobile drawer)', () => {
      component['sidebarOpen'].set(true);
      component.switchTab('home');
      expect(component['sidebarOpen']()).toBeFalse();
    });

    it('currentTabLabel reflects the active tab', () => {
      component['tab'].set('home');
      expect(component['currentTabLabel']()).toBe('Accueil');
      component['tab'].set('email');
      expect(component['currentTabLabel']()).toBe('Email');
    });
  });

  describe('Toast stack', () => {
    it('stacks multiple toasts and dismisses the targeted one', () => {
      portfolioServiceSpy.createExhibition.and.returnValue(throwError(() => new Error('boom1')));

      component.newExhibition();
      component['exhibitionForm'].patchValue({ title: 'A', startDate: '2026-01-01', endDate: '2026-02-01' });
      component.saveExhibition();

      component.newExhibition();
      component['exhibitionForm'].patchValue({ title: 'B', startDate: '2026-01-01', endDate: '2026-02-01' });
      component.saveExhibition();

      expect(component['toasts']().length).toBe(2);

      const firstId = component['toasts']()[0].id;
      component['dismissToast'](firstId);
      expect(component['toasts']().length).toBe(1);
      expect(component['toasts']()[0].id).not.toBe(firstId);
    });

    it('message() and messageType() reflect the most recent toast', () => {
      portfolioServiceSpy.createExhibition.and.returnValue(throwError(() => new Error('boom')));
      component.newExhibition();
      component['exhibitionForm'].patchValue({ title: 'A', startDate: '2026-01-01', endDate: '2026-02-01' });
      component.saveExhibition();
      expect(component['messageType']()).toBe('error');

      // Success flash after error → latest toast wins
      component['toasts'].update(list => [...list, { id: 999, text: 'OK', type: 'success' }]);
      expect(component['messageType']()).toBe('success');
      expect(component['message']()).toBe('OK');
    });
  });

  describe('Gallery thumbnails (reorder & remove)', () => {
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

  describe('Home tab', () => {
    beforeEach(() => {
      portfolioServiceSpy.getAdminFeed = jasmine.createSpy('getAdminFeed').and.returnValue(of([
        { kind: 'exhibition', slug: 'matieres-silencieuses', position: 0 },
      ])) as any;
      portfolioServiceSpy.getAdminExhibitionsMeta = jasmine.createSpy('getAdminExhibitionsMeta').and.returnValue(of([
        { slug: 'matieres-silencieuses', position: 0, visible: true },
      ])) as any;
      portfolioServiceSpy.replaceAdminFeed = jasmine.createSpy('replaceAdminFeed').and.returnValue(of([])) as any;
      portfolioServiceSpy.updateAdminExhibitionMeta = jasmine.createSpy('updateAdminExhibitionMeta').and.returnValue(of({} as any)) as any;

      component['switchTab']('home');
      fixture.detectChanges();
    });

    it('loadHomeTab() builds the feed items mixing included furniture and exhibitions', () => {
      const items = component['homeItems']();
      expect(items).not.toBeNull();
      expect(items!.length).toBe(1);
      expect(items!.some(i => i.included)).toBeTrue();
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

});
