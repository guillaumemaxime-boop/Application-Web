import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { VideoSummary } from '../../../models/video.model';

@Component({
  selector: 'app-video-picker',
  standalone: true,
  imports: [FormsModule, A11yModule],
  template: `
    <div class="picker-backdrop" role="presentation" (click)="emitClose()">
      <div class="picker-panel" role="dialog" aria-modal="true"
           [attr.aria-labelledby]="'video-picker-title'"
           cdkTrapFocus cdkTrapFocusAutoCapture (click)="$event.stopPropagation()">
        <div class="picker-head">
          <h3 id="video-picker-title">Choisir une vidéo existante</h3>
          <button type="button" class="picker-close" (click)="emitClose()" aria-label="Fermer">×</button>
        </div>
        @if (readyVideos().length === 0) {
          <p class="picker-empty">Aucune vidéo prête. Importez une vidéo dans la Médiathèque vidéo.</p>
        } @else {
          <div class="picker-search">
            <input type="search" class="picker-search-input"
              [ngModel]="query()" (ngModelChange)="query.set($event)"
              placeholder="Rechercher par nom…" aria-label="Rechercher une vidéo par nom" />
          </div>
          @if (filtered().length === 0) {
            <p class="picker-empty">Aucun résultat pour « {{ query() }} ».</p>
          } @else {
            <div class="picker-grid">
              @for (v of filtered(); track v.id) {
                <button type="button" class="picker-item vp-item" (click)="select(v)"
                        [title]="v.originalName ?? v.id"
                        [attr.aria-label]="'Choisir la vidéo ' + (v.originalName ?? v.id)">
                  @if (v.poster) {
                    <img [src]="v.poster" alt="" loading="lazy" />
                  } @else {
                    <span class="vp-noposter" aria-hidden="true">▶</span>
                  }
                  <span class="vp-caption" aria-hidden="true">
                    <span class="vp-name">{{ v.originalName ?? v.id }}</span>
                    @if (v.durationSeconds) { <span class="vp-dur">{{ fmtDuration(v.durationSeconds) }}</span> }
                  </span>
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .picker-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1300;
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .picker-panel {
      background: var(--color-bg); width: 100%; max-width: 860px; max-height: 80vh;
      display: flex; flex-direction: column;
    }
    .picker-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--color-line); flex-shrink: 0;
    }
    .picker-head h3 { margin: 0; font-size: 1.1rem; }
    .picker-close {
      background: transparent; border: 0; font-size: 1.5rem; color: var(--color-mute);
      cursor: pointer; line-height: 1; padding: 4px 8px;
    }
    .picker-close:hover { color: var(--color-ink); }
    .picker-search { padding: 12px 24px 0; flex-shrink: 0; }
    .picker-search-input {
      width: 100%; box-sizing: border-box; font: inherit; padding: 8px 12px;
      border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink);
    }
    .picker-search-input:focus { outline: none; border-color: var(--color-accent); }
    .picker-search-input:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .picker-empty { padding: 32px 24px; color: var(--color-mute); font-size: 0.9rem; }
    .picker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px; padding: 16px 24px 24px; overflow-y: auto;
    }
    .picker-item {
      border: 2px solid var(--color-line); background: var(--color-bg-alt); padding: 0;
      cursor: pointer; overflow: hidden;
    }
    .picker-item:hover { border-color: var(--color-accent); }
    .picker-item:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .vp-item { display: flex; flex-direction: column; aspect-ratio: auto; }
    .vp-item img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
    .vp-noposter { display: flex; align-items: center; justify-content: center; aspect-ratio: 16/9; background: var(--color-bg-alt); color: var(--color-mute); font-size: 1.5rem; }
    .vp-caption { display: flex; justify-content: space-between; gap: 8px; padding: 6px 8px; font-size: 0.72rem; }
    .vp-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vp-dur { color: var(--color-mute); flex-shrink: 0; }
  `]
})
export class VideoPickerComponent implements OnInit, OnDestroy {
  @Input() videos: VideoSummary[] = [];
  @Output() selected = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  protected readonly query = signal('');
  private previousFocus: HTMLElement | null = null;

  protected readonly readyVideos = computed(() => this.videos.filter(v => v.status === 'READY'));

  protected filtered(): VideoSummary[] {
    const q = this.query().trim().toLowerCase();
    const list = this.readyVideos();
    if (!q) return list;
    return list.filter(v => (v.originalName ?? v.id).toLowerCase().includes(q));
  }

  ngOnInit(): void {
    if (typeof document !== 'undefined') this.previousFocus = document.activeElement as HTMLElement | null;
  }

  ngOnDestroy(): void { this.restorePreviousFocus(); }

  private restorePreviousFocus(): void {
    const t = this.previousFocus;
    if (!t || typeof t.focus !== 'function') return;
    setTimeout(() => { try { t.focus(); } catch { /* ignore */ } }, 0);
    this.previousFocus = null;
  }

  fmtDuration(seconds: number | null): string {
    if (seconds == null) return '';
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  select(v: VideoSummary): void { this.selected.emit(v.id); }

  emitClose(): void { this.closed.emit(); this.restorePreviousFocus(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.emitClose(); }
}
