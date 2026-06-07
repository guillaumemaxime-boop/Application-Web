import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { CreationItem } from '../../models/creation.model';

type Kind = 'all' | 'furniture' | 'exhibition';

@Component({
  selector: 'app-creations',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Catalogue</span>
        <h1>Créations</h1>
        <p class="lead">L'ensemble des pièces et expositions de l'atelier, filtrables par type, année et tags.</p>
      </div>
    </section>

    <section class="filters">
      <div class="container">
        <div class="kind-toggle" role="radiogroup" aria-label="Type de création">
          <button type="button" role="radio" [attr.aria-checked]="selectedKind() === 'all'"
                  [class.active]="selectedKind() === 'all'" (click)="setKind('all')">Tout</button>
          <button type="button" role="radio" [attr.aria-checked]="selectedKind() === 'furniture'"
                  [class.active]="selectedKind() === 'furniture'" (click)="setKind('furniture')">Mobilier</button>
          <button type="button" role="radio" [attr.aria-checked]="selectedKind() === 'exhibition'"
                  [class.active]="selectedKind() === 'exhibition'" (click)="setKind('exhibition')">Expositions</button>
        </div>

        @if (availableYears().length > 0) {
          <div class="facet">
            <span class="facet-label">Année</span>
            @for (y of availableYears(); track y) {
              <button type="button" [class.active]="selectedYears().has(y)"
                      [attr.aria-pressed]="selectedYears().has(y)" (click)="toggleYear(y)">
                {{ y }} <small>({{ yearCount(y) }})</small>
              </button>
            }
          </div>
        }

        @if (availableTags().length > 0) {
          <div class="facet">
            <span class="facet-label">Tags</span>
            @for (t of availableTags(); track t) {
              <button type="button" [class.active]="selectedTags().has(t)"
                      [attr.aria-pressed]="selectedTags().has(t)" (click)="toggleTag(t)">
                {{ t }} <small>({{ tagCount(t) }})</small>
              </button>
            }
          </div>
        }

        @if (hasActiveFilters()) {
          <div class="bar">
            <button type="button" class="reset" (click)="clearFilters()">Réinitialiser les filtres</button>
            <span aria-live="polite">{{ filteredItems().length }} résultats</span>
          </div>
        }
      </div>
    </section>

    <section class="results">
      <div class="container">
        @if (filteredItems().length === 0 && allItems().length > 0) {
          <p class="empty">Aucune création ne correspond aux filtres sélectionnés.</p>
        }
        <div class="grid">
          @for (item of filteredItems(); track item.kind + ':' + item.slug) {
            <a class="card" [routerLink]="item.href">
              @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
              <div class="thumb">
                <img [src]="item.cover" [alt]="item.title" loading="lazy" />
              </div>
              <div class="meta">
                <span class="cat">{{ item.subtitle }}</span>
                <h3 class="title">{{ item.title }}</h3>
                @if (item.tags.length > 0) {
                  <div class="card-tags">
                    @for (t of item.tags.slice(0, 3); track t) {
                      <span class="card-tag" (click)="onCardTagClick($event, t)">{{ t }}</span>
                    }
                    @if (item.tags.length > 3) { <span class="card-tag more">+{{ item.tags.length - 3 }}</span> }
                  </div>
                }
              </div>
            </a>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-head { padding: 96px 0 48px; }
    .page-head .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .page-head h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 12px; }
    .page-head .lead { max-width: 640px; margin-top: 24px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .filters { padding: 24px 0; border-top: 1px solid var(--color-line); border-bottom: 1px solid var(--color-line); }
    .kind-toggle { display: inline-flex; gap: 0; border: 1px solid var(--color-ink); margin-bottom: 20px; }
    .kind-toggle button { padding: 8px 18px; background: var(--color-bg); border: 0; cursor: pointer; font-size: 0.85rem; color: var(--color-ink); }
    .kind-toggle button.active { background: var(--color-ink); color: var(--color-bg); }
    .kind-toggle button + button { border-left: 1px solid var(--color-ink); }

    .facet { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
    .facet-label { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); margin-right: 8px; min-width: 60px; }
    .facet button {
      padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line);
      cursor: pointer; font-size: 0.82rem; color: var(--color-ink);
    }
    .facet button:hover { border-color: var(--color-ink); }
    .facet button.active { background: var(--color-ink); color: var(--color-bg); border-color: var(--color-ink); }
    .facet button small { opacity: 0.7; margin-left: 2px; }

    .bar { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 0.85rem; }
    .reset { background: none; border: 0; color: var(--color-ink); text-decoration: underline; cursor: pointer; font-size: 0.85rem; }

    .results { padding: 64px 0 140px; }
    .empty { color: var(--color-mute); font-style: italic; margin: 48px 0; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 24px; }
    .card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }
    .meta { padding: 18px 2px 0; display: flex; flex-direction: column; gap: 8px; }
    .cat { font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .title { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; line-height: 1.15; margin: 0; }
    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .card-tag { font-size: 0.7rem; padding: 2px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line); color: var(--color-ink-soft); cursor: pointer; }
    .card-tag:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .card-tag.more { cursor: default; }
    .card-tag.more:hover { color: var(--color-ink-soft); border-color: var(--color-line); }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); gap: 36px 20px; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; gap: 48px; } }
  `]
})
export class CreationsComponent implements OnInit {
  private portfolio = inject(PortfolioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly allItems = signal<CreationItem[]>([]);
  protected readonly availableTags = signal<string[]>([]);
  protected readonly availableYears = signal<number[]>([]);
  protected readonly selectedTags = signal<Set<string>>(new Set());
  protected readonly selectedYears = signal<Set<number>>(new Set());
  protected readonly selectedKind = signal<Kind>('all');

  protected readonly filteredItems = computed(() => {
    const kind = this.selectedKind();
    const years = this.selectedYears();
    const tags = this.selectedTags();
    return this.allItems().filter(i =>
      (kind === 'all' || i.kind === kind) &&
      (years.size === 0 || years.has(i.year)) &&
      (tags.size === 0 || i.tags.some(t => tags.has(t)))
    );
  });

  protected readonly hasActiveFilters = computed(() =>
    this.selectedKind() !== 'all' || this.selectedTags().size > 0 || this.selectedYears().size > 0
  );

  protected yearCount(year: number): number {
    return this.allItems().filter(i =>
      (this.selectedKind() === 'all' || i.kind === this.selectedKind()) &&
      i.year === year &&
      (this.selectedTags().size === 0 || i.tags.some(t => this.selectedTags().has(t)))
    ).length;
  }

  protected tagCount(tag: string): number {
    return this.allItems().filter(i =>
      (this.selectedKind() === 'all' || i.kind === this.selectedKind()) &&
      (this.selectedYears().size === 0 || this.selectedYears().has(i.year)) &&
      i.tags.includes(tag)
    ).length;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(p => {
      const tagsParam = p.get('tags');
      if (tagsParam) this.selectedTags.set(new Set(tagsParam.split(',').filter(Boolean)));
      const yearsParam = p.get('years');
      if (yearsParam) this.selectedYears.set(new Set(yearsParam.split(',').filter(Boolean).map(Number)));
      const kindParam = p.get('kind');
      if (kindParam === 'furniture' || kindParam === 'exhibition' || kindParam === 'all') {
        this.selectedKind.set(kindParam);
      }
    });

    forkJoin({
      furniture: this.portfolio.getAllFurniture(),
      exhibitions: this.portfolio.getAllExhibitions(),
    }).subscribe(({ furniture, exhibitions }) => {
      const items: CreationItem[] = [
        ...furniture.map(f => ({
          kind: 'furniture' as const,
          slug: f.slug,
          title: f.title,
          cover: f.coverImage,
          subtitle: `${f.category} · ${f.year}`,
          year: f.year,
          tags: f.tags ?? [],
          href: `/mobilier/${f.slug}`,
        })),
        ...exhibitions.map(e => ({
          kind: 'exhibition' as const,
          slug: e.slug,
          title: e.title,
          cover: e.coverImage,
          subtitle: `${e.venue} · ${e.startDate.substring(0, 4)}`,
          year: parseInt(e.startDate.substring(0, 4), 10),
          tags: e.tags ?? [],
          href: `/expositions/${e.slug}`,
        })),
      ];
      items.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
      this.allItems.set(items);
      this.availableTags.set([...new Set(items.flatMap(i => i.tags))].sort());
      this.availableYears.set([...new Set(items.map(i => i.year))].sort((a, b) => b - a));
    });
  }

  protected toggleTag(tag: string): void {
    this.selectedTags.update(s => {
      const next = new Set(s);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
    this.syncQueryParams();
  }

  protected toggleYear(year: number): void {
    this.selectedYears.update(s => {
      const next = new Set(s);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
    this.syncQueryParams();
  }

  protected setKind(kind: Kind): void {
    this.selectedKind.set(kind);
    this.syncQueryParams();
  }

  protected clearFilters(): void {
    this.selectedTags.set(new Set());
    this.selectedYears.set(new Set());
    this.selectedKind.set('all');
    this.syncQueryParams();
  }

  protected onCardTagClick(event: Event, tag: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleTag(tag);
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string | null> = {
      tags: this.selectedTags().size > 0 ? [...this.selectedTags()].join(',') : null,
      years: this.selectedYears().size > 0 ? [...this.selectedYears()].join(',') : null,
      kind: this.selectedKind() !== 'all' ? this.selectedKind() : null,
    };
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
