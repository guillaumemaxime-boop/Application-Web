import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';
import { srcsetFor } from '../../utils/image-variant';

interface YearGroup {
  year: number;
  items: Exhibition[];
}

@Component({
  selector: 'app-expositions-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="head">
      <div class="container">
        <span class="eyebrow" [ngStyle]="eyebrowStyle()">Archives</span>
        <h1 [ngStyle]="titleStyle()">Expositions</h1>
        <p class="lead">Les présentations et installations de l'atelier, des plus récentes aux premières.</p>
      </div>
    </section>

    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (items().length === 0) {
      <div class="container section"><p class="status">Aucune exposition pour l'instant.</p></div>
    } @else {
      @for (g of groups(); track g.year) {
        <section class="group">
          <div class="container">
            <h2 class="group-label" [ngStyle]="sectionTitleStyle()">{{ g.year }}</h2>
            <div class="grid">
              @for (e of g.items; track e.slug) {
                <a class="card" [routerLink]="['/expositions', e.slug]">
                  <div class="thumb">
                    <img [src]="e.coverImage"
                         [attr.srcset]="srcsetFor(e.coverImage) || null"
                         sizes="(max-width: 720px) 100vw, 50vw"
                         [alt]="e.title" loading="lazy" />
                  </div>
                  <div class="meta">
                    <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ e.venue }} · {{ e.city }}</span>
                    <span class="title" [ngStyle]="cardTitleStyle()">{{ e.title }}</span>
                    <span class="dates">{{ formatRange(e.startDate, e.endDate) }}</span>
                  </div>
                </a>
              }
            </div>
          </div>
        </section>
      }
    }
  `,
  styles: [`
    .head { padding: 120px 0 48px; border-bottom: 1px solid var(--color-line); }
    .head .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .head h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 5vw, 3.5rem); margin-top: 16px; }
    .head .lead { max-width: 540px; margin-top: 20px; color: var(--color-ink-soft); }

    .group { padding: 64px 0 24px; }
    .group:first-of-type { padding-top: 56px; }
    .group-label {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 1rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
      margin-bottom: 32px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--color-line);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 48px 28px;
    }
    .card { display: block; color: inherit; text-decoration: none; }
    .thumb {
      aspect-ratio: 16 / 10;
      overflow: hidden;
      background: var(--color-bg-alt);
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 320ms ease;
    }
    .card:hover .thumb img { transform: scale(1.02); }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 16px;
    }
    .meta .eyebrow {
      font-size: 0.68rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .meta .title {
      font-family: var(--serif);
      font-size: 1.5rem;
      line-height: 1.2;
      color: var(--color-ink);
    }
    .meta .dates {
      font-size: 0.85rem;
      color: var(--color-ink-soft);
    }

    .status { color: var(--color-mute); }

    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; gap: 40px; }
      .head { padding: 96px 0 40px; }
    }
  `]
})
export class ExpositionsListComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly items = signal<Exhibition[]>([]);
  protected readonly loading = signal(true);
  protected readonly content = signal<SiteContent>({});

  protected readonly srcsetFor = srcsetFor;

  protected readonly titleStyle        = computed(() => roleStyle(this.content(), 'title'));
  protected readonly sectionTitleStyle = computed(() => roleStyle(this.content(), 'section-title'));
  protected readonly cardTitleStyle    = computed(() => roleStyle(this.content(), 'card-title'));
  protected readonly eyebrowStyle      = computed(() => roleStyle(this.content(), 'eyebrow'));

  protected readonly groups = computed<YearGroup[]>(() => {
    const all = this.items();
    if (all.length === 0) return [];
    const map = new Map<number, Exhibition[]>();
    for (const e of all) {
      const y = this.yearOf(e.startDate);
      const list = map.get(y) ?? [];
      list.push(e);
      map.set(y, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, items]) => ({
        year,
        items: items.slice().sort((a, b) => b.startDate.localeCompare(a.startDate)),
      }));
  });

  constructor() {
    document.title = 'Expositions — Milo GUILLAUME Design';
    this.loadingSvc.start('page');
    forkJoin({
      exhibitions: this.portfolio.getAllExhibitions(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ exhibitions, content }) => {
        this.items.set(exhibitions);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  private yearOf(date: string): number {
    if (!date) return 0;
    const d = new Date(date);
    const y = d.getFullYear();
    return Number.isFinite(y) ? y : 0;
  }

  protected formatRange(start: string, end: string): string {
    if (!start) return '';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = end ? new Date(end).toLocaleDateString('fr-FR', opts) : '';
    return e ? `${s} — ${e}` : s;
  }
}
