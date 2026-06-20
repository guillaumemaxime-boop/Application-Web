import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { VideoPlayerComponent } from '../../../components/video-player/video-player.component';

/**
 * Champ admin pour gerer la video optionnelle d'une fiche/page :
 * upload video (.mp4/.webm), poster (image), sous-titres (.vtt) ;
 * apercu + remplacer/retirer. Emet les URLs vers le parent (pas de
 * HttpClient direct : passe par PortfolioService).
 */
@Component({
  selector: 'app-video-field',
  standalone: true,
  imports: [VideoPlayerComponent],
  template: `
    <div class="video-field">
      <span class="vf-title">Vidéo (optionnelle)</span>

      @if (videoUrl) {
        <app-video-player [src]="videoUrl" [poster]="videoPoster ?? null"
          [captions]="videoCaptions ?? null" [label]="label" />
      } @else {
        <p class="vf-empty">Aucune vidéo. Formats : mp4/webm web-ready (≤ 200 Mo).</p>
      }

      <div class="vf-actions">
        <input #videoInput type="file" accept="video/mp4,video/webm" hidden (change)="onVideoSelected($event)" />
        <button type="button" class="vf-btn" (click)="videoInput.click()">
          {{ videoUrl ? 'Remplacer la vidéo' : 'Ajouter une vidéo' }}
        </button>
        <input #posterInput type="file" accept="image/*" hidden (change)="onPosterSelected($event)" />
        <button type="button" class="vf-btn" (click)="posterInput.click()">
          {{ videoPoster ? 'Remplacer le poster' : 'Ajouter un poster' }}
        </button>
        <input #captionsInput type="file" accept=".vtt,text/vtt" hidden (change)="onCaptionsSelected($event)" />
        <button type="button" class="vf-btn" (click)="captionsInput.click()">
          {{ videoCaptions ? 'Remplacer les sous-titres' : 'Ajouter des sous-titres (.vtt)' }}
        </button>
        @if (videoUrl) {
          <button type="button" class="vf-btn vf-remove" (click)="removeVideo()">Retirer la vidéo</button>
        }
      </div>
      @if (error()) { <p class="vf-error" role="alert">{{ error() }}</p> }
    </div>
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
    .vf-error { color: #c0392b; font-size: 0.8rem; }
  `]
})
export class VideoFieldComponent {
  private readonly portfolio = inject(PortfolioService);

  @Input() label = 'Vidéo';
  @Input() videoUrl: string | null = null;
  @Input() videoPoster: string | null = null;
  @Input() videoCaptions: string | null = null;

  @Output() videoUrlChange = new EventEmitter<string | null>();
  @Output() videoPosterChange = new EventEmitter<string | null>();
  @Output() videoCaptionsChange = new EventEmitter<string | null>();

  protected readonly error = signal('');

  onVideoSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: (r) => { this.videoUrl = r.url; this.videoUrlChange.emit(r.url); },
      error: () => this.error.set('Échec de l’envoi de la vidéo.'),
    });
  }

  onPosterSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.portfolio.uploadPhoto(file).subscribe({
      next: (p) => { this.videoPoster = p.url; this.videoPosterChange.emit(p.url); },
      error: () => this.error.set('Échec de l’envoi du poster.'),
    });
  }

  onCaptionsSelected(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: (r) => { this.videoCaptions = r.url; this.videoCaptionsChange.emit(r.url); },
      error: () => this.error.set('Échec de l’envoi des sous-titres.'),
    });
  }

  removeVideo(): void {
    this.videoUrl = null;
    this.videoPoster = null;
    this.videoCaptions = null;
    this.videoUrlChange.emit(null);
    this.videoPosterChange.emit(null);
    this.videoCaptionsChange.emit(null);
  }
}
