import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';

@Component({
  selector: 'app-furniture-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section page-head">
      <div class="container">
        <span class="eyebrow">Catalogue · Éditions limitées</span>
        <h1>Mobilier</h1>
        <p class="lead">
          Une collection de pièces sculptées, dessinées et fabriquées dans notre atelier
          parisiens. Chaque édition est numérotée et signée à la main.
        </p>
      </div>
    </section>

    <section class="section list">
      <div class="container">
        <div class="filters">
          <button [class.active]="active() === 'all'" (click)="active.set('all')">Toutes</button>
          @for (cat of categories(); track cat) {
            <button [class.active]="active() === cat" (click)="active.set(cat)">{{ cat }}</button>
          }
        </div>

        @if (loading()) {
          <p class="status">Chargement…</p>
        } @else if (error()) {
          <p class="status error">Impossible de charger le catalogue. Veuillez réessayer ultérieurement.</p>
        } @else {
          <div class="grid">
            @for (item of filtered(); track item.id) {
              <a class="card fade-in" [routerLink]="['/mobilier', item.slug]">
                <div class="thumb">
                  <img [src]="item.coverImage" [alt]="item.title" loading="lazy" />
                </div>
                <div class="meta">
                  <span class="cat">{{ item.category }} · {{ item.year }}</span>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.material }}</p>
                </div>
              </a>
            }
            @empty {
              <p class="status">Aucune pièce ne correspond à ce filtre.</p>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .page-head { padding-top: 64px; padding-bottom: 32px; }
    .page-head h1 { margin-top: 16px; }
    .lead { max-width: 640px; margin-top: 24px; font-size: 1.05rem; }

    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 56px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--color-line);
    }
    .filters button {
      padding: 8px 18px;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      color: var(--color-ink-soft);
      border: 1px solid transparent;
      transition: all var(--transition);
    }
    .filters button:hover { color: var(--color-ink); }
    .filters button.active {
      color: var(--color-ink);
      border-color: var(--color-ink);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 56px 40px;
    }
    .card { display: block; }
    .thumb {
      overflow: hidden;
      background: var(--color-bg-alt);
      aspect-ratio: 4 / 5;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .card:hover .thumb img { transform: scale(1.04); }
    .meta { padding-top: 20px; }
    .cat {
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .meta h3 { margin: 10px 0 6px; }
    .meta p { font-size: 0.9rem; color: var(--color-ink-soft); }

    .status { color: var(--color-mute); }
    .status.error { color: #b1532a; }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `]
})
export class FurnitureListComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly all = signal<Furniture[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly active = signal<string>('all');

  protected readonly categories = computed(() =>
    [...new Set(this.all().map(f => f.category))].sort()
  );

  protected readonly filtered = computed(() => {
    const a = this.active();
    return a === 'all' ? this.all() : this.all().filter(f => f.category === a);
  });

  constructor() {
    this.portfolio.getAllFurniture().subscribe({
      next: data => { this.all.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }
}
