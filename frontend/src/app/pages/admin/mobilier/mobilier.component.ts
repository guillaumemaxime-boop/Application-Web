import { Component, ViewChild, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import { Furniture } from '../../../models/furniture.model';
import { Story } from '../../../models/story.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { SlidesEditorComponent } from '../shared/slides-editor.component';
import { GalleryEditorComponent } from '../shared/gallery-editor.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { TagInputComponent } from '../shared/tag-input.component';
import { ToastService } from '../shared/toast.service';
import { GalleryItem } from '../../../models/gallery-item.model';
import { Crop } from '../../../models/crop.model';
import { FurniturePreviewComponent } from './preview/furniture-preview.component';
import { enrichSlides } from '../../../utils/display-slides';

@Component({
  selector: 'app-mobilier',
  standalone: true,
  imports: [ReactiveFormsModule, ReorderableDirective, SlidesEditorComponent, GalleryEditorComponent, ImageFieldComponent, TagInputComponent, FurniturePreviewComponent],
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

      <div class="admin-split">
        @if (editingFurnitureSlug() !== null || editingFurnitureId() !== null || creatingFurniture()) {
          <div class="admin-mode-bar" role="tablist" aria-label="Mode d'édition de la pièce">
            <button type="button" role="tab" class="admin-mode-tab"
                    [class.active]="mobilierViewMode() === 'form'"
                    [attr.aria-selected]="mobilierViewMode() === 'form'"
                    (click)="mobilierViewMode.set('form')">
              ✏ Modifier la pièce
            </button>
            <button type="button" role="tab" class="admin-mode-tab"
                    [class.active]="mobilierViewMode() === 'preview'"
                    [attr.aria-selected]="mobilierViewMode() === 'preview'"
                    (click)="mobilierViewMode.set('preview')">
              👁 Aperçu
            </button>
          </div>
        }
        <section class="admin-form" [class.is-hidden]="mobilierViewMode() !== 'form'">
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
              (imagesChange)="furnitureGallery.set($event)" />

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

            <label class="checkbox">
              <input type="checkbox" formControlName="showStoryLink" />
              <span>Afficher le lien en fin de story</span>
            </label>

            <label class="checkbox">
              <input type="checkbox" formControlName="showStoryButton" />
              <span>Afficher le bouton "Voir en plein écran" sur la fiche publique</span>
            </label>

            @if (editingFurnitureId()) {
              <section class="stories-block">
                <header class="stories-head">
                  <h3>Stories</h3>
                  <button type="button" class="btn-link" (click)="newStory()">+ Nouvelle story</button>
                </header>
                @if (currentStories().length === 0) {
                  <p class="empty">Aucune story pour ce mobilier.</p>
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
                <app-slides-editor [storyId]="sid" [ownerSlug]="editingFurnitureSlug()" />
              }
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
        </section>

        @if (mobilierViewMode() === 'preview' && (editingFurnitureSlug() !== null || editingFurnitureId() !== null || creatingFurniture())) {
          <aside class="admin-preview" [class.fullscreen]="previewFullscreen()" aria-label="Aperçu de la fiche">
            <div class="admin-preview-toolbar">
              <span class="admin-preview-label">Aperçu</span>
              <div class="admin-preview-actions">
                <button type="button" class="btn-preview-save"
                        [disabled]="furnitureForm.invalid || saving()"
                        (click)="saveFurniture()">
                  @if (saving()) { Enregistrement… } @else { 💾 Enregistrer }
                </button>
                <button type="button" class="btn-preview-toggle"
                        (click)="togglePreviewFullscreen()"
                        [attr.aria-label]="previewFullscreenLabel()">
                  @if (previewFullscreen()) { ⤡ Réduire } @else { ⤢ Plein écran }
                </button>
              </div>
            </div>
            <app-furniture-preview
              [form]="furnitureForm"
              [gallery]="furnitureGallery.asReadonly()"
              [story]="currentStories()[0] ?? null"
              [displaySlides]="previewDisplaySlides()"
              (coverEdit)="onPreviewCoverEdit($event)"
              (galleryItemEdit)="onPreviewGalleryItemEdit($event)"
              (galleryReorder)="onPreviewGalleryReorder($event)"
              (galleryAdd)="onPreviewGalleryAdd()"
              (textFieldClick)="focusField($event)"
              (textFieldEdit)="onPreviewTextFieldEdit($event)"
              (galleryItemResize)="onPreviewGalleryItemResize($event)" />
          </aside>
        }
      </div>
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
    .admin-split { display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
    .admin-mode-bar { display: inline-flex; gap: 4px; padding: 4px; background: var(--color-bg-alt); border: 1px solid var(--color-line); align-self: flex-start; }
    .admin-mode-tab { padding: 8px 16px; background: transparent; border: 0; color: var(--color-ink-soft); font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
    .admin-mode-tab:hover { color: var(--color-ink); }
    .admin-mode-tab.active { background: var(--color-ink); color: var(--color-bg); font-weight: 600; }
    .admin-form { max-width: 100%; }
    /* En mode preview : form sort du flow + invisible, MAIS ne pas utiliser display:none
       car les modales descendantes (photo-picker, crop-picker) en position:fixed seraient
       retirees du rendu. visibility:hidden + position:absolute conserve les ViewChild et
       laisse les modales s'afficher (override visibility:visible ci-dessous). */
    .admin-form.is-hidden { position: absolute; left: -100vw; top: 0; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
    .admin-form.is-hidden .picker-backdrop,
    .admin-form.is-hidden .crop-backdrop { visibility: visible; pointer-events: auto; }
    .admin-preview { max-height: calc(100vh - 100px); overflow-y: auto; background: var(--color-bg-alt); border: 1px solid var(--color-line); padding: 24px; }
    .admin-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -8px -8px 16px; padding: 0 4px; }
    .admin-preview-label { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-mute); }
    .btn-preview-toggle { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line); color: var(--color-ink-soft); font-size: 0.78rem; cursor: pointer; font-family: inherit; }
    .btn-preview-toggle:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .admin-preview-actions { display: inline-flex; gap: 8px; align-items: center; }
    .btn-preview-save { padding: 6px 14px; background: var(--color-ink); color: var(--color-bg); border: 1px solid var(--color-ink); font-size: 0.78rem; cursor: pointer; font-family: inherit; font-weight: 600; }
    .btn-preview-save:hover:not(:disabled) { background: var(--color-bg); color: var(--color-ink); }
    .btn-preview-save:disabled { opacity: 0.4; cursor: not-allowed; }
    .admin-preview.fullscreen { position: fixed; inset: 0; max-height: none; z-index: 1200; border: 0; padding: 24px 32px; }
    .admin-preview.fullscreen .admin-preview-toolbar { margin-top: 0; }
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
    @media (max-width: 1280px) {
      .admin-split { grid-template-columns: 1fr; }
      .admin-preview { position: static; max-height: 60vh; }
    }
    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .admin-preview { display: none; }
    }
    @media (max-width: 600px) {
      .dim-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MobilierComponent implements OnInit, OnDestroy {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('coverField') coverImageField?: ImageFieldComponent;
  @ViewChild('galleryEditor') galleryEditor?: GalleryEditorComponent;

  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingFurnitureId = signal<string | null>(null);
  readonly furnitureGallery = signal<GalleryItem[]>([]);
  protected readonly currentStories = signal<Story[]>([]);
  protected readonly editingStoryId = signal<string | null>(null);
  protected readonly editingCoverStoryId = signal<string | null>(null);
  protected readonly coverEditCtrl = new FormControl('');
  protected readonly editingStoryCoverCrop = signal<Crop | null>(null);
  protected readonly allTags = signal<string[]>([]);

  protected readonly creatingFurniture = signal(false);
  protected readonly previewFullscreen = signal(false);
  protected readonly mobilierViewMode = signal<'form' | 'preview'>('form');

  protected togglePreviewFullscreen(): void { this.previewFullscreen.update(v => !v); }
  protected previewFullscreenLabel(): string {
    return this.previewFullscreen() ? 'Réduire l’aperçu' : 'Aperçu plein écran';
  }
  private readonly _formTick = signal(0);
  private formTickSub?: Subscription;

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
  });

  protected readonly previewDisplaySlides = computed(() => {
    this._formTick(); // dépendance signal — force recompute sur valueChanges
    const story = this.currentStories()[0];
    if (!story) return [];
    const v = this.furnitureForm.getRawValue();
    return enrichSlides({
      slug: v.slug ?? '',
      coverImage: v.coverImage ?? null,
      coverCrop: v.coverCrop ?? null,
      slides: [],
      showStoryLink: v.showStoryLink ?? true,
    }, 'furniture');
  });

  constructor() {
    this.refreshFurniture();
    this.portfolio.getAllTags().subscribe(t => this.allTags.set(t));
    this.route.queryParamMap.subscribe(params => {
      if (params.get('new') === '1') this.newFurniture();
    });
  }

  ngOnInit(): void {
    this.formTickSub = this.furnitureForm.valueChanges.subscribe(() =>
      this._formTick.update(n => n + 1)
    );
  }

  ngOnDestroy(): void {
    this.formTickSub?.unsubscribe();
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
    this.creatingFurniture.set(true);
    this.mobilierViewMode.set('form');
    this.currentStories.set([]);
    this.editingStoryId.set(null);
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '', coverCrop: null,
      dimW: null, dimD: null, dimH: null, dimNotes: '',
      shortDescription: '', description: '',
      showStoryLink: true,
      showStoryButton: true,
      tags: [],
    });
    this.furnitureGallery.set([]);
  }

  loadFurniture(item: Furniture): void {
    this.editingFurnitureSlug.set(item.slug);
    this.editingFurnitureId.set(item.id ?? null);
    this.creatingFurniture.set(false);
    this.mobilierViewMode.set('form');
    this.currentStories.set([]);
    this.editingStoryId.set(null);
    const dims = this.parseDimensions(item.dimensions ?? []);
    this.furnitureForm.reset({
      title: item.title, slug: item.slug, category: item.category, year: item.year,
      material: item.material ?? '', designer: item.designer ?? '', coverImage: item.coverImage ?? '', coverCrop: item.coverCrop ?? null,
      dimW: dims.w, dimD: dims.d, dimH: dims.h, dimNotes: dims.notes,
      shortDescription: item.shortDescription ?? '', description: item.description ?? '',
      showStoryLink: item.showStoryLink ?? true,
      showStoryButton: item.showStoryButton ?? true,
      tags: item.tags ?? [],
    });
    this.furnitureGallery.set([...(item.gallery ?? [])]);
    if (item.id) {
      this.loadStoriesFor(item.id, item.title, item.coverImage ?? '');
    }
  }

  protected onCoverCropChange(crop: Crop | null): void {
    this.furnitureForm.patchValue({ coverCrop: crop });
  }

  private loadStoriesFor(furnitureId: string, fallbackTitle: string, fallbackCover: string): void {
    this.portfolio.getAdminStories('furniture', furnitureId).subscribe(stories => {
      this.currentStories.set(stories);
      if (stories.length === 0) {
        // Cas rare : owner sans story → créer une story par défaut et l'ouvrir
        this.portfolio.createStory({
          ownerKind: 'furniture', ownerId: furnitureId,
          title: fallbackTitle, coverImage: fallbackCover,
        }).subscribe(s => {
          this.currentStories.set([s]);
          this.editingStoryId.set(s.id);
        });
      }
      // Sinon, on ne pré-sélectionne rien : l'admin choisit explicitement.
    });
  }

  editStory(story: Story): void {
    this.editingStoryId.set(story.id);
  }

  newStory(): void {
    const ownerId = this.editingFurnitureId();
    if (!ownerId) return;
    const slug = this.editingFurnitureSlug();
    const owner = slug ? this.furniture().find(f => f.slug === slug) : null;
    const defaultTitle = owner ? `${owner.title} — Story` : 'Nouvelle story';
    const title = prompt('Titre de la nouvelle story ?', defaultTitle);
    if (!title) return;
    this.portfolio.createStory({
      ownerKind: 'furniture', ownerId,
      title, coverImage: owner?.coverImage ?? '',
    }).subscribe({
      next: s => {
        this.currentStories.update(arr => [...arr, s]);
        this.editingStoryId.set(s.id);
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
        const ownerId = this.editingFurnitureId();
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
        const ownerId = this.editingFurnitureId();
        if (ownerId) this.loadStoriesFor(ownerId, '', '');
      });
    });
  }

  focusField(name: string): void {
    const el = document.getElementById(`field-${name}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLInputElement | HTMLTextAreaElement).focus();
  }

  onPreviewCoverEdit(action: 'crop' | 'replace'): void {
    if (action === 'crop') {
      this.coverImageField?.openCrop();
    } else {
      this.coverImageField?.openPicker();
    }
  }

  onPreviewGalleryItemEdit(e: { index: number; action: 'crop' | 'replace' | 'remove' }): void {
    if (e.action === 'remove') {
      this.furnitureGallery.update(arr => arr.filter((_, i) => i !== e.index));
      return;
    }
    if (e.action === 'crop') {
      this.galleryEditor?.openCropFor(e.index);
    } else {
      this.galleryEditor?.openReplaceFor(e.index);
    }
  }

  onPreviewGalleryAdd(): void {
    this.galleryEditor?.openPicker();
  }

  onPreviewTextFieldEdit(e: { field: string; value: string }): void {
    this.furnitureForm.patchValue({ [e.field]: e.value });
    this.furnitureForm.get(e.field)?.markAsDirty();
  }

  onPreviewGalleryReorder(order: number[]): void {
    const items = this.furnitureGallery();
    this.furnitureGallery.set(order.map(i => items[i]));
  }

  onPreviewGalleryItemResize(e: { index: number; colSpan: number; rowSpan: number }): void {
    this.furnitureGallery.update(arr => arr.map((it, i) =>
      i === e.index ? { ...it, colSpan: e.colSpan, rowSpan: e.rowSpan } : it
    ));
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
    };
    this.saving.set(true);
    const op$ = slug
      ? this.portfolio.updateFurniture(slug, payload)
      : this.portfolio.createFurniture(payload);
    op$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(slug ? 'Pièce mise à jour.' : 'Pièce créée.');
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
