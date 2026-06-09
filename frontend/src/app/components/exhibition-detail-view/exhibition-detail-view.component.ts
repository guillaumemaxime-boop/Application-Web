import { Component, Input } from '@angular/core';
import { Exhibition } from '../../models/exhibition.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

@Component({
  selector: 'app-exhibition-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent],
  template: `
    @if (item) {
      <article class="fade-in">
        <header class="hero">
          <div class="hero-bg">
            <app-cropped-image-canvas
              [imageUrl]="item.coverImage"
              [crop]="item.coverCrop ?? null"
              [alt]="item.title"
              mode="cover" />
          </div>
          <div class="container hero-content">
            <span class="eyebrow">{{ item.venue }} · {{ item.city }}, {{ item.country }}</span>
            <h1>{{ item.title }}</h1>
            <p class="dates">{{ formatRange(item.startDate, item.endDate) }}</p>
          </div>
        </header>
      </article>
    }
  `,
  styles: [`
    .hero { position: relative; min-height: 65vh; display: flex; align-items: flex-end; padding: 80px 0; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero-bg app-cropped-image-canvas { width: 100%; height: 100%; display: block; }
    .hero-bg::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 60%, transparent 100%); }
    .hero-content { position: relative; z-index: 1; color: #ffffff; max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero-content .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.85; }
    .hero-content h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin: 16px 0; }
    .hero-content .dates { font-size: 0.95rem; opacity: 0.85; }
  `]
})
export class ExhibitionDetailViewComponent {
  @Input({ required: true }) item: Exhibition | null = null;

  formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = new Date(end).toLocaleDateString('fr-FR', opts);
    return `${s} — ${e}`;
  }
}
