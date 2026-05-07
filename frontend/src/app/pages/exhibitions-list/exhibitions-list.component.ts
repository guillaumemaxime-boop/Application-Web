import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Exhibition } from '../../models/exhibition.model';

@Component({
  selector: 'app-exhibitions-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div class="wrap">
        <span class="label">Scénographies & expositions</span>
        <h1>Expositions</h1>
        <p>
          Galeries, foires internationales, fondations et institutions culturelles.
          Là où les pièces de l'atelier rencontrent un public, un lieu, une lumière.
        </p>
      </div>
    </div>

    <hr />

    <section class="section">
      <div class="wrap">
        @if (loading()) {
          <p class="status">Chargement…</p>
        } @else if (error()) {
          <p class="status err">Impossible de charger les expositions.</p>
        } @else {
          <ul class="list">
            @for (e of items(); track e.id) {
              <li>
                <a class="row" [routerLink]="['/expositions', e.slug]">
                  <div class="date">
                    <span class="yr">{{ year(e.startDate) }}</span>
                    <span class="mo label">{{ month(e.startDate) }}</span>
                  </div>

                  <div class="thumb">
                    <img [src]="e.coverImage" [alt]="e.title" loading="lazy" />
                  </div>

                  <div class="meta">
                    <span class="label venue">{{ e.venue }} · {{ e.city }}, {{ e.country }}</span>
                    <h2>{{ e.title }}</h2>
                    <p>{{ e.shortDescription }}</p>
                    @if (e.tags?.length) {
                      <div class="tags">
                        @for (t of e.tags; track t) {
                          <span class="tag">{{ t }}</span>
                        }
                      </div>
                    }
                  </div>

                  <span class="arrow" aria-hidden="true">→</span>
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
      padding: 100px 0 72px;
    }
    .page-head .label { display: block; margin-bottom: 20px; }
    .page-head h1 { margin-bottom: 20px; }
    .page-head p { max-width: 540px; }

    .list {}
    .row {
      display: grid;
      grid-template-columns: 72px 220px 1fr 24px;
      gap: 40px;
      align-items: start;
      padding: 40px 0;
      border-bottom: 1px solid var(--line);
      transition: opacity var(--ease);
    }
    .list li:first-child .row { border-top: 1px solid var(--line); }
    .row:hover { opacity: 0.5; }

    .date { padding-top: 2px; }
    .yr {
      display: block;
      font-family: var(--serif);
      font-size: 1.5rem;
      font-style: italic;
      color: var(--muted);
      line-height: 1;
    }
    .mo {
      display: block;
      margin-top: 6px;
    }

    .thumb {
      aspect-ratio: 3 / 2;
      overflow: hidden;
      background: #eeede9;
    }
    .thumb img {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: opacity var(--ease);
    }
    .row:hover .thumb img { opacity: 0.85; }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 2px;
    }
    .venue { display: block; }
    .meta h2 {
      font-size: clamp(1.5rem, 2.5vw, 2.25rem);
    }
    .meta p { font-size: 0.9rem; }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
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

    .arrow {
      font-size: 0.9rem;
      color: var(--muted);
      padding-top: 4px;
      align-self: center;
      transition: color var(--ease);
    }
    .row:hover .arrow { color: var(--ink); }

    .status { color: var(--muted); }
    .status.err { color: #b53030; }

    @media (max-width: 960px) {
      .row { grid-template-columns: 56px 1fr 24px; gap: 24px; }
      .thumb { display: none; }
    }
    @media (max-width: 600px) {
      .row { grid-template-columns: 1fr 24px; gap: 16px; }
      .date { display: flex; align-items: baseline; gap: 10px; }
      .mo { margin-top: 0; }
    }
    @media (max-width: 420px) {
      .row { grid-template-columns: 1fr; }
      .arrow { display: none; }
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
