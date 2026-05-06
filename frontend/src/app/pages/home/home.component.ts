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
    <!-- HERO -->
    <section class="hero">
      <div class="container">
        <span class="eyebrow fade-in">Milo GUILLAUME Design · Paris, France</span>
        <h1 class="fade-in">Mobilier sculpté<br>& scénographies sensibles.</h1>
        <p class="lead fade-in">
          Depuis 2017, l'atelier conçoit des pièces uniques et des éditions limitées,
          et signe des expositions pour des institutions culturelles européennes.
        </p>
        <a routerLink="/mobilier" class="btn-link fade-in">Découvrir les pièces</a>
      </div>
    </section>

    <!-- FEATURED FURNITURE -->
    <section class="section ruled">
      <div class="container">
        <div class="sec-head">
          <span class="eyebrow">Pièces phares</span>
          <a routerLink="/mobilier" class="sec-more">Voir tout le catalogue →</a>
        </div>

        @if (loadingFurniture()) {
          <p class="status">Chargement…</p>
        } @else if (errorFurniture()) {
          <p class="status error">Impossible de charger les pièces. Vérifiez le backend.</p>
        } @else {
          <div class="proj-grid">
            @for (item of featuredFurniture(); track item.id) {
              <a class="proj-card" [routerLink]="['/mobilier', item.slug]">
                <div class="proj-img">
                  <img [src]="item.coverImage" [alt]="item.title" loading="lazy" />
                </div>
                <div class="proj-info">
                  <span class="proj-cat">{{ item.category }}</span>
                  <h3 class="proj-title">{{ item.title }}</h3>
                  <span class="proj-year">{{ item.year }}</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <!-- EXHIBITIONS -->
    <section class="section ruled">
      <div class="container">
        <div class="sec-head">
          <span class="eyebrow">Expositions à l'affiche</span>
          <a routerLink="/expositions" class="sec-more">Toutes les expositions →</a>
        </div>

        @if (!loadingExhibitions() && featuredExhibitions().length) {
          <ul class="exh-rows">
            @for (exh of featuredExhibitions(); track exh.id) {
              <li>
                <a class="exh-row" [routerLink]="['/expositions', exh.slug]">
                  <span class="exh-year">{{ exhYear(exh.startDate) }}</span>
                  <h3 class="exh-title">{{ exh.title }}</h3>
                  <span class="exh-venue">{{ exh.venue }}, {{ exh.city }}</span>
                </a>
              </li>
            }
          </ul>
        }
      </div>
    </section>

    <!-- QUOTE -->
    <section class="section ruled">
      <div class="container">
        <blockquote>
          « Le mobilier juste, c'est celui qui se tait quand on ne le regarde pas
          et qui éclaire la pièce dès qu'on s'en approche. »
          <cite>— Milo GUILLAUME Design</cite>
        </blockquote>
      </div>
    </section>
  `,
  styles: [`
    /* ── HERO ───────────────────────────────────────────────────── */
    .hero {
      min-height: 90vh;
      display: flex;
      align-items: center;
      padding: 140px 0 100px;
    }
    .hero .eyebrow { display: block; margin-bottom: 32px; }
    .hero h1 { max-width: 820px; margin-bottom: 32px; }
    .lead {
      max-width: 520px;
      font-size: 1.0625rem;
      line-height: 1.75;
      margin-bottom: 48px;
    }

    /* ── SECTION STRUCTURE ──────────────────────────────────────── */
    .ruled { border-top: 1px solid var(--color-line); }
    .sec-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 48px;
    }
    .sec-more {
      font-size: 0.65rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      transition: color var(--transition);
    }
    .sec-more:hover { color: var(--color-ink); }

    /* ── PROJECT GRID ───────────────────────────────────────────── */
    .proj-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .proj-card { display: block; }
    .proj-img {
      aspect-ratio: 3 / 4;
      overflow: hidden;
      background: var(--color-bg-alt);
      margin-bottom: 16px;
    }
    .proj-img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(18%);
      transition: transform var(--transition-img), filter var(--transition-img);
    }
    .proj-card:hover .proj-img img {
      transform: scale(1.04);
      filter: grayscale(0%);
    }
    .proj-info {
      border-top: 1px solid var(--color-line);
      padding-top: 14px;
    }
    .proj-cat {
      font-size: 0.62rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .proj-title {
      font-family: var(--serif);
      font-size: 1.375rem;
      font-weight: 500;
      color: var(--color-ink);
      margin: 6px 0;
    }
    .proj-year {
      font-size: 0.62rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    /* ── EXHIBITION ROWS ────────────────────────────────────────── */
    .exh-rows { list-style: none; }
    .exh-row {
      display: grid;
      grid-template-columns: 72px 1fr auto;
      gap: 40px;
      align-items: baseline;
      padding: 22px 0;
      border-bottom: 1px solid var(--color-line);
      transition: opacity var(--transition);
    }
    .exh-rows li:first-child .exh-row { border-top: 1px solid var(--color-line); }
    .exh-row:hover { opacity: 0.50; }
    .exh-year {
      font-family: var(--serif);
      font-size: 1.0625rem;
      font-style: italic;
      color: var(--color-mute);
    }
    .exh-title {
      font-family: var(--serif);
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--color-ink);
    }
    .exh-venue {
      font-size: 0.65rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    /* ── QUOTE ──────────────────────────────────────────────────── */
    blockquote {
      max-width: 880px;
      font-family: var(--serif);
      font-size: clamp(1.875rem, 3vw, 2.75rem);
      font-weight: 400;
      font-style: italic;
      line-height: 1.38;
      color: var(--color-ink);
    }
    cite {
      display: block;
      margin-top: 28px;
      font-family: var(--sans);
      font-style: normal;
      font-size: 0.65rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    .status { color: var(--color-mute); }
    .status.error { color: #b53535; }

    /* ── RESPONSIVE ─────────────────────────────────────────────── */
    @media (max-width: 960px) {
      .proj-grid { grid-template-columns: repeat(2, 1fr); }
      .exh-row { grid-template-columns: 56px 1fr; }
      .exh-venue { display: none; }
    }
    @media (max-width: 640px) {
      .hero { min-height: auto; padding: 120px 0 80px; }
      .proj-grid { grid-template-columns: 1fr; }
      .exh-row { grid-template-columns: 1fr; }
      .exh-year { display: none; }
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
