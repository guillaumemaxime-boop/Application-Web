import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit,
  Output, SimpleChanges, inject, signal,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { PortfolioService } from '../../../services/portfolio.service';
import { VideoPlayerComponent } from '../../../components/video-player/video-player.component';
import { PhotoPickerComponent } from './photo-picker.component';
import { Photo } from '../../../models/photo.model';
import { VideoStatus } from '../../../models/video.model';

/**
 * Champ admin pour gérer la vidéo optionnelle d'une fiche/page :
 * upload vidéo (.mp4/.webm) → polling status (PROCESSING/READY/FAILED),
 * poster (image upload ou médiathèque), sous-titres (.vtt).
 * Émet videoIdChange (id DB) et non plus une URL directe.
 */
@Component({
  selector: 'app-video-field',
  standalone: true,
  imports: [VideoPlayerComponent, PhotoPickerComponent],
  template: `
    <div class="video-field">
      <span class="vf-title">Vidéo (optionnelle)</span>

      @if (status() === 'PROCESSING' || status() === 'UPLOADED') {
        <div aria-live="polite" class="vf-processing">
          <span class="vf-spinner" aria-hidden="true"></span>
          <p>Traitement de la vidéo en cours…</p>
        </div>
      }

      @if (status() === 'READY' && previewUrl()) {
        <app-video-player
          [src]="previewUrl()!"
          [hlsSrc]="previewHls()"
          [poster]="videoPoster ?? null"
          [captions]="videoCaptions ?? null"
          [label]="label" />
      }

      @if (status() === 'FAILED') {
        <div class="vf-error" role="alert">
          <p>{{ errorMsg() }}</p>
          <button type="button" class="vf-btn vf-retry" (click)="onRetry()">Relancer</button>
        </div>
      }

      @if (!videoId && status() === null) {
        <p class="vf-empty">Aucune vidéo. Formats : mp4/webm web-ready (≤ 200 Mo).</p>
      }

      <div class="vf-actions">
        <input #videoInput type="file" accept="video/mp4,video/webm" hidden (change)="onVideoSelected($event)" />
        <button type="button" class="vf-btn" (click)="videoInput.click()">
          {{ videoId ? 'Remplacer la vidéo' : 'Ajouter une vidéo' }}
        </button>
        <input #posterInput type="file" accept="image/*" hidden (change)="onPosterSelected($event)" />
        <button type="button" class="vf-btn" (click)="posterInput.click()">
          {{ videoPoster ? 'Remplacer le poster' : 'Ajouter un poster' }}
        </button>
        <button type="button" class="vf-btn" (click)="openPosterPicker()" title="Choisir le poster depuis la médiathèque">
          Poster depuis la médiathèque
        </button>
        <input #captionsInput type="file" accept=".vtt,text/vtt" hidden (change)="onCaptionsSelected($event)" />
        <button type="button" class="vf-btn" (click)="captionsInput.click()">
          {{ videoCaptions ? 'Remplacer les sous-titres' : 'Ajouter des sous-titres (.vtt)' }}
        </button>
        @if (videoId) {
          <button type="button" class="vf-btn vf-remove" (click)="removeVideo()">Retirer la vidéo</button>
        }
      </div>

      @if (uploadError()) { <p class="vf-upload-error" role="alert">{{ uploadError() }}</p> }
    </div>

    @if (posterPickerOpen()) {
      <app-photo-picker
        target="cover"
        [photos]="photos()"
        (selected)="onPosterPicked($event)"
        (closed)="posterPickerOpen.set(false)" />
    }
  `,
  styles: [`
    .video-field { display: flex; flex-direction: column; gap: 10px; }
    .vf-title { font-size: 0.78rem; color: var(--color-ink-soft); }
    .vf-empty { font-size: 0.85rem; color: var(--color-mute); }
    .vf-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .vf-btn {
      background: transparent; border: 1px solid var(--color-line); padding: 6px 14px;
      font-size: 0.78rem; cursor: pointer; color: var(--color-ink-soft);
    }
    .vf-btn:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .vf-remove { color: #c0392b; }
    .vf-retry { margin-top: 4px; }
    .vf-error { color: #c0392b; font-size: 0.85rem; }
    .vf-upload-error { color: #c0392b; font-size: 0.8rem; }
    .vf-processing { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--color-ink-soft); }
    .vf-spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid var(--color-line); border-top-color: var(--color-ink-soft);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class VideoFieldComponent implements OnInit, OnChanges, OnDestroy {
  private readonly portfolio = inject(PortfolioService);

  /** Identifiant de la vidéo en base (null si aucune vidéo). */
  @Input() videoId: string | null = null;
  @Input() label = 'Vidéo';
  @Input() videoPoster: string | null = null;
  @Input() videoCaptions: string | null = null;

  @Output() videoIdChange = new EventEmitter<string | null>();
  @Output() videoPosterChange = new EventEmitter<string | null>();
  @Output() videoCaptionsChange = new EventEmitter<string | null>();

  /** Statut de transcodage courant. */
  protected readonly status = signal<VideoStatus | null>(null);
  /** URL de preview mp4 (disponible uniquement quand status=READY). */
  protected readonly previewUrl = signal<string | null>(null);
  /** URL master.m3u8 HLS si disponible (null sinon — fallback mp4). */
  protected readonly previewHls = signal<string | null>(null);
  /** Message d'erreur de transcodage (FAILED). */
  protected readonly errorMsg = signal<string | null>(null);
  /** Erreur d'upload réseau. */
  protected readonly uploadError = signal('');
  protected readonly posterPickerOpen = signal(false);
  protected readonly photos = signal<Photo[]>([]);

  private pollingSubscription: Subscription | null = null;
  private currentVideoId: string | null = null;

  /** Durée max de polling : 5 minutes. */
  private static readonly MAX_POLL_TICKS = Math.ceil((5 * 60 * 1000) / 2000);

  ngOnInit(): void {
    if (this.videoId) {
      this.loadVideoStatus(this.videoId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoId'] && !changes['videoId'].firstChange) {
      const newId: string | null = changes['videoId'].currentValue;
      if (newId && newId !== this.currentVideoId) {
        this.loadVideoStatus(newId);
      } else if (!newId) {
        this.resetState();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  /** Charge le statut une fois et reprend le polling si encore en cours. */
  private loadVideoStatus(id: string): void {
    this.currentVideoId = id;
    this.portfolio.getVideoStatus(id).subscribe({
      next: (dto) => {
        this.status.set(dto.status);
        if (dto.status === 'READY') {
          this.previewUrl.set(dto.url ?? null);
          this.previewHls.set(dto.hls ?? null);
        } else if (dto.status === 'FAILED') {
          this.errorMsg.set(dto.errorMessage ?? 'Échec du transcodage.');
        } else if (dto.status === 'PROCESSING' || dto.status === 'UPLOADED') {
          // reprend le polling
          this.startPolling(id);
        }
      },
      error: () => this.uploadError.set('Impossible de récupérer le statut vidéo.'),
    });
  }

  /** Lance un polling toutes les 2 s jusqu'à READY/FAILED ou timeout. */
  private startPolling(id: string): void {
    this.stopPolling();
    this.currentVideoId = id;
    let tickCount = 0;

    this.pollingSubscription = timer(2000, 2000).pipe(
      switchMap(() => this.portfolio.getVideoStatus(id)),
    ).subscribe({
      next: (dto) => {
        tickCount++;
        this.status.set(dto.status);

        if (dto.status === 'READY') {
          this.previewUrl.set(dto.url ?? null);
          this.previewHls.set(dto.hls ?? null);
          this.stopPolling();
        } else if (dto.status === 'FAILED') {
          this.errorMsg.set(dto.errorMessage ?? 'Échec du transcodage.');
          this.stopPolling();
        } else if (tickCount >= VideoFieldComponent.MAX_POLL_TICKS) {
          // garde-fou 5 min
          this.stopPolling();
        }
      },
      error: () => {
        this.uploadError.set('Erreur lors du suivi du transcodage.');
        this.stopPolling();
      },
    });
  }

  private stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  private resetState(): void {
    this.stopPolling();
    this.currentVideoId = null;
    this.status.set(null);
    this.previewUrl.set(null);
    this.previewHls.set(null);
    this.errorMsg.set(null);
    this.uploadError.set('');
  }

  // ---------------------------------------------------------------------------
  // Actions utilisateur
  // ---------------------------------------------------------------------------

  onVideoSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadError.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: (r) => {
        this.videoId = r.id;
        this.videoIdChange.emit(r.id);
        this.status.set(r.status);
        this.startPolling(r.id);
      },
      error: () => this.uploadError.set('Échec de l\'envoi de la vidéo.'),
    });
  }

  onPosterSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadError.set('');
    this.portfolio.uploadPhoto(file).subscribe({
      next: (p) => { this.videoPoster = p.url; this.videoPosterChange.emit(p.url); },
      error: () => this.uploadError.set('Échec de l\'envoi du poster.'),
    });
  }

  onCaptionsSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadError.set('');
    this.portfolio.uploadCaptions(file).subscribe({
      next: (r) => { this.videoCaptions = r.url; this.videoCaptionsChange.emit(r.url); },
      error: () => this.uploadError.set('Échec de l\'envoi des sous-titres.'),
    });
  }

  onRetry(): void {
    if (!this.currentVideoId) return;
    this.errorMsg.set(null);
    this.status.set('UPLOADED');
    const id = this.currentVideoId;
    this.portfolio.retryVideo(id).subscribe({
      next: () => this.startPolling(id),
      error: () => this.uploadError.set('Impossible de relancer le transcodage.'),
    });
  }

  removeVideo(): void {
    this.videoId = null;
    this.videoPoster = null;
    this.videoCaptions = null;
    this.videoIdChange.emit(null);
    this.videoPosterChange.emit(null);
    this.videoCaptionsChange.emit(null);
    this.resetState();
  }

  /** Ouvre la médiathèque pour choisir le poster parmi les images existantes. */
  openPosterPicker(): void {
    this.posterPickerOpen.set(true);
    this.portfolio.getPhotos().subscribe(p => this.photos.set(p));
  }

  /** Poster sélectionné depuis la médiathèque : adopte son URL (pas d'upload). */
  onPosterPicked(photo: Photo): void {
    this.videoPoster = photo.url;
    this.videoPosterChange.emit(photo.url);
    this.posterPickerOpen.set(false);
  }
}
