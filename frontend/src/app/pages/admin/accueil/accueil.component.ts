import { Component, computed, inject, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
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
  imports: [A11yModule, ReorderableDirective, SlidersComponent, HomePreviewComponent, ImageCropPickerComponent],
  template: `
    <div class="admin-split">
      <div class="admin-mode-bar" role="tablist" aria-label="Mode d'édition de l'accueil">
        <button type="button" role="tab" class="admin-mode-tab"
                [class.active]="accueilViewMode() === 'form'"
                [attr.aria-selected]="accueilViewMode() === 'form'"
                (click)="accueilViewMode.set('form')">
          ✏ Modifier l'accueil
        </button>
        <button type="button" role="tab" class="admin-mode-tab"
                [class.active]="accueilViewMode() === 'preview'"
                [attr.aria-selected]="accueilViewMode() === 'preview'"
                (click)="accueilViewMode.set('preview')">
          👁 Aperçu
        </button>
      </div>

      <section class="admin-form" [class.is-hidden]="accueilViewMode() !== 'form'">
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
      </section>

      @if (accueilViewMode() === 'preview') {
        <aside class="admin-preview" [class.fullscreen]="previewFullscreen()"
               [attr.aria-modal]="previewFullscreen() ? 'true' : null"
               [attr.role]="previewFullscreen() ? 'dialog' : null"
               [cdkTrapFocus]="previewFullscreen()"
               [cdkTrapFocusAutoCapture]="previewFullscreen()"
               aria-label="Aperçu de l'accueil">
          <div class="admin-preview-toolbar">
            <span class="admin-preview-label">Aperçu</span>
            <button type="button" class="btn-preview-toggle"
                    (click)="togglePreviewFullscreen()"
                    [attr.aria-label]="previewFullscreenLabel()">
              @if (previewFullscreen()) { ⤡ Réduire } @else { ⤢ Plein écran }
            </button>
          </div>
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
        </aside>
      }

      @if (cropEditOpen() && cropEditItem(); as ctx) {
        <app-image-crop-picker
          [imageUrl]="ctx.imageUrl"
          [initialCrop]="ctx.initialCrop"
          (validated)="onCropEditSave($event)"
          (cancelled)="onCropEditCancel()" />
      }
    </div>
  `,
  styles: [`
    .admin-split { display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
    .admin-mode-bar { display: inline-flex; gap: 4px; padding: 4px; background: var(--color-bg-alt); border: 1px solid var(--color-line); align-self: flex-start; }
    .admin-mode-tab { padding: 8px 16px; background: transparent; border: 0; color: var(--color-ink-soft); font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
    .admin-mode-tab:hover { color: var(--color-ink); }
    .admin-mode-tab.active { background: var(--color-ink); color: var(--color-bg); font-weight: 600; }
    .admin-form { max-width: 100%; }
    /* En mode preview : form rendue mais positionnee hors viewport. Pas de display:none
       (qui retirerait les modales descendantes) ni de visibility:hidden (qui se propage
       en heritage CSS aux modales position:fixed et bloque par view encapsulation
       Angular sur les composants enfants). Les pickers position:fixed s'affichent
       toujours au viewport grace a leur z-index. */
    .admin-form.is-hidden { position: absolute; left: -100vw; top: 0; width: 0; height: 0; overflow: hidden; pointer-events: none; }
    .admin-preview { max-height: calc(100vh - 100px); overflow-y: auto; background: var(--color-bg-alt); border: 1px solid var(--color-line); padding: 24px; }
    .admin-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -8px -8px 16px; padding: 0 4px; }
    .admin-preview-label { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-mute); }
    .btn-preview-toggle { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line); color: var(--color-ink-soft); font-size: 0.78rem; cursor: pointer; font-family: inherit; }
    .btn-preview-toggle:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .admin-preview.fullscreen { position: fixed; inset: 0; max-height: none; z-index: 1200; border: 0; padding: 24px 32px; }
    .admin-preview.fullscreen .admin-preview-toolbar { margin-top: 0; }
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
    @media (max-width: 768px) {
      .admin-mode-tab { font-size: 0.78rem; }
      .admin-preview { max-height: 60vh; }
    }
  `]
})
export class AccueilComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly homeItems = signal<HomeAdminItem[] | null>(null);

  protected readonly accueilViewMode = signal<'form' | 'preview'>('form');
  protected readonly previewFullscreen = signal(false);
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

  protected togglePreviewFullscreen(): void { this.previewFullscreen.update(v => !v); }
  protected previewFullscreenLabel(): string {
    return this.previewFullscreen() ? 'Réduire l\'aperçu' : 'Aperçu plein écran';
  }

  protected onPreviewFeedReorder(order: number[]): void {
    const current = this.homeItems();
    if (!current) return;
    this.homeItems.set(order.map(i => current[i]));
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
