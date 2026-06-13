import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Exhibition } from '../../../models/exhibition.model';
import { Story } from '../../../models/story.model';
import { Slide } from '../../../models/slide.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { SlidesEditorComponent } from '../shared/slides-editor.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { TagInputComponent } from '../shared/tag-input.component';
import { ToastService } from '../shared/toast.service';
import { GalleryItem } from '../../../models/gallery-item.model';
import { Crop } from '../../../models/crop.model';
import { ExhibitionPreviewComponent } from './preview/exhibition-preview.component';
import { enrichSlides } from '../../../utils/display-slides';
import { AdminPreviewShellComponent, ShellPreviewDirective } from '../shared/admin-preview-shell.component';
import { confirmIfDirty, createFieldFocus, createGalleryPreviewHandlers, createTextFieldEditHandler, createUndoHistory, formTickSignal } from '../shared/preview-page-helpers';
import { EditableExhibitionField } from '../../../components/exhibition-detail-view/exhibition-detail-view.component';

@Component({
  selector: 'app-expositions',
  standalone: true,
  imports: [ReactiveFormsModule, ReorderableDirective, SlidesEditorComponent, GalleryEditorComponent, ImageFieldComponent, TagInputComponent, ExhibitionPreviewComponent, AdminPreviewShellComponent, ShellPreviewDirective, A11yModule],
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

          <label class="checkbox">
            <input type="checkbox" formControlName="showStoryLink" />
            <span>Afficher le lien en fin de story</span>
          </label>

          <label class="checkbox">
            <input type="checkbox" formControlName="showStoryButton" />
            <span>Afficher le bouton "Voir en plein écran" sur la fiche publique</span>
          </label>

          @if (editingExhibitionId()) {
            <section class="stories-block">
              <header class="stories-head">
                <h3>Stories</h3>
                <button type="button" class="btn-link" (click)="newStory()">+ Nouvelle story</button>
              </header>
              @if (currentStories().length === 0) {
                <p class="empty">Aucune story pour cette exposition.</p>
              }
              @for (story of currentStories(); track story.id; let i = $index) {
                <article class="story-item" [class.active]="editingStoryId() === story.id">
                  <img [src]="story.coverImage" alt="" class="story-cover" />
                  <span class="story-title">{{ story.title }}</span>
                  <div class="story-actions">
                    <button type="button" class="reorder-btn" (click)="moveStoryUp(story)" [disabled]="i === 0" aria-label="Monter la story">↑</button>
                    <button type="button" class="reorder-btn" (click)="moveStoryDown(story)" [disabled]="i === currentStories().length - 1" aria-label="Descendre la story">↓</button>
                    <button type="button" class="btn-mini" (click)="editStory(story)">Éditer slides</button>
                    <button type="button" class="btn-mini" (click)="openCoverEditor(story)">Cover</button>
                    <button type="button" class="btn-mini" (click)="renameStory(story)">Renommer</button>
                    <button type="button" class="btn-mini danger" (click)="deleteStory(story)">Supprimer</button>
                  </div>
                </article>
                @if (editingCoverStoryId() === story.id) {
                  <div class="cover-editor">
                    <app-image-field label="Image de couverture" [formControl]="coverEditCtrl"
                      [cropEnabled]="true"
                      [cropValue]="editingStoryCoverCrop()"
                      (cropChange)="onStoryCoverCropChange($event)" />
                    <div class="cover-editor-actions">
                      <button type="button" class="btn-mini" (click)="cancelCoverEdit()">Annuler</button>
                      <button type="button" class="btn-mini primary" (click)="saveCover(story)">Enregistrer</button>
                    </div>
                  </div>
                }
              }
            </section>
            @if (editingStoryId(); as sid) {
              <app-slides-editor [storyId]="sid" [ownerSlug]="editingExhibitionSlug()" />
            }
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
        <ng-template shellPreview>
          <app-exhibition-preview
            [form]="exhibitionForm"
            [gallery]="exhibitionGallery.asReadonly()"
            [story]="currentStories()[0] ?? null"
            [stories]="currentStories()"
            [activeStoryId]="activeStoryId()"
            [displaySlides]="previewDisplaySlides()"
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
            (storySelect)="onPreviewStorySelect($event)"
            (storyCreate)="onPreviewStoryCreate()"
            (storyRename)="onPreviewStoryRename($event)"
            (storyDelete)="onPreviewStoryDelete($event)"
            (storyMove)="onPreviewStoryMove($event)"
            (storyCoverEdit)="onPreviewStoryCoverEdit($event)"
            (storySlidesEdit)="onPreviewStorySlidesEdit($event)" />
        </ng-template>
      </app-admin-preview-shell>
    </div>

    @if (previewSlidesStoryId(); as sid) {
      <div class="slides-modal-overlay" role="dialog" aria-modal="true" aria-label="Éditer les slides de la story"
           cdkTrapFocus cdkTrapFocusAutoCapture (keydown.escape)="onPreviewSlidesModalClose()">
        <div class="slides-modal-panel">
          <header class="slides-modal-head">
            <h3>Éditer les slides</h3>
            <button type="button" (click)="onPreviewSlidesModalClose()" aria-label="Fermer">Fermer</button>
          </header>
          <app-slides-editor [storyId]="sid" [ownerSlug]="editingExhibitionSlug()" />
        </div>
      </div>
    }
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
    .stories-block .empty { margin: 0; color: var(--color-mute); font-size: 0.85rem; font-style: italic; }
    .cover-editor { padding: 12px; margin: 4px 0 12px 84px; background: var(--color-bg); border: 1px solid var(--color-line); display: flex; flex-direction: column; gap: 12px; }
    .cover-editor-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .btn-mini.primary { background: var(--color-ink); color: var(--color-bg); border-color: var(--color-ink); }
    .story-item { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: var(--color-bg); border: 1px solid var(--color-line); }
    .story-item.active { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent) inset; }
    .story-cover { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; border-radius: 50%; background: var(--color-bg-alt); }
    .story-title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .story-actions { display: flex; align-items: center; gap: 6px; }
    .btn-mini { background: transparent; border: 1px solid var(--color-line); color: var(--color-ink-soft); padding: 4px 10px; font-size: 0.75rem; cursor: pointer; letter-spacing: 0.04em; text-transform: uppercase; }
    .btn-mini:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .btn-mini.danger:hover { color: #b1532a; border-color: #b1532a; }
    .form label.checkbox { flex-direction: row; align-items: center; gap: 10px; }
    .form label.checkbox > span { text-transform: none; letter-spacing: normal; font-size: 0.9rem; color: var(--color-ink); }
    .reorder-btn { background: transparent; border: 1px solid var(--color-line); color: var(--color-ink-soft); width: 28px; height: 28px; padding: 0; cursor: pointer; font-size: 0.9rem; line-height: 1; }
    .reorder-btn:hover:not(:disabled) { color: var(--color-ink); border-color: var(--color-ink); }
    .reorder-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .status { color: var(--color-mute); }
    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
    .slides-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1300; display: flex; align-items: center; justify-content: center; }
    .slides-modal-panel { width: 92%; max-width: 920px; max-height: 86vh; overflow: auto; background: var(--color-bg); padding: 20px; border: 1px solid var(--color-ink); }
    .slides-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
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
  protected readonly currentStories = signal<Story[]>([]);
  protected readonly editingStoryId = signal<string | null>(null);
  protected readonly editingCoverStoryId = signal<string | null>(null);
  protected readonly coverEditCtrl = new FormControl('');
  protected readonly editingStoryCoverCrop = signal<Crop | null>(null);
  protected readonly activeStoryId = signal<string | null>(null);
  protected readonly activeStorySlides = signal<Slide[]>([]);
  protected readonly previewSlidesStoryId = signal<string | null>(null);

  protected readonly creatingExhibition = signal(false);
  protected readonly expoViewMode = signal<'form' | 'preview'>('form');
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

  private readonly _formTick = formTickSignal(this.exhibitionForm, inject(DestroyRef));

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

  private loadActiveStorySlides(id: string | null): void {
    if (!id) { this.activeStorySlides.set([]); return; }
    this.portfolio.getStorySlides(id).subscribe(slides => this.activeStorySlides.set(slides));
  }

  protected onPreviewStorySelect(id: string): void {
    this.activeStoryId.set(id);
    this.loadActiveStorySlides(id);
  }

  protected onPreviewStoryCreate(): void { this.newStory(); }

  protected onPreviewStoryRename(e: { id: string; title: string }): void {
    const story = this.currentStories().find(s => s.id === e.id);
    if (!story) return;
    this.portfolio.updateStory(story.id, {
      ownerKind: story.ownerKind, ownerId: story.ownerId,
      title: e.title, coverImage: story.coverImage,
    }).subscribe({
      next: updated => {
        this.currentStories.update(arr => arr.map(s => s.id === updated.id ? updated : s));
        this.toast.success('Story renommée.');
      },
      error: () => this.toast.error('Erreur lors du renommage de la story.'),
    });
  }

  protected onPreviewStoryDelete(id: string): void {
    const story = this.currentStories().find(s => s.id === id);
    if (story) this.deleteStory(story);
  }

  protected onPreviewStoryMove(e: { id: string; dir: 'up' | 'down' }): void {
    const story = this.currentStories().find(s => s.id === e.id);
    if (!story) return;
    if (e.dir === 'up') this.moveStoryUp(story); else this.moveStoryDown(story);
  }

  protected onPreviewStoryCoverEdit(id: string): void {
    const story = this.currentStories().find(s => s.id === id);
    if (story) this.openCoverEditor(story);
  }

  protected onPreviewStorySlidesEdit(id: string): void {
    this.activeStoryId.set(id);
    this.previewSlidesStoryId.set(id);
  }

  protected onPreviewSlidesModalClose(): void {
    const id = this.previewSlidesStoryId();
    this.previewSlidesStoryId.set(null);
    if (id) this.loadActiveStorySlides(id);
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

  protected readonly previewDisplaySlides = computed(() => {
    this._formTick(); // dépendance signal — force recompute sur valueChanges
    const stories = this.currentStories();
    const active = stories.find(s => s.id === this.activeStoryId()) ?? stories[0];
    if (!active) return [];
    const v = this.exhibitionForm.getRawValue();
    return enrichSlides({
      slug: v.slug ?? '',
      coverImage: v.coverImage ?? null,
      coverCrop: v.coverCrop ?? null,
      slides: this.activeStorySlides(),
      showStoryLink: v.showStoryLink ?? true,
    }, 'exhibition');
  });

  constructor() {
    this.refreshExhibitions();
    this.portfolio.getAllTags().subscribe(t => this.allTags.set(t));
    this.route.queryParamMap.subscribe(params => {
      if (params.get('new') === '1') this.newExhibition();
    });
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
    this.currentStories.set([]);
    this.editingStoryId.set(null);
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '', coverCrop: null,
      shortDescription: '', description: '',
      showStoryLink: true,
      showStoryButton: true,
      tags: [],
    });
    this.exhibitionGallery.set([]);
  }

  loadExhibition(item: Exhibition): void {
    this.history.clear();
    this.editingExhibitionSlug.set(item.slug);
    this.editingExhibitionId.set(item.id ?? null);
    this.creatingExhibition.set(false);
    this.expoViewMode.set('form');
    this.currentStories.set([]);
    this.editingStoryId.set(null);
    this.exhibitionForm.reset({
      title: item.title, slug: item.slug, venue: item.venue ?? '', city: item.city ?? '', country: item.country ?? '',
      startDate: item.startDate ?? '', endDate: item.endDate ?? '', curator: item.curator ?? '',
      coverImage: item.coverImage ?? '', coverCrop: item.coverCrop ?? null,
      shortDescription: item.shortDescription ?? '', description: item.description ?? '',
      showStoryLink: item.showStoryLink ?? true,
      showStoryButton: item.showStoryButton ?? true,
      tags: item.tags ?? [],
    });
    this.exhibitionGallery.set([...(item.gallery ?? [])]);
    if (item.id) {
      this.loadStoriesFor(item.id, item.title, item.coverImage ?? '');
    }
  }

  protected onCoverCropChange(crop: Crop | null): void {
    const current = this.exhibitionForm.getRawValue().coverCrop ?? null;
    if (JSON.stringify(crop ?? null) === JSON.stringify(current)) return;
    this.history.record();
    this.exhibitionForm.patchValue({ coverCrop: crop });
    this.exhibitionForm.markAsDirty();
  }

  private loadStoriesFor(exhibitionId: string, fallbackTitle: string, fallbackCover: string): void {
    this.portfolio.getAdminStories('exhibition', exhibitionId).subscribe(stories => {
      this.currentStories.set(stories);
      if (stories.length === 0) {
        // Cas rare : owner sans story → créer une story par défaut et l'ouvrir
        this.portfolio.createStory({
          ownerKind: 'exhibition', ownerId: exhibitionId,
          title: fallbackTitle, coverImage: fallbackCover,
        }).subscribe(s => {
          this.currentStories.set([s]);
          this.editingStoryId.set(s.id);
          this.activeStoryId.set(s.id);
          this.loadActiveStorySlides(s.id);
        });
      } else {
        const first = this.currentStories()[0];
        this.activeStoryId.set(first ? first.id : null);
        this.loadActiveStorySlides(first ? first.id : null);
      }
    });
  }

  editStory(story: Story): void {
    this.editingStoryId.set(story.id);
  }

  newStory(): void {
    const ownerId = this.editingExhibitionId();
    if (!ownerId) return;
    const slug = this.editingExhibitionSlug();
    const owner = slug ? this.exhibitions().find(e => e.slug === slug) : null;
    const defaultTitle = owner ? `${owner.title} — Story` : 'Nouvelle story';
    const title = prompt('Titre de la nouvelle story ?', defaultTitle);
    if (!title) return;
    this.portfolio.createStory({
      ownerKind: 'exhibition', ownerId,
      title, coverImage: owner?.coverImage ?? '',
    }).subscribe({
      next: s => {
        this.currentStories.update(arr => [...arr, s]);
        this.editingStoryId.set(s.id);
        this.activeStoryId.set(s.id);
        this.loadActiveStorySlides(s.id);
        this.toast.success('Story créée.');
      },
      error: () => this.toast.error('Erreur lors de la création de la story.'),
    });
  }

  openCoverEditor(story: Story): void {
    this.editingCoverStoryId.set(story.id);
    this.coverEditCtrl.setValue(story.coverImage);
    this.editingStoryCoverCrop.set(story.coverCrop ?? null);
  }

  cancelCoverEdit(): void {
    this.editingCoverStoryId.set(null);
    this.coverEditCtrl.setValue('');
    this.editingStoryCoverCrop.set(null);
  }

  protected onStoryCoverCropChange(crop: Crop | null): void {
    this.editingStoryCoverCrop.set(crop);
  }

  saveCover(story: Story): void {
    const newCover = (this.coverEditCtrl.value ?? '').trim();
    if (!newCover) { this.cancelCoverEdit(); return; }
    const newCrop = this.editingStoryCoverCrop();
    const urlUnchanged = newCover === story.coverImage;
    const cropUnchanged = JSON.stringify(newCrop ?? null) === JSON.stringify(story.coverCrop ?? null);
    if (urlUnchanged && cropUnchanged) { this.cancelCoverEdit(); return; }
    this.portfolio.updateStory(story.id, {
      ownerKind: story.ownerKind, ownerId: story.ownerId,
      title: story.title, coverImage: newCover,
      coverCrop: newCrop,
    }).subscribe({
      next: updated => {
        this.currentStories.update(arr => arr.map(s => s.id === updated.id ? updated : s));
        this.cancelCoverEdit();
        this.toast.success('Image de couverture mise à jour.');
      },
      error: () => this.toast.error('Erreur lors de la mise à jour de la cover.'),
    });
  }

  renameStory(story: Story): void {
    const newTitle = prompt('Nouveau titre ?', story.title);
    if (!newTitle || newTitle === story.title) return;
    this.portfolio.updateStory(story.id, {
      ownerKind: story.ownerKind, ownerId: story.ownerId,
      title: newTitle, coverImage: story.coverImage,
    }).subscribe({
      next: updated => {
        this.currentStories.update(arr => arr.map(s => s.id === updated.id ? updated : s));
        this.toast.success('Story renommée.');
      },
      error: () => this.toast.error('Erreur lors du renommage.'),
    });
  }

  deleteStory(story: Story): void {
    if (!confirm(`Supprimer la story "${story.title}" et ses slides ?`)) return;
    this.portfolio.deleteStory(story.id).subscribe({
      next: () => {
        this.currentStories.update(arr => arr.filter(s => s.id !== story.id));
        if (this.editingStoryId() === story.id) this.editingStoryId.set(null);
        this.toast.success('Story supprimée.');
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  moveStoryUp(story: Story): void {
    const arr = this.currentStories();
    const i = arr.findIndex(s => s.id === story.id);
    if (i <= 0) return;
    const above = arr[i - 1];
    this.portfolio.updateStoryPosition(story.id, above.position).subscribe(() => {
      this.portfolio.updateStoryPosition(above.id, story.position).subscribe(() => {
        const ownerId = this.editingExhibitionId();
        if (ownerId) this.loadStoriesFor(ownerId, '', '');
      });
    });
  }

  moveStoryDown(story: Story): void {
    const arr = this.currentStories();
    const i = arr.findIndex(s => s.id === story.id);
    if (i < 0 || i >= arr.length - 1) return;
    const below = arr[i + 1];
    this.portfolio.updateStoryPosition(story.id, below.position).subscribe(() => {
      this.portfolio.updateStoryPosition(below.id, story.position).subscribe(() => {
        const ownerId = this.editingExhibitionId();
        if (ownerId) this.loadStoriesFor(ownerId, '', '');
      });
    });
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
