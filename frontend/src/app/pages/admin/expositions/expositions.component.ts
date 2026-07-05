import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Exhibition } from '../../../models/exhibition.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { TagInputComponent } from '../shared/tag-input.component';
import { ToastService } from '../shared/toast.service';
import { GalleryItem } from '../../../models/gallery-item.model';
import { Crop } from '../../../models/crop.model';
import { ExhibitionPreviewComponent } from './preview/exhibition-preview.component';
import { AdminPreviewShellComponent, ShellPreviewDirective } from '../shared/admin-preview-shell.component';
import { confirmIfDirty, createFieldFocus, createGalleryPreviewHandlers, createTextFieldEditHandler, createUndoHistory } from '../shared/preview-page-helpers';
import { EditableExhibitionField } from '../../../components/exhibition-detail-view/exhibition-detail-view.component';

@Component({
  selector: 'app-expositions',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ReorderableDirective, GalleryEditorComponent, ImageFieldComponent, TagInputComponent, ExhibitionPreviewComponent, AdminPreviewShellComponent, ShellPreviewDirective],
  template: `
    <div class="grid-admin">
      <aside class="list" [attr.inert]="previewFullscreenActive() ? '' : null">
        <div class="list-head">
          <h2>Expositions existantes</h2>
          <button type="button" class="btn-link" (click)="onNewExhibition()">+ Nouvelle exposition</button>
        </div>
        @if (loadingExhibitions()) {
          <p class="status">Chargement…</p>
        } @else if (exhibitions().length === 0) {
          <p class="status">Aucune exposition.</p>
        } @else {
          <ul>
            @for (item of exhibitions(); track item.id) {
              <li [class.selected]="editingExhibitionSlug() === item.slug">
                <button type="button" class="row" (click)="onSelectExhibition(item)">
                  <span class="row-title">{{ item.title }}</span>
                  <span class="row-meta">{{ item.venue }} · {{ item.city }}</span>
                </button>
                <button type="button" class="row-del" (click)="removeExhibition(item)" aria-label="Supprimer">×</button>
              </li>
            }
          </ul>
        }
      </aside>

      <app-admin-preview-shell
        [active]="previewActive()"
        [(viewMode)]="expoViewMode"
        [startFullscreen]="wantFullscreen()"
        modeBarAriaLabel="Mode d'édition de l'exposition"
        formTabLabel="✏ Modifier l'exposition"
        previewDialogLabel="Aperçu de l’exposition"
        [showSave]="true"
        [saveDisabled]="exhibitionForm.invalid"
        [saving]="saving()"
        [formModalOpen]="coverField.modalOpen() || galleryEditor.modalOpen()"
        (save)="saveExhibition()"
        (fullscreenChange)="previewFullscreenActive.set($event)"
        [historyEnabled]="true"
        [canUndo]="history.canUndo()"
        [canRedo]="history.canRedo()"
        (undoRequested)="history.undo()"
        (redoRequested)="history.redo()">
        <form class="form" [formGroup]="exhibitionForm" (ngSubmit)="saveExhibition()">
          <div class="form-head">
            <h2>{{ editingExhibitionSlug() ? 'Modifier l\'exposition' : 'Nouvelle exposition' }}</h2>
            @if (editingExhibitionSlug(); as s) {
              <a class="view-link" [href]="'/expositions/' + s" target="_blank" rel="noopener">Voir sur le site ↗</a>
            }
          </div>

          <label><span>Titre *</span><input type="text" id="field-title" formControlName="title" /></label>
          @if (editingExhibitionSlug()) {
            <label class="readonly-row"><span>Slug</span><input type="text" formControlName="slug" readonly /></label>
          }
          <label><span>Lieu</span><input type="text" id="field-venue" formControlName="venue" /></label>
          <div class="row-2">
            <label><span>Ville</span><input type="text" id="field-city" formControlName="city" /></label>
            <label><span>Pays</span><input type="text" id="field-country" formControlName="country" /></label>
          </div>
          <div class="row-2">
            <label><span>Date de début *</span><input type="date" id="field-startDate" formControlName="startDate" /></label>
            <label><span>Date de fin *</span><input type="date" id="field-endDate" formControlName="endDate" /></label>
          </div>
          <label><span>Commissaire</span><input type="text" id="field-curator" formControlName="curator" /></label>

          <app-image-field
            #coverField
            formControlName="coverImage"
            label="Image principale (URL)"
            [cropEnabled]="true"
            [cropValue]="exhibitionForm.get('coverCrop')?.value"
            (cropChange)="onCoverCropChange($event)" />

          <app-gallery-editor
            #galleryEditor
            [images]="exhibitionGallery()"
            (imagesChange)="history.record(); exhibitionGallery.set($event); exhibitionForm.markAsDirty()" />

          <label>
            <span>Tags</span>
            <app-tag-input formControlName="tags" [suggestions]="allTags()" />
          </label>
          <label><span>Description courte</span><textarea rows="2" id="field-shortDescription" formControlName="shortDescription"></textarea></label>
          <label><span>Description longue</span><textarea rows="5" id="field-description" formControlName="description"></textarea></label>

          @if (editingExhibitionId(); as eid) {
            <section class="stories-block">
              <header class="stories-head">
                <h3>Stories</h3>
              </header>
              <p class="stories-hint">Les stories de cette exposition se gèrent désormais sur la page dédiée.</p>
              <a class="btn-link" routerLink="/admin/stories" [queryParams]="{ ownerKind: 'exhibition', ownerId: eid }">Gérer les stories →</a>
            </section>
          } @else {
            <p class="slides-hint">Enregistre l'exposition une première fois pour pouvoir gérer ses stories.</p>
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
        <ng-template shellPreview>
          <app-exhibition-preview
            [form]="exhibitionForm"
            [gallery]="exhibitionGallery.asReadonly()"
            [tagSuggestions]="allTags()"
            (tagsChange)="onPreviewTagsChange($event)"
            (coverEdit)="onPreviewCoverEdit($event)"
            (galleryItemEdit)="onPreviewGalleryItemEdit($event)"
            (galleryReorder)="onPreviewGalleryReorder($event)"
            (galleryAdd)="onPreviewGalleryAdd()"
            (galleryItemResize)="onPreviewGalleryItemResize($event)"
            (textFieldClick)="focusField($event)"
            (textFieldEdit)="onPreviewTextFieldEdit($event)"
            (dateFieldEdit)="onPreviewDateFieldEdit($event)"
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
    .stories-block { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--color-line); background: var(--color-bg-alt); }
    .stories-head { display: flex; align-items: center; justify-content: space-between; }
    .stories-head h3 { margin: 0; font-size: 1rem; letter-spacing: 0.04em; }
    .stories-hint { margin: 0; color: var(--color-mute); font-size: 0.85rem; font-style: italic; }
    .form label.checkbox { flex-direction: row; align-items: center; gap: 10px; }
    .form label.checkbox > span { text-transform: none; letter-spacing: normal; font-size: 0.9rem; color: var(--color-ink); }
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
  private readonly announcer = inject(LiveAnnouncer);

  @ViewChild('coverField') coverImageField?: ImageFieldComponent;
  @ViewChild('galleryEditor') galleryEditor?: GalleryEditorComponent;

  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly loadingExhibitions = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly editingExhibitionId = signal<string | null>(null);
  readonly exhibitionGallery = signal<GalleryItem[]>([]);
  protected readonly allTags = signal<string[]>([]);

  protected readonly creatingExhibition = signal(false);
  protected readonly expoViewMode = signal<'form' | 'preview'>('form');
  /** Passe à true via ?preview=full (lien "Ouvrir la fiche") → ouvre l'aperçu plein écran. */
  protected readonly wantFullscreen = signal(false);
  /** Reflète le plein écran du shell — rend la liste latérale inert (neutralisation aria-modal). */
  protected readonly previewFullscreenActive = signal(false);

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
    coverCrop: this.fb.control<Crop | null>(null),
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
  private static readonly FOCUSABLE_FIELDS = new Set<EditableExhibitionField | 'startDate' | 'endDate'>([
    'title', 'venue', 'city', 'country', 'startDate', 'endDate',
    'curator', 'shortDescription', 'description',
  ]);
  private static readonly DATE_FIELDS = new Set<'startDate' | 'endDate'>(['startDate', 'endDate']);

  protected readonly previewActive = computed(() =>
    this.editingExhibitionSlug() !== null || this.editingExhibitionId() !== null || this.creatingExhibition()
  );

  protected readonly focusField = createFieldFocus(ExpositionsComponent.FOCUSABLE_FIELDS);
  protected readonly onPreviewTextFieldEdit = createTextFieldEditHandler(this.exhibitionForm, ExpositionsComponent.FOCUSABLE_FIELDS, { onBeforeMutate: () => this.history.record() });
  protected readonly onPreviewDateFieldEdit = createTextFieldEditHandler(this.exhibitionForm, ExpositionsComponent.DATE_FIELDS, { onBeforeMutate: () => this.history.record() });

  private readonly galleryHandlers = createGalleryPreviewHandlers({
    gallery: this.exhibitionGallery,
    galleryEditor: () => this.galleryEditor,
    coverField: () => this.coverImageField,
    onMutate: () => this.exhibitionForm.markAsDirty(),
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
    this.exhibitionForm.patchValue({ tags });
    this.exhibitionForm.markAsDirty();
  }

  /**
   * Edition in-preview de la vidéo : <app-video-field> a déjà uploadé le
   * fichier et émet l'URL (ou null au retrait). On reporte dans le form (qui
   * alimente le preview et le payload de saveExhibition) — même flux que
   * cover/galerie/tags. La persistance se fait au save de l'exposition.
   */
  protected onPreviewVideoChange(field: 'videoId' | 'videoPoster' | 'videoCaptions', value: string | null): void {
    this.history.record();
    this.exhibitionForm.patchValue({ [field]: value });
    this.exhibitionForm.markAsDirty();
  }

  /**
   * Historique undo/redo des opérations WYSIWYG (snapshots form + galerie).
   * Le snapshot aliase par référence les valeurs structurées du form (tags,
   * coverCrop) et les items de galerie : sûr tant que ces valeurs sont
   * remplacées immutablement (jamais mutées in-place) — convention respectée
   * partout dans le projet.
   */
  readonly history = createUndoHistory({
    capture: () => ({ form: this.exhibitionForm.getRawValue(), gallery: [...this.exhibitionGallery()] }),
    restore: s => {
      this.exhibitionForm.patchValue(s.form);
      this.exhibitionGallery.set(s.gallery);
      this.exhibitionForm.markAsDirty();
    },
    announcer: this.announcer,
  });

  constructor() {
    this.refreshExhibitions();
    this.portfolio.getAllTags().subscribe(t => this.allTags.set(t));
    this.route.queryParamMap.subscribe(params => {
      if (params.get('preview') === 'full') this.wantFullscreen.set(true);
      if (params.get('new') === '1') { this.newExhibition(); return; }
      const slug = params.get('slug');
      if (slug) { this.pendingSlug = slug; this.trySelectPendingSlug(); }
    });
  }

  /** Slug a selectionner via deep-link (?slug=), consomme une fois la liste chargee. */
  private pendingSlug: string | null = null;

  private trySelectPendingSlug(): void {
    const slug = this.pendingSlug;
    if (!slug) return;
    const item = this.exhibitions().find(e => e.slug === slug);
    if (item) { this.pendingSlug = null; this.loadExhibition(item); }
  }

  /** Message du garde-fou perte de saisie. */
  private static readonly DIRTY_MESSAGE = 'Des modifications ne sont pas enregistrées. Continuer sans enregistrer ?';

  /** Wrapper UI gardé — le template l'appelle ; les flux internes appellent loadExhibition directement. */
  protected onSelectExhibition(item: Exhibition): void {
    if (!confirmIfDirty(this.exhibitionForm, ExpositionsComponent.DIRTY_MESSAGE)) return;
    this.loadExhibition(item);
  }

  /** Wrapper UI gardé — idem pour « + Nouvelle exposition ». */
  protected onNewExhibition(): void {
    if (!confirmIfDirty(this.exhibitionForm, ExpositionsComponent.DIRTY_MESSAGE)) return;
    this.newExhibition();
  }

  private refreshExhibitions(): void {
    this.loadingExhibitions.set(true);
    this.portfolio.getAllExhibitions().subscribe({
      next: data => { this.exhibitions.set(data); this.loadingExhibitions.set(false); },
      error: () => { this.loadingExhibitions.set(false); this.toast.error('Impossible de charger les expositions.'); }
    });
  }

  newExhibition(): void {
    this.history.clear();
    this.editingExhibitionSlug.set(null);
    this.editingExhibitionId.set(null);
    this.creatingExhibition.set(true);
    this.expoViewMode.set('form');
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '', coverCrop: null,
      shortDescription: '', description: '',
      showStoryLink: true,
      showStoryButton: true,
      tags: [],
      videoId: null,
      videoPoster: null,
      videoCaptions: null,
    });
    this.exhibitionGallery.set([]);
  }

  loadExhibition(item: Exhibition): void {
    this.history.clear();
    this.editingExhibitionSlug.set(item.slug);
    this.editingExhibitionId.set(item.id ?? null);
    this.creatingExhibition.set(false);
    // Selection d'une expo existante -> ouvre l'onglet Apercu (edition via l'onglet Modifier).
    this.expoViewMode.set('preview');
    this.exhibitionForm.reset({
      title: item.title, slug: item.slug, venue: item.venue ?? '', city: item.city ?? '', country: item.country ?? '',
      startDate: item.startDate ?? '', endDate: item.endDate ?? '', curator: item.curator ?? '',
      coverImage: item.coverImage ?? '', coverCrop: item.coverCrop ?? null,
      shortDescription: item.shortDescription ?? '', description: item.description ?? '',
      showStoryLink: item.showStoryLink ?? true,
      showStoryButton: item.showStoryButton ?? true,
      tags: item.tags ?? [],
      videoId: item.videoId ?? null,
      videoPoster: item.videoPoster ?? null,
      videoCaptions: item.videoCaptions ?? null,
    });
    this.exhibitionGallery.set([...(item.gallery ?? [])]);
  }

  protected onCoverCropChange(crop: Crop | null): void {
    const current = this.exhibitionForm.getRawValue().coverCrop ?? null;
    if (JSON.stringify(crop ?? null) === JSON.stringify(current)) return;
    this.history.record();
    this.exhibitionForm.patchValue({ coverCrop: crop });
    this.exhibitionForm.markAsDirty();
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
      curator: v.curator ?? '', coverImage: v.coverImage ?? '', coverCrop: v.coverCrop ?? null,
      gallery: [...this.exhibitionGallery()],
      tags: v.tags ?? [],
      shortDescription: v.shortDescription ?? '', description: v.description ?? '',
      featured: existing?.featured ?? false,
      showStoryLink: v.showStoryLink ?? true,
      showStoryButton: v.showStoryButton ?? true,
      videoId: v.videoId ?? null,
      videoPoster: v.videoPoster ?? null,
      videoCaptions: v.videoCaptions ?? null,
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateExhibition(slug, payload)
      : this.portfolio.createExhibition(payload);
    op$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(slug ? 'Exposition mise à jour.' : 'Exposition créée.');
        // L'état sauvegardé devient la référence : le garde-fou dirty
        // ne doit pas se déclencher sur le reload post-save.
        this.exhibitionForm.markAsPristine();
        this.refreshExhibitions();
        // Reste sur la fiche après save : recharge depuis la réponse serveur
        // (préserve form + preview, slug/id à jour pour les opérations suivantes)
        if (saved) {
          this.loadExhibition(saved);
        }
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
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }
}
