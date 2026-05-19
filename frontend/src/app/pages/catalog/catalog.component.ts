import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';
import { SiteContent } from '../../models/site-content.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';

type GroupKey = 'category' | 'year';

interface Group {
  label: string;
  items: Furniture[];
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="head">
      <div class="container">
        <span class="eyebrow" [ngStyle]="eyebrowStyle()">Catalogue</span>
        <h1 [ngStyle]="titleStyle()">Mobilier</h1>
        <p class="lead">L'ensemble des pièces de l'atelier, classées par {{ groupBy() === 'category' ? 'catégorie' : 'année' }}.</p>

        <div class="toggle" role="tablist" aria-label="Mode d'organisation">
          <button type="button"
                  role="tab"
                  [attr.aria-selected]="groupBy() === 'category'"
                  [class.active]="groupBy() === 'category'"
                  (click)="setGroupBy('category')">Catégorie</button>
          <button type="button"
                  role="tab"
                  [attr.aria-selected]="groupBy() === 'year'"
                  [class.active]="groupBy() === 'year'"
                  (click)="setGroupBy('year')">Année</button>
        </div>
      </div>
    </section>

    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (items().length === 0) {
      <div class="container section"><p class="status">Aucune pièce pour l'instant.</p></div>
    } @else {
      @for (g of groups(); track g.label) {
        <section class="group">
          <div class="container">
            <h2 class="group-label" [ngStyle]="sectionTitleStyle()">{{ g.label }}</h2>
            <div class="grid">
              @for (f of g.items; track f.slug) {
                <a class="card" [routerLink]="['/mobilier', f.slug]">
                  <div class="thumb">
                    <img [src]="f.coverImage" [alt]="f.title" loading="lazy" />
                  </div>
                  <div class="meta">
                    <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ f.category }} · {{ f.year }}</span>
                    <span class="title" [ngStyle]="cardTitleStyle()">{{ f.title }}</span>
                    <span class="material">{{ f.material }}</span>
                  </div>
                </a>
              }
            </div>
          </div>
        </section>
      }
    }
  `,
  styles: [`
    .head { padding: 120px 0 48px; border-bottom: 1px solid var(--color-line); }
    .head .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .head h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 5vw, 3.5rem); margin-top: 16px; }
    .head .lead { max-width: 540px; margin-top: 20px; color: var(--color-ink-soft); }

    .toggle {
      margin-top: 40px;
      display: inline-flex;
      gap: 0;
      border: 1px solid var(--color-line);
    }
    .toggle button {
      background: none;
      border: none;
      padding: 10px 22px;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }
    .toggle button + button { border-left: 1px solid var(--color-line); }
    .toggle button.active {
      background: var(--color-ink);
      color: var(--color-bg);
    }

    .group { padding: 64px 0 24px; }
    .group:first-of-type { padding-top: 56px; }
    .group-label {
      font-family: var(--serif);
      font-weight: 400;
      font-size: 1rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
      margin-bottom: 32px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--color-line);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px 24px;
    }
    .card {
      display: block;
      color: inherit;
      text-decoration: none;
    }
    .thumb {
      aspect-ratio: 4 / 5;
      overflow: hidden;
      background: var(--color-bg-alt);
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 320ms ease;
    }
    .card:hover .thumb img { transform: scale(1.02); }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 14px;
    }
    .meta .eyebrow {
      font-size: 0.68rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .meta .title {
      font-family: var(--serif);
      font-size: 1.3rem;
      line-height: 1.2;
      color: var(--color-ink);
    }
    .meta .material {
      font-size: 0.85rem;
      color: var(--color-ink-soft);
    }

    .status { color: var(--color-mute); }

    @media (max-width: 960px) {
      .grid { grid-template-columns: repeat(2, 1fr); gap: 32px 20px; }
      .head { padding: 96px 0 40px; }
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; gap: 32px; }
      .group { padding: 48px 0 16px; }
    }
  `]
})
export class CatalogComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly items = signal<Furniture[]>([]);
  protected readonly loading = signal(true);
  protected readonly groupBy = signal<GroupKey>('category');
  protected readonly content = signal<SiteContent>({});

  protected readonly titleStyle        = computed(() => roleStyle(this.content(), 'title'));
  protected readonly sectionTitleStyle = computed(() => roleStyle(this.content(), 'section-title'));
  protected readonly cardTitleStyle    = computed(() => roleStyle(this.content(), 'card-title'));
  protected readonly eyebrowStyle      = computed(() => roleStyle(this.content(), 'eyebrow'));

  protected readonly groups = computed<Group[]>(() => {
    const all = this.items();
    if (all.length === 0) return [];
    return this.groupBy() === 'category'
      ? this.groupByCategory(all)
      : this.groupByYear(all);
  });

  constructor() {
    document.title = 'Mobilier — Milo GUILLAUME Design';
    this.loadingSvc.start('page');
    forkJoin({
      furniture: this.portfolio.getAllFurniture(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ furniture, content }) => {
        this.items.set(furniture);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  protected setGroupBy(key: GroupKey) {
    this.groupBy.set(key);
  }

  private groupByCategory(all: Furniture[]): Group[] {
    const map = new Map<string, Furniture[]>();
    for (const f of all) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([label, items]) => ({
        label,
        items: items.slice().sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
      }));
  }

  private groupByYear(all: Furniture[]): Group[] {
    const map = new Map<number, Furniture[]>();
    for (const f of all) {
      const y = f.year ?? 0;
      const list = map.get(y) ?? [];
      list.push(f);
      map.set(y, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, items]) => ({
        label: year ? String(year) : 'Sans date',
        items: items.slice().sort((a, b) => a.title.localeCompare(b.title, 'fr')),
      }));
  }
}
