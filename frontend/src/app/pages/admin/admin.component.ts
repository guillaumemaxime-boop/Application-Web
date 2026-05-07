import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { PortfolioService } from '../../services/portfolio.service';

type Tab = 'furniture' | 'exhibitions';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="wrap">

        <div class="page-head">
          <span class="label">Console d'administration</span>
          <h1>Contenu</h1>
        </div>

        <div class="tabs" role="tablist">
          <button type="button" role="tab"
            [attr.aria-selected]="tab() === 'furniture'"
            [class.active]="tab() === 'furniture'"
            (click)="switchTab('furniture')">Mobilier</button>
          <button type="button" role="tab"
            [attr.aria-selected]="tab() === 'exhibitions'"
            [class.active]="tab() === 'exhibitions'"
            (click)="switchTab('exhibitions')">Expositions</button>
        </div>

        @if (message()) {
          <div class="flash" [class.flash-err]="messageType() === 'error'">
            {{ message() }}
          </div>
        }

        @if (tab() === 'furniture') {
          <div class="layout">
            <aside class="sidebar">
              <div class="sidebar-head">
                <span class="label">Pièces</span>
                <button type="button" class="new-btn" (click)="newFurniture()">+ Nouveau</button>
              </div>

              @if (loadingFurniture()) {
                <p class="status">Chargement…</p>
              } @else if (furniture().length === 0) {
                <p class="status">Aucune pièce.</p>
              } @else {
                <ul class="item-list">
                  @for (item of furniture(); track item.id) {
                    <li [class.selected]="editingFurnitureSlug() === item.slug">
                      <button type="button" class="item-btn" (click)="loadFurniture(item)">
                        <span class="item-title">{{ item.title }}</span>
                        <span class="label item-meta">{{ item.category }} · {{ item.year }}</span>
                      </button>
                      <button type="button" class="del-btn"
                        (click)="removeFurniture(item)"
                        aria-label="Supprimer">×</button>
                    </li>
                  }
                </ul>
              }
            </aside>

            <form class="form-panel" [formGroup]="furnitureForm" (ngSubmit)="saveFurniture()">
              <h2>{{ editingFurnitureSlug() ? 'Modifier la pièce' : 'Nouvelle pièce' }}</h2>

              <div class="fields">
                <div class="field">
                  <label class="label" for="f-title">Titre *</label>
                  <input id="f-title" type="text" formControlName="title" />
                </div>
                <div class="field">
                  <label class="label" for="f-slug">Slug</label>
                  <input id="f-slug" type="text" formControlName="slug" placeholder="auto-généré si vide" />
                </div>
                <div class="row-2">
                  <div class="field">
                    <label class="label" for="f-cat">Catégorie *</label>
                    <input id="f-cat" type="text" formControlName="category" placeholder="Sièges, Tables…" />
                  </div>
                  <div class="field">
                    <label class="label" for="f-yr">Année</label>
                    <input id="f-yr" type="number" formControlName="year" />
                  </div>
                </div>
                <div class="field">
                  <label class="label" for="f-mat">Matériaux</label>
                  <input id="f-mat" type="text" formControlName="material" />
                </div>
                <div class="field">
                  <label class="label" for="f-des">Designer</label>
                  <input id="f-des" type="text" formControlName="designer" />
                </div>
                <div class="field">
                  <label class="label" for="f-cover">Image principale (URL)</label>
                  <input id="f-cover" type="url" formControlName="coverImage" />
                </div>
                <div class="field">
                  <label class="label" for="f-gallery">Galerie (une URL par ligne)</label>
                  <textarea id="f-gallery" rows="3" formControlName="gallery"></textarea>
                </div>
                <div class="field">
                  <label class="label" for="f-dims">Dimensions (une par ligne)</label>
                  <textarea id="f-dims" rows="3" formControlName="dimensions"></textarea>
                </div>
                <div class="field">
                  <label class="label" for="f-short">Description courte</label>
                  <textarea id="f-short" rows="2" formControlName="shortDescription"></textarea>
                </div>
                <div class="field">
                  <label class="label" for="f-desc">Description longue</label>
                  <textarea id="f-desc" rows="5" formControlName="description"></textarea>
                </div>
                <div class="field field-check">
                  <input id="f-featured" type="checkbox" formControlName="featured" />
                  <label for="f-featured">Mettre en avant sur l'accueil</label>
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="save-btn"
                  [disabled]="furnitureForm.invalid || saving()">
                  {{ saving() ? 'Enregistrement…' : (editingFurnitureSlug() ? 'Mettre à jour' : 'Créer') }}
                </button>
                @if (editingFurnitureSlug()) {
                  <button type="button" class="cancel-btn" (click)="newFurniture()">Annuler</button>
                }
              </div>
            </form>
          </div>
        }

        @if (tab() === 'exhibitions') {
          <div class="layout">
            <aside class="sidebar">
              <div class="sidebar-head">
                <span class="label">Expositions</span>
                <button type="button" class="new-btn" (click)="newExhibition()">+ Nouveau</button>
              </div>

              @if (loadingExhibitions()) {
                <p class="status">Chargement…</p>
              } @else if (exhibitions().length === 0) {
                <p class="status">Aucune exposition.</p>
              } @else {
                <ul class="item-list">
                  @for (item of exhibitions(); track item.id) {
                    <li [class.selected]="editingExhibitionSlug() === item.slug">
                      <button type="button" class="item-btn" (click)="loadExhibition(item)">
                        <span class="item-title">{{ item.title }}</span>
                        <span class="label item-meta">{{ item.venue }} · {{ item.city }}</span>
                      </button>
                      <button type="button" class="del-btn"
                        (click)="removeExhibition(item)"
                        aria-label="Supprimer">×</button>
                    </li>
                  }
                </ul>
              }
            </aside>

            <form class="form-panel" [formGroup]="exhibitionForm" (ngSubmit)="saveExhibition()">
              <h2>{{ editingExhibitionSlug() ? 'Modifier l\'exposition' : 'Nouvelle exposition' }}</h2>

              <div class="fields">
                <div class="field">
                  <label class="label" for="e-title">Titre *</label>
                  <input id="e-title" type="text" formControlName="title" />
                </div>
                <div class="field">
                  <label class="label" for="e-slug">Slug</label>
                  <input id="e-slug" type="text" formControlName="slug" placeholder="auto-généré si vide" />
                </div>
                <div class="field">
                  <label class="label" for="e-venue">Lieu</label>
                  <input id="e-venue" type="text" formControlName="venue" />
                </div>
                <div class="row-2">
                  <div class="field">
                    <label class="label" for="e-city">Ville</label>
                    <input id="e-city" type="text" formControlName="city" />
                  </div>
                  <div class="field">
                    <label class="label" for="e-country">Pays</label>
                    <input id="e-country" type="text" formControlName="country" />
                  </div>
                </div>
                <div class="row-2">
                  <div class="field">
                    <label class="label" for="e-start">Date de début *</label>
                    <input id="e-start" type="date" formControlName="startDate" />
                  </div>
                  <div class="field">
                    <label class="label" for="e-end">Date de fin *</label>
                    <input id="e-end" type="date" formControlName="endDate" />
                  </div>
                </div>
                <div class="field">
                  <label class="label" for="e-curator">Commissaire</label>
                  <input id="e-curator" type="text" formControlName="curator" />
                </div>
                <div class="field">
                  <label class="label" for="e-cover">Image principale (URL)</label>
                  <input id="e-cover" type="url" formControlName="coverImage" />
                </div>
                <div class="field">
                  <label class="label" for="e-gallery">Galerie (une URL par ligne)</label>
                  <textarea id="e-gallery" rows="3" formControlName="gallery"></textarea>
                </div>
                <div class="field">
                  <label class="label" for="e-tags">Tags (un par ligne)</label>
                  <textarea id="e-tags" rows="2" formControlName="tags"></textarea>
                </div>
                <div class="field">
                  <label class="label" for="e-short">Description courte</label>
                  <textarea id="e-short" rows="2" formControlName="shortDescription"></textarea>
                </div>
                <div class="field">
                  <label class="label" for="e-desc">Description longue</label>
                  <textarea id="e-desc" rows="5" formControlName="description"></textarea>
                </div>
                <div class="field field-check">
                  <input id="e-featured" type="checkbox" formControlName="featured" />
                  <label for="e-featured">Exposition phare</label>
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="save-btn"
                  [disabled]="exhibitionForm.invalid || saving()">
                  {{ saving() ? 'Enregistrement…' : (editingExhibitionSlug() ? 'Mettre à jour' : 'Créer') }}
                </button>
                @if (editingExhibitionSlug()) {
                  <button type="button" class="cancel-btn" (click)="newExhibition()">Annuler</button>
                }
              </div>
            </form>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .page { padding: 88px 0 80px; }

    .page-head { margin-bottom: 32px; }
    .page-head .label { display: block; margin-bottom: 12px; }
    .page-head h1 { font-size: clamp(2rem, 4vw, 3rem); }

    /* ── Tabs ── */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--line);
      margin-bottom: 24px;
    }
    .tabs button {
      padding: 12px 16px;
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color var(--ease), border-color var(--ease);
    }
    .tabs button:hover { color: var(--dim); }
    .tabs button.active {
      color: var(--ink);
      border-bottom-color: var(--ink);
    }

    /* ── Flash ── */
    .flash {
      padding: 10px 14px;
      margin-bottom: 20px;
      border-left: 2px solid var(--ink);
      font-size: 0.875rem;
      color: var(--dim);
      background: rgba(0, 0, 0, 0.03);
    }
    .flash-err {
      border-left-color: #b53030;
      color: #b53030;
      background: rgba(181, 48, 48, 0.04);
    }

    /* ── Layout ── */
    .layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 32px;
      align-items: start;
    }

    /* ── Sidebar ── */
    .sidebar {
      border: 1px solid var(--line);
      position: sticky;
      top: 80px;
      max-height: calc(100vh - 112px);
      overflow-y: auto;
    }
    .sidebar-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
      background: var(--bg);
      position: sticky;
      top: 0;
    }
    .new-btn {
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .new-btn:hover { color: var(--ink); }

    .item-list {}
    .item-list li {
      display: flex;
      align-items: stretch;
      border-bottom: 1px solid var(--line);
    }
    .item-list li:last-child { border-bottom: none; }
    .item-list li.selected { background: rgba(0,0,0,0.03); }

    .item-btn {
      flex: 1;
      text-align: left;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: transparent;
      transition: background var(--ease);
    }
    .item-btn:hover { background: rgba(0,0,0,0.03); }
    .item-title { font-size: 0.875rem; color: var(--ink); }
    .item-meta { display: block; }

    .del-btn {
      padding: 0 12px;
      font-size: 1.25rem;
      line-height: 1;
      color: var(--muted);
      transition: color var(--ease);
    }
    .del-btn:hover { color: #b53030; }

    .status { padding: 14px 16px; color: var(--muted); font-size: 0.875rem; }

    /* ── Form ── */
    .form-panel {
      border: 1px solid var(--line);
      padding: 28px;
    }
    .form-panel h2 {
      font-size: 1.5rem;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }

    .fields { display: flex; flex-direction: column; gap: 16px; }

    .field { display: flex; flex-direction: column; gap: 6px; }
    .field .label { display: block; }

    input[type="text"],
    input[type="number"],
    input[type="url"],
    input[type="date"],
    textarea {
      width: 100%;
      padding: 9px 11px;
      border: 1px solid var(--line);
      background: var(--bg);
      font: inherit;
      font-size: 0.9375rem;
      color: var(--ink);
      transition: border-color var(--ease);
    }
    input:focus,
    textarea:focus {
      outline: none;
      border-color: var(--ink);
    }
    textarea { resize: vertical; font-family: var(--sans); }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .field-check {
      flex-direction: row !important;
      align-items: center;
      gap: 8px !important;
    }
    .field-check input[type="checkbox"] {
      width: auto;
      padding: 0;
    }
    .field-check label {
      font-size: 0.875rem;
      color: var(--dim);
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    .save-btn {
      padding: 10px 22px;
      background: var(--ink);
      color: var(--bg);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      transition: opacity var(--ease);
    }
    .save-btn:hover:not(:disabled) { opacity: 0.72; }
    .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .cancel-btn {
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .cancel-btn:hover { color: var(--ink); }

    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: static; max-height: 360px; }
    }
  `]
})
export class AdminComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<Tab>('furniture');
  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly loadingExhibitions = signal(true);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly messageType = signal<'success' | 'error'>('success');

  protected readonly furnitureForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    category: ['', Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    material: [''],
    designer: ['Milo GUILLAUME Design'],
    coverImage: [''],
    gallery: [''],
    dimensions: [''],
    shortDescription: [''],
    description: [''],
    featured: [false],
  });

  protected readonly exhibitionForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    venue: [''],
    city: [''],
    country: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    curator: [''],
    coverImage: [''],
    gallery: [''],
    tags: [''],
    shortDescription: [''],
    description: [''],
    featured: [false],
  });

  constructor() {
    this.refreshFurniture();
    this.refreshExhibitions();
  }

  switchTab(tab: Tab) {
    this.tab.set(tab);
    this.message.set(null);
  }

  private refreshFurniture() {
    this.loadingFurniture.set(true);
    this.portfolio.getAllFurniture().subscribe({
      next: data => { this.furniture.set(data); this.loadingFurniture.set(false); },
      error: () => { this.loadingFurniture.set(false); this.flash('Impossible de charger les pièces.', 'error'); }
    });
  }

  private refreshExhibitions() {
    this.loadingExhibitions.set(true);
    this.portfolio.getAllExhibitions().subscribe({
      next: data => { this.exhibitions.set(data); this.loadingExhibitions.set(false); },
      error: () => { this.loadingExhibitions.set(false); this.flash('Impossible de charger les expositions.', 'error'); }
    });
  }

  newFurniture() {
    this.editingFurnitureSlug.set(null);
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '',
      gallery: '', dimensions: '', shortDescription: '', description: '', featured: false,
    });
    this.message.set(null);
  }

  loadFurniture(item: Furniture) {
    this.editingFurnitureSlug.set(item.slug);
    this.furnitureForm.reset({
      title: item.title,
      slug: item.slug,
      category: item.category,
      year: item.year,
      material: item.material ?? '',
      designer: item.designer ?? '',
      coverImage: item.coverImage ?? '',
      gallery: (item.gallery ?? []).join('\n'),
      dimensions: (item.dimensions ?? []).join('\n'),
      shortDescription: item.shortDescription ?? '',
      description: item.description ?? '',
      featured: item.featured,
    });
    this.message.set(null);
  }

  saveFurniture() {
    if (this.furnitureForm.invalid) return;
    const v = this.furnitureForm.getRawValue();
    const payload: Partial<Furniture> = {
      title: v.title!,
      slug: v.slug || undefined,
      category: v.category!,
      year: v.year ?? undefined,
      material: v.material ?? '',
      designer: v.designer ?? '',
      coverImage: v.coverImage ?? '',
      gallery: this.splitLines(v.gallery),
      dimensions: this.splitLines(v.dimensions),
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      featured: !!v.featured,
    };

    this.saving.set(true);
    const slug = this.editingFurnitureSlug();
    const op$ = slug
      ? this.portfolio.updateFurniture(slug, payload)
      : this.portfolio.createFurniture(payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.flash(slug ? 'Pièce mise à jour.' : 'Pièce créée.', 'success');
        this.refreshFurniture();
        this.newFurniture();
      },
      error: () => {
        this.saving.set(false);
        this.flash('Erreur lors de l\'enregistrement.', 'error');
      }
    });
  }

  removeFurniture(item: Furniture) {
    if (!confirm(`Supprimer la pièce "${item.title}" ?`)) return;
    this.portfolio.deleteFurniture(item.slug).subscribe({
      next: () => {
        this.flash('Pièce supprimée.', 'success');
        if (this.editingFurnitureSlug() === item.slug) this.newFurniture();
        this.refreshFurniture();
      },
      error: () => this.flash('Erreur lors de la suppression.', 'error')
    });
  }

  newExhibition() {
    this.editingExhibitionSlug.set(null);
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '',
      gallery: '', tags: '', shortDescription: '', description: '', featured: false,
    });
    this.message.set(null);
  }

  loadExhibition(item: Exhibition) {
    this.editingExhibitionSlug.set(item.slug);
    this.exhibitionForm.reset({
      title: item.title,
      slug: item.slug,
      venue: item.venue ?? '',
      city: item.city ?? '',
      country: item.country ?? '',
      startDate: item.startDate ?? '',
      endDate: item.endDate ?? '',
      curator: item.curator ?? '',
      coverImage: item.coverImage ?? '',
      gallery: (item.gallery ?? []).join('\n'),
      tags: (item.tags ?? []).join('\n'),
      shortDescription: item.shortDescription ?? '',
      description: item.description ?? '',
      featured: item.featured,
    });
    this.message.set(null);
  }

  saveExhibition() {
    if (this.exhibitionForm.invalid) return;
    const v = this.exhibitionForm.getRawValue();
    const payload: Partial<Exhibition> = {
      title: v.title!,
      slug: v.slug || undefined,
      venue: v.venue ?? '',
      city: v.city ?? '',
      country: v.country ?? '',
      startDate: v.startDate!,
      endDate: v.endDate!,
      curator: v.curator ?? '',
      coverImage: v.coverImage ?? '',
      gallery: this.splitLines(v.gallery),
      tags: this.splitLines(v.tags),
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      featured: !!v.featured,
    };

    this.saving.set(true);
    const slug = this.editingExhibitionSlug();
    const op$ = slug
      ? this.portfolio.updateExhibition(slug, payload)
      : this.portfolio.createExhibition(payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.flash(slug ? 'Exposition mise à jour.' : 'Exposition créée.', 'success');
        this.refreshExhibitions();
        this.newExhibition();
      },
      error: () => {
        this.saving.set(false);
        this.flash('Erreur lors de l\'enregistrement.', 'error');
      }
    });
  }

  removeExhibition(item: Exhibition) {
    if (!confirm(`Supprimer l'exposition "${item.title}" ?`)) return;
    this.portfolio.deleteExhibition(item.slug).subscribe({
      next: () => {
        this.flash('Exposition supprimée.', 'success');
        if (this.editingExhibitionSlug() === item.slug) this.newExhibition();
        this.refreshExhibitions();
      },
      error: () => this.flash('Erreur lors de la suppression.', 'error')
    });
  }

  private splitLines(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private flash(text: string, type: 'success' | 'error') {
    this.message.set(text);
    this.messageType.set(type);
    setTimeout(() => {
      if (this.message() === text) this.message.set(null);
    }, 4000);
  }
}
