import { parseVideoUrl } from './video-url';

describe('parseVideoUrl', () => {
  it('reconnaît https://www.youtube.com/watch?v=ID', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît https://youtu.be/ID', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît https://www.youtube.com/embed/ID', () => {
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('reconnaît https://vimeo.com/ID', () => {
    expect(parseVideoUrl('https://vimeo.com/123456789'))
      .toEqual({ platform: 'vimeo', id: '123456789' });
  });

  it('reconnaît https://player.vimeo.com/video/ID', () => {
    expect(parseVideoUrl('https://player.vimeo.com/video/123456789'))
      .toEqual({ platform: 'vimeo', id: '123456789' });
  });

  it('ignore les paramètres additionnels YouTube', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share'))
      .toEqual({ platform: 'youtube', id: 'dQw4w9WgXcQ' });
  });

  it('retourne null pour URL vide', () => {
    expect(parseVideoUrl('')).toBeNull();
  });

  it('retourne null pour URL non vidéo', () => {
    expect(parseVideoUrl('https://example.com/foo')).toBeNull();
  });

  it('retourne null pour URL malformée', () => {
    expect(parseVideoUrl('not a url')).toBeNull();
  });
});
