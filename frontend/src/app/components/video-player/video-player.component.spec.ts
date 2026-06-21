import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  let fixture: ComponentFixture<VideoPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VideoPlayerComponent] }).compileComponents();
    fixture = TestBed.createComponent(VideoPlayerComponent);
  });

  function render(props: Partial<VideoPlayerComponent>) {
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
  }

  it('rend la source et le nom accessible', () => {
    render({ src: '/api/videos/files/clip.mp4', label: 'Tabouret Aurore — vidéo' });
    const video: HTMLVideoElement = fixture.nativeElement.querySelector('video');
    expect(video.getAttribute('aria-label')).toBe('Tabouret Aurore — vidéo');
  });

  it('rend une balise <source> mp4 quand hlsSrc est absent', () => {
    render({ src: '/api/videos/files/clip.mp4', label: 'Tabouret Aurore — vidéo' });
    const source: HTMLSourceElement = fixture.nativeElement.querySelector('source');
    expect(source).toBeTruthy();
    expect(source.getAttribute('src')).toBe('/api/videos/files/clip.mp4');
  });

  it('omet la balise <source> quand hlsSrc est fourni (hls.js gère la lecture)', () => {
    render({ src: '/api/videos/files/clip.mp4', hlsSrc: '/api/videos/files/clip/master.m3u8', label: 'x' });
    expect(fixture.nativeElement.querySelector('source')).toBeNull();
  });

  it('utilise preload=none avec poster, metadata sans', () => {
    render({ src: '/api/videos/files/clip.mp4', poster: '/api/photos/files/p.jpg', label: 'x' });
    expect(fixture.nativeElement.querySelector('video').getAttribute('preload')).toBe('none');

    const f2 = TestBed.createComponent(VideoPlayerComponent);
    Object.assign(f2.componentInstance, { src: '/api/videos/files/clip.mp4', label: 'x' });
    f2.detectChanges();
    expect(f2.nativeElement.querySelector('video').getAttribute('preload')).toBe('metadata');
  });

  it('ajoute la piste de sous-titres si captions', () => {
    render({ src: '/api/videos/files/clip.mp4', captions: '/api/videos/files/s.vtt', label: 'x' });
    const track: HTMLTrackElement = fixture.nativeElement.querySelector('track');
    expect(track).toBeTruthy();
    expect(track.getAttribute('src')).toBe('/api/videos/files/s.vtt');
    expect(track.getAttribute('kind')).toBe('captions');
  });

  it('omet la piste si pas de captions', () => {
    render({ src: '/api/videos/files/clip.mp4', label: 'x' });
    expect(fixture.nativeElement.querySelector('track')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Tests unitaires de la stratégie pure (chooseStrategy)
  // -------------------------------------------------------------------------

  describe('chooseStrategy (pure)', () => {
    const { chooseStrategy } = VideoPlayerComponent;

    it('retourne mp4 si hlsSrc est null (quel que soit le support navigateur)', () => {
      expect(chooseStrategy(null, true, true)).toBe('mp4');
      expect(chooseStrategy(null, false, true)).toBe('mp4');
      expect(chooseStrategy(null, false, false)).toBe('mp4');
    });

    it('retourne native si hlsSrc fourni et navigateur supporte HLS natif', () => {
      expect(chooseStrategy('https://cdn/master.m3u8', true, true)).toBe('native');
      expect(chooseStrategy('https://cdn/master.m3u8', true, false)).toBe('native');
    });

    it('retourne hlsjs si hlsSrc fourni, pas de HLS natif, mais hls.js supporté', () => {
      expect(chooseStrategy('https://cdn/master.m3u8', false, true)).toBe('hlsjs');
    });

    it('retourne mp4 (fallback) si hlsSrc fourni mais aucun support HLS', () => {
      expect(chooseStrategy('https://cdn/master.m3u8', false, false)).toBe('mp4');
    });
  });
});
