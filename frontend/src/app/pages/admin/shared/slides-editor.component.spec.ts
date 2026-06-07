import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { SlidesEditorComponent } from './slides-editor.component';
import { Slide } from '../../../models/slide.model';

describe('SlidesEditorComponent', () => {
  let fixture: ComponentFixture<SlidesEditorComponent>;
  let component: SlidesEditorComponent;
  let httpMock: HttpTestingController;

  function build(storyId: string | null = 'st-001', ownerSlug: string | null = null) {
    fixture = TestBed.createComponent(SlidesEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    if (storyId !== null) fixture.componentRef.setInput('storyId', storyId);
    if (ownerSlug !== null) fixture.componentRef.setInput('ownerSlug', ownerSlug);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidesEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  function flushSlides(slides: Slide[], storyId: string = 'st-001') {
    const req = httpMock.expectOne(`/api/admin/stories/${storyId}/slides`);
    expect(req.request.method).toBe('GET');
    req.flush(slides);
  }

  it('loads slides on init', () => {
    build();
    flushSlides([{ type: 'image', id: 's1', position: 0, src: 'x.jpg', caption: null } as Slide]);
    expect((component as any).slides().length).toBe(1);
  });

  it('add() can append each supported slide type', () => {
    build();
    flushSlides([]);
    for (const t of ['image', 'video', 'spec', 'quote'] as const) {
      (component as any).add(t);
    }
    const types = (component as any).slides().map((s: Slide) => s.type);
    expect(types).toEqual(['image', 'video', 'spec', 'quote']);
  });

  it('remove() drops the slide at the given index', () => {
    build();
    flushSlides([
      { type: 'image', id: 'a', position: 0, src: 'a.jpg', caption: null } as Slide,
      { type: 'image', id: 'b', position: 1, src: 'b.jpg', caption: null } as Slide,
    ]);
    (component as any).remove(0);
    const slides = (component as any).slides();
    expect(slides.length).toBe(1);
    expect(slides[0].id).toBe('b');
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
    flushSlides([{ type: 'image', id: 'a', position: 0, src: 'x.jpg', caption: null } as Slide]);
    (component as any).addSpec(0);
    expect((component as any).slides()[0].type).toBe('image');
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
    flushSlides([{ type: 'image', id: 'a', position: 0, src: '', caption: null } as Slide]);
    expect((component as any).canSave()).toBeFalse();

    (component as any).slides.set([{ type: 'video', id: 'v', position: 0, src: '', caption: null } as Slide]);
    expect((component as any).canSave()).toBeFalse();

    (component as any).slides.set([{ type: 'quote', id: 'c', position: 0, body: '', cite: null } as Slide]);
    expect((component as any).canSave()).toBeFalse();

    (component as any).slides.set([{ type: 'spec', id: 'd', position: 0, specs: [] } as Slide]);
    expect((component as any).canSave()).toBeFalse();
  });

  it('canSave() returns true when slides are valid', () => {
    build();
    flushSlides([
      { type: 'image', id: 'a', position: 0, src: 'a.jpg', caption: null } as Slide,
    ]);
    expect((component as any).canSave()).toBeTrue();
  });

  it('onReorder reorders slides according to the given indices', () => {
    build();
    flushSlides([
      { type: 'image', id: 'a', position: 0, src: 'a.jpg', caption: null } as Slide,
      { type: 'image', id: 'b', position: 1, src: 'b.jpg', caption: null } as Slide,
      { type: 'image', id: 'c', position: 2, src: 'c.jpg', caption: null } as Slide,
    ]);
    (component as any).onReorder([2, 0, 1]);
    const slides = (component as any).slides();
    expect(slides[0].id).toBe('c');
    expect(slides[1].id).toBe('a');
    expect(slides[2].id).toBe('b');
  });

  it('reload() filtre les rows legacy cover/link', () => {
    build();
    httpMock.expectOne('/api/admin/stories/st-001/slides').flush([
      { type: 'cover', id: 'c', position: 0, src: 'x.jpg' },
      { type: 'image', id: 'i', position: 1, src: 'y.jpg', caption: null },
      { type: 'link', id: 'l', position: 2, label: null, description: null, href: null },
    ]);
    const slides = (component as any).slides();
    expect(slides.length).toBe(1);
    expect(slides[0].type).toBe('image');
  });

  it('save() PUTs the slides et filtre les rows legacy cover/link de la reponse', () => {
    build();
    flushSlides([{ type: 'image', id: 'a', position: 0, src: 'x.jpg', caption: null } as Slide]);
    (component as any).save();
    const put = httpMock.expectOne('/api/admin/stories/st-001/slides');
    expect(put.request.method).toBe('PUT');
    put.flush([
      { type: 'cover', id: 'c', position: 0, src: 'x.jpg' },
      { type: 'image', id: 'a', position: 1, src: 'x.jpg', caption: null },
      { type: 'link', id: 'l', position: 2, label: null, description: null, href: null },
    ]);
    const slides = (component as any).slides();
    expect(slides.length).toBe(1);
    expect(slides[0].type).toBe('image');
  });

  it('reload() is a no-op when storyId is empty', () => {
    fixture = TestBed.createComponent(SlidesEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('storyId', '');
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

  it('expose 4 boutons d\'ajout (image/video/spec/quote), plus de cover/link', () => {
    build();
    flushSlides([]);
    (component as any).open.set(true);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.actions button'));
    const labels = buttons.map(b => (b.nativeElement as HTMLElement).textContent?.trim());
    expect(labels).toContain('+ Image');
    expect(labels).toContain('+ Vidéo');
    expect(labels).toContain('+ Caractéristiques');
    expect(labels).toContain('+ Citation');
    expect(labels).not.toContain('+ Cover');
    expect(labels).not.toContain('+ Lien');
  });

  it('add(\'video\') ajoute un slide video avec src vide et caption null', () => {
    build();
    flushSlides([]);
    (component as any).add('video');
    expect((component as any).slides().length).toBe(1);
    expect((component as any).slides()[0]).toEqual(jasmine.objectContaining({ type: 'video', src: '', caption: null }));
  });

  it('indique la plateforme detectee pour un slide video', () => {
    build();
    flushSlides([]);
    (component as any).add('video');
    (component as any).patch(0, { src: 'https://www.youtube.com/watch?v=abc12345' });
    (component as any).open.set(true);
    fixture.detectChanges();
    const hint = fixture.debugElement.query(By.css('.video-detect'));
    expect(hint).toBeTruthy();
    const text = (hint.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('YouTube');
    expect(text).toContain('abc12345');
  });

  it('canSave est faux quand un slide video a src vide', () => {
    build();
    flushSlides([]);
    (component as any).add('video');
    expect((component as any).canSave()).toBeFalse();
    (component as any).patch(0, { src: 'https://www.youtube.com/watch?v=abc12345' });
    expect((component as any).canSave()).toBeTrue();
  });
});
