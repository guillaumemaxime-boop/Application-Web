import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';

@Component({
  selector: 'app-furniture-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div class="wrap">
        <span class="label">Catalogue · Éditions limitées</span>
        <h1>Mobilier</h1>
        <p>
          Pièces sculptées, dessinées et fabriquées dans notre atelier parisien.
          Chaque édition est numérotée et signée à la main.
        </p>
      </div>
    </div>

    <hr />

    <section class="section">
      <div class="wrap">
        <div class="filters">
          <button
            [class.active]="active() === 'all'"
            (click)="active.set('all')">Toutes</button>
          @for (cat of categories(); track cat) {
            <button
              [class.active]="active() === cat"
              (click)="active.set(cat)">{{ cat }}</button>
          }
        </div>

        @if (loading()) {
          <p class="status">Chargement…</p>
        } @else if (error()) {
          <p class="status err">Impossible de charger le catalogue.</p>
        } @else {
          <div class="grid">
            @for (item of filtered(); track item.id) {
              <a class="card" [routerLink]="['/mobilier', item.slug]">
                <div class="img-wrap">
                  <img [src]="item.coverImage" [alt]="item.title" loading="lazy" />
                </div>
                <div class="card-body">
                  <span class="label">{{ item.category }}</span>
                  <h3>{{ item.title }}</h3>
                  <span class="mat">{{ item.material }}</span>
                </div>
              </a>
            }
            @empty {
              <p class="status">Aucune pièce dans cette catégorie.</p>
            }
          </div>
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

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      margin-bottom: 56px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .filters button {
      padding: 13px 18px;
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      border-right: 1px solid var(--line);
      transition: color var(--ease), background var(--ease);
    }
    .filters button:first-child { border-left: 1px solid var(--line); }
    .filters button:hover { color: var(--ink); }
    .filters button.active {
      color: var(--bg);
      background: var(--ink);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px 20px;
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
    .card-body h3 { font-size: 1.375rem; margin-bottom: 4px; }
    .mat {
      font-size: 0.8125rem;
      color: var(--muted);
    }

    .status { color: var(--muted); }
    .status.err { color: #b53030; }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 540px) { .grid { grid-template-columns: 1fr; } }
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
