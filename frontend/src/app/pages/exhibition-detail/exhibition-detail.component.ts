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
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h2>Exposition introuvable</h2>
        <p><a class="btn-link" routerLink="/expositions">Retour aux expositions</a></p>
      </div>
    } @else if (item(); as e) {
      <article class="fade-in">
        <header class="hero">
          <div class="hero-bg">
            <img [src]="e.coverImage" [alt]="e.title" />
          </div>
          <div class="container hero-content">
            <a class="back" routerLink="/expositions">← Retour aux expositions</a>
            <span class="eyebrow">{{ e.venue }} · {{ e.city }}, {{ e.country }}</span>
            <h1>{{ e.title }}</h1>
            <p class="dates">{{ formatRange(e.startDate, e.endDate) }}</p>
          </div>
        </header>

        <section class="section intro">
          <div class="container narrow">
            <span class="eyebrow">Commissariat — {{ e.curator }}</span>
            <p class="lead">{{ e.shortDescription }}</p>
            <p class="body">{{ e.description }}</p>

            <div class="tags">
              @for (t of e.tags; track t) { <span class="tag">{{ t }}</span> }
            </div>
          </div>
        </section>

        <section class="section gallery">
          <div class="container">
            <div class="g-grid">
              @for (img of e.gallery; track img; let i = $index) {
                <figure [class.wide]="i === 0">
                  <img [src]="img" [alt]="e.title + ' — vue ' + (i + 1)" loading="lazy" />
                </figure>
              }
            </div>
          </div>
        </section>
      </article>
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
    .back {
      display: inline-block;
      margin-bottom: 32px;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      transition: color var(--transition);
    }
    .back:hover { color: #ffffff; }
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

    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 40px; }
    .tag {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 10px;
      border: 1px solid var(--color-line);
      color: var(--color-mute);
      transition: border-color var(--transition), color var(--transition);
    }
    .tag:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

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

    @media (max-width: 720px) {
      .gallery .g-grid { grid-template-columns: 1fr; }
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
