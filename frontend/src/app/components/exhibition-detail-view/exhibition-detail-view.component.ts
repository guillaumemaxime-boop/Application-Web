import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Exhibition } from '../../models/exhibition.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { SiteContent } from '../../models/site-content.model';
import { Story } from '../../models/story.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';
import { StoryItem } from '../story-viewer/story-viewer.component';
import { roleStyle } from '../../utils/title-style';

@Component({
  selector: 'app-exhibition-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent, NgStyle, RouterLink],
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
            <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ item.venue }} · {{ item.city }}, {{ item.country }}</span>
            <h1 [ngStyle]="titleStyle()">{{ item.title }}</h1>
            <p class="dates">{{ formatRange(item.startDate, item.endDate) }}</p>
          </div>
        </header>

        <section class="section intro">
          <div class="container narrow">
            <span class="eyebrow">Commissariat — {{ item.curator }}</span>
            <p class="lead">{{ item.shortDescription }}</p>
            <p class="body">{{ item.description }}</p>

            @if (item.tags && item.tags.length > 0) {
              <div class="tags-list">
                @for (t of item.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
          </div>
        </section>

        @if (item.gallery.length > 0) {
          <section class="section gallery">
            <div class="container">
              <div class="g-grid">
                @for (img of item.gallery; track img.url; let i = $index) {
                  <figure [style.grid-column]="'span ' + (img.colSpan ?? 1)"
                          [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
                    <div class="gallery-img-wrap">
                      <app-cropped-image-canvas
                        [imageUrl]="img.url" [crop]="img.crop ?? null"
                        [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
                    </div>
                  </figure>
                }
              </div>
            </div>
          </section>
        }

        @if (displaySlides.length > 0 && item.showStoryButton) {
          <div class="container narrow viewer-link-wrap">
            <button type="button" class="viewer-link" aria-label="Voir la story en plein écran" (click)="onViewerOpen()">
              Voir la story →
            </button>
          </div>
        }
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

    .section { padding: 80px 0; }
    .section .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .container.narrow { max-width: 720px; }
    .intro .eyebrow { display: block; font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); margin-bottom: 24px; }
    .intro .lead { font-size: 1.2rem; line-height: 1.6; color: var(--color-ink); margin-bottom: 24px; }
    .intro .body { font-size: 1rem; line-height: 1.7; color: var(--color-ink-soft); white-space: pre-line; }
    .tags-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
    .tag-chip { padding: 4px 10px; font-size: 0.78rem; border: 1px solid var(--color-line); color: var(--color-ink-soft); text-decoration: none; }
    .tag-chip:hover { color: var(--color-ink); border-color: var(--color-ink); }

    .gallery .g-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; grid-auto-rows: 220px; }
    .gallery .g-grid figure { margin: 0; overflow: hidden; height: 100%; }
    .gallery-img-wrap { position: relative; overflow: hidden; width: 100%; height: 100%; }
    .gallery-img-wrap app-cropped-image-canvas { display: block; width: 100%; height: 100%; }

    @media (max-width: 960px) { .gallery .g-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .gallery .g-grid { grid-template-columns: 1fr; } }

    .viewer-link-wrap { padding: 32px 0 80px; text-align: center; }
    .viewer-link { background: transparent; border: 1px solid var(--color-ink); padding: 12px 24px; color: var(--color-ink); cursor: pointer; font-family: inherit; font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .viewer-link:hover { background: var(--color-ink); color: var(--color-bg); }
  `]
})
export class ExhibitionDetailViewComponent {
  @Input({ required: true }) item: Exhibition | null = null;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};

  @Output() viewerOpen = new EventEmitter<StoryItem[]>();

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }

  protected onViewerOpen(): void {
    const e = this.item;
    if (!e) return;
    if (this.displaySlides.length === 0) return;
    this.viewerOpen.emit([{
      title: e.title,
      subtitle: `${e.venue} · ${e.city}`,
      slides: this.displaySlides,
      kind: 'exhibition',
      slug: e.slug,
    }]);
  }

  formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = new Date(end).toLocaleDateString('fr-FR', opts);
    return `${s} — ${e}`;
  }
}
