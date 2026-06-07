import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { MobilierComponent } from './mobilier.component';
import { ToastService } from '../shared/toast.service';

type MobilierInternals = {
  furnitureForm: {
    patchValue: (v: Record<string, unknown>) => void;
    getRawValue: () => Record<string, unknown>;
    reset: (v?: Record<string, unknown>) => void;
    invalid: boolean;
  };
  furniture: () => unknown[];
  loadingFurniture: () => boolean;
  editingFurnitureSlug: () => string | null;
  editingFurnitureId: () => string | null;
  furnitureGallery: { (): string[]; set: (v: string[]) => void };
  currentStories: { (): Array<{ id: string; title: string; position: number; ownerId: string; ownerKind: string; coverImage: string }>; set: (v: unknown[]) => void };
  editingStoryId: { (): string | null; set: (v: string | null) => void };
  saving: () => boolean;
  allTags: () => string[];
  loadFurniture: (item: unknown) => void;
  newFurniture: () => void;
  saveFurniture: () => void;
  removeFurniture: (item: unknown) => void;
  parseDimensions: (list: string[]) => { w: number | null; d: number | null; h: number | null; notes: string };
  serializeDimensions: (w: number | null, d: number | null, h: number | null, notesText: string) => string[];
  editStory: (s: unknown) => void;
  newStory: () => void;
  renameStory: (s: unknown) => void;
  deleteStory: (s: unknown) => void;
};

describe('MobilierComponent', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [MobilierComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(queryParams)) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  function flushInitial(items: unknown[] = []) {
    httpMock.expectOne('/api/furniture').flush(items);
    httpMock.expectOne('/api/tags').flush([]);
  }

  afterEach(() => httpMock?.verify());

  it('charge la liste des pièces', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'chaise', title: 'Chaise', category: 'Sièges', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.list li')).length).toBe(1);
  });

  it('ouvre un formulaire vierge si ?new=1', () => {
    configure({ new: '1' });
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.editingFurnitureSlug()).toBeNull();
  });

  it('saveFurniture() POST quand nouveau', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('loadFurniture() populate le form avec les valeurs de l\'item', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const item = {
      id: 'id-1', slug: 'tabouret', title: 'Tabouret', category: 'Sièges', year: 2023,
      material: 'chêne', designer: 'Designer X', coverImage: '/c.jpg',
      gallery: ['/g1.jpg', '/g2.jpg'],
      dimensions: ['L 50 cm', 'H 80 cm', 'Note libre'],
      shortDescription: 'short', description: 'long', featured: false,
    };
    cmp.loadFurniture(item);
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(cmp.editingFurnitureSlug()).toBe('tabouret');
    expect(cmp.editingFurnitureId()).toBe('id-1');
    const v = cmp.furnitureForm.getRawValue();
    expect(v['title']).toBe('Tabouret');
    expect(v['slug']).toBe('tabouret');
    expect(v['dimW']).toBe(50);
    expect(v['dimH']).toBe(80);
    expect(v['dimNotes']).toBe('Note libre');
    expect(cmp.furnitureGallery()).toEqual(['/g1.jpg', '/g2.jpg']);
  });

  it('loadFurniture() supporte les champs optionnels manquants', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: undefined, slug: 'x', title: 'X', category: 'C', year: 2024 });
    expect(cmp.editingFurnitureId()).toBeNull();
    expect(cmp.furnitureGallery()).toEqual([]);
  });

  it('parseDimensions() extrait L/P/H depuis différents formats', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const parsed = cmp.parseDimensions(['Largeur: 60', 'Prof. 40,5', 'H 80', 'Note libre', '']);
    expect(parsed.w).toBe(60);
    expect(parsed.d).toBe(40.5);
    expect(parsed.h).toBe(80);
    expect(parsed.notes).toBe('Note libre');
  });

  it('parseDimensions() ignore les doublons après une valeur trouvée', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const parsed = cmp.parseDimensions(['L 50', 'L 99', 'autre']);
    expect(parsed.w).toBe(50);
    expect(parsed.notes).toBe('L 99\nautre');
  });

  it('serializeDimensions() produit une liste correcte', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const ser = cmp.serializeDimensions(50, 40, 80, 'note1\nnote2');
    expect(ser).toEqual(['L 50 cm', 'P 40 cm', 'H 80 cm', 'note1', 'note2']);
  });

  it('serializeDimensions() omet les valeurs nulles et lignes vides', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    const ser = cmp.serializeDimensions(null, null, 80, '');
    expect(ser).toEqual(['H 80 cm']);
  });

  it('saveFurniture() ne fait rien quand le form est invalid', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    // Form is invalid by default (title required)
    cmp.saveFurniture();
    // Pas d'appel HTTP attendu — httpMock.verify() à la fin garantit
    expect(cmp.saving()).toBe(false);
  });

  it('saveFurniture() PUT quand slug est édité', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial([
      { id: '1', slug: 'existing', title: 'E', category: 'C', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: true },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: '1', slug: 'existing', title: 'E', category: 'C', year: 2024 });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    cmp.furnitureForm.patchValue({ title: 'E2' });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/furniture/existing').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('saveFurniture() POST error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024 });
    cmp.saveFurniture();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
    expect(cmp.saving()).toBe(false);
  });

  it('removeFurniture() ne supprime rien si confirm cancel', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(false);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.removeFurniture({ slug: 'x', title: 'X' });
    // pas d'appel DELETE
    httpMock.expectNone(r => r.method === 'DELETE');
    expect(window.confirm).toHaveBeenCalled();
  });

  it('removeFurniture() DELETE + toast success quand OK', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.removeFurniture({ slug: 'chair', title: 'Chair' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/furniture/chair').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('removeFurniture() reset le form si on supprimait l\'item en cours d\'édition', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: '1', slug: 'chair', title: 'Chair', category: 'C', year: 2024 });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(cmp.editingFurnitureSlug()).toBe('chair');
    cmp.removeFurniture({ slug: 'chair', title: 'Chair' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/furniture/chair').flush({});
    httpMock.expectOne('/api/furniture').flush([]);
    expect(cmp.editingFurnitureSlug()).toBeNull();
  });

  it('removeFurniture() DELETE error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.removeFurniture({ slug: 'chair', title: 'Chair' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/furniture/chair').error(new ProgressEvent('err'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('newFurniture() reset form et galerie', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: '1', slug: 'x', title: 'X', category: 'C', year: 2024, gallery: ['/a.jpg'] });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([{ id: 'st-1' }]);
    expect(cmp.furnitureGallery().length).toBe(1);
    cmp.newFurniture();
    expect(cmp.editingFurnitureSlug()).toBeNull();
    expect(cmp.editingFurnitureId()).toBeNull();
    expect(cmp.furnitureGallery()).toEqual([]);
  });

  it('loadFurniture() peuple currentStories avec la liste retournée (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: 'f1', slug: 'x', title: 'X', category: 'C', year: 2024 });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'furniture', ownerId: 'f1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
      { id: 'st-2', ownerKind: 'furniture', ownerId: 'f1', title: 'S2', coverImage: '', slug: 's2', position: 1, createdAt: '' },
    ]);
    expect(cmp.currentStories().length).toBe(2);
    expect(cmp.currentStories()[0].id).toBe('st-1');
    // Aucune story pré-sélectionnée
    expect(cmp.editingStoryId()).toBeNull();
  });

  it('loadFurniture() crée une story par défaut quand liste vide (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: 'f1', slug: 'x', title: 'X', category: 'C', year: 2024, coverImage: '/c.jpg' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([]);
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/stories').flush({
      id: 'new-st', ownerKind: 'furniture', ownerId: 'f1', title: 'X', coverImage: '/c.jpg', slug: 'x', position: 0, createdAt: '',
    });
    expect(cmp.currentStories().length).toBe(1);
    expect(cmp.editingStoryId()).toBe('new-st');
  });

  it('editStory() définit editingStoryId (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.editStory({ id: 'st-42' });
    expect(cmp.editingStoryId()).toBe('st-42');
  });

  it('newStory() POST une nouvelle story et l\'ouvre (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    flushInitial([
      { id: 'f1', slug: 'chair', title: 'Chair', category: 'C', year: 2024, coverImage: '/c.jpg', dimensions: [], gallery: [], featured: false },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: 'f1', slug: 'chair', title: 'Chair', category: 'C', year: 2024, coverImage: '/c.jpg' });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'furniture', ownerId: 'f1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
    ]);
    spyOn(window, 'prompt').and.returnValue('Ma nouvelle story');
    cmp.newStory();
    httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/admin/stories').flush({
      id: 'st-2', ownerKind: 'furniture', ownerId: 'f1', title: 'Ma nouvelle story', coverImage: '/c.jpg', slug: 'ma-nouvelle-story', position: 1, createdAt: '',
    });
    expect(cmp.currentStories().length).toBe(2);
    expect(cmp.editingStoryId()).toBe('st-2');
    expect(toast.success).toHaveBeenCalled();
  });

  it('newStory() abort si prompt cancel (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: 'f1', slug: 'chair', title: 'Chair', category: 'C', year: 2024 });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'furniture', ownerId: 'f1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
    ]);
    spyOn(window, 'prompt').and.returnValue(null);
    cmp.newStory();
    // Pas d'appel POST attendu — verify() à la fin garantit
    expect(cmp.currentStories().length).toBe(1);
  });

  it('deleteStory() retire la story de la liste après confirmation (Task 10)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    flushInitial();
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.loadFurniture({ id: 'f1', slug: 'chair', title: 'Chair', category: 'C', year: 2024 });
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories').flush([
      { id: 'st-1', ownerKind: 'furniture', ownerId: 'f1', title: 'S1', coverImage: '', slug: 's1', position: 0, createdAt: '' },
      { id: 'st-2', ownerKind: 'furniture', ownerId: 'f1', title: 'S2', coverImage: '', slug: 's2', position: 1, createdAt: '' },
    ]);
    spyOn(window, 'confirm').and.returnValue(true);
    cmp.deleteStory({ id: 'st-1', title: 'S1' });
    httpMock.expectOne(r => r.method === 'DELETE' && r.url === '/api/admin/stories/st-1').flush({});
    expect(cmp.currentStories().length).toBe(1);
    expect(cmp.currentStories()[0].id).toBe('st-2');
  });

  it('charge les tags via getAllTags au constructeur', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush(['bois', 'sculpture']);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.allTags()).toEqual(['bois', 'sculpture']);
  });

  it('saveFurniture envoie tags dans le payload', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024, tags: ['bois'] });
    cmp.saveFurniture();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture');
    expect(req.request.body['tags']).toEqual(['bois']);
    req.flush({});
    httpMock.expectOne('/api/furniture').flush([]);
  });

  it('refreshFurniture() error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').error(new ProgressEvent('err'));
    httpMock.expectOne('/api/tags').flush([]);
    fixture.detectChanges();
    expect(toast.error).toHaveBeenCalled();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.loadingFurniture()).toBe(false);
  });
});
