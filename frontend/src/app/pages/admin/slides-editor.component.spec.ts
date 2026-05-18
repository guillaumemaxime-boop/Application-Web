import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SlidesEditorComponent } from './slides-editor.component';
import { Slide } from '../../models/slide.model';

describe('SlidesEditorComponent', () => {
  let fixture: ComponentFixture<SlidesEditorComponent>;
  let component: SlidesEditorComponent;
  let httpMock: HttpTestingController;

  function build(kind: 'furniture' | 'exhibition' = 'furniture', ownerId: string | null = 'f-001', ownerSlug: string | null = null) {
    fixture = TestBed.createComponent(SlidesEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('kind', kind);
    if (ownerId !== null) fixture.componentRef.setInput('ownerId', ownerId);
    if (ownerSlug !== null) fixture.componentRef.setInput('ownerSlug', ownerSlug);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidesEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  function flushSlides(slides: Slide[], kind: string = 'furniture', ownerId: string = 'f-001') {
    const req = httpMock.expectOne(`/api/admin/slides/${kind}/${ownerId}`);
    expect(req.request.method).toBe('GET');
    req.flush(slides);
  }

  it('loads slides on init', () => {
    build();
    flushSlides([{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' } as Slide]);
    expect((component as any).slides().length).toBe(1);
  });

  it('add() can append each supported slide type', () => {
    build();
    flushSlides([]);
    for (const t of ['cover', 'image', 'spec', 'quote', 'link'] as const) {
      (component as any).add(t);
    }
    const types = (component as any).slides().map((s: Slide) => s.type);
    expect(types).toEqual(['cover', 'image', 'spec', 'quote', 'link']);
  });

  it('remove() drops the slide at the given index', () => {
    build();
    flushSlides([
      { type: 'cover', id: 'a', position: 0, src: 'a.jpg' } as Slide,
      { type: 'image', id: 'b', position: 1, src: 'b.jpg', caption: null } as Slide,
    ]);
    (component as any).remove(0);
    const slides = (component as any).slides();
    expect(slides.length).toBe(1);
    expect(slides[0].type).toBe('image');
  });

  it('patch() updates a slide in place', () => {
    build();
    flushSlides([{ type: 'image', id: 'a', position: 0, src: '', caption: null } as Slide]);
    (component as any).patch(0, { src: 'new.jpg', caption: 'hello' });
    const updated = (component as any).slides()[0];
    expect(updated.src).toBe('new.jpg');
    expect(updated.caption).toBe('hello');
  });

  it('patchSpec() updates an entry inside a spec slide', () => {
    build();
    flushSlides([{ type: 'spec', id: 'a', position: 0, specs: [{ label: 'X', value: 'Y' }] } as Slide]);
    (component as any).patchSpec(0, 0, 'label', 'Bois');
    (component as any).patchSpec(0, 0, 'value', 'Chêne');
    const updated = (component as any).slides()[0] as Extract<Slide, { type: 'spec' }>;
    expect(updated.specs[0]).toEqual({ label: 'Bois', value: 'Chêne' });
  });

  it('patchSpec() is a no-op when index does not match or slide is not a spec', () => {
    build();
    flushSlides([{ type: 'image', id: 'a', position: 0, src: 'x.jpg', caption: null } as Slide]);
    (component as any).patchSpec(0, 0, 'label', 'X');
    expect((component as any).slides()[0].type).toBe('image');
    (component as any).patchSpec(5, 0, 'label', 'X');
    expect((component as any).slides().length).toBe(1);
  });

  it('addSpec() adds an entry to a spec slide', () => {
    build();
    flushSlides([{ type: 'spec', id: 'a', position: 0, specs: [] } as unknown as Slide]);
    (component as any).addSpec(0);
    (component as any).addSpec(0);
    const updated = (component as any).slides()[0] as Extract<Slide, { type: 'spec' }>;
    expect(updated.specs.length).toBe(2);
  });

  it('addSpec() is a no-op on non-spec slides', () => {
    build();
    flushSlides([{ type: 'cover', id: 'a', position: 0, src: 'x.jpg' } as Slide]);
    (component as any).addSpec(0);
    expect((component as any).slides()[0].type).toBe('cover');
  });

  it('removeSpec() drops one entry from a spec slide', () => {
    build();
    flushSlides([{ type: 'spec', id: 'a', position: 0, specs: [{ label: 'A', value: '1' }, { label: 'B', value: '2' }] } as Slide]);
    (component as any).removeSpec(0, 0);
    const updated = (component as any).slides()[0] as Extract<Slide, { type: 'spec' }>;
    expect(updated.specs.length).toBe(1);
    expect(updated.specs[0].label).toBe('B');
  });

  it('removeSpec() is a no-op on non-spec slides', () => {
    build();
    flushSlides([{ type: 'image', id: 'a', position: 0, src: 'x.jpg', caption: null } as Slide]);
    (component as any).removeSpec(0, 0);
    expect((component as any).slides()[0].type).toBe('image');
  });

  it('canSave() returns false when slides are invalid (each type)', () => {
    build();
    flushSlides([{ type: 'cover', id: 'a', position: 0, src: '' } as Slide]);
    expect((component as any).canSave()).toBeFalse();

    (component as any).slides.set([{ type: 'image', id: 'b', position: 0, src: '', caption: null } as Slide]);
    expect((component as any).canSave()).toBeFalse();

    (component as any).slides.set([{ type: 'quote', id: 'c', position: 0, body: '', cite: null } as Slide]);
    expect((component as any).canSave()).toBeFalse();

    (component as any).slides.set([{ type: 'spec', id: 'd', position: 0, specs: [] } as Slide]);
    expect((component as any).canSave()).toBeFalse();
  });

  it('canSave() returns true when slides are valid', () => {
    build();
    flushSlides([
      { type: 'cover', id: 'a', position: 0, src: 'a.jpg' } as Slide,
      { type: 'link', id: 'b', position: 1, label: null, description: null, href: null } as Slide,
    ]);
    expect((component as any).canSave()).toBeTrue();
  });

  it('warnings flag a missing cover slide at start', () => {
    build();
    flushSlides([{ type: 'image', id: 'a', position: 0, src: 'x.jpg', caption: null } as Slide]);
    const warnings = (component as any).warnings();
    expect(warnings.some((w: string) => w.includes('cover'))).toBeTrue();
  });

  it('warnings flag a missing link slide at end', () => {
    build();
    flushSlides([{ type: 'cover', id: 'a', position: 0, src: 'x.jpg' } as Slide]);
    const warnings = (component as any).warnings();
    expect(warnings.some((w: string) => w.includes('lien'))).toBeTrue();
  });

  it('onReorder reorders slides according to the given indices', () => {
    build();
    flushSlides([
      { type: 'cover', id: 'a', position: 0, src: 'a.jpg' } as Slide,
      { type: 'image', id: 'b', position: 1, src: 'b.jpg', caption: null } as Slide,
      { type: 'link', id: 'c', position: 2, label: null, description: null, href: null } as Slide,
    ]);
    (component as any).onReorder([2, 0, 1]);
    const slides = (component as any).slides();
    expect(slides[0].id).toBe('c');
    expect(slides[1].id).toBe('a');
    expect(slides[2].id).toBe('b');
  });

  it('reload() enriches a link slide with a furniture fallback href when ownerSlug is set', () => {
    build('furniture', 'f-001', 'commode-noyer');
    httpMock.expectOne('/api/admin/slides/furniture/f-001').flush([
      { type: 'link', id: 'l', position: 0, label: null, description: null, href: null } as Slide,
    ]);
    const slide = (component as any).slides()[0] as Extract<Slide, { type: 'link' }>;
    expect(slide.href).toBe('/mobilier/commode-noyer');
  });

  it('reload() derives an /expositions/<slug> href when kind=exhibition', () => {
    build('exhibition', 'e-001', 'reflets');
    httpMock.expectOne('/api/admin/slides/exhibition/e-001').flush([
      { type: 'link', id: 'l', position: 0, label: null, description: null, href: null } as Slide,
    ]);
    const slide = (component as any).slides()[0] as Extract<Slide, { type: 'link' }>;
    expect(slide.href).toBe('/expositions/reflets');
  });

  it('save() PUTs the slides and replaces local state with the server response', () => {
    build();
    flushSlides([{ type: 'cover', id: 'a', position: 0, src: 'x.jpg' } as Slide]);
    (component as any).save();
    const put = httpMock.expectOne('/api/admin/slides/furniture/f-001');
    expect(put.request.method).toBe('PUT');
    put.flush([
      { type: 'cover', id: 'a', position: 0, src: 'x.jpg' } as Slide,
      { type: 'link', id: 'l', position: 1, label: null, description: null, href: null } as Slide,
    ]);
    expect((component as any).slides().length).toBe(2);
  });

  it('reload() is a no-op when ownerId is empty', () => {
    fixture = TestBed.createComponent(SlidesEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('kind', 'furniture');
    fixture.componentRef.setInput('ownerId', '');
    fixture.detectChanges();
    httpMock.expectNone(() => true);
  });

  it('toggling open() switches the editor body visibility', () => {
    build();
    flushSlides([]);
    expect((component as any).open()).toBeFalse();
    (component as any).open.set(true);
    expect((component as any).open()).toBeTrue();
  });
});
