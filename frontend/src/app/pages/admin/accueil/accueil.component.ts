import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { AdminFeedEntry, HomePageData } from '../../../models/home.model';
import { Crop } from '../../../models/crop.model';
import { SiteContent } from '../../../models/site-content.model';
import { NewsSliderView } from '../../../models/news-slider.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { ToastService } from '../shared/toast.service';
import { SlidersComponent } from '../sliders/sliders.component';
import { HomePreviewComponent } from './preview/home-preview.component';
import { ImageCropPickerComponent } from '../shared/image-crop-picker.component';
import { AdminPreviewShellComponent, ShellPreviewDirective } from '../shared/admin-preview-shell.component';

interface HomeAdminItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  included: boolean;
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [ReorderableDirective, SlidersComponent, HomePreviewComponent, ImageCropPickerComponent, AdminPreviewShellComponent, ShellPreviewDirective],
  template: `
    <app-admin-preview-shell
      [(viewMode)]="accueilViewMode"
      modeBarAriaLabel="Mode d'édition de l'accueil"
      formTabLabel="✏ Modifier l'accueil"
      previewDialogLabel="Aperçu de l'accueil">
      <div class="home-editor">
        <h2>Ordre éditorial du masonry</h2>
        <p class="hint">Glisse pour réordonner. Décoche pour exclure du feed. Les modifications sont enregistrées automatiquement.</p>
        @if (homeItems(); as items) {
          <ul class="ordering-list" appReorderable (reordered)="onFeedReorder($event)">
            @for (entry of items; track entry.kind + ':' + entry.slug; let i = $index) {
              <li class="home-row">
                <span class="handle" aria-hidden="true">⠿</span>
                <span class="kind-badge">{{ entry.kind === 'furniture' ? 'MOBILIER' : 'EXPO' }}</span>
                <img [src]="entry.cover" [alt]="entry.title" class="thumb" />
                <span class="title">{{ entry.title }}</span>
                <label class="incl">
                  <input type="checkbox" [checked]="entry.included" (change)="toggleIncluded(entry, $event)" /> Inclure
                </label>
                <button type="button" class="reorder-btn" aria-label="Monter dans l'ordre"
                        (click)="moveUp(i)" [disabled]="i === 0">↑</button>
                <button type="button" class="reorder-btn" aria-label="Descendre dans l'ordre"
                        (click)="moveDown(i)" [disabled]="i === items.length - 1">↓</button>
              </li>
            }
          </ul>
        } @else {
          <p class="status">Chargement…</p>
        }
      </div>
      <div id="admin-sliders-anchor" class="home-editor sliders-section">
        <app-admin-sliders />
      </div>
      <ng-template shellPreview>
        <app-home-preview
          [data]="homeData"
          [content]="content"
          [sliders]="sliders"
          [includedSlugs]="includedSlugs"
          (feedReorder)="onPreviewFeedReorder($event)"
          (feedItemToggleInclude)="onPreviewFeedItemToggleInclude($event)"
          (textFieldEdit)="onPreviewTextFieldEdit($event)"
          (sliderEditRequested)="onSliderEditRequested($event)"
          (feedItemCropEdit)="onPreviewFeedItemCropEdit($event)" />
      </ng-template>
    </app-admin-preview-shell>

    @if (cropEditOpen() && cropEditItem(); as ctx) {
      <app-image-crop-picker
        [imageUrl]="ctx.imageUrl"
        [initialCrop]="ctx.initialCrop"
        (validated)="onCropEditSave($event)"
        (cancelled)="onCropEditCancel()" />
    }
  `,
  styles: [`
    .home-editor h2 { margin: 0 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .home-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .ordering-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; user-select: none; }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .thumb { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    .reorder-btn {
      background: transparent; border: 1px solid var(--color-line); color: var(--color-ink-soft);
      width: 28px; height: 28px; padding: 0; cursor: pointer; font-size: 0.9rem; line-height: 1;
    }
    .reorder-btn:hover:not(:disabled) { color: var(--color-ink); border-color: var(--color-ink); }
    .reorder-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .status { color: var(--color-mute); }
    .sliders-section { margin-top: 48px; }
  `]
})
export class AccueilComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly homeItems = signal<HomeAdminItem[] | null>(null);

  protected readonly accueilViewMode = signal<'form' | 'preview'>('form');
  protected readonly homeData = signal<HomePageData | null>(null);
  protected readonly content = signal<SiteContent>({});
  protected readonly sliders = signal<NewsSliderView[]>([]);

  protected readonly cropEditOpen = signal(false);
  protected readonly cropEditItem = signal<{ kind: 'furniture' | 'exhibition'; slug: string; imageUrl: string; initialCrop: Crop | null } | null>(null);

  protected readonly includedSlugs = computed(() => {
    const items = this.homeItems();
    if (!items) return new Set<string>();
    return new Set(items.filter((i: HomeAdminItem) => i.included).map((i: HomeAdminItem) => i.kind + ':' + i.slug));
  });

  constructor() {
    forkJoin([
      this.portfolio.getAllFurniture(),
      this.portfolio.getAllExhibitions(),
      this.portfolio.getAdminFeed(),
    ]).subscribe(([furniture, expos, feed]) => {
      const included = new Set(feed.map(f => `${f.kind}:${f.slug}`));
      const items: HomeAdminItem[] = [];
      for (const f of feed) {
        const fur = furniture.find(x => x.slug === f.slug && f.kind === 'furniture');
        if (fur) items.push({ kind: 'furniture', slug: fur.slug, title: fur.title, cover: fur.coverImage, included: true });
        const exh = expos.find(x => x.slug === f.slug && f.kind === 'exhibition');
        if (exh) items.push({ kind: 'exhibition', slug: exh.slug, title: exh.title, cover: exh.coverImage, included: true });
      }
      for (const fur of furniture) {
        if (!included.has(`furniture:${fur.slug}`)) {
          items.push({ kind: 'furniture', slug: fur.slug, title: fur.title, cover: fur.coverImage, included: false });
        }
      }
      for (const exh of expos) {
        if (!included.has(`exhibition:${exh.slug}`)) {
          items.push({ kind: 'exhibition', slug: exh.slug, title: exh.title, cover: exh.coverImage, included: false });
        }
      }
      this.homeItems.set(items);
    });

    forkJoin([
      this.portfolio.getHome(),
      this.portfolio.getContent(),
      this.portfolio.getPublicSliders(),
    ]).subscribe(([home, content, sliders]) => {
      this.homeData.set(home);
      this.content.set(content);
      this.sliders.set(sliders);
    });
  }

  onFeedReorder(order: number[]): void {
    const current = this.homeItems();
    if (!current) return;
    this.homeItems.set(order.map(i => current[i]));
    this.saveFeed().subscribe({
      next: () => this.toast.success('Ordre enregistré.'),
      error: () => this.toast.error('Impossible d\'enregistrer l\'ordre.'),
    });
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const items = this.homeItems();
    if (!items) return;
    const order = items.map((_, i) => i);
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    this.onFeedReorder(order);
  }

  moveDown(index: number): void {
    const items = this.homeItems();
    if (!items || index >= items.length - 1) return;
    const order = items.map((_, i) => i);
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    this.onFeedReorder(order);
  }

  toggleIncluded(item: HomeAdminItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.homeItems.update(items => items?.map(x => x === item ? { ...x, included: checked } : x) ?? null);
    this.saveFeed().subscribe({
      next: () => this.toast.success('Ordre enregistré.'),
      error: () => this.toast.error('Impossible d\'enregistrer l\'ordre.'),
    });
  }

  saveFeed(): import('rxjs').Observable<unknown> {
    const items = this.homeItems() ?? [];
    const entries: AdminFeedEntry[] = items.filter(i => i.included).map(i => ({ kind: i.kind, slug: i.slug }));
    return this.portfolio.replaceAdminFeed(entries);
  }

  /** @deprecated Use saveFeed() directly. Kept for backward compatibility. */
  persistFeed(): void {
    this.saveFeed().subscribe({
      next: () => this.toast.success('Ordre enregistré.'),
      error: () => this.toast.error('Impossible d\'enregistrer l\'ordre.'),
    });
  }

  protected onPreviewFeedReorder(order: number[]): void {
    const current = this.homeItems();
    if (!current) return;
    // L'ordre vient de la preview qui n'affiche QUE les items inclus.
    // On reordonne seulement les inclus, en preservant la position des exclus dans homeItems.
    const includedItems = current.filter(i => i.included);
    const newIncluded = order.map(i => includedItems[i]).filter((x): x is HomeAdminItem => !!x);
    let nextIncludedIdx = 0;
    const newItems = current.map(item =>
      item.included ? (newIncluded[nextIncludedIdx++] ?? item) : item
    );
    this.homeItems.set(newItems);
    this.saveFeed().subscribe({
      next: () => {
        this.toast.success('Ordre enregistré.');
        this.portfolio.getHome().subscribe(h => this.homeData.set(h));
      },
      error: () => this.toast.error('Impossible d\'enregistrer l\'ordre.'),
    });
  }

  protected onPreviewFeedItemToggleInclude(e: { kind: 'furniture' | 'exhibition'; slug: string; included: boolean }): void {
    const items = this.homeItems() ?? [];
    const target = items.find((it: HomeAdminItem) => it.kind === e.kind && it.slug === e.slug);
    if (!target) return;
    this.homeItems.update(all => all?.map(x => x === target ? { ...x, included: e.included } : x) ?? null);
    this.saveFeed().subscribe({
      next: () => {
        this.toast.success('Ordre enregistré.');
        this.portfolio.getHome().subscribe(h => this.homeData.set(h));
      },
      error: () => this.toast.error('Impossible d\'enregistrer l\'ordre.'),
    });
  }

  private static readonly EDITABLE_CONTENT_KEYS = new Set([
    'home.hero.eyebrow', 'home.hero.title', 'home.hero.lead',
  ]);

  protected onPreviewTextFieldEdit(e: { key: string; value: string }): void {
    if (!AccueilComponent.EDITABLE_CONTENT_KEYS.has(e.key)) return;
    const next: SiteContent = { ...this.content(), [e.key]: e.value };
    this.portfolio.updateContent(next).subscribe({
      next: () => {
        this.content.set(next);
        this.toast.success('Texte sauvegardé.');
      },
      error: () => this.toast.error('Erreur lors de la sauvegarde du texte.'),
    });
  }

  protected onSliderEditRequested(zone: 'home-top' | 'home-middle' | 'home-bottom'): void {
    this.accueilViewMode.set('form');
    queueMicrotask(() => {
      const el = document.getElementById('admin-sliders-anchor');
      el?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  protected onPreviewFeedItemCropEdit(e: { kind: 'furniture' | 'exhibition'; slug: string }): void {
    const data = this.homeData();
    if (!data) return;
    const item = data.feed.find(f => f.kind === e.kind && f.slug === e.slug);
    if (!item) return;
    this.cropEditItem.set({
      kind: e.kind,
      slug: e.slug,
      imageUrl: item.cover,
      initialCrop: item.coverCrop ?? null,
    });
    this.cropEditOpen.set(true);
  }

  protected onCropEditSave(crop: Crop): void {
    const ctx = this.cropEditItem();
    if (!ctx) return;
    this.portfolio.updateHomeFeedCoverCrop(ctx.kind, ctx.slug, crop).subscribe({
      next: () => {
        this.toast.success('Cadrage sauvegardé.');
        this.cropEditOpen.set(false);
        this.cropEditItem.set(null);
        this.portfolio.getHome().subscribe(h => this.homeData.set(h));
      },
      error: () => this.toast.error('Erreur lors de la sauvegarde du cadrage.'),
    });
  }

  protected onCropEditCancel(): void {
    this.cropEditOpen.set(false);
    this.cropEditItem.set(null);
  }
}
