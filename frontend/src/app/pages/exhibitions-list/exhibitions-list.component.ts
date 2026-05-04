import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';

@Component({
  selector: 'app-exhibitions-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section page-head">
      <div class="container">
        <span class="eyebrow">Scénographies & expositions</span>
        <h1>Expositions</h1>
        <p class="lead">
          Là où les pièces de l'atelier rencontrent un public, un lieu, une lumière.
          Galeries, foires internationales, fondations et institutions culturelles.
        </p>
      </div>
    </section>

    <section class="section list">
      <div class="container">
        @if (loading()) {
          <p class="status">Chargement…</p>
        } @else if (error()) {
          <p class="status error">Impossible de charger les expositions. Vérifiez le backend.</p>
        } @else {
          <ul class="timeline">
            @for (exh of items(); track exh.id) {
              <li>
                <a class="exh-card fade-in" [routerLink]="['/expositions', exh.slug]">
                  <div class="dates">
                    <span class="year">{{ year(exh.startDate) }}</span>
                    <span class="month">{{ month(exh.startDate) }}</span>
                  </div>

                  <div class="img">
                    <img [src]="exh.coverImage" [alt]="exh.title" loading="lazy" />
                  </div>

                  <div class="meta">
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
    .page-head { padding-top: 64px; padding-bottom: 32px; }
    .page-head h1 { margin-top: 16px; }
    .lead { max-width: 640px; margin-top: 24px; font-size: 1.05rem; }

    .timeline { list-style: none; display: flex; flex-direction: column; }
    .exh-card {
      display: grid;
      grid-template-columns: 80px 320px 1fr;
      gap: 48px;
      padding: 40px 0;
      border-top: 1px solid var(--color-line);
      transition: opacity var(--transition);
    }
    .exh-card:hover { opacity: 0.65; }

    .dates { padding-top: 4px; }
    .year {
      display: block;
      font-family: var(--serif);
      font-size: 1.75rem;
      color: var(--color-ink);
      line-height: 1;
    }
    .month {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      margin-top: 6px;
    }

    .img { aspect-ratio: 3 / 2; overflow: hidden; background: var(--color-bg-alt); }
    .img img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .meta { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
    .venue {
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .meta h2 { font-size: 2rem; }
    .meta p { font-size: 0.95rem; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .tag {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 8px;
      border: 1px solid var(--color-line);
      color: var(--color-mute);
    }

    .status { color: var(--color-mute); }
    .status.error { color: #c0392b; }

    @media (max-width: 960px) {
      .exh-card { grid-template-columns: 1fr; gap: 16px; }
      .img { aspect-ratio: 16 / 10; }
      .dates { display: flex; align-items: baseline; gap: 12px; }
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
