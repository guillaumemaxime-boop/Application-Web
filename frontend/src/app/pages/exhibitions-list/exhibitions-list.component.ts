import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';

@Component({
  selector: 'app-exhibitions-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Scénographies & expositions</span>
        <h1>Expositions</h1>
        <p class="lead">
          Là où les pièces de l'atelier rencontrent un public, un lieu, une lumière.
          Galeries, foires internationales, fondations et institutions culturelles.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        @if (loading()) {
          <p class="status">Chargement…</p>
        } @else if (error()) {
          <p class="status error">Impossible de charger les expositions.</p>
        } @else {
          <ul class="timeline">
            @for (exh of items(); track exh.id) {
              <li>
                <a class="row fade-in" [routerLink]="['/expositions', exh.slug]">
                  <div class="date-col">
                    <span class="year">{{ year(exh.startDate) }}</span>
                    <span class="month">{{ month(exh.startDate) }}</span>
                  </div>

                  <div class="img-col">
                    <img [src]="exh.coverImage" [alt]="exh.title" loading="lazy" />
                  </div>

                  <div class="meta-col">
                    <span class="venue">{{ exh.venue }} · {{ exh.city }}, {{ exh.country }}</span>
                    <h2>{{ exh.title }}</h2>
                    <p>{{ exh.shortDescription }}</p>
                    <div class="tags">
                      @for (t of exh.tags; track t) { <span class="tag">{{ t }}</span> }
                    </div>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: [`
    .page-head {
      padding-top: 120px;
      padding-bottom: 80px;
      border-bottom: 1px solid var(--color-line);
    }
    .page-head .eyebrow { display: block; margin-bottom: 20px; }
    .page-head h1 { margin-bottom: 24px; }
    .lead { max-width: 600px; font-size: 1rem; }

    .timeline { list-style: none; display: flex; flex-direction: column; }
    .row {
      display: grid;
      grid-template-columns: 80px 280px 1fr;
      gap: 48px;
      padding: 48px 0;
      border-bottom: 1px solid var(--color-line);
      align-items: start;
      transition: opacity var(--transition);
    }
    .timeline li:first-child .row { border-top: 1px solid var(--color-line); }
    .row:hover { opacity: 0.55; }

    .date-col { padding-top: 4px; }
    .year {
      display: block;
      font-family: var(--serif);
      font-size: 1.625rem;
      font-style: italic;
      color: var(--color-mute);
      line-height: 1;
    }
    .month {
      display: block;
      font-size: 0.62rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
      margin-top: 8px;
    }

    .img-col {
      aspect-ratio: 3 / 2;
      overflow: hidden;
      background: var(--color-bg-alt);
    }
    .img-col img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(15%);
      transition: transform var(--transition-img), filter var(--transition-img);
    }
    .row:hover .img-col img { transform: scale(1.03); filter: grayscale(0%); }

    .meta-col { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
    .venue {
      font-size: 0.65rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .meta-col h2 { font-size: 2rem; }
    .meta-col p { font-size: 0.9375rem; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .tag {
      font-size: 0.60rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 4px 10px;
      border: 1px solid var(--color-line);
      color: var(--color-mute);
    }

    .status { color: var(--color-mute); }
    .status.error { color: #b53535; }

    @media (max-width: 960px) {
      .row { grid-template-columns: 64px 1fr; gap: 24px; }
      .img-col { display: none; }
    }
    @media (max-width: 600px) {
      .row { grid-template-columns: 1fr; }
      .date-col { display: flex; align-items: baseline; gap: 12px; }
    }
  `]
})
export class ExhibitionsListComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly items = signal<Exhibition[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  constructor() {
    this.portfolio.getAllExhibitions().subscribe({
      next: data => { this.items.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }

  protected year(d: string): string { return new Date(d).getFullYear().toString(); }
  protected month(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  }
}
