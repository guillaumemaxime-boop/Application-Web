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
    const source: HTMLSourceElement = fixture.nativeElement.querySelector('source');
    expect(video.getAttribute('aria-label')).toBe('Tabouret Aurore — vidéo');
    expect(source.getAttribute('src')).toBe('/api/videos/files/clip.mp4');
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
});
