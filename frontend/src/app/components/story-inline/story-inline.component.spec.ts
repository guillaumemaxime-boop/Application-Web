import { TestBed } from '@angular/core/testing';
import { StoryInlineComponent } from './story-inline.component';
import { Slide } from '../../models/slide.model';
import { DisplaySlide } from '../../models/display-slide.model';

describe('StoryInlineComponent', () => {
  function createWithSlides(slides: DisplaySlide[]) {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    fixture.componentRef.setInput('slides', slides);
    fixture.detectChanges();
    return fixture;
  }

  it('should render nothing when no inline-renderable slides are provided', () => {
    const fixture = createWithSlides([]);
    expect(fixture.nativeElement.querySelector('.story-inline')).toBeNull();
  });

  it('should treat undefined slides input as an empty list (??)', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    fixture.componentRef.setInput('slides', undefined as unknown as DisplaySlide[]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-inline')).toBeNull();
  });

  it('should skip cover and link slides', () => {
    const fixture = createWithSlides([
      { id: '1', position: 1, type: 'cover', src: 'a.jpg' },
      { id: '2', position: 2, type: 'link', label: 'Voir', description: null, href: null },
    ]);
    expect(fixture.nativeElement.querySelector('.story-inline')).toBeNull();
  });

  it('should render image slides with caption', () => {
    const fixture = createWithSlides([
      { id: '1', position: 1, type: 'image', src: 'b.jpg', caption: 'Détail du laiton' },
    ]);
    const block = fixture.nativeElement.querySelector('.block.image');
    expect(block).not.toBeNull();
    expect(block.querySelector('img').getAttribute('src')).toBe('b.jpg');
    expect(block.querySelector('figcaption').textContent.trim()).toBe('Détail du laiton');
  });

  it('should render image slides without caption', () => {
    const fixture = createWithSlides([
      { id: '1', position: 1, type: 'image', src: 'b.jpg', caption: null },
    ]);
    const block = fixture.nativeElement.querySelector('.block.image');
    expect(block).not.toBeNull();
    expect(block.querySelector('figcaption')).toBeNull();
  });

  it('should render spec slides with all entries', () => {
    const fixture = createWithSlides([
      {
        id: '1',
        position: 1,
        type: 'spec',
        specs: [
          { label: 'Matière', value: 'Noyer' },
          { label: 'Hauteur', value: '75 cm' },
        ],
      },
    ]);
    const dl = fixture.nativeElement.querySelector('.block.spec dl');
    expect(dl).not.toBeNull();
    expect(dl.querySelectorAll('dt').length).toBe(2);
    expect(dl.textContent).toContain('Matière');
    expect(dl.textContent).toContain('Noyer');
  });

  it('should render quote slides with optional citation', () => {
    const fixture = createWithSlides([
      { id: '1', position: 1, type: 'quote', body: 'Le geste du bois.', cite: 'Studio K' },
    ]);
    const quote = fixture.nativeElement.querySelector('.block.quote');
    expect(quote).not.toBeNull();
    expect(quote.querySelector('blockquote').textContent.trim()).toBe('Le geste du bois.');
    expect(quote.querySelector('cite').textContent.trim()).toBe('Studio K');
  });

  it('should keep the original order of inline-renderable slides', () => {
    const fixture = createWithSlides([
      { id: 'a', position: 1, type: 'image', src: 'a.jpg', caption: null },
      { id: 'b', position: 2, type: 'cover', src: 'cover.jpg' },
      { id: 'c', position: 3, type: 'quote', body: 'q', cite: null },
      { id: 'd', position: 4, type: 'spec', specs: [{ label: 'L', value: 'V' }] },
    ]);
    const blocks = fixture.nativeElement.querySelectorAll('.block');
    expect(blocks.length).toBe(3);
    expect(blocks[0].classList.contains('image')).toBeTrue();
    expect(blocks[1].classList.contains('quote')).toBeTrue();
    expect(blocks[2].classList.contains('spec')).toBeTrue();
  });

  it('rend un iframe YouTube pour un slide video YouTube', () => {
    const fixture = createWithSlides([
      { id: 'v1', position: 1, type: 'video', src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', caption: null },
    ]);
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('rend un iframe Vimeo pour un slide video Vimeo', () => {
    const fixture = createWithSlides([
      { id: 'v1', position: 1, type: 'video', src: 'https://vimeo.com/123456789', caption: null },
    ]);
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('player.vimeo.com/video/123456789');
  });

  // ── Mode éditable ──────────────────────────────────────────────────────────

  function rawSlides(): any[] {
    return [
      { id: 's1', type: 'quote', position: 0, body: 'Bonjour', cite: null },
      { id: 's2', type: 'image', position: 1, src: '/a.jpg', caption: 'A' },
    ];
  }

  it('mode lecture seule : pas d\'affordance d\'édition', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = rawSlides();
    component.editable = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slide-edit-block')).toBeNull();
  });

  it('mode éditable : un bloc éditable par slide avec poignée drag + supprimer', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.slide-edit-block').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.slide-drag').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.slide-del').length).toBe(2);
  });

  it('supprimer un slide émet slidesChange sans ce slide', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (fixture.nativeElement.querySelectorAll('.slide-del')[0] as HTMLButtonElement).click();
    expect(emitted!.map(s => s.id)).toEqual(['s2']);
  });

  it('réordonnancement via onReorder émet slidesChange ordonné', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (component as any).onReorder([1, 0]);
    expect(emitted!.map(s => s.id)).toEqual(['s2', 's1']);
  });

  it('un nouvel input slides réinitialise la working-copy', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = rawSlides();
    component.editable = true;
    fixture.detectChanges();
    component.slides = [{ id: 'x', type: 'quote', position: 0, body: 'X', cite: null } as any];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.slide-edit-block').length).toBe(1);
  });

  it('éditer la légende image (blur) émet slidesChange', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = [{ id: 's1', type: 'image', position: 0, src: '/a.jpg', caption: 'A' } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const cap = fixture.nativeElement.querySelector('.slide-caption') as HTMLElement;
    cap.textContent = 'Nouvelle légende'; cap.dispatchEvent(new Event('blur'));
    expect(emitted![0].caption).toBe('Nouvelle légende');
  });

  it('éditer l\'URL vidéo (change) émet slidesChange', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = [{ id: 's1', type: 'video', position: 0, src: '', caption: null } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const input = fixture.nativeElement.querySelector('.slide-video-url') as HTMLInputElement;
    input.value = 'https://youtu.be/abc'; input.dispatchEvent(new Event('change'));
    expect(emitted![0].src).toBe('https://youtu.be/abc');
  });

  it('éditer une cellule spec (blur) émet slidesChange', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = [{ id: 's1', type: 'spec', position: 0, specs: [{ label: 'L', value: 'V' }] } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const dd = fixture.nativeElement.querySelector('.spec-value') as HTMLElement;
    dd.textContent = 'V2'; dd.dispatchEvent(new Event('blur'));
    expect(emitted![0].specs[0].value).toBe('V2');
  });

  it('ajouter / retirer une ligne de spec émet slidesChange', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = [{ id: 's1', type: 'spec', position: 0, specs: [{ label: 'L', value: 'V' }] } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    (fixture.nativeElement.querySelector('.spec-add') as HTMLButtonElement).click();
    expect(emitted![0].specs.length).toBe(2);
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.spec-row-del')[1] as HTMLButtonElement).click();
    expect(emitted![0].specs.length).toBe(1);
  });

  it('éditer le corps d\'une citation (blur) émet slidesChange', () => {
    TestBed.configureTestingModule({ imports: [StoryInlineComponent] });
    const fixture = TestBed.createComponent(StoryInlineComponent);
    const component = fixture.componentInstance;
    component.slides = [{ id: 's1', type: 'quote', position: 0, body: 'B', cite: null } as any];
    component.editable = true; fixture.detectChanges();
    let emitted: any[] | null = null;
    component.slidesChange.subscribe((s: any[]) => emitted = s);
    const body = fixture.nativeElement.querySelector('.quote-body') as HTMLElement;
    body.textContent = 'Nouveau'; body.dispatchEvent(new Event('blur'));
    expect(emitted![0].body).toBe('Nouveau');
  });
});
