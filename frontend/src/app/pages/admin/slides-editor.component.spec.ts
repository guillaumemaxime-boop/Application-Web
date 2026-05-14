import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SlidesEditorComponent } from './slides-editor.component';
import { Slide } from '../../models/slide.model';

describe('SlidesEditorComponent', () => {
  let fixture: ComponentFixture<SlidesEditorComponent>;
  let component: SlidesEditorComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidesEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SlidesEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('kind', 'furniture');
    fixture.componentRef.setInput('ownerId', 'f-001');
    fixture.detectChanges();
  });

  function flushSlides(slides: Slide[]) {
    const req = httpMock.expectOne('/api/admin/slides/furniture/f-001');
    expect(req.request.method).toBe('GET');
    req.flush(slides);
  }

  it('loads slides on init', () => {
    flushSlides([{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' } as Slide]);
    expect((component as any).slides().length).toBe(1);
  });

  it('add() appends a new slide of the requested type', () => {
    flushSlides([]);
    (component as any).add('image');
    const slides = (component as any).slides();
    expect(slides.length).toBe(1);
    expect(slides[0].type).toBe('image');
  });

  it('remove() drops the slide at the given index', () => {
    flushSlides([
      { type: 'cover', id: 'a', position: 0, src: 'a.jpg' } as Slide,
      { type: 'image', id: 'b', position: 1, src: 'b.jpg', caption: null } as Slide,
    ]);
    (component as any).remove(0);
    expect((component as any).slides().length).toBe(1);
    expect((component as any).slides()[0].type).toBe('image');
  });

  it('canSave() returns false when a cover slide has no src', () => {
    flushSlides([{ type: 'cover', id: 'a', position: 0, src: '' } as Slide]);
    expect((component as any).canSave()).toBeFalse();
  });

  it('canSave() returns true when slides are valid', () => {
    flushSlides([
      { type: 'cover', id: 'a', position: 0, src: 'a.jpg' } as Slide,
      { type: 'link', id: 'b', position: 1, label: null, description: null, href: null } as Slide,
    ]);
    expect((component as any).canSave()).toBeTrue();
  });

  it('warnings flag a missing cover slide at start', () => {
    flushSlides([{ type: 'image', id: 'a', position: 0, src: 'x.jpg', caption: null } as Slide]);
    const warnings = (component as any).warnings();
    expect(warnings.some((w: string) => w.includes('cover'))).toBeTrue();
  });

  it('onReorder reorders slides according to the given indices', () => {
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
});
