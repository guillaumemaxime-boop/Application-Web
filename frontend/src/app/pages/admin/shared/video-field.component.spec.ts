import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { VideoFieldComponent } from './video-field.component';
import { PortfolioService } from '../../../services/portfolio.service';

describe('VideoFieldComponent', () => {
  let fixture: ComponentFixture<VideoFieldComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', ['uploadVideo', 'uploadPhoto', 'deleteVideo', 'getPhotos']);
    portfolio.getPhotos.and.returnValue(of([{ url: '/api/photos/files/p.jpg' } as any]));
    await TestBed.configureTestingModule({
      imports: [VideoFieldComponent],
      providers: [{ provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();
    fixture = TestBed.createComponent(VideoFieldComponent);
  });

  it('upload vidéo → émet videoUrl', () => {
    portfolio.uploadVideo.and.returnValue(of({ url: '/api/videos/files/u.mp4', filename: 'u.mp4' }));
    const emitted: string[] = [];
    fixture.componentInstance.videoUrlChange.subscribe(v => emitted.push(v ?? ''));
    fixture.detectChanges();

    const file = new File([new Uint8Array([1])], 'c.mp4', { type: 'video/mp4' });
    fixture.componentInstance.onVideoSelected({ target: { files: [file] } } as unknown as Event);

    expect(portfolio.uploadVideo).toHaveBeenCalled();
    expect(emitted).toContain('/api/videos/files/u.mp4');
  });

  it('retirer → émet null', () => {
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoUrlChange.subscribe(v => emitted.push(v));
    fixture.componentInstance.removeVideo();
    expect(emitted).toContain(null);
  });

  it('upload sous-titres → émet videoCaptions', () => {
    portfolio.uploadVideo.and.returnValue(of({ url: '/api/videos/files/s.vtt', filename: 's.vtt' }));
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoCaptionsChange.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    const file = new File(['WEBVTT'], 's.vtt', { type: 'text/vtt' });
    fixture.componentInstance.onCaptionsSelected({ target: { files: [file] } } as unknown as Event);
    expect(emitted).toContain('/api/videos/files/s.vtt');
  });

  it('poster depuis la médiathèque : ouvre le picker et la sélection émet l’URL du poster', () => {
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoPosterChange.subscribe(v => emitted.push(v));

    // Ouvre la médiathèque
    fixture.componentInstance.openPosterPicker();
    expect(portfolio.getPhotos).toHaveBeenCalled();
    expect((fixture.componentInstance as any).posterPickerOpen()).toBeTrue();

    // Sélection d'une image → poster = son URL, picker fermé
    fixture.componentInstance.onPosterPicked({ url: '/api/photos/files/p.jpg' } as any);
    expect(emitted).toContain('/api/photos/files/p.jpg');
    expect((fixture.componentInstance as any).posterPickerOpen()).toBeFalse();
  });
});
