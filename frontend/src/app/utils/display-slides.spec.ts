import { enrichSlides } from './display-slides';
import { Slide } from '../models/slide.model';

describe('enrichSlides', () => {
  it('returns empty array when no coverImage, no slides, and showStoryLink is false', () => {
    const result = enrichSlides(
      { slug: 'x', coverImage: null, slides: [], showStoryLink: false },
      'furniture'
    );
    expect(result).toEqual([]);
  });

  it('prepends cover when coverImage is present', () => {
    const result = enrichSlides(
      { slug: 'x', coverImage: 'cover.jpg', slides: [], showStoryLink: false },
      'furniture'
    );
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('cover');
    if (result[0].type === 'cover') {
      expect(result[0].src).toBe('cover.jpg');
      expect(result[0].id).toBe('_cover');
      expect(result[0].position).toBe(0);
    }
  });

  it('filters out legacy cover/link slides from input', () => {
    const slides = [
      { type: 'cover', id: 'old-cover', position: 0, src: 'old.jpg' } as unknown as Slide,
      { type: 'image', id: 's1', position: 1, src: 'a.jpg', caption: null } as Slide,
      { type: 'link', id: 'old-link', position: 2, label: 'old', description: null, href: '/old' } as unknown as Slide,
    ];
    const result = enrichSlides(
      { slug: 'x', coverImage: null, slides, showStoryLink: false },
      'furniture'
    );
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('image');
    expect(result[0].id).toBe('s1');
  });

  it('appends link with furniture-specific label and href when showStoryLink is true', () => {
    const result = enrichSlides(
      { slug: 'commode-noyer', coverImage: null, slides: [], showStoryLink: true },
      'furniture'
    );
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('link');
    if (result[0].type === 'link') {
      expect(result[0].label).toBe('Découvrir la pièce');
      expect(result[0].href).toBe('/mobilier/commode-noyer');
    }
  });

  it('appends link with exhibition-specific label and href when showStoryLink is true', () => {
    const result = enrichSlides(
      { slug: 'reflets', coverImage: null, slides: [], showStoryLink: true },
      'exhibition'
    );
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('link');
    if (result[0].type === 'link') {
      expect(result[0].label).toBe("Voir l'exposition");
      expect(result[0].href).toBe('/expositions/reflets');
    }
  });

  it('omits link when showStoryLink is false', () => {
    const slides = [
      { type: 'image', id: 's1', position: 0, src: 'a.jpg', caption: null } as Slide,
    ];
    const result = enrichSlides(
      { slug: 'x', coverImage: 'cover.jpg', slides, showStoryLink: false },
      'furniture'
    );
    expect(result.length).toBe(2);
    expect(result[0].type).toBe('cover');
    expect(result[1].type).toBe('image');
    expect(result.find(s => s.type === 'link')).toBeUndefined();
  });

  it('produces cover + narrative + link in order when all elements present', () => {
    const slides = [
      { type: 'image', id: 's1', position: 0, src: 'a.jpg', caption: null } as Slide,
      { type: 'quote', id: 's2', position: 1, body: 'hi', cite: null } as Slide,
    ];
    const result = enrichSlides(
      { slug: 'commode', coverImage: 'cov.jpg', slides, showStoryLink: true },
      'furniture'
    );
    expect(result.length).toBe(4);
    expect(result[0].type).toBe('cover');
    expect(result[1].type).toBe('image');
    expect(result[2].type).toBe('quote');
    expect(result[3].type).toBe('link');
  });
});
