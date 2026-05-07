import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (loading()) {
      <div class="wrap section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="wrap section not-found">
        <h2>Exposition introuvable</h2>
        <a routerLink="/expositions" class="back-link">← Retour aux expositions</a>
      </div>
    } @else if (item(); as e) {
      <article>

        <div class="cover">
          <img [src]="e.coverImage" [alt]="e.title" />
        </div>

        <div class="hero-meta">
          <div class="wrap">
            <a routerLink="/expositions" class="back">← Expositions</a>
            <div class="hero-grid">
              <div>
                <span class="label">{{ e.venue }} · {{ e.city }}, {{ e.country }}</span>
                <h1>{{ e.title }}</h1>
              </div>
              <div class="hero-side">
                <div class="detail-row">
                  <span class="dt-label label">Dates</span>
                  <span>{{ formatRange(e.startDate, e.endDate) }}</span>
                </div>
                @if (e.curator) {
                  <div class="detail-row">
                    <span class="dt-label label">Commissariat</span>
                    <span>{{ e.curator }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <hr />

        <section class="section">
          <div class="wrap narrow">
            <p class="lead">{{ e.shortDescription }}</p>
            <p class="body">{{ e.description }}</p>

            @if (e.tags?.length) {
              <div class="tags">
                @for (t of e.tags; track t) {
                  <span class="tag">{{ t }}</span>
                }
              </div>
            }
          </div>
        </section>

        @if (e.gallery?.length) {
          <hr />
          <section class="section">
            <div class="wrap">
              <div class="gallery">
                @for (img of e.gallery; track img; let i = $index) {
                  <figure [class.wide]="i === 0">
                    <img [src]="img" [alt]="e.title + ' — vue ' + (i + 1)" loading="lazy" />
                  </figure>
                }
              </div>
            </div>
          </section>
        }

      </article>
    }
  `,
  styles: [`
    /* ── Cover ── */
    .cover {
      width: 100%;
      aspect-ratio: 16 / 7;
      overflow: hidden;
      background: #eeede9;
    }
    .cover img { width: 100%; height: 100%; object-fit: cover; }

    /* ── Hero meta ── */
    .hero-meta { padding: 48px 0 64px; }
    .back {
      display: inline-block;
      margin-bottom: 32px;
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .back:hover { color: var(--ink); }

    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 60px;
      align-items: start;
    }
    .hero-grid .label { display: block; margin-bottom: 14px; }
    .hero-grid h1 { max-width: 640px; }

    .hero-side {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-top: 8px;
    }
    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .dt-label { display: block; }
    .detail-row > span:last-child {
      font-size: 0.9375rem;
      color: var(--dim);
    }

    /* ── Description ── */
    .narrow { max-width: 720px; }
    .lead {
      font-family: var(--serif);
      font-size: clamp(1.25rem, 2.5vw, 1.75rem);
      line-height: 1.45;
      color: var(--ink);
      margin-bottom: 28px;
    }
    .body {
      font-size: 1rem;
      line-height: 1.8;
      white-space: pre-line;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 36px;
    }
    .tag {
      font-size: 0.58rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      padding: 3px 9px;
      border: 1px solid var(--line);
      color: var(--muted);
    }

    /* ── Gallery ── */
    .gallery {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    figure {
      overflow: hidden;
      background: #eeede9;
      aspect-ratio: 4 / 3;
    }
    figure.wide {
      grid-column: 1 / -1;
      aspect-ratio: 21 / 9;
    }
    figure img { width: 100%; height: 100%; object-fit: cover; }

    /* ── States ── */
    .status { color: var(--muted); }
    .not-found { display: flex; flex-direction: column; gap: 20px; padding-top: 120px; }
    .back-link {
      font-size: 0.65rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .back-link:hover { color: var(--ink); }

    /* ── Responsive ── */
    @media (max-width: 960px) {
      .hero-grid { grid-template-columns: 1fr; gap: 32px; }
      .cover { aspect-ratio: 4 / 3; }
    }
    @media (max-width: 600px) {
      .gallery { grid-template-columns: 1fr; }
      figure.wide { aspect-ratio: 4 / 3; }
    }
  `]
})
export class ExhibitionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly portfolio = inject(PortfolioService);

  protected readonly item = signal<Exhibition | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.portfolio.getExhibition(slug).subscribe({
      next: data => {
        this.item.set(data);
        this.loading.set(false);
        document.title = `${data.title} — Milo GUILLAUME Design`;
      },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
  }

  protected formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = new Date(end).toLocaleDateString('fr-FR', opts);
    return `${s} — ${e}`;
  }
}
