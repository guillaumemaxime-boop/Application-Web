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
  categoryMeta: { (): unknown[] | null; set: (v: unknown[]) => void };
  saving: () => boolean;
  loadFurniture: (item: unknown) => void;
  newFurniture: () => void;
  saveFurniture: () => void;
  removeFurniture: (item: unknown) => void;
  onCategoryReorder: (order: number[]) => void;
  toggleCategoryVisibility: (c: unknown, event: Event) => void;
  moveCategoryUp: (i: number) => void;
  moveCategoryDown: (i: number) => void;
  parseDimensions: (list: string[]) => { w: number | null; d: number | null; h: number | null; notes: string };
  serializeDimensions: (w: number | null, d: number | null, h: number | null, notesText: string) => string[];
  persistCategories: () => void;
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

  function flushInitial(items: unknown[] = [], cats: unknown[] = []) {
    httpMock.expectOne('/api/furniture').flush(items);
    httpMock.expectOne('/api/admin/categories').flush(cats);
  }

  afterEach(() => httpMock?.verify());

  it('charge la liste des pièces et les catégories', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([
      { id: '1', slug: 'chaise', title: 'Chaise', category: 'Sièges', year: 2024, coverImage: '', dimensions: [], gallery: [], featured: false },
    ]);
    httpMock.expectOne('/api/admin/categories').flush([]);
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

  it('onCategoryReorder() met à jour positions et persiste', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([
      { category: 'A', coverImage: '', position: 0, visible: true },
      { category: 'B', coverImage: '', position: 1, visible: true },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.onCategoryReorder([1, 0]);
    const cats = cmp.categoryMeta() as Array<{ category: string; position: number }>;
    expect(cats[0].category).toBe('B');
    expect(cats[0].position).toBe(0);
    expect(cats[1].position).toBe(1);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/B').flush({});
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/A').flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('onCategoryReorder() ne fait rien si categoryMeta est null', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    // Ne pas flush /api/admin/categories pour garder categoryMeta() === null
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.onCategoryReorder([0]);
    expect(cmp.categoryMeta()).toBeNull();
    // Aucun PUT attendu — cleanup HTTP
    httpMock.expectOne('/api/admin/categories').flush([]);
  });

  it('moveCategoryUp() echange avec la precedente (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([
      { category: 'A', coverImage: '', position: 0, visible: true },
      { category: 'B', coverImage: '', position: 1, visible: true },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.moveCategoryUp(1);
    const cats = cmp.categoryMeta() as Array<{ category: string }>;
    expect(cats[0].category).toBe('B');
    expect(cats[1].category).toBe('A');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/B').flush({});
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/A').flush({});
  });

  it('moveCategoryUp(0) ne fait rien (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([{ category: 'A', coverImage: '', position: 0, visible: true }]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.moveCategoryUp(0);
    // pas de PUT
  });

  it('moveCategoryUp() ne fait rien quand categoryMeta null (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.moveCategoryUp(1);
    expect(cmp.categoryMeta()).toBeNull();
    httpMock.expectOne('/api/admin/categories').flush([]);
  });

  it('moveCategoryDown() echange avec la suivante (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([
      { category: 'A', coverImage: '', position: 0, visible: true },
      { category: 'B', coverImage: '', position: 1, visible: true },
    ]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.moveCategoryDown(0);
    const cats = cmp.categoryMeta() as Array<{ category: string }>;
    expect(cats[0].category).toBe('B');
    expect(cats[1].category).toBe('A');
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/B').flush({});
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/A').flush({});
  });

  it('moveCategoryDown(last) ne fait rien (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([{ category: 'A', coverImage: '', position: 0, visible: true }]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.moveCategoryDown(0);
    // pas de PUT
  });

  it('moveCategoryDown() ne fait rien quand categoryMeta null (A-04)', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.moveCategoryDown(0);
    expect(cmp.categoryMeta()).toBeNull();
    httpMock.expectOne('/api/admin/categories').flush([]);
  });

  it('toggleCategoryVisibility() change visible et persiste', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'success');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    const cat = { category: 'A', coverImage: '', position: 0, visible: true };
    httpMock.expectOne('/api/admin/categories').flush([cat]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.toggleCategoryVisibility(cat, { target: { checked: false } } as unknown as Event);
    const cats = cmp.categoryMeta() as Array<{ visible: boolean }>;
    expect(cats[0].visible).toBe(false);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/A').flush({});
    expect(toast.success).toHaveBeenCalled();
  });

  it('persistCategories() ne fait rien quand aucune catégorie', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    httpMock.expectOne('/api/admin/categories').flush([]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    // categoryMeta = [] -> persistCategories devrait return early
    cmp.persistCategories();
    // verify() à la fin garantit qu'il n'y a pas eu d'appel
    expect(cmp.categoryMeta()).toEqual([]);
  });

  it('persistCategories() error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').flush([]);
    const cat = { category: 'A', coverImage: '', position: 0, visible: true };
    httpMock.expectOne('/api/admin/categories').flush([cat]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    cmp.toggleCategoryVisibility(cat, { target: { checked: false } } as unknown as Event);
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/categories/A').error(new ProgressEvent('err'));
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
    expect(cmp.furnitureGallery().length).toBe(1);
    cmp.newFurniture();
    expect(cmp.editingFurnitureSlug()).toBeNull();
    expect(cmp.editingFurnitureId()).toBeNull();
    expect(cmp.furnitureGallery()).toEqual([]);
  });

  it('refreshFurniture() error -> toast error', () => {
    configure();
    const fixture = TestBed.createComponent(MobilierComponent);
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    fixture.detectChanges();
    httpMock.expectOne('/api/furniture').error(new ProgressEvent('err'));
    httpMock.expectOne('/api/admin/categories').flush([]);
    fixture.detectChanges();
    expect(toast.error).toHaveBeenCalled();
    const cmp = fixture.componentInstance as unknown as MobilierInternals;
    expect(cmp.loadingFurniture()).toBe(false);
  });
});
