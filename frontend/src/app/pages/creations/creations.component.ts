import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { CreationItem } from '../../models/creation.model';
import { srcsetFor } from '../../utils/image-variant';

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

    <section class="creations-body">
      <div class="container">
        <button type="button" class="filters-toggle" (click)="toggleFilters()"
                [attr.aria-expanded]="filtersOpen()" aria-controls="creations-filters">
          <span class="ft-icon" aria-hidden="true">☰</span> Filtres
        </button>

        <div class="creations-layout">
          <aside id="creations-filters" class="filters" [class.open]="filtersOpen()" aria-label="Filtres">
            <div class="kind-toggle" role="group" aria-label="Type de création">
              <button type="button" [attr.aria-pressed]="selectedKind() === 'furniture'"
                      [class.active]="selectedKind() === 'furniture'" (click)="toggleKind('furniture')">Mobilier</button>
              <button type="button" [attr.aria-pressed]="selectedKind() === 'exhibition'"
                      [class.active]="selectedKind() === 'exhibition'" (click)="toggleKind('exhibition')">Expositions</button>
            </div>

            @if (availableYears().length > 0) {
              <div class="facet">
                <span class="facet-label">Année</span>
                <div class="facet-options">
                  @for (y of availableYears(); track y) {
                    <button type="button" [class.active]="selectedYears().has(y)"
                            [attr.aria-pressed]="selectedYears().has(y)" (click)="toggleYear(y)">
                      {{ y }} <small>({{ yearCount(y) }})</small>
                    </button>
                  }
                </div>
              </div>
            }

            @if (availableTags().length > 0) {
              <div class="facet">
                <span class="facet-label">Tags</span>
                <div class="facet-options">
                  @for (t of availableTags(); track t) {
                    <button type="button" [class.active]="selectedTags().has(t)"
                            [attr.aria-pressed]="selectedTags().has(t)" (click)="toggleTag(t)">
                      {{ t }} <small>({{ tagCount(t) }})</small>
                    </button>
                  }
                </div>
              </div>
            }

            @if (hasActiveFilters()) {
              <div class="bar">
                <button type="button" class="reset" (click)="clearFilters()">Réinitialiser les filtres</button>
                <span aria-live="polite">{{ filteredItems().length }} résultats</span>
              </div>
            }
          </aside>

          <div class="results">
            @if (filteredItems().length === 0 && allItems().length > 0) {
              <p class="empty">Aucune création ne correspond aux filtres sélectionnés.</p>
            }
            <div class="grid">
              @for (item of filteredItems(); track item.kind + ':' + item.slug) {
                <a class="card" [routerLink]="item.href">
                  @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                  <div class="thumb">
                    <img [src]="item.cover"
                         [attr.srcset]="srcsetFor(item.cover) || null"
                         sizes="(max-width: 600px) 100vw, (max-width: 700px) 50vw, 320px"
                         [alt]="item.title" loading="lazy" />
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
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-head { padding: 96px 0 48px; }
    .page-head .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .page-head h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 12px; }
    .page-head .lead { max-width: 640px; margin-top: 24px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .creations-body { padding: 40px 0 140px; border-top: 1px solid var(--color-line); }
    .creations-layout { display: grid; grid-template-columns: 230px 1fr; gap: 48px; align-items: start; }

    .filters-toggle {
      display: none; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
      margin-bottom: 20px; background: var(--color-bg-alt); border: 1px solid var(--color-line);
      font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-ink); cursor: pointer;
    }
    .filters-toggle .ft-icon { font-size: 1.1rem; }

    .filters { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 22px; }
    .kind-toggle { display: inline-flex; gap: 0; border: 1px solid var(--color-ink); align-self: flex-start; }
    .kind-toggle button { padding: 8px 18px; background: var(--color-bg); border: 0; cursor: pointer; font-size: 0.85rem; color: var(--color-ink); }
    .kind-toggle button.active { background: var(--color-ink); color: var(--color-bg); }
    .kind-toggle button + button { border-left: 1px solid var(--color-ink); }

    .facet { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
    .facet-label { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); }
    .facet-options { display: flex; flex-wrap: wrap; gap: 6px; }
    .facet button {
      padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line);
      cursor: pointer; font-size: 0.82rem; color: var(--color-ink);
    }
    .facet button:hover { border-color: var(--color-ink); }
    .facet button.active { background: var(--color-ink); color: var(--color-bg); border-color: var(--color-ink); }
    .facet button small { opacity: 0.7; margin-left: 2px; }

    .bar { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding-top: 16px; border-top: 1px solid var(--color-line); font-size: 0.85rem; }
    .reset { background: none; border: 0; color: var(--color-ink); text-decoration: underline; cursor: pointer; font-size: 0.85rem; padding: 0; }

    .results { min-width: 0; }
    .empty { color: var(--color-mute); font-style: italic; margin: 48px 0; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 40px 24px; }
    .card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }
    .meta { padding: 18px 2px 0; display: flex; flex-direction: column; gap: 8px; }
    .cat { font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .title { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; line-height: 1.15; margin: 0; }
    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .card-tag { font-size: 0.7rem; padding: 3px 12px; background: transparent; border: 1px solid var(--color-ink); border-radius: 999px; color: var(--color-ink); cursor: pointer; }
    .card-tag:hover { background: var(--color-ink); color: var(--color-bg); }
    .card-tag.more { cursor: default; }
    .card-tag.more:hover { background: transparent; color: var(--color-ink); }

    @media (max-width: 860px) {
      .creations-layout { grid-template-columns: 1fr; gap: 20px; }
      .filters-toggle { display: inline-flex; }
      .filters { position: static; max-height: 0; overflow: hidden; transition: max-height 260ms ease; }
      .filters.open { max-height: 1400px; }
    }
    @media (max-width: 600px) { .grid { gap: 40px; } }
  `]
})
export class CreationsComponent implements OnInit {
  private portfolio = inject(PortfolioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor() {
    document.title = 'Créations — Milo GUILLAUME Design';
  }

  protected readonly srcsetFor = srcsetFor;

  protected readonly allItems = signal<CreationItem[]>([]);
  protected readonly availableTags = signal<string[]>([]);
  protected readonly availableYears = signal<number[]>([]);
  protected readonly selectedTags = signal<Set<string>>(new Set());
  protected readonly selectedYears = signal<Set<number>>(new Set());
  protected readonly selectedKind = signal<Kind>('all');
  /** Ouverture du panneau de filtres en mobile (sidebar toujours visible en desktop). */
  protected readonly filtersOpen = signal(false);

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
      // Mobiliers d'abord, puis expositions ; a l'interieur, annee decroissante puis titre.
      const kindOrder = (k: 'furniture' | 'exhibition') => (k === 'furniture' ? 0 : 1);
      items.sort((a, b) =>
        kindOrder(a.kind) - kindOrder(b.kind) ||
        b.year - a.year ||
        a.title.localeCompare(b.title, 'fr'));
      this.allItems.set(items);
      this.availableTags.set([...new Set(items.flatMap(i => i.tags))].sort((a, b) => a.localeCompare(b, 'fr')));
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

  /** Ouvre/ferme le panneau de filtres (mobile). */
  protected toggleFilters(): void { this.filtersOpen.update(v => !v); }

  /** Bascule le filtre de type : re-cliquer le type actif revient a la vue combinee (mobiliers puis expos). */
  protected toggleKind(kind: 'furniture' | 'exhibition'): void {
    this.selectedKind.update(current => (current === kind ? 'all' : kind));
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
