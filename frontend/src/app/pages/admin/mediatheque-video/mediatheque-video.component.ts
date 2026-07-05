import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { VideoSummary } from '../../../models/video.model';
import { VideoPlayerComponent } from '../../../components/video-player/video-player.component';

@Component({
  selector: 'app-mediatheque-video',
  standalone: true,
  imports: [RouterLink, VideoPlayerComponent],
  template: `
    <div class="videos-tab">
      <div class="videos-upload-zone">
        <h2>Importer une vidéo</h2>
        <p class="videos-upload-hint">Formats : MP4 / WebM web-ready · max 200 Mo · transcodage automatique après import.</p>
        <input #fileInput type="file" accept="video/mp4,video/webm" style="display:none" (change)="upload($event)" />
        <button type="button" class="btn-primary" [disabled]="uploading()" (click)="fileInput.click()">
          {{ uploading() ? 'Import en cours…' : 'Choisir un fichier' }}
        </button>
        @if (uploadError()) { <p class="vv-error" role="alert">{{ uploadError() }}</p> }
      </div>

      @if (loading()) {
        <p class="status">Chargement de la médiathèque vidéo…</p>
      } @else if (videos().length === 0) {
        <p class="status">Aucune vidéo. Importez-en une ci-dessus.</p>
      } @else {
        <h2 class="videos-list-title">Vidéos importées</h2>
        <div class="videos-grid">
          @for (v of videos(); track v.id) {
            <div class="video-card">
              <div class="video-thumb" [class.playing]="activePlayerId() === v.id">
                @if (activePlayerId() === v.id && v.url) {
                  <app-video-player [src]="v.url" [hlsSrc]="v.hls" [poster]="v.poster" [captions]="null" label="Aperçu vidéo" />
                } @else if (v.status === 'READY' && v.url) {
                  <button type="button" class="video-play-btn" (click)="play(v)"
                          [attr.aria-label]="'Lire ' + (v.originalName ?? 'la vidéo')">
                    @if (v.poster) { <img [src]="v.poster" [alt]="v.originalName ?? 'Vidéo'" loading="lazy" /> }
                    @else { <span class="video-noposter" aria-hidden="true"></span> }
                    <span class="video-play-overlay" aria-hidden="true">▶</span>
                  </button>
                } @else {
                  @if (v.poster) { <img [src]="v.poster" [alt]="v.originalName ?? 'Vidéo'" loading="lazy" /> }
                  @else { <span class="video-noposter" aria-hidden="true">▶</span> }
                }
                @if (activePlayerId() !== v.id) {
                  <span class="video-badge" [class.ok]="v.status==='READY'" [class.ko]="v.status==='FAILED'">{{ statusLabel(v.status) }}</span>
                }
              </div>
              <div class="video-info">
                <span class="video-name" [title]="v.originalName ?? v.id">{{ v.originalName ?? v.id }}</span>
                <span class="video-meta">
                  @if (v.durationSeconds) { <span>{{ fmtDuration(v.durationSeconds) }}</span> }
                  @if (v.width && v.height) { <span>{{ v.width }}×{{ v.height }}</span> }
                </span>
              </div>
              <p class="video-processing" aria-live="polite">
                @if (v.status === 'PROCESSING' || v.status === 'UPLOADED') { Traitement en cours… }
              </p>
              @if (v.status === 'FAILED') {
                <div class="video-failed" role="alert">
                  <span>{{ v.errorMessage ?? 'Échec du transcodage.' }}</span>
                  <button type="button" class="btn-link" (click)="retry(v)">Relancer</button>
                </div>
              }
              <div class="video-usage">
                @if (v.usedBy.length === 0) {
                  <span class="video-orphan">Non utilisée</span>
                } @else {
                  <span class="video-usage-label">Utilisée par :</span>
                  <ul>
                    @for (u of v.usedBy; track u.type + (u.slug ?? '')) {
                      <li>
                        @if (u.type === 'furniture') { <a [routerLink]="['/admin/mobilier']" [queryParams]="{ slug: u.slug }">{{ u.label }}</a> }
                        @else if (u.type === 'exhibition') { <a [routerLink]="['/admin/expositions']" [queryParams]="{ slug: u.slug }">{{ u.label }}</a> }
                        @else { <a [routerLink]="['/admin/textes']">Studio</a> }
                      </li>
                    }
                  </ul>
                }
              </div>
              <div class="video-actions">
                <button type="button" class="video-del" [disabled]="!canDelete(v)"
                        [title]="canDelete(v) ? 'Supprimer' : 'Impossible : vidéo utilisée'"
                        [attr.aria-label]="(canDelete(v) ? 'Supprimer ' : 'Impossible de supprimer : ') + (v.originalName ?? v.id)"
                        (click)="remove(v)">Supprimer</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .videos-tab { display: flex; flex-direction: column; gap: 24px; }
    .videos-upload-zone { padding: 32px; border: 1px dashed var(--color-line); background: var(--color-bg-alt); text-align: center; }
    .videos-upload-zone h2 { margin: 0 0 8px; font-size: 1.3rem; }
    .videos-upload-hint { margin: 0 0 20px; color: var(--color-mute); font-size: 0.85rem; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .vv-error { color: #c0392b; font-size: 0.85rem; margin-top: 12px; }
    .status { color: var(--color-mute); }
    .videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .video-card { display: flex; flex-direction: column; border: 1px solid var(--color-line); background: var(--color-bg); }
    .video-thumb { position: relative; aspect-ratio: 16/9; overflow: hidden; background: var(--color-bg-alt); }
    .video-thumb.playing { aspect-ratio: auto; overflow: visible; }
    .video-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .video-play-btn { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; position: relative; }
    .video-play-btn img { width: 100%; height: 100%; object-fit: cover; }
    .video-play-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 2rem; color: #fff; background: rgba(0,0,0,0.45); transition: background var(--transition);
    }
    .video-play-btn:hover .video-play-overlay, .video-play-btn:focus-visible .video-play-overlay { background: rgba(0,0,0,0.6); }
    .video-play-btn:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .video-noposter { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--color-mute); font-size: 1.8rem; }
    .video-badge { position: absolute; top: 6px; left: 6px; font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 6px; background: var(--color-ink); color: var(--color-bg); }
    .video-badge.ok { background: #2e7d32; } .video-badge.ko { background: #c0392b; }
    .video-info { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
    .video-name { font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .video-meta { display: inline-flex; gap: 10px; font-size: 0.7rem; color: var(--color-mute); }
    .video-processing { padding: 0 12px 8px; font-size: 0.78rem; color: var(--color-ink-soft); }
    .video-failed { padding: 0 12px 8px; font-size: 0.78rem; color: #c0392b; display: flex; flex-direction: column; gap: 4px; }
    .btn-link { background: transparent; border: 0; color: var(--color-accent); cursor: pointer; text-align: left; padding: 0; font: inherit; text-decoration: underline; }
    .btn-link:focus-visible, .video-del:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .videos-list-title { font-size: 1.1rem; font-weight: 500; margin: 0; }
    .video-usage { padding: 8px 12px; border-top: 1px solid var(--color-line); font-size: 0.75rem; }
    .video-usage ul { list-style: none; padding: 0; margin: 4px 0 0; display: flex; flex-direction: column; gap: 2px; }
    .video-usage-label { color: var(--color-mute); }
    .video-orphan { color: var(--color-mute); }
    .video-actions { display: flex; justify-content: flex-end; padding: 8px 12px; border-top: 1px solid var(--color-line); }
    .video-del { background: transparent; border: 1px solid var(--color-line); padding: 4px 12px; font-size: 0.75rem; cursor: pointer; color: #b1532a; }
    .video-del:disabled { opacity: 0.4; cursor: not-allowed; color: var(--color-mute); }
  `]
})
export class MediathequeVideoComponent implements OnDestroy, AfterViewInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  protected readonly videos = signal<VideoSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal('');
  /** Id de la vidéo dont le lecteur est actif dans sa carte (un seul à la fois). */
  protected readonly activePlayerId = signal<string | null>(null);
  private pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  constructor() { this.refresh(); }

  ngAfterViewInit(): void {
    // ?import=1 (lien "Importer vidéo" du dashboard) → ouvre directement le sélecteur de fichier.
    this.route.queryParamMap.subscribe(params => {
      if (params.get('import') === '1') {
        setTimeout(() => this.fileInput?.nativeElement.click(), 0);
      }
    });
  }

  /** Active la lecture en place dans la carte de la vidéo v. */
  play(v: VideoSummary): void { this.activePlayerId.set(v.id); }

  ngOnDestroy(): void { this.pollTimers.forEach(t => clearInterval(t)); }

  private refresh(): void {
    this.loading.set(true);
    this.portfolio.getVideos().subscribe({
      next: v => { this.videos.set(v); this.loading.set(false); this.resumePolling(v); },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger la médiathèque vidéo.'); },
    });
  }

  canDelete(v: VideoSummary): boolean { return v.usedBy.length === 0; }

  statusLabel(s: string): string {
    return s === 'READY' ? 'Prête' : s === 'FAILED' ? 'Échec' : s === 'PROCESSING' ? 'Traitement' : 'En file';
  }

  fmtDuration(seconds: number | null): string {
    if (seconds == null) return '';
    const m = Math.floor(seconds / 60), sec = Math.floor(seconds % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.portfolio.uploadVideo(file).subscribe({
      next: r => {
        this.uploading.set(false);
        const stub: VideoSummary = { id: r.id, status: r.status, originalName: file.name, url: null,
          poster: null, hls: null, durationSeconds: null, width: null, height: null, createdAt: null,
          errorMessage: null, usedBy: [] };
        this.videos.update(list => [stub, ...list]);
        this.startPolling(r.id);
      },
      error: () => { this.uploading.set(false); this.uploadError.set('Échec de l\'envoi de la vidéo.'); },
    });
  }

  retry(v: VideoSummary): void {
    this.portfolio.retryVideo(v.id).subscribe({
      next: () => { this.patch(v.id, { status: 'UPLOADED', errorMessage: null }); this.startPolling(v.id); },
      error: () => this.toast.error('Impossible de relancer le transcodage.'),
    });
  }

  remove(v: VideoSummary): void {
    if (!this.canDelete(v)) return;
    if (!confirm(`Supprimer la vidéo "${v.originalName ?? v.id}" ?`)) return;
    this.portfolio.deleteVideoById(v.id).subscribe({
      next: () => { this.videos.update(list => list.filter(x => x.id !== v.id)); this.toast.success('Vidéo supprimée.'); },
      error: (err) => this.toast.error(err?.status === 409 ? 'Vidéo utilisée : suppression refusée.' : 'Erreur lors de la suppression.'),
    });
  }

  private resumePolling(list: VideoSummary[]): void {
    for (const v of list) if (v.status === 'PROCESSING' || v.status === 'UPLOADED') this.startPolling(v.id);
  }

  private startPolling(id: string): void {
    if (this.pollTimers.has(id)) return;
    const timer = setInterval(() => {
      this.portfolio.getVideoStatus(id).subscribe({
        next: dto => {
          this.patch(id, { status: dto.status, url: dto.url ?? null, poster: dto.poster ?? null,
            hls: dto.hls ?? null, durationSeconds: dto.durationSeconds ?? null,
            width: dto.width ?? null, height: dto.height ?? null, errorMessage: dto.errorMessage ?? null });
          if (dto.status === 'READY' || dto.status === 'FAILED') this.stopPolling(id);
        },
        error: () => this.stopPolling(id),
      });
    }, 2000);
    this.pollTimers.set(id, timer);
  }

  private stopPolling(id: string): void {
    const t = this.pollTimers.get(id);
    if (t) { clearInterval(t); this.pollTimers.delete(id); }
  }

  private patch(id: string, changes: Partial<VideoSummary>): void {
    this.videos.update(list => list.map(x => x.id === id ? { ...x, ...changes } : x));
  }
}
