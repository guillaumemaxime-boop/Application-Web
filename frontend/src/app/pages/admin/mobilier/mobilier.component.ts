import { Component, ViewChild, inject, signal, computed } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Furniture } from '../../../models/furniture.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { TagInputComponent } from '../shared/tag-input.component';
import { ToastService } from '../shared/toast.service';
import { GalleryItem } from '../../../models/gallery-item.model';
import { Crop } from '../../../models/crop.model';
import { FurniturePreviewComponent } from './preview/furniture-preview.component';
import { AdminPreviewShellComponent, ShellPreviewDirective } from '../shared/admin-preview-shell.component';
import { confirmIfDirty, createFieldFocus, createGalleryPreviewHandlers, createTextFieldEditHandler, createUndoHistory } from '../shared/preview-page-helpers';
import { EditableTextField } from '../../../components/furniture-detail-view/furniture-detail-view.component';

@Component({
  selector: 'app-mobilier',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ReorderableDirective, GalleryEditorComponent, ImageFieldComponent, TagInputComponent, FurniturePreviewComponent, AdminPreviewShellComponent, ShellPreviewDirective],
  template: `
    <div class="grid-admin">
      <aside class="list" [attr.inert]="previewFullscreenActive() ? '' : null">
        <div class="list-head">
          <h2>Pièces existantes</h2>
          <button type="button" class="btn-link" (click)="onNewFurniture()">+ Nouvelle pièce</button>
        </div>
        @if (loadingFurniture()) {
          <p class="status">Chargement…</p>
        } @else if (furniture().length === 0) {
          <p class="status">Aucune pièce.</p>
        } @else {
          <ul>
            @for (item of furniture(); track item.id) {
              <li [class.selected]="editingFurnitureSlug() === item.slug">
                <button type="button" class="row" (click)="onSelectFurniture(item)">
                  <span class="row-title">{{ item.title }}</span>
                  <span class="row-meta">{{ item.category }} · {{ item.year }}</span>
                </button>
                <button type="button" class="row-del" (click)="removeFurniture(item)" aria-label="Supprimer">×</button>
              </li>
            }
          </ul>
        }
      </aside>

      <app-admin-preview-shell
        [active]="previewActive()"
        [(viewMode)]="mobilierViewMode"
        [startFullscreen]="wantFullscreen()"
        modeBarAriaLabel="Mode d'édition de la pièce"
        formTabLabel="✏ Modifier la pièce"
        previewDialogLabel="Aperçu de la fiche"
        [showSave]="true"
        [saveDisabled]="furnitureForm.invalid"
        [saving]="saving()"
        [hidePreviewOnMobile]="true"
        [formModalOpen]="coverField.modalOpen() || galleryEditor.modalOpen()"
        (save)="saveFurniture()"
        (fullscreenChange)="previewFullscreenActive.set($event)"
        [historyEnabled]="true"
        [canUndo]="history.canUndo()"
        [canRedo]="history.canRedo()"
        (undoRequested)="history.undo()"
        (redoRequested)="history.redo()">
        <form class="form" [formGroup]="furnitureForm" (ngSubmit)="saveFurniture()">
          <div class="form-head">
            <h2>{{ editingFurnitureSlug() ? 'Modifier la pièce' : 'Nouvelle pièce' }}</h2>
            @if (editingFurnitureSlug(); as s) {
              <a class="view-link" [href]="'/mobilier/' + s" target="_blank" rel="noopener" title="Voir sur le site">Voir sur le site ↗</a>
            }
          </div>

          <label>
            <span>Titre *</span>
            <input type="text" id="field-title" formControlName="title" />
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
              <input type="text" id="field-category" formControlName="category" placeholder="Sièges, Tables…" />
            </label>
            <label>
              <span>Année</span>
              <input type="number" inputmode="numeric" formControlName="year" />
            </label>
          </div>
          <label>
            <span>Matériaux</span>
            <input type="text" id="field-material" formControlName="material" />
          </label>
          <label>
            <span>Designer</span>
            <input type="text" formControlName="designer" />
          </label>

          <app-image-field
            #coverField
            formControlName="coverImage"
            label="Image principale (URL)"
            [cropEnabled]="true"
            [cropValue]="furnitureForm.get('coverCrop')?.value"
            (cropChange)="onCoverCropChange($event)" />

          <label>
            <span>Tags</span>
            <app-tag-input formControlName="tags" [suggestions]="allTags()" />
          </label>

          <app-gallery-editor
            #galleryEditor
            [images]="furnitureGallery()"
            (imagesChange)="history.record(); furnitureGallery.set($event); furnitureForm.markAsDirty()" />

          <fieldset class="dim-fieldset">
            <legend>Dimensions</legend>
            <div class="dim-grid">
              <label class="dim-cell">
                <span>Largeur (cm)</span>
                <input type="number" inputmode="decimal" step="0.1" min="0" formControlName="dimW" placeholder="—" />
              </label>
              <label class="dim-cell">
                <span>Profondeur (cm)</span>
                <input type="number" inputmode="decimal" step="0.1" min="0" formControlName="dimD" placeholder="—" />
              </label>
              <label class="dim-cell">
                <span>Hauteur (cm)</span>
                <input type="number" inputmode="decimal" step="0.1" min="0" formControlName="dimH" placeholder="—" />
              </label>
            </div>
            <label class="dim-notes">
              <span>Autres dimensions (une par ligne)</span>
              <textarea rows="2" formControlName="dimNotes" placeholder="Ex. : Diamètre assise 45 cm"></textarea>
            </label>
          </fieldset>
          <label>
            <span>Description courte</span>
            <textarea rows="2" id="field-shortDescription" formControlName="shortDescription"></textarea>
          </label>
          <label>
            <span>Description longue</span>
            <textarea rows="5" id="field-description" formControlName="description"></textarea>
          </label>

          @if (editingFurnitureId(); as fid) {
            <section class="stories-block">
              <header class="stories-head">
                <h3>Stories</h3>
              </header>
              <p class="stories-hint">Les stories de cette pièce se gèrent désormais sur la page dédiée.</p>
              <a class="btn-link" routerLink="/admin/stories" [queryParams]="{ ownerKind: 'furniture', ownerId: fid }">Gérer les stories →</a>
            </section>
          } @else {
            <p class="slides-hint">Enregistre la pièce une première fois pour pouvoir gérer ses stories.</p>
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
        <ng-template shellPreview>
          <app-furniture-preview
            [form]="furnitureForm"
            [gallery]="furnitureGallery.asReadonly()"
            [tagSuggestions]="allTags()"
            (tagsChange)="onPreviewTagsChange($event)"
            (coverEdit)="onPreviewCoverEdit($event)"
            (galleryItemEdit)="onPreviewGalleryItemEdit($event)"
            (galleryReorder)="onPreviewGalleryReorder($event)"
            (galleryAdd)="onPreviewGalleryAdd()"
            (textFieldClick)="focusField($event)"
            (textFieldEdit)="onPreviewTextFieldEdit($event)"
            (galleryItemResize)="onPreviewGalleryItemResize($event)"
            (videoIdChange)="onPreviewVideoChange('videoId', $event)"
            (videoPosterChange)="onPreviewVideoChange('videoPoster', $event)"
            (videoCaptionsChange)="onPreviewVideoChange('videoCaptions', $event)" />
        </ng-template>
      </app-admin-preview-shell>
    </div>
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
    .form input:focus-visible, .form textarea:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
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
    .stories-block { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--color-line); background: var(--color-bg-alt); }
    .stories-head { display: flex; align-items: center; justify-content: space-between; }
    .stories-head h3 { margin: 0; font-size: 1rem; letter-spacing: 0.04em; }
    .stories-hint { margin: 0; color: var(--color-mute); font-size: 0.85rem; font-style: italic; }
    .form label.checkbox { flex-direction: row; align-items: center; gap: 10px; }
    .form label.checkbox > span { text-transform: none; letter-spacing: normal; font-size: 0.9rem; color: var(--color-ink); }

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
  private readonly announcer = inject(LiveAnnouncer);

  @ViewChild('coverField') coverImageField?: ImageFieldComponent;
  @ViewChild('galleryEditor') galleryEditor?: GalleryEditorComponent;

  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingFurnitureId = signal<string | null>(null);
  readonly furnitureGallery = signal<GalleryItem[]>([]);
  protected readonly allTags = signal<string[]>([]);

  protected readonly creatingFurniture = signal(false);
  protected readonly mobilierViewMode = signal<'form' | 'preview'>('form');
  /** Passe à true via ?preview=full (lien "Ouvrir la fiche") → ouvre l'aperçu plein écran. */
  protected readonly wantFullscreen = signal(false);
  /** Reflète le plein écran du shell — rend la liste latérale inert (neutralisation aria-modal). */
  protected readonly previewFullscreenActive = signal(false);

  protected readonly furnitureForm = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    category: ['', Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    material: [''],
    designer: ['Milo GUILLAUME Design'],
    coverImage: [''],
    coverCrop: this.fb.control<Crop | null>(null),
    dimW: [null as number | null],
    dimD: [null as number | null],
    dimH: [null as number | null],
    dimNotes: [''],
    shortDescription: [''],
    description: [''],
    showStoryLink: [true],
    showStoryButton: [true],
    tags: this.fb.control<string[]>([], { nonNullable: true }),
    videoId: this.fb.control<string | null>(null),
    videoPoster: this.fb.control<string | null>(null),
    videoCaptions: this.fb.control<string | null>(null),
  });

  // — Câblage preview WYSIWYG (shell + composables, voir preview-page-helpers) —
  // Les champs onPreview*/focusField préservent les noms historiques testés par la spec.

  /** Whitelist des champs admissibles depuis le preview (défense en profondeur). */
  private static readonly FOCUSABLE_FIELDS = new Set<EditableTextField>([
    'title', 'category', 'material', 'shortDescription', 'description',
  ]);

  protected readonly previewActive = computed(() =>
    this.editingFurnitureSlug() !== null || this.editingFurnitureId() !== null || this.creatingFurniture()
  );

  protected readonly focusField = createFieldFocus(MobilierComponent.FOCUSABLE_FIELDS);
  protected readonly onPreviewTextFieldEdit = createTextFieldEditHandler(
    this.furnitureForm,
    MobilierComponent.FOCUSABLE_FIELDS,
    { onBeforeMutate: () => this.history.record() },
  );

  private readonly galleryHandlers = createGalleryPreviewHandlers({
    gallery: this.furnitureGallery,
    galleryEditor: () => this.galleryEditor,
    coverField: () => this.coverImageField,
    onMutate: () => this.furnitureForm.markAsDirty(),
    announcer: this.announcer,
    onBeforeMutate: () => this.history.record(),
  });
  protected readonly onPreviewCoverEdit = this.galleryHandlers.onCoverEdit;
  protected readonly onPreviewGalleryItemEdit = this.galleryHandlers.onGalleryItemEdit;
  protected readonly onPreviewGalleryAdd = this.galleryHandlers.onGalleryAdd;
  protected readonly onPreviewGalleryReorder = this.galleryHandlers.onGalleryReorder;
  protected readonly onPreviewGalleryItemResize = this.galleryHandlers.onGalleryItemResize;

  protected onPreviewTagsChange(tags: string[]): void {
    this.history.record();
    this.furnitureForm.patchValue({ tags });
    this.furnitureForm.markAsDirty();
  }

  /**
   * Edition in-preview de la vidéo : <app-video-field> a déjà uploadé le
   * fichier et émet l'URL (ou null au retrait). On reporte dans le form (qui
   * alimente le preview et le payload de saveFurniture) — même flux que
   * cover/galerie/tags. La persistance se fait au save de la fiche.
   */
  protected onPreviewVideoChange(field: 'videoId' | 'videoPoster' | 'videoCaptions', value: string | null): void {
    this.history.record();
    this.furnitureForm.patchValue({ [field]: value });
    this.furnitureForm.markAsDirty();
  }

  /**
   * Historique undo/redo des opérations WYSIWYG (snapshots form + galerie).
   * Le snapshot aliase par référence les valeurs structurées du form (tags,
   * coverCrop) et les items de galerie : sûr tant que ces valeurs sont
   * remplacées immutablement (jamais mutées in-place) — convention respectée
   * partout dans le projet.
   */
  readonly history = createUndoHistory({
    capture: () => ({ form: this.furnitureForm.getRawValue(), gallery: [...this.furnitureGallery()] }),
    restore: s => {
      this.furnitureForm.patchValue(s.form);
      this.furnitureGallery.set(s.gallery);
      this.furnitureForm.markAsDirty();
    },
    announcer: this.announcer,
  });

  constructor() {
    this.refreshFurniture();
    this.portfolio.getAllTags().subscribe(t => this.allTags.set(t));
    this.route.queryParamMap.subscribe(params => {
      if (params.get('preview') === 'full') this.wantFullscreen.set(true);
      if (params.get('new') === '1') { this.newFurniture(); return; }
      const slug = params.get('slug');
      if (slug) { this.pendingSlug = slug; this.trySelectPendingSlug(); }
    });
  }

  /** Slug a selectionner via deep-link (?slug=), consomme une fois la liste chargee. */
  private pendingSlug: string | null = null;

  private trySelectPendingSlug(): void {
    const slug = this.pendingSlug;
    if (!slug) return;
    const item = this.furniture().find(f => f.slug === slug);
    if (item) { this.pendingSlug = null; this.loadFurniture(item); }
  }

  private refreshFurniture(): void {
    this.loadingFurniture.set(true);
    this.portfolio.getAllFurniture().subscribe({
      next: data => { this.furniture.set(data); this.loadingFurniture.set(false); this.trySelectPendingSlug(); },
      error: () => { this.loadingFurniture.set(false); this.toast.error('Impossible de charger les pièces.'); }
    });
  }

  /** Message du garde-fou perte de saisie. */
  private static readonly DIRTY_MESSAGE = 'Des modifications ne sont pas enregistrées. Continuer sans enregistrer ?';

  /** Wrapper UI gardé — le template l'appelle ; les flux internes appellent loadFurniture directement. */
  protected onSelectFurniture(item: Furniture): void {
    if (!confirmIfDirty(this.furnitureForm, MobilierComponent.DIRTY_MESSAGE)) return;
    this.loadFurniture(item);
  }

  /** Wrapper UI gardé — idem pour « + Nouvelle pièce ». */
  protected onNewFurniture(): void {
    if (!confirmIfDirty(this.furnitureForm, MobilierComponent.DIRTY_MESSAGE)) return;
    this.newFurniture();
  }

  newFurniture(): void {
    this.history.clear();
    this.editingFurnitureSlug.set(null);
    this.editingFurnitureId.set(null);
    this.creatingFurniture.set(true);
    this.mobilierViewMode.set('form');
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '', coverCrop: null,
      dimW: null, dimD: null, dimH: null, dimNotes: '',
      shortDescription: '', description: '',
      showStoryLink: true,
      showStoryButton: true,
      tags: [],
      videoId: null,
      videoPoster: null,
      videoCaptions: null,
    });
    this.furnitureGallery.set([]);
  }

  loadFurniture(item: Furniture): void {
    this.history.clear();
    this.editingFurnitureSlug.set(item.slug);
    this.editingFurnitureId.set(item.id ?? null);
    this.creatingFurniture.set(false);
    // Selection d'une piece existante -> ouvre l'onglet Apercu (edition via l'onglet Modifier).
    this.mobilierViewMode.set('preview');
    const dims = this.parseDimensions(item.dimensions ?? []);
    this.furnitureForm.reset({
      title: item.title, slug: item.slug, category: item.category, year: item.year,
      material: item.material ?? '', designer: item.designer ?? '', coverImage: item.coverImage ?? '', coverCrop: item.coverCrop ?? null,
      dimW: dims.w, dimD: dims.d, dimH: dims.h, dimNotes: dims.notes,
      shortDescription: item.shortDescription ?? '', description: item.description ?? '',
      showStoryLink: item.showStoryLink ?? true,
      showStoryButton: item.showStoryButton ?? true,
      tags: item.tags ?? [],
      videoId: item.videoId ?? null,
      videoPoster: item.videoPoster ?? null,
      videoCaptions: item.videoCaptions ?? null,
    });
    this.furnitureGallery.set([...(item.gallery ?? [])]);
  }

  protected onCoverCropChange(crop: Crop | null): void {
    const current = this.furnitureForm.getRawValue().coverCrop ?? null;
    if (JSON.stringify(crop ?? null) === JSON.stringify(current)) return;
    this.history.record();
    this.furnitureForm.patchValue({ coverCrop: crop });
    this.furnitureForm.markAsDirty();
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
      coverCrop: v.coverCrop ?? null,
      gallery: [...this.furnitureGallery()],
      dimensions: this.serializeDimensions(v.dimW ?? null, v.dimD ?? null, v.dimH ?? null, v.dimNotes ?? ''),
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      featured: existing?.featured ?? false,
      showStoryLink: v.showStoryLink ?? true,
      showStoryButton: v.showStoryButton ?? true,
      tags: v.tags ?? [],
      videoId: v.videoId ?? null,
      videoPoster: v.videoPoster ?? null,
      videoCaptions: v.videoCaptions ?? null,
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateFurniture(slug, payload)
      : this.portfolio.createFurniture(payload);
    op$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(slug ? 'Pièce mise à jour.' : 'Pièce créée.');
        // L'état sauvegardé devient la référence : le garde-fou dirty
        // ne doit pas se déclencher sur le reload post-save.
        this.furnitureForm.markAsPristine();
        this.refreshFurniture();
        // Reste sur la fiche après save : recharge depuis la réponse serveur
        // (préserve form + preview, slug/id à jour pour les opérations suivantes)
        if (saved) {
          this.loadFurniture(saved);
        }
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

}
