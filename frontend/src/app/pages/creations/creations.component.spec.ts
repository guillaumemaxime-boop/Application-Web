import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CreationsComponent } from './creations.component';

type Internals = {
  allItems: () => any[];
  availableTags: () => string[];
  availableYears: () => number[];
  selectedTags: { (): Set<string>; set: (v: Set<string>) => void };
  selectedYears: { (): Set<number>; set: (v: Set<number>) => void };
  selectedKind: { (): 'all' | 'furniture' | 'exhibition'; set: (v: any) => void };
  filteredItems: () => any[];
  toggleTag: (t: string) => void;
  toggleYear: (y: number) => void;
  setKind: (k: 'all' | 'furniture' | 'exhibition') => void;
  clearFilters: () => void;
};

describe('CreationsComponent', () => {
  let fixture: ComponentFixture<CreationsComponent>;
  let httpMock: HttpTestingController;
  let queryParams$: BehaviorSubject<any>;

  function setup(initialParams: Record<string, string> = {}) {
    queryParams$ = new BehaviorSubject(convertToParamMap(initialParams));
    TestBed.configureTestingModule({
      imports: [CreationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams$ } },
      ],
    });
    fixture = TestBed.createComponent(CreationsComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function flushApi(furniture: any[] = [], exhibitions: any[] = []) {
    httpMock.expectOne('/api/furniture').flush(furniture);
    httpMock.expectOne('/api/exhibitions').flush(exhibitions);
  }

  afterEach(() => httpMock?.verify());

  it('merge furniture + exhibitions et calcule les facettes', () => {
    setup();
    flushApi(
      [{ slug: 'f1', title: 'F1', coverImage: '/c.jpg', category: 'Cat', year: 2024, tags: ['bois'] }],
      [{ slug: 'e1', title: 'E1', coverImage: '/c.jpg', venue: 'V', startDate: '2025-01-01', tags: ['art'] }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.allItems().length).toBe(2);
    expect(cmp.availableYears()).toEqual([2025, 2024]);
    expect(cmp.availableTags()).toEqual(['art', 'bois']);
  });

  it('tri par annee desc puis titre asc', () => {
    setup();
    flushApi(
      [
        { slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: [] },
        { slug: 'b', title: 'B', coverImage: '', category: 'C', year: 2025, tags: [] },
        { slug: 'c', title: 'C', coverImage: '', category: 'C', year: 2024, tags: [] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    const titles = cmp.allItems().map(i => i.title);
    expect(titles).toEqual(['B', 'A', 'C']);
  });

  it('filtre par type', () => {
    setup();
    flushApi(
      [{ slug: 'f1', title: 'F', coverImage: '', category: 'C', year: 2024, tags: [] }],
      [{ slug: 'e1', title: 'E', coverImage: '', venue: 'V', startDate: '2024-01-01', tags: [] }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.setKind('furniture');
    expect(cmp.filteredItems().map(i => i.title)).toEqual(['F']);
  });

  it('filtre par tags en union (OR)', () => {
    setup();
    flushApi(
      [
        { slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: ['bois'] },
        { slug: 'b', title: 'B', coverImage: '', category: 'C', year: 2024, tags: ['metal'] },
        { slug: 'c', title: 'C', coverImage: '', category: 'C', year: 2024, tags: ['textile'] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleTag('bois');
    cmp.toggleTag('metal');
    expect(cmp.filteredItems().map(i => i.title).sort()).toEqual(['A', 'B']);
  });

  it('filtre par annees en union', () => {
    setup();
    flushApi(
      [
        { slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2023, tags: [] },
        { slug: 'b', title: 'B', coverImage: '', category: 'C', year: 2024, tags: [] },
        { slug: 'c', title: 'C', coverImage: '', category: 'C', year: 2025, tags: [] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleYear(2023);
    cmp.toggleYear(2025);
    expect(cmp.filteredItems().map(i => i.title).sort()).toEqual(['A', 'C']);
  });

  it('clearFilters reset les 3 signals', () => {
    setup();
    flushApi([{ slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: ['x'] }], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleTag('x');
    cmp.toggleYear(2024);
    cmp.setKind('furniture');
    cmp.clearFilters();
    expect(cmp.selectedTags().size).toBe(0);
    expect(cmp.selectedYears().size).toBe(0);
    expect(cmp.selectedKind()).toBe('all');
  });

  it('deep-link initial peuple selectedTags', () => {
    setup({ tags: 'bois,metal' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedTags()).toEqual(new Set(['bois', 'metal']));
  });

  it('deep-link initial peuple selectedKind', () => {
    setup({ kind: 'furniture' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedKind()).toBe('furniture');
  });

  it('exhibition.startDate "2025-03-01" est parse en year 2025', () => {
    setup();
    flushApi([], [{ slug: 'e1', title: 'E', coverImage: '', venue: 'V', startDate: '2025-03-01', tags: [] }]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.allItems()[0].year).toBe(2025);
  });

  it('deep-link initial peuple selectedYears', () => {
    setup({ years: '2024,2025' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedYears()).toEqual(new Set([2024, 2025]));
  });

  it('deep-link kind invalide est ignoré', () => {
    setup({ kind: 'invalid' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedKind()).toBe('all');
  });

  it('yearCount filtre par kind quand kind !== all', () => {
    setup();
    flushApi(
      [
        { slug: 'f1', title: 'F', coverImage: '', category: 'C', year: 2024, tags: [] },
      ],
      [
        { slug: 'e1', title: 'E', coverImage: '', venue: 'V', startDate: '2024-01-01', tags: [] },
      ],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.setKind('furniture');
    // yearCount(2024) ne doit compter que les meubles, pas les expositions
    expect((fixture.componentInstance as any).yearCount(2024)).toBe(1);
  });

  it('yearCount tient compte des tags sélectionnés', () => {
    setup();
    flushApi(
      [
        { slug: 'f1', title: 'F1', coverImage: '', category: 'C', year: 2024, tags: ['bois'] },
        { slug: 'f2', title: 'F2', coverImage: '', category: 'C', year: 2024, tags: ['metal'] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleTag('bois');
    expect((fixture.componentInstance as any).yearCount(2024)).toBe(1);
  });

  it('tagCount filtre par years sélectionnées', () => {
    setup();
    flushApi(
      [
        { slug: 'f1', title: 'F1', coverImage: '', category: 'C', year: 2024, tags: ['bois'] },
        { slug: 'f2', title: 'F2', coverImage: '', category: 'C', year: 2025, tags: ['bois'] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleYear(2024);
    expect((fixture.componentInstance as any).tagCount('bois')).toBe(1);
  });

  it('tagCount filtre par kind quand kind !== all', () => {
    setup();
    flushApi(
      [
        { slug: 'f1', title: 'F1', coverImage: '', category: 'C', year: 2024, tags: ['bois'] },
      ],
      [
        { slug: 'e1', title: 'E1', coverImage: '', venue: 'V', startDate: '2024-01-01', tags: ['bois'] },
      ],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.setKind('furniture');
    expect((fixture.componentInstance as any).tagCount('bois')).toBe(1);
  });

  it('toggleTag désélectionne un tag déjà actif', () => {
    setup();
    flushApi([{ slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: ['bois'] }], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleTag('bois');
    expect(cmp.selectedTags().has('bois')).toBeTrue();
    cmp.toggleTag('bois');
    expect(cmp.selectedTags().has('bois')).toBeFalse();
  });

  it('toggleYear désélectionne une année déjà active', () => {
    setup();
    flushApi([{ slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: [] }], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleYear(2024);
    expect(cmp.selectedYears().has(2024)).toBeTrue();
    cmp.toggleYear(2024);
    expect(cmp.selectedYears().has(2024)).toBeFalse();
  });

  it('deep-link kind=all est accepté', () => {
    setup({ kind: 'all' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedKind()).toBe('all');
  });
});
