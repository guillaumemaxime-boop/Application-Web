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
      <div class="container hero-inner">
        <span class="eyebrow fade-in">Milo GUILLAUME Design — Paris, France</span>
        <h1 class="fade-in">Mobilier sculpté<br/>& scénographies sensibles.</h1>
        <p class="lead fade-in">
          Depuis 2017, l'atelier conçoit des pièces uniques et des éditions limitées,
          et signe des expositions pour des institutions culturelles européennes.
        </p>
        <div class="hero-actions fade-in">
          <a routerLink="/mobilier" class="btn-link">Découvrir le mobilier</a>
          <a routerLink="/expositions" class="btn-link">Voir les expositions</a>
        </div>
      </div>
    </section>

    <section class="section featured">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Pièces phares</span>
          <h2>Une sélection d'éditions récentes</h2>
        </div>

        @if (loadingFurniture()) {
          <p class="status">Chargement…</p>
        } @else if (errorFurniture()) {
          <p class="status error">Impossible de charger les pièces. Vérifiez que le backend est lancé sur le port 8080.</p>
        } @else {
          <div class="grid">
            @for (item of featuredFurniture(); track item.id) {
              <a class="card" [routerLink]="['/mobilier', item.slug]">
                <div class="thumb">
                  <img [src]="item.coverImage" [alt]="item.title" loading="lazy" />
                </div>
                <div class="meta">
                  <span class="cat">{{ item.category }} · {{ item.year }}</span>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.shortDescription }}</p>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <section class="section exhibitions">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Expositions à l'affiche</span>
          <h2>Là où nos pièces prennent vie</h2>
        </div>

        @if (loadingExhibitions()) {
          <p class="status">Chargement…</p>
        } @else {
          <div class="exh-list">
            @for (exh of featuredExhibitions(); track exh.id) {
              <a class="exh-row" [routerLink]="['/expositions', exh.slug]">
                <div class="exh-img">
                  <img [src]="exh.coverImage" [alt]="exh.title" loading="lazy" />
                </div>
                <div class="exh-meta">
                  <span class="cat">{{ exh.venue }} · {{ exh.city }}, {{ exh.country }}</span>
                  <h3>{{ exh.title }}</h3>
                  <p>{{ exh.shortDescription }}</p>
                  <span class="dates">{{ formatRange(exh.startDate, exh.endDate) }}</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    <section class="section quote">
      <div class="container">
        <blockquote>
          « Le mobilier juste, c'est celui qui se tait quand on ne le regarde pas
          et qui éclaire la pièce dès qu'on s'en approche. »
        </blockquote>
        <cite>— Milo GUILLAUME Design</cite>
      </div>
    </section>
  `,
  styles: [`
    .hero {
      padding: 120px 0 128px;
    }
    .hero-inner { max-width: 880px; }
    .hero h1 { margin-top: 24px; }
    .lead {
      margin-top: 32px;
      max-width: 620px;
      font-size: 1.125rem;
      line-height: 1.7;
    }
    .hero-actions {
      display: flex;
      gap: 32px;
      margin-top: 48px;
      flex-wrap: wrap;
    }

    .section-head {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 56px;
      max-width: 720px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 48px;
    }
    .card {
      display: block;
      transition: transform 360ms ease;
    }
    .card:hover { transform: translateY(-6px); }
    .thumb {
      overflow: hidden;
      background: var(--color-bg-alt);
      aspect-ratio: 4 / 5;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 400ms ease;
    }
    .card:hover .thumb img { transform: scale(1.04); }
    .meta { padding: 20px 0 0; }
    .cat {
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .meta h3 {
      margin: 12px 0 8px;
      font-size: 1.5rem;
    }
    .meta p { font-size: 0.95rem; color: var(--color-ink-soft); }

    .exh-list { display: flex; flex-direction: column; }
    .exh-row {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 48px;
      padding: 32px 0;
      border-top: 1px solid var(--color-line);
      transition: border-color var(--transition);
    }
    .exh-row:hover { border-top-color: var(--color-accent); }
    .exh-img { aspect-ratio: 3 / 2; overflow: hidden; }
    .exh-img img { width: 100%; height: 100%; object-fit: cover; }
    .exh-meta { display: flex; flex-direction: column; justify-content: center; gap: 12px; }
    .exh-meta h3 { font-size: 1.75rem; }
    .dates {
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    .quote {
      text-align: center;
      padding: 128px 0;
      border-top: 1px solid var(--color-line);
    }
    blockquote {
      font-family: var(--serif);
      font-size: clamp(1.5rem, 3vw, 2.5rem);
      line-height: 1.3;
      max-width: 880px;
      margin: 0 auto;
      color: var(--color-ink);
    }
    cite {
      display: block;
      margin-top: 32px;
      font-style: normal;
      font-size: 0.875rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    .status { color: var(--color-mute); }
    .status.error { color: #c0392b; }

    @media (max-width: 960px) {
      .grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
      .exh-row { grid-template-columns: 1fr; gap: 24px; }
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }
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

  protected formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = new Date(end).toLocaleDateString('fr-FR', opts);
    return `${s} → ${e}`;
  }
}
