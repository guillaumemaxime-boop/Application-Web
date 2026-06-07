import { Component, computed, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';
import { enrichSlides } from '../../utils/display-slides';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [NgStyle, RouterLink, StoryViewerComponent],
  template: `
    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h1>Exposition introuvable</h1>
        <p><a class="btn-link" routerLink="/expositions">Retour aux expositions</a></p>
      </div>
    } @else if (item(); as e) {
      <article class="fade-in">
        <header class="hero">
          <div class="hero-bg">
            <img [src]="e.coverImage" [alt]="e.title" />
          </div>
          <div class="container hero-content">
            <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ e.venue }} · {{ e.city }}, {{ e.country }}</span>
            <h1 [ngStyle]="titleStyle()">{{ e.title }}</h1>
            <p class="dates">{{ formatRange(e.startDate, e.endDate) }}</p>
          </div>
        </header>

        <section class="section intro">
          <div class="container narrow">
            <span class="eyebrow" [ngStyle]="eyebrowStyle()">Commissariat — {{ e.curator }}</span>
            <p class="lead">{{ e.shortDescription }}</p>
            <p class="body">{{ e.description }}</p>

            @if (e.tags && e.tags.length > 0) {
              <div class="tags-list">
                @for (t of e.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
          </div>
        </section>

        <section class="section gallery">
          <div class="container">
            <div class="g-grid">
              @for (img of e.gallery; track img.url; let i = $index) {
                <figure [class.wide]="i === 0">
                  <img [src]="img.url" [alt]="e.title + ' — vue ' + (i + 1)" loading="lazy" />
                </figure>
              }
            </div>
          </div>
        </section>

        @if (hasSlides() && e.showStoryButton) {
          <div class="container narrow viewer-link-wrap">
            <button type="button" class="viewer-link" (click)="openViewer()">
              Voir la story →
            </button>
          </div>
        }
      </article>

      @if (viewerQueue().length > 0) {
        <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
      }
    }
  `,
  styles: [`
    .hero {
      position: relative;
      min-height: 65vh;
      display: flex;
      align-items: flex-end;
      padding: 120px 0 72px;
      overflow: hidden;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .hero-bg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hero-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 60%, transparent 100%);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      color: #ffffff;
    }
    .hero-content .eyebrow,
    .hero-content .dates {
      color: rgba(255, 255, 255, 0.6);
    }
    .hero-content h1 {
      color: #ffffff;
      margin: 16px 0 24px;
      max-width: 880px;
    }
    .dates {
      font-size: 0.85rem;
      letter-spacing: 0.08em;
    }

    .narrow { max-width: 760px; }
    .lead {
      margin-top: 24px;
      font-family: var(--serif);
      font-size: 1.75rem;
      line-height: 1.4;
      color: var(--color-ink);
    }
    .body {
      margin-top: 32px;
      font-size: 1.05rem;
      line-height: 1.8;
      white-space: pre-line;
    }

    .tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 40px; }
    .tag-chip {
      font-size: 0.78rem; padding: 4px 12px; background: var(--color-bg-alt);
      border: 1px solid var(--color-line); color: var(--color-ink-soft); text-decoration: none;
    }
    .tag-chip:hover { color: var(--color-ink); border-color: var(--color-ink); }

    .gallery .g-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    figure {
      overflow: hidden;
      background: var(--color-bg-alt);
      aspect-ratio: 4 / 3;
    }
    figure.wide {
      grid-column: 1 / -1;
      aspect-ratio: 16 / 9;
    }
    figure img { width: 100%; height: 100%; object-fit: cover; }

    .status { color: var(--color-mute); }

    .viewer-link-wrap {
      display: flex;
      justify-content: center;
      padding: 0 0 96px;
    }
    .viewer-link {
      background: none;
      border: 1px solid var(--color-ink);
      color: var(--color-ink);
      padding: 12px 28px;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }
    .viewer-link:hover {
      background: var(--color-ink);
      color: var(--color-bg);
    }

    @media (max-width: 720px) {
      .gallery .g-grid { grid-template-columns: 1fr; }
      figure.wide { aspect-ratio: 4 / 3; }
    }
  `]
})
export class ExhibitionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly item = signal<Exhibition | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly content = signal<SiteContent>({});
  protected readonly viewerQueue = signal<StoryItem[]>([]);

  protected readonly titleStyle   = computed(() => roleStyle(this.content(), 'title'));
  protected readonly eyebrowStyle = computed(() => roleStyle(this.content(), 'eyebrow'));

  protected readonly hasSlides = computed(() => {
    const e = this.item();
    if (!e) return false;
    return !!e.coverImage || (e.slides?.length ?? 0) > 0;
  });

  protected readonly displaySlides = computed<DisplaySlide[]>(() => {
    const e = this.item();
    if (!e) return [];
    return enrichSlides({
      slug: e.slug,
      coverImage: e.coverImage,
      slides: e.slides ?? [],
      showStoryLink: e.showStoryLink,
    }, 'exhibition');
  });

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loadingSvc.start('page');
    forkJoin({
      exhibition: this.portfolio.getExhibition(slug),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ exhibition, content }) => {
        this.item.set(exhibition);
        this.content.set(content);
        this.loading.set(false);
        document.title = `${exhibition.title} — Milo GUILLAUME Design`;
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  protected openViewer() {
    const e = this.item();
    if (!e) return;
    const slides = this.displaySlides();
    if (slides.length === 0) return;
    this.viewerQueue.set([{
      title: e.title,
      subtitle: `${e.venue} · ${this.formatRange(e.startDate, e.endDate)}`,
      slides,
      kind: 'exhibition',
      slug: e.slug,
    }]);
  }

  protected closeViewer() {
    this.viewerQueue.set([]);
  }

  protected formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = new Date(end).toLocaleDateString('fr-FR', opts);
    return `${s} — ${e}`;
  }
}
