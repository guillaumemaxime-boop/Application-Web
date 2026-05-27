import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminFeedEntry } from '../../models/home.model';
import { PortfolioService } from '../../services/portfolio.service';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { MailSettingsComponent } from './mail-settings/mail-settings.component';

interface HomeAdminItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  included: boolean;
}

type Tab = 'home' | 'email';

interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReorderableDirective, MailSettingsComponent],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <span class="eyebrow">Console d'administration</span>
          <h1>Gérer le contenu</h1>
          <p class="lead">Ajoutez, modifiez ou supprimez les pièces de mobilier et les expositions présentées sur le site.</p>
        </div>

        <div class="admin-layout">
          <button type="button" class="sidebar-toggle" (click)="toggleSidebar()" [attr.aria-expanded]="sidebarOpen()" aria-controls="admin-tabs">
            <span class="burger-icon" aria-hidden="true">☰</span>
            <span>{{ currentTabLabel() }}</span>
          </button>

          <nav id="admin-tabs" class="tabs" [class.open]="sidebarOpen()" role="tablist">
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'home'"
              [class.active]="tab() === 'home'"
              (click)="switchTab('home')">Accueil</button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'email'"
              [class.active]="tab() === 'email'"
              (click)="switchTab('email')">Email</button>
          </nav>

          <div class="admin-content">

        @if (tab() === 'home') {
          <div class="home-editor">
            <h2>Sections visibles dans le menu</h2>
            <p class="hint">Active ou désactive l'apparition de chaque section dans l'en-tête et le pied de page. Les pages restent accessibles via leur URL si elles existent.</p>
            <ul class="nav-vis-list">
              <li class="home-row">
                <span class="kind-badge">MENU</span>
                <span class="title">Mobilier</span>
                <label class="incl">
                  <input type="checkbox" [checked]="navMobilierVisible()" (change)="toggleNavSection('mobilier', $event)" /> Visible
                </label>
              </li>
              <li class="home-row">
                <span class="kind-badge">MENU</span>
                <span class="title">Expositions</span>
                <label class="incl">
                  <input type="checkbox" [checked]="navExpositionsVisible()" (change)="toggleNavSection('expositions', $event)" /> Visible
                </label>
              </li>
              <li class="home-row">
                <span class="kind-badge">MENU</span>
                <span class="title">Studio</span>
                <label class="incl">
                  <input type="checkbox" [checked]="navStudioVisible()" (change)="toggleNavSection('studio', $event)" /> Visible
                </label>
              </li>
            </ul>

            <h2 style="margin-top: 48px">Ordre éditorial du masonry</h2>
            <p class="hint">Glisse pour réordonner. Décoche pour exclure du feed. Les modifications sont enregistrées automatiquement.</p>
            @if (homeItems(); as items) {
              <ul class="ordering-list" appReorderable (reordered)="onFeedReorder($event)">
                @for (entry of items; track entry.kind + ':' + entry.slug) {
                  <li class="home-row">
                    <span class="handle">⠿</span>
                    <span class="kind-badge">{{ entry.kind === 'furniture' ? 'MOBILIER' : 'EXPO' }}</span>
                    <img [src]="entry.cover" [alt]="entry.title" class="thumb" />
                    <span class="title">{{ entry.title }}</span>
                    <label class="incl">
                      <input type="checkbox" [checked]="entry.included" (change)="toggleIncluded(entry, $event)" /> Inclure
                    </label>
                  </li>
                }
              </ul>
            } @else {
              <p class="status">Chargement…</p>
            }
          </div>
        }

        @if (tab() === 'email') {
          <app-mail-settings></app-mail-settings>
        }
          </div>
        </div>
      </div>
    </section>

    @if (toasts().length > 0) {
      <div class="toast-stack" aria-live="polite">
        @for (t of toasts(); track t.id) {
          <div class="toast" [class.error]="t.type === 'error'" role="status">
            <span class="toast-text">{{ t.text }}</span>
            <button type="button" class="toast-close" (click)="dismissToast(t.id)" aria-label="Fermer">×</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .section { padding: 128px 0 96px; }
    .head { max-width: 720px; margin-bottom: 48px; }
    .head h1 { margin-top: 16px; }
    .lead { margin-top: 16px; color: var(--color-ink-soft); }

    .admin-layout { display: grid; grid-template-columns: 220px 1fr; gap: 40px; align-items: start; }
    .admin-content { min-width: 0; }

    .sidebar-toggle {
      display: none;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      width: 100%;
      background: var(--color-bg-alt);
      border: 1px solid var(--color-line);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-ink);
      cursor: pointer;
      grid-column: 1 / -1;
    }
    .burger-icon { font-size: 1.1rem; }

    .tabs {
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: sticky;
      top: 96px;
      border-right: 1px solid var(--color-line);
      padding-right: 12px;
    }
    .tabs button {
      background: transparent;
      border: 0;
      padding: 12px 14px;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      color: var(--color-ink-soft);
      cursor: pointer;
      text-align: left;
      border-left: 2px solid transparent;
      transition: color var(--transition), border-color var(--transition), background var(--transition);
    }
    .tabs button:hover { color: var(--color-ink); background: var(--color-bg-alt); }
    .tabs button.active {
      color: var(--color-ink);
      border-left-color: var(--color-accent);
      background: var(--color-bg-alt);
      font-weight: 500;
    }

    @media (max-width: 720px) {
      .admin-layout { grid-template-columns: 1fr; gap: 0; }
      .sidebar-toggle { display: flex; margin-bottom: 16px; }
      .tabs {
        position: static;
        border-right: none;
        padding-right: 0;
        margin-bottom: 24px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 240ms ease;
      }
      .tabs.open { max-height: 600px; }
    }

    .toast-stack {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: var(--color-bg);
      border: 1px solid var(--color-line);
      border-left: 3px solid var(--color-accent);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      font-size: 0.9rem;
      pointer-events: auto;
      animation: toast-slide-in 220ms ease-out;
    }
    .toast.error {
      border-left-color: #b1532a;
      color: #8a3d1f;
      background: rgba(177, 83, 42, 0.04);
    }
    .toast-text { flex: 1; line-height: 1.4; }
    .toast-close {
      background: none;
      border: none;
      color: var(--color-mute);
      font-size: 1.2rem;
      line-height: 1;
      padding: 0 4px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .toast-close:hover { color: var(--color-ink); }
    @keyframes toast-slide-in {
      from { transform: translateX(40px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .status { color: var(--color-mute); padding: 16px 20px; }

    /* Onglet Accueil (ordre éditorial) */
    .home-editor h2 { margin: 32px 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .home-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .ordering-list, .nav-vis-list { list-style: none; padding: 0; margin: 0; }

    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; cursor: grab; user-select: none; }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .thumb { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class AdminComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly tab = signal<Tab>('home');
  protected readonly sidebarOpen = signal(false);
  private readonly tabLabels: Record<Tab, string> = {
    home: 'Accueil',
    email: 'Email',
  };
  protected readonly currentTabLabel = computed(() => this.tabLabels[this.tab()]);

  protected readonly toasts = signal<Toast[]>([]);
  private toastCounter = 0;
  protected readonly message = computed<string | null>(() => {
    const list = this.toasts();
    return list.length === 0 ? null : list[list.length - 1].text;
  });
  protected readonly messageType = computed<'success' | 'error'>(() => {
    const list = this.toasts();
    return list.length === 0 ? 'success' : list[list.length - 1].type;
  });

  protected readonly homeItems = signal<HomeAdminItem[] | null>(null);

  protected readonly navMobilierVisible = signal(true);
  protected readonly navExpositionsVisible = signal(true);
  protected readonly navStudioVisible = signal(true);

  constructor() {
    this.portfolio.getContent().subscribe(c => {
      this.navMobilierVisible.set(c['nav.mobilier.visible'] !== 'false');
      this.navExpositionsVisible.set(c['nav.expositions.visible'] !== 'false');
      this.navStudioVisible.set(c['nav.studio.visible'] !== 'false');
    });
    this.loadHomeTab();
  }

  switchTab(tab: Tab) {
    this.tab.set(tab);
    this.sidebarOpen.set(false);
    if (tab === 'home') this.loadHomeTab();
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  loadHomeTab() {
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
  }

  onFeedReorder(order: number[]) {
    const current = this.homeItems();
    if (!current) return;
    this.homeItems.set(order.map(i => current[i]));
    this.persistFeed();
  }

  toggleIncluded(item: HomeAdminItem, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.homeItems.update(items => items?.map(x => x === item ? { ...x, included: checked } : x) ?? null);
    this.persistFeed();
  }

  private persistFeed() {
    const items = this.homeItems() ?? [];
    const entries: AdminFeedEntry[] = items.filter(i => i.included).map(i => ({ kind: i.kind, slug: i.slug }));
    this.portfolio.replaceAdminFeed(entries).subscribe({
      next: () => this.flash('Ordre enregistré.', 'success'),
      error: () => this.flash('Impossible d\'enregistrer l\'ordre.', 'error'),
    });
  }

  toggleNavSection(section: 'mobilier' | 'expositions' | 'studio', event: Event) {
    const visible = (event.target as HTMLInputElement).checked;
    if (section === 'mobilier') this.navMobilierVisible.set(visible);
    else if (section === 'expositions') this.navExpositionsVisible.set(visible);
    else this.navStudioVisible.set(visible);
    this.portfolio.updateContent({ [`nav.${section}.visible`]: visible ? 'true' : 'false' }).subscribe({
      next: () => this.flash('Visibilité de la section enregistrée.', 'success'),
      error: () => this.flash('Impossible d\'enregistrer la visibilité.', 'error'),
    });
  }

  private flash(text: string, type: 'success' | 'error') {
    const id = ++this.toastCounter;
    this.toasts.update(list => [...list, { id, text, type }]);
    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
    }, 4000);
  }

  protected dismissToast(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
