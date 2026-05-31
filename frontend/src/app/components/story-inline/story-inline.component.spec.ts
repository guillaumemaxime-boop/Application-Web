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
});
