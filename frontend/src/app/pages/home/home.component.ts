import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="wrap">
        <span class="label">Milo GUILLAUME Design · Paris, France</span>
        <h1>Mobilier sculpté<br>&amp; scénographies.</h1>
        <p>
          Depuis 2017, éditions limitées fabriquées en atelier
          et scénographies pour institutions culturelles européennes.
        </p>
        <a routerLink="/mobilier" class="cta">Découvrir le catalogue →</a>
      </div>
    </section>

    <hr />

    <section class="section">
      <div class="wrap">
        <div class="sec-head">
          <span class="label">Pièces phares</span>
          <a routerLink="/mobilier" class="see-all">Tout le catalogue →</a>
        </div>

        @if (loadingFurniture()) {
          <p class="status">Chargement…</p>
        } @else if (errorFurniture()) {
          <p class="status err">Impossible de charger les pièces.</p>
        } @else {
          <div class="grid">
            @for (item of featuredFurniture(); track item.id) {
              <a class="card" [routerLink]="['/mobilier', item.slug]">
                <div class="img-wrap">
                  <img [src]="item.coverImage" [alt]="item.title" loading="lazy" />
                </div>
                <div class="card-body">
                  <span class="label">{{ item.category }}</span>
                  <h3>{{ item.title }}</h3>
                  <span class="yr">{{ item.year }}</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <hr />

    <section class="section">
      <div class="wrap">
        <div class="sec-head">
          <span class="label">Expositions</span>
          <a routerLink="/expositions" class="see-all">Toutes les expositions →</a>
        </div>

        @if (!loadingExhibitions() && featuredExhibitions().length) {
          <ul class="exh-list">
            @for (e of featuredExhibitions(); track e.id) {
              <li>
                <a class="exh-row" [routerLink]="['/expositions', e.slug]">
                  <span class="exh-yr">{{ exhYear(e.startDate) }}</span>
                  <h3 class="exh-title">{{ e.title }}</h3>
                  <span class="label exh-venue">{{ e.venue }}, {{ e.city }}</span>
                </a>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: [`
    /* ── Hero ── */
    .hero {
      padding: 160px 0 120px;
    }
    .hero .label {
      display: block;
      margin-bottom: 28px;
    }
    .hero h1 {
      max-width: 880px;
      margin-bottom: 28px;
    }
    .hero p {
      max-width: 440px;
      font-size: 1rem;
      margin-bottom: 40px;
    }
    .cta {
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--dim);
      transition: color var(--ease);
    }
    .cta:hover { color: var(--ink); }

    /* ── Section header ── */
    .sec-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 36px;
    }
    .see-all {
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .see-all:hover { color: var(--ink); }

    /* ── Furniture grid ── */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .card { display: block; }
    .img-wrap {
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: #eeede9;
      margin-bottom: 14px;
    }
    .img-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: opacity var(--ease);
    }
    .card:hover .img-wrap img { opacity: 0.82; }
    .card-body {
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    .card-body .label { display: block; margin-bottom: 6px; }
    .card-body h3 {
      font-size: 1.375rem;
      margin-bottom: 4px;
    }
    .yr {
      font-size: 0.6rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    /* ── Exhibition list ── */
    .exh-list {}
    .exh-row {
      display: grid;
      grid-template-columns: 72px 1fr auto;
      align-items: baseline;
      gap: 32px;
      padding: 22px 0;
      border-bottom: 1px solid var(--line);
      transition: opacity var(--ease);
    }
    .exh-list li:first-child .exh-row { border-top: 1px solid var(--line); }
    .exh-row:hover { opacity: 0.45; }
    .exh-yr {
      font-family: var(--serif);
      font-size: 1.125rem;
      font-style: italic;
      color: var(--muted);
    }
    .exh-title {
      font-size: clamp(1.25rem, 2vw, 1.625rem);
    }
    .exh-venue { text-align: right; }

    /* ── Status ── */
    .status { color: var(--muted); }
    .status.err { color: #b53030; }

    /* ── Responsive ── */
    @media (max-width: 960px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
      .exh-row { grid-template-columns: 56px 1fr; }
      .exh-venue { display: none; }
    }
    @media (max-width: 600px) {
      .hero { padding: 110px 0 72px; }
      .grid { grid-template-columns: 1fr; }
      .exh-row { grid-template-columns: 1fr; gap: 8px; }
      .exh-yr { display: none; }
    }
  `]
})
export class HomeComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly featuredFurniture = signal<Furniture[]>([]);
  protected readonly featuredExhibitions = signal<Exhibition[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly loadingExhibitions = signal(true);
  protected readonly errorFurniture = signal(false);

  constructor() {
    this.portfolio.getFeaturedFurniture().subscribe({
      next: data => { this.featuredFurniture.set(data); this.loadingFurniture.set(false); },
      error: () => { this.errorFurniture.set(true); this.loadingFurniture.set(false); }
    });
    this.portfolio.getFeaturedExhibitions().subscribe({
      next: data => { this.featuredExhibitions.set(data); this.loadingExhibitions.set(false); },
      error: () => this.loadingExhibitions.set(false)
    });
  }

  protected exhYear(d: string): string {
    return new Date(d).getFullYear().toString();
  }
}
