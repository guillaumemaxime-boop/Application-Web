import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { Furniture } from '../../../models/furniture.model';
import { AdminCategoryView } from '../../../models/home.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { SlidesEditorComponent } from '../shared/slides-editor.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-mobilier',
  standalone: true,
  imports: [ReactiveFormsModule, ReorderableDirective, SlidesEditorComponent, GalleryEditorComponent, ImageFieldComponent],
  template: `
    <div class="grid-admin">
      <aside class="list">
        <div class="list-head">
          <h2>Pièces existantes</h2>
          <button type="button" class="btn-link" (click)="newFurniture()">+ Nouvelle pièce</button>
        </div>
        @if (loadingFurniture()) {
          <p class="status">Chargement…</p>
        } @else if (furniture().length === 0) {
          <p class="status">Aucune pièce.</p>
        } @else {
          <ul>
            @for (item of furniture(); track item.id) {
              <li [class.selected]="editingFurnitureSlug() === item.slug">
                <button type="button" class="row" (click)="loadFurniture(item)">
                  <span class="row-title">{{ item.title }}</span>
                  <span class="row-meta">{{ item.category }} · {{ item.year }}</span>
                </button>
                <button type="button" class="row-del" (click)="removeFurniture(item)" aria-label="Supprimer">×</button>
              </li>
            }
          </ul>
        }
      </aside>

      <form class="form" [formGroup]="furnitureForm" (ngSubmit)="saveFurniture()">
        <div class="form-head">
          <h2>{{ editingFurnitureSlug() ? 'Modifier la pièce' : 'Nouvelle pièce' }}</h2>
          @if (editingFurnitureSlug(); as s) {
            <a class="view-link" [href]="'/mobilier/' + s" target="_blank" rel="noopener" title="Voir sur le site">Voir sur le site ↗</a>
          }
        </div>

        <label>
          <span>Titre *</span>
          <input type="text" formControlName="title" />
        </label>
        @if (editingFurnitureSlug()) {
          <label class="readonly-row">
            <span>Slug</span>
            <input type="text" formControlName="slug" readonly />
          </label>
        }
        <div class="row-2">
          <label>
            <span>Catégorie *</span>
            <input type="text" formControlName="category" placeholder="Sièges, Tables…" />
          </label>
          <label>
            <span>Année</span>
            <input type="number" formControlName="year" />
          </label>
        </div>
        <label>
          <span>Matériaux</span>
          <input type="text" formControlName="material" />
        </label>
        <label>
          <span>Designer</span>
          <input type="text" formControlName="designer" />
        </label>

        <app-image-field formControlName="coverImage" label="Image principale (URL)" />

        <app-gallery-editor
          [images]="furnitureGallery()"
          (imagesChange)="furnitureGallery.set($event)" />

        <fieldset class="dim-fieldset">
          <legend>Dimensions</legend>
          <div class="dim-grid">
            <label class="dim-cell">
              <span>Largeur (cm)</span>
              <input type="number" step="0.1" min="0" formControlName="dimW" placeholder="—" />
            </label>
            <label class="dim-cell">
              <span>Profondeur (cm)</span>
              <input type="number" step="0.1" min="0" formControlName="dimD" placeholder="—" />
            </label>
            <label class="dim-cell">
              <span>Hauteur (cm)</span>
              <input type="number" step="0.1" min="0" formControlName="dimH" placeholder="—" />
            </label>
          </div>
          <label class="dim-notes">
            <span>Autres dimensions (une par ligne)</span>
            <textarea rows="2" formControlName="dimNotes" placeholder="Ex. : Diamètre assise 45 cm"></textarea>
          </label>
        </fieldset>
        <label>
          <span>Description courte</span>
          <textarea rows="2" formControlName="shortDescription"></textarea>
        </label>
        <label>
          <span>Description longue</span>
          <textarea rows="5" formControlName="description"></textarea>
        </label>

        @if (editingFurnitureId(); as ownerId) {
          <app-slides-editor kind="furniture" [ownerId]="ownerId" [ownerSlug]="editingFurnitureSlug()" />
        } @else {
          <p class="slides-hint">Enregistre la pièce une première fois pour pouvoir éditer ses slides.</p>
        }

        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="furnitureForm.invalid || saving()">
            {{ saving() ? 'Enregistrement…' : (editingFurnitureSlug() ? 'Mettre à jour' : 'Créer') }}
          </button>
          @if (editingFurnitureSlug()) {
            <button type="button" class="btn-link" (click)="newFurniture()">Annuler</button>
          }
        </div>
      </form>
    </div>

    <section class="categories-section">
      <h2>Catégories de mobilier</h2>
      <p class="hint">Glisse pour réordonner. Décoche pour masquer une catégorie de la home.</p>
      @if (categoryMeta(); as cats) {
        <ul class="cat-list" appReorderable (reordered)="onCategoryReorder($event)">
          @for (c of cats; track c.category) {
            <li class="home-row">
              <span class="handle">⠿</span>
              <img [src]="c.coverImage" [alt]="c.category" class="thumb-round" />
              <span class="title">{{ c.category }}</span>
              <label class="incl">
                <input type="checkbox" [checked]="c.visible" (change)="toggleCategoryVisibility(c, $event)" /> Visible
              </label>
            </li>
          }
        </ul>
      } @else {
        <p class="status">Chargement…</p>
      }
    </section>
  `,
  styles: [`
    .grid-admin { display: grid; grid-template-columns: 320px 1fr; gap: 48px; align-items: start; }
    .list { border: 1px solid var(--color-line); background: var(--color-bg); position: sticky; top: 112px; max-height: calc(100vh - 144px); overflow-y: auto; }
    .list-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-line); background: var(--color-bg-alt); }
    .list-head h2 { font-size: 1rem; margin: 0; letter-spacing: 0.04em; }
    .list ul { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; align-items: stretch; border-bottom: 1px solid var(--color-line); }
    .list li:last-child { border-bottom: 0; }
    .list li.selected { background: rgba(139, 111, 71, 0.08); }
    .row { flex: 1; text-align: left; background: transparent; border: 0; padding: 14px 20px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
    .row:hover { background: var(--color-bg-alt); }
    .row-title { color: var(--color-ink); font-size: 0.95rem; }
    .row-meta { font-size: 0.75rem; color: var(--color-mute); letter-spacing: 0.06em; text-transform: uppercase; }
    .row-del { background: transparent; border: 0; padding: 0 16px; color: var(--color-mute); font-size: 1.5rem; cursor: pointer; line-height: 1; }
    .row-del:hover { color: #b1532a; }
    .form { display: flex; flex-direction: column; gap: 20px; padding: 32px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .form h2 { margin: 0; font-size: 1.5rem; }
    .form-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .view-link { font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-mute); text-decoration: none; white-space: nowrap; }
    .view-link:hover { color: var(--color-accent); }
    .form label { display: flex; flex-direction: column; gap: 6px; }
    .form label > span { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-mute); }
    .form input[type="text"],
    .form input[type="number"],
    .form input[type="url"],
    .form input[type="date"],
    .form textarea {
      padding: 10px 12px; border: 1px solid var(--color-line); background: var(--color-bg);
      font: inherit; color: var(--color-ink); border-radius: 0;
    }
    .form input:focus, .form textarea:focus { outline: none; border-color: var(--color-accent); }
    .form textarea { font-family: var(--sans, inherit); resize: vertical; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .readonly-row input[readonly] { background: var(--color-bg-alt); color: var(--color-ink-soft); cursor: default; }
    .dim-fieldset { border: 1px solid var(--color-line); padding: 16px; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .dim-fieldset legend { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-ink-soft); padding: 0 8px; }
    .dim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .dim-cell { gap: 4px; }
    .dim-cell span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .dim-notes { gap: 4px; }
    .dim-notes span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .actions { display: flex; align-items: center; gap: 24px; margin-top: 8px; }
    .btn-primary {
      padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0;
      font-size: 0.875rem; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
      transition: background var(--transition);
    }
    .btn-primary:hover:not(:disabled) { background: var(--color-accent-deep); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-link { background: none; border: 0; color: var(--color-accent); font-size: 0.875rem; cursor: pointer; padding: 0; text-decoration: underline; }
    .status { color: var(--color-mute); padding: 16px 20px; }
    .slides-hint { margin-top: 24px; padding: 12px 16px; background: var(--color-bg-alt); border-left: 3px solid var(--color-mute); font-size: 0.85rem; color: var(--color-ink-soft); font-style: italic; }

    .categories-section { margin-top: 64px; }
    .categories-section h2 { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; margin: 0 0 8px; }
    .categories-section .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .cat-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; user-select: none; }
    .home-row .thumb-round { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .dim-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MobilierComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingFurnitureId = signal<string | null>(null);
  protected readonly furnitureGallery = signal<string[]>([]);
  protected readonly categoryMeta = signal<AdminCategoryView[] | null>(null);

  protected readonly furnitureForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    category: ['', Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    material: [''],
    designer: ['Milo GUILLAUME Design'],
    coverImage: [''],
    dimW: [null as number | null],
    dimD: [null as number | null],
    dimH: [null as number | null],
    dimNotes: [''],
    shortDescription: [''],
    description: [''],
  });

  constructor() {
    this.refreshFurniture();
    this.portfolio.getAdminCategories().subscribe(c => this.categoryMeta.set(c));
    this.route.queryParamMap.subscribe(params => {
      if (params.get('new') === '1') this.newFurniture();
    });
  }

  private refreshFurniture(): void {
    this.loadingFurniture.set(true);
    this.portfolio.getAllFurniture().subscribe({
      next: data => { this.furniture.set(data); this.loadingFurniture.set(false); },
      error: () => { this.loadingFurniture.set(false); this.toast.error('Impossible de charger les pièces.'); }
    });
  }

  newFurniture(): void {
    this.editingFurnitureSlug.set(null);
    this.editingFurnitureId.set(null);
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '',
      dimW: null, dimD: null, dimH: null, dimNotes: '',
      shortDescription: '', description: '',
    });
    this.furnitureGallery.set([]);
  }

  loadFurniture(item: Furniture): void {
    this.editingFurnitureSlug.set(item.slug);
    this.editingFurnitureId.set(item.id ?? null);
    const dims = this.parseDimensions(item.dimensions ?? []);
    this.furnitureForm.reset({
      title: item.title, slug: item.slug, category: item.category, year: item.year,
      material: item.material ?? '', designer: item.designer ?? '', coverImage: item.coverImage ?? '',
      dimW: dims.w, dimD: dims.d, dimH: dims.h, dimNotes: dims.notes,
      shortDescription: item.shortDescription ?? '', description: item.description ?? '',
    });
    this.furnitureGallery.set([...(item.gallery ?? [])]);
  }

  private parseDimensions(list: string[]): { w: number | null; d: number | null; h: number | null; notes: string } {
    const widthRe = /^(L|Larg(?:eur)?\.?)\s*[:.]?\s*([0-9]+(?:[.,][0-9]+)?)/i;
    const depthRe = /^(P|Prof(?:ondeur)?\.?)\s*[:.]?\s*([0-9]+(?:[.,][0-9]+)?)/i;
    const heightRe = /^(H|Haut(?:eur)?\.?)\s*[:.]?\s*([0-9]+(?:[.,][0-9]+)?)/i;
    let w: number | null = null, d: number | null = null, h: number | null = null;
    const notes: string[] = [];
    for (const raw of list) {
      const line = (raw ?? '').trim();
      if (!line) continue;
      let m = w === null ? line.match(widthRe) : null;
      if (m) { w = parseFloat(m[2].replace(',', '.')); continue; }
      m = d === null ? line.match(depthRe) : null;
      if (m) { d = parseFloat(m[2].replace(',', '.')); continue; }
      m = h === null ? line.match(heightRe) : null;
      if (m) { h = parseFloat(m[2].replace(',', '.')); continue; }
      notes.push(line);
    }
    return { w, d, h, notes: notes.join('\n') };
  }

  private serializeDimensions(w: number | null, d: number | null, h: number | null, notesText: string): string[] {
    const result: string[] = [];
    if (w !== null && w !== undefined && !isNaN(w)) result.push(`L ${w} cm`);
    if (d !== null && d !== undefined && !isNaN(d)) result.push(`P ${d} cm`);
    if (h !== null && h !== undefined && !isNaN(h)) result.push(`H ${h} cm`);
    result.push(...this.splitLines(notesText));
    return result;
  }

  private splitLines(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
  }

  saveFurniture(): void {
    if (this.furnitureForm.invalid) return;
    const v = this.furnitureForm.getRawValue();
    const slug = this.editingFurnitureSlug();
    const existing = slug ? this.furniture().find(f => f.slug === slug) : null;
    const payload: Partial<Furniture> = {
      title: v.title!,
      slug: v.slug || undefined,
      category: v.category!,
      year: v.year ?? undefined,
      material: v.material ?? '',
      designer: v.designer ?? '',
      coverImage: v.coverImage ?? '',
      gallery: [...this.furnitureGallery()],
      dimensions: this.serializeDimensions(v.dimW ?? null, v.dimD ?? null, v.dimH ?? null, v.dimNotes ?? ''),
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      featured: existing?.featured ?? false,
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateFurniture(slug, payload)
      : this.portfolio.createFurniture(payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(slug ? 'Pièce mise à jour.' : 'Pièce créée.');
        this.refreshFurniture();
        this.newFurniture();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erreur lors de l\'enregistrement.');
      }
    });
  }

  removeFurniture(item: Furniture): void {
    if (!confirm(`Supprimer la pièce "${item.title}" ?`)) return;
    this.portfolio.deleteFurniture(item.slug).subscribe({
      next: () => {
        this.toast.success('Pièce supprimée.');
        if (this.editingFurnitureSlug() === item.slug) this.newFurniture();
        this.refreshFurniture();
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }

  onCategoryReorder(order: number[]): void {
    const current = this.categoryMeta();
    if (!current) return;
    this.categoryMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
    this.persistCategories();
  }

  toggleCategoryVisibility(c: AdminCategoryView, event: Event): void {
    const visible = (event.target as HTMLInputElement).checked;
    this.categoryMeta.update(cats => cats?.map(x => x.category === c.category ? { ...x, visible } : x) ?? null);
    this.persistCategories();
  }

  private persistCategories(): void {
    const cats = this.categoryMeta() ?? [];
    const requests = cats.map(c => this.portfolio.updateAdminCategory(c.category, c));
    if (requests.length === 0) return;
    forkJoin(requests).subscribe({
      next: () => this.toast.success('Catégories enregistrées.'),
      error: () => this.toast.error('Impossible d\'enregistrer les catégories.'),
    });
  }
}
