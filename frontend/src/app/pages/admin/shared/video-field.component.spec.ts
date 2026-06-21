import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { VideoFieldComponent } from './video-field.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { VideoStatusDto } from '../../../models/video.model';

describe('VideoFieldComponent', () => {
  let fixture: ComponentFixture<VideoFieldComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService', [
      'uploadVideo', 'uploadCaptions', 'uploadPhoto', 'deleteVideo',
      'getPhotos', 'getVideoStatus', 'retryVideo',
    ]);
    portfolio.getPhotos.and.returnValue(of([{ url: '/api/photos/files/p.jpg' } as any]));
    portfolio.retryVideo.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [VideoFieldComponent],
      providers: [{ provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoFieldComponent);
  });

  // -----------------------------------------------------------------------
  // Scénario 1 : Upload vidéo → polling PROCESSING → READY → aperçu
  // -----------------------------------------------------------------------
  it('upload vidéo → émet videoIdChange, affiche traitement puis aperçu quand READY', fakeAsync(() => {
    const processing: VideoStatusDto = { id: 'vid-1', status: 'PROCESSING' };
    const ready: VideoStatusDto = {
      id: 'vid-1', status: 'READY',
      url: '/api/videos/files/u.mp4', poster: null, durationSeconds: 12,
    };

    portfolio.uploadVideo.and.returnValue(of({ id: 'vid-1', status: 'UPLOADED', filename: 'u.mp4' }));
    portfolio.getVideoStatus.and.returnValues(of(processing), of(ready));

    const emittedIds: (string | null)[] = [];
    fixture.componentInstance.videoIdChange.subscribe(v => emittedIds.push(v));
    fixture.detectChanges();

    // Simule la sélection d'un fichier
    const file = new File([new Uint8Array([1])], 'u.mp4', { type: 'video/mp4' });
    fixture.componentInstance.onVideoSelected({ target: { files: [file] } } as unknown as Event);

    // Après l'upload : videoIdChange émis
    expect(portfolio.uploadVideo).toHaveBeenCalled();
    expect(emittedIds).toContain('vid-1');

    // Premier tick : statut PROCESSING
    tick(2000);
    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    expect(comp.status()).toBe('PROCESSING');

    // Deuxième tick : statut READY
    tick(2000);
    fixture.detectChanges();
    expect(comp.status()).toBe('READY');
    expect(comp.previewUrl()).toBe('/api/videos/files/u.mp4');

    // L'aperçu doit être visible (app-video-player ou équivalent)
    const nativeEl: HTMLElement = fixture.nativeElement;
    const processingEl = nativeEl.querySelector('[aria-live="polite"]');
    expect(processingEl).toBeNull(); // plus de message "Traitement…"

    // Nettoyage de l'interval
    tick(5 * 60 * 1000);
  }));

  // -----------------------------------------------------------------------
  // Scénario 2 : Upload vidéo → polling → FAILED → message + bouton Relancer
  // -----------------------------------------------------------------------
  it(`getVideoStatus FAILED → message d'erreur + bouton Relancer ; clic relance retryVideo`, fakeAsync(() => {
    const failed: VideoStatusDto = {
      id: 'vid-1', status: 'FAILED',
      errorMessage: 'Transcodage échoué',
    };
    const processing: VideoStatusDto = { id: 'vid-1', status: 'PROCESSING' };

    portfolio.uploadVideo.and.returnValue(of({ id: 'vid-1', status: 'UPLOADED', filename: 'u.mp4' }));
    // Premier polling → FAILED
    portfolio.getVideoStatus.and.returnValues(of(failed), of(processing));
    portfolio.retryVideo.and.returnValue(of(undefined));

    fixture.detectChanges();

    const file = new File([new Uint8Array([1])], 'u.mp4', { type: 'video/mp4' });
    fixture.componentInstance.onVideoSelected({ target: { files: [file] } } as unknown as Event);

    // Premier tick → FAILED
    tick(2000);
    fixture.detectChanges();

    const comp = fixture.componentInstance as any;
    expect(comp.status()).toBe('FAILED');
    expect(comp.errorMsg()).toBe('Transcodage échoué');

    // Message d'erreur visible avec role="alert"
    const alertEl: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl!.textContent).toContain('Transcodage échoué');

    // Bouton "Relancer" visible
    const retryBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.vf-retry');
    expect(retryBtn).not.toBeNull();

    // Clic sur "Relancer" → retryVideo appelé
    retryBtn!.click();
    fixture.detectChanges();
    expect(portfolio.retryVideo).toHaveBeenCalledWith('vid-1');

    // Après retry, le polling reprend (tick pour éviter timer ouvert)
    tick(5 * 60 * 1000);
  }));

  // -----------------------------------------------------------------------
  // Compatibilité : retirer → émet videoId null
  // -----------------------------------------------------------------------
  it('retirer → émet videoId null et reset', fakeAsync(() => {
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoIdChange.subscribe(v => emitted.push(v));
    fixture.componentInstance.removeVideo();
    expect(emitted).toContain(null);
    tick(5 * 60 * 1000);
  }));

  // -----------------------------------------------------------------------
  // Upload sous-titres → uploadCaptions → émet videoCaptions
  // -----------------------------------------------------------------------
  it('upload sous-titres → uploadCaptions émet videoCaptions', () => {
    portfolio.uploadCaptions.and.returnValue(of({ url: '/api/videos/files/s.vtt', filename: 's.vtt' }));
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoCaptionsChange.subscribe(v => emitted.push(v));
    fixture.detectChanges();
    const file = new File(['WEBVTT'], 's.vtt', { type: 'text/vtt' });
    fixture.componentInstance.onCaptionsSelected({ target: { files: [file] } } as unknown as Event);
    expect(portfolio.uploadCaptions).toHaveBeenCalled();
    expect(emitted).toContain('/api/videos/files/s.vtt');
  });

  // -----------------------------------------------------------------------
  // Poster depuis la médiathèque (inchangé)
  // -----------------------------------------------------------------------
  it(`poster depuis la médiathèque : ouvre le picker et la sélection émet l'URL du poster`, () => {
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    fixture.componentInstance.videoPosterChange.subscribe(v => emitted.push(v));

    fixture.componentInstance.openPosterPicker();
    expect(portfolio.getPhotos).toHaveBeenCalled();
    expect((fixture.componentInstance as any).posterPickerOpen()).toBeTrue();

    fixture.componentInstance.onPosterPicked({ url: '/api/photos/files/p.jpg' } as any);
    expect(emitted).toContain('/api/photos/files/p.jpg');
    expect((fixture.componentInstance as any).posterPickerOpen()).toBeFalse();
  });

  // -----------------------------------------------------------------------
  // ngOnInit avec videoId existant → charge le statut initial
  // -----------------------------------------------------------------------
  it('videoId fourni en entrée (mode édition) → charge getVideoStatus au init', fakeAsync(() => {
    const ready: VideoStatusDto = {
      id: 'existing-1', status: 'READY',
      url: '/api/videos/files/existing.mp4',
    };
    portfolio.getVideoStatus.and.returnValue(of(ready));

    fixture.componentInstance.videoId = 'existing-1';
    fixture.detectChanges();

    expect(portfolio.getVideoStatus).toHaveBeenCalledWith('existing-1');
    const comp = fixture.componentInstance as any;
    expect(comp.status()).toBe('READY');
    expect(comp.previewUrl()).toBe('/api/videos/files/existing.mp4');
    tick(5 * 60 * 1000);
  }));
});
