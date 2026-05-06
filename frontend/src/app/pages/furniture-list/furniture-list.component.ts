import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';

@Component({
  selector: 'app-furniture-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Catalogue · Éditions limitées</span>
        <h1>Mobilier</h1>
        <p class="lead">
          Une collection de pièces sculptées, dessinées et fabriquées dans notre atelier
          parisien. Chaque édition est numérotée et signée à la main.
        </p>
      </div>
    </section>

    <section class="section ruled">
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
          <p class="status error">Impossible de charger le catalogue.</p>
        } @else {
          <div class="grid">
            @for (item of filtered(); track item.id) {
              <a class="card fade-in" [routerLink]="['/mobilier', item.slug]">
                <div class="thumb">
                  <img [src]="item.coverImage" [alt]="item.title" loading="lazy" />
                </div>
                <div class="info">
                  <span class="cat">{{ item.category }}</span>
                  <h3>{{ item.title }}</h3>
                  <span class="mat">{{ item.material }}</span>
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
    .page-head {
      padding-top: 120px;
      padding-bottom: 80px;
      border-bottom: 1px solid var(--color-line);
    }
    .page-head .eyebrow { display: block; margin-bottom: 20px; }
    .page-head h1 { margin-bottom: 24px; }
    .lead { max-width: 600px; font-size: 1rem; }

    .ruled { border-top: none; }

    .filters {
      display: flex;
      gap: 0;
      flex-wrap: wrap;
      margin-bottom: 64px;
      border-bottom: 1px solid var(--color-line);
    }
    .filters button {
      padding: 14px 20px;
      font-family: var(--sans);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
      border: none;
      border-right: 1px solid var(--color-line);
      background: transparent;
      transition: color var(--transition), background var(--transition);
    }
    .filters button:first-child { border-left: 1px solid var(--color-line); }
    .filters button:hover { color: var(--color-ink); }
    .filters button.active {
      color: var(--color-bg);
      background: var(--color-ink);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px 24px;
    }
    .card { display: block; }
    .thumb {
      overflow: hidden;
      background: var(--color-bg-alt);
      aspect-ratio: 3 / 4;
      margin-bottom: 16px;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: grayscale(15%);
      transition: transform var(--transition-img), filter var(--transition-img);
    }
    .card:hover .thumb img { transform: scale(1.04); filter: grayscale(0%); }
    .info { border-top: 1px solid var(--color-line); padding-top: 14px; }
    .cat {
      display: block;
      font-size: 0.62rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
      margin-bottom: 6px;
    }
    .info h3 { font-size: 1.375rem; color: var(--color-ink); margin-bottom: 4px; }
    .mat {
      font-size: 0.8125rem;
      color: var(--color-mute);
    }

    .status { color: var(--color-mute); }
    .status.error { color: #b53535; }

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
