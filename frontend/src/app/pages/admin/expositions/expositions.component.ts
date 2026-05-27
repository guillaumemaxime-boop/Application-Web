import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { Exhibition } from '../../../models/exhibition.model';
import { AdminExhibitionMetaView } from '../../../models/home.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { SlidesEditorComponent } from '../shared/slides-editor.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ToastService } from '../shared/toast.service';

interface ExhibitionMetaRow {
  slug: string;
  title: string;
  cover: string;
  position: number;
  visible: boolean;
}

@Component({
  selector: 'app-expositions',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ReorderableDirective, SlidesEditorComponent, GalleryEditorComponent],
  template: `
    <div class="grid-admin">
      <aside class="list">
        <div class="list-head">
          <h2>Expositions existantes</h2>
          <button type="button" class="btn-link" (click)="newExhibition()">+ Nouvelle exposition</button>
        </div>
        @if (loadingExhibitions()) {
          <p class="status">Chargement…</p>
        } @else if (exhibitions().length === 0) {
          <p class="status">Aucune exposition.</p>
        } @else {
          <ul>
            @for (item of exhibitions(); track item.id) {
              <li [class.selected]="editingExhibitionSlug() === item.slug">
                <button type="button" class="row" (click)="loadExhibition(item)">
                  <span class="row-title">{{ item.title }}</span>
                  <span class="row-meta">{{ item.venue }} · {{ item.city }}</span>
                </button>
                <button type="button" class="row-del" (click)="removeExhibition(item)" aria-label="Supprimer">×</button>
              </li>
            }
          </ul>
        }
      </aside>

      <form class="form" [formGroup]="exhibitionForm" (ngSubmit)="saveExhibition()">
        <div class="form-head">
          <h2>{{ editingExhibitionSlug() ? 'Modifier l\\'exposition' : 'Nouvelle exposition' }}</h2>
          @if (editingExhibitionSlug(); as s) {
            <a class="view-link" [href]="'/expositions/' + s" target="_blank" rel="noopener">Voir sur le site ↗</a>
          }
        </div>

        <label><span>Titre *</span><input type="text" formControlName="title" /></label>
        @if (editingExhibitionSlug()) {
          <label class="readonly-row"><span>Slug</span><input type="text" formControlName="slug" readonly /></label>
        }
        <label><span>Lieu</span><input type="text" formControlName="venue" /></label>
        <div class="row-2">
          <label><span>Ville</span><input type="text" formControlName="city" /></label>
          <label><span>Pays</span><input type="text" formControlName="country" /></label>
        </div>
        <div class="row-2">
          <label><span>Date de début *</span><input type="date" formControlName="startDate" /></label>
          <label><span>Date de fin *</span><input type="date" formControlName="endDate" /></label>
        </div>
        <label><span>Commissaire</span><input type="text" formControlName="curator" /></label>

        <label><span>Image principale (URL)</span><input type="url" formControlName="coverImage" /></label>

        <app-gallery-editor
          [images]="exhibitionGallery()"
          (imagesChange)="exhibitionGallery.set($event)" />

        <label>
          <span>Tags</span>
          <div class="chips-input">
            @for (t of exhibitionTags(); track t) {
              <span class="chip">{{ t }}<button type="button" class="chip-remove" (click)="removeExhibitionTag(t)" aria-label="Retirer">×</button></span>
            }
            <input
              type="text"
              [ngModel]="newExhibitionTag()"
              (ngModelChange)="newExhibitionTag.set($event)"
              [ngModelOptions]="{ standalone: true }"
              (keydown.enter)="addExhibitionTag($event)"
              (keydown.backspace)="onTagBackspace($event)"
              placeholder="Ajouter un tag puis Entrée"
              class="chip-input-field" />
          </div>
        </label>
        <label><span>Description courte</span><textarea rows="2" formControlName="shortDescription"></textarea></label>
        <label><span>Description longue</span><textarea rows="5" formControlName="description"></textarea></label>

        @if (editingExhibitionId(); as ownerId) {
          <app-slides-editor kind="exhibition" [ownerId]="ownerId" [ownerSlug]="editingExhibitionSlug()" />
        } @else {
          <p class="slides-hint">Enregistre l'exposition une première fois pour pouvoir éditer ses slides.</p>
        }

        <div class="actions">
          <button type="submit" class="btn-primary" [disabled]="exhibitionForm.invalid || saving()">
            {{ saving() ? 'Enregistrement…' : (editingExhibitionSlug() ? 'Mettre à jour' : 'Créer') }}
          </button>
          @if (editingExhibitionSlug()) {
            <button type="button" class="btn-link" (click)="newExhibition()">Annuler</button>
          }
        </div>
      </form>
    </div>

    <section class="meta-section">
      <h2>Position sur la home</h2>
      <p class="hint">Glisse pour réordonner. Décoche pour masquer une exposition du bandeau (la fiche reste accessible via son URL).</p>
      @if (exhibitionsMeta(); as rows) {
        <ul class="exh-list" appReorderable (reordered)="onExhibitionMetaReorder($event)">
          @for (r of rows; track r.slug) {
            <li class="home-row">
              <span class="handle">⠿</span>
              <img [src]="r.cover" [alt]="r.title" class="thumb-round" />
              <span class="title">{{ r.title }}</span>
              <label class="incl">
                <input type="checkbox" [checked]="r.visible" (change)="toggleExhibitionVisibility(r, $event)" /> Visible
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
    .list li.selected { background: rgba(139, 111, 71, 0.08); }
    .row { flex: 1; text-align: left; background: transparent; border: 0; padding: 14px 20px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
    .row:hover { background: var(--color-bg-alt); }
    .row-title { color: var(--color-ink); font-size: 0.95rem; }
    .row-meta { font-size: 0.75rem; color: var(--color-mute); letter-spacing: 0.06em; text-transform: uppercase; }
    .row-del { background: transparent; border: 0; padding: 0 16px; color: var(--color-mute); font-size: 1.5rem; cursor: pointer; line-height: 1; }
    .form { display: flex; flex-direction: column; gap: 20px; padding: 32px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .form h2 { margin: 0; font-size: 1.5rem; }
    .form-head { display: flex; align-items: baseline; justify-content: space-between; }
    .view-link { font-size: 0.85rem; color: var(--color-accent); text-decoration: none; }
    .form label { display: flex; flex-direction: column; gap: 6px; }
    .form label > span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .form input, .form textarea { font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); resize: vertical; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .readonly-row input { background: var(--color-bg-alt); color: var(--color-mute); }
    .actions { display: flex; gap: 16px; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-link { background: transparent; border: 0; color: var(--color-accent); cursor: pointer; font-size: 0.85rem; }
    .slides-hint { padding: 12px 16px; background: var(--color-bg-alt); border-left: 3px solid var(--color-mute); font-size: 0.85rem; color: var(--color-ink-soft); font-style: italic; }

    .chips-input { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: var(--color-bg-alt); font-size: 0.8rem; }
    .chip-remove { background: transparent; border: 0; color: var(--color-mute); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0; }
    .chip-input-field { flex: 1; min-width: 120px; border: 0; padding: 4px; background: transparent; }
    .chip-input-field:focus { outline: none; }

    .meta-section { margin-top: 64px; }
    .meta-section h2 { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; margin: 0 0 8px; }
    .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .exh-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; }
    .home-row .thumb-round { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
    .status { color: var(--color-mute); }
    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class ExpositionsComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly loadingExhibitions = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly editingExhibitionId = signal<string | null>(null);
  protected readonly exhibitionGallery = signal<string[]>([]);
  protected readonly exhibitionTags = signal<string[]>([]);
  protected readonly newExhibitionTag = signal('');
  protected readonly exhibitionsMeta = signal<ExhibitionMetaRow[] | null>(null);

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
    shortDescription: [''],
    description: [''],
  });

  constructor() {
    this.refreshExhibitions();
    this.refreshExhibitionsMeta();
    this.route.queryParamMap.subscribe(params => {
      if (params.get('new') === '1') this.newExhibition();
    });
  }

  private refreshExhibitions(): void {
    this.loadingExhibitions.set(true);
    this.portfolio.getAllExhibitions().subscribe({
      next: data => { this.exhibitions.set(data); this.loadingExhibitions.set(false); },
      error: () => { this.loadingExhibitions.set(false); this.toast.error('Impossible de charger les expositions.'); }
    });
  }

  private refreshExhibitionsMeta(): void {
    forkJoin([
      this.portfolio.getAllExhibitions(),
      this.portfolio.getAdminExhibitionsMeta(),
    ]).subscribe(([expos, metas]) => {
      const byMeta = new Map(metas.map(m => [m.slug, m]));
      const rows: ExhibitionMetaRow[] = expos
        .map(e => {
          const m = byMeta.get(e.slug);
          if (!m) return null;
          return { slug: e.slug, title: e.title, cover: e.coverImage, position: m.position, visible: m.visible };
        })
        .filter((r): r is ExhibitionMetaRow => r !== null)
        .sort((a, b) => a.position - b.position);
      this.exhibitionsMeta.set(rows);
    });
  }

  newExhibition(): void {
    this.editingExhibitionSlug.set(null);
    this.editingExhibitionId.set(null);
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '',
      shortDescription: '', description: '',
    });
    this.exhibitionGallery.set([]);
    this.exhibitionTags.set([]);
    this.newExhibitionTag.set('');
  }

  loadExhibition(item: Exhibition): void {
    this.editingExhibitionSlug.set(item.slug);
    this.editingExhibitionId.set(item.id ?? null);
    this.exhibitionForm.reset({
      title: item.title, slug: item.slug, venue: item.venue ?? '', city: item.city ?? '', country: item.country ?? '',
      startDate: item.startDate ?? '', endDate: item.endDate ?? '', curator: item.curator ?? '',
      coverImage: item.coverImage ?? '', shortDescription: item.shortDescription ?? '', description: item.description ?? '',
    });
    this.exhibitionGallery.set([...(item.gallery ?? [])]);
    this.exhibitionTags.set([...(item.tags ?? [])]);
    this.newExhibitionTag.set('');
  }

  addExhibitionTag(event: Event): void {
    event.preventDefault();
    const value = this.newExhibitionTag().trim();
    if (!value) return;
    const current = this.exhibitionTags();
    if (current.includes(value)) {
      this.newExhibitionTag.set('');
      return;
    }
    this.exhibitionTags.set([...current, value]);
    this.newExhibitionTag.set('');
  }

  removeExhibitionTag(tag: string): void {
    this.exhibitionTags.update(tags => tags.filter(t => t !== tag));
  }

  onTagBackspace(event: Event): void {
    if (this.newExhibitionTag() !== '') return;
    event.preventDefault();
    this.exhibitionTags.update(tags => tags.slice(0, -1));
  }

  saveExhibition(): void {
    if (this.exhibitionForm.invalid) return;
    const v = this.exhibitionForm.getRawValue();
    const slug = this.editingExhibitionSlug();
    const existing = slug ? this.exhibitions().find(e => e.slug === slug) : null;
    const payload: Partial<Exhibition> = {
      title: v.title!, slug: v.slug || undefined,
      venue: v.venue ?? '', city: v.city ?? '', country: v.country ?? '',
      startDate: v.startDate!, endDate: v.endDate!,
      curator: v.curator ?? '', coverImage: v.coverImage ?? '',
      gallery: [...this.exhibitionGallery()],
      tags: [...this.exhibitionTags()],
      shortDescription: v.shortDescription ?? '', description: v.description ?? '',
      featured: existing?.featured ?? false,
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateExhibition(slug, payload)
      : this.portfolio.createExhibition(payload);
    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(slug ? 'Exposition mise à jour.' : 'Exposition créée.');
        this.refreshExhibitions();
        this.refreshExhibitionsMeta();
        this.newExhibition();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erreur lors de l\'enregistrement.');
      }
    });
  }

  removeExhibition(item: Exhibition): void {
    if (!confirm(`Supprimer l'exposition "${item.title}" ?`)) return;
    this.portfolio.deleteExhibition(item.slug).subscribe({
      next: () => {
        this.toast.success('Exposition supprimée.');
        if (this.editingExhibitionSlug() === item.slug) this.newExhibition();
        this.refreshExhibitions();
        this.refreshExhibitionsMeta();
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }

  onExhibitionMetaReorder(order: number[]): void {
    const current = this.exhibitionsMeta();
    if (!current) return;
    this.exhibitionsMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
    this.persistExhibitionsMeta();
  }

  toggleExhibitionVisibility(row: ExhibitionMetaRow, event: Event): void {
    const visible = (event.target as HTMLInputElement).checked;
    this.exhibitionsMeta.update(rows => rows?.map(x => x.slug === row.slug ? { ...x, visible } : x) ?? null);
    this.persistExhibitionsMeta();
  }

  private persistExhibitionsMeta(): void {
    const rows = this.exhibitionsMeta() ?? [];
    const requests = rows.map(r => this.portfolio.updateAdminExhibitionMeta(r.slug, {
      slug: r.slug, position: r.position, visible: r.visible,
    } as AdminExhibitionMetaView));
    if (requests.length === 0) return;
    forkJoin(requests).subscribe({
      next: () => this.toast.success('Expositions enregistrées.'),
      error: () => this.toast.error('Impossible d\'enregistrer les expositions.'),
    });
  }
}
