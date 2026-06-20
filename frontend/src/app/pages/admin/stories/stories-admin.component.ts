import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { StoryAdminView } from '../../../models/story.model';
import { NewsSlider } from '../../../models/news-slider.model';
import { Crop } from '../../../models/crop.model';
import { CroppedImageCanvasComponent } from '../shared/cropped-image-canvas.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { StoryCreateModalComponent } from './story-create-modal.component';

@Component({
  selector: 'app-stories-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, CroppedImageCanvasComponent, ImageFieldComponent, StoryCreateModalComponent],
  template: `
    <header class="page-head">
      <h2>Stories</h2>
      <button type="button" class="primary" (click)="createOpen.set(true)">+ Nouvelle story</button>
    </header>

    <div class="filters">
      <label class="owner-filter">
        <span>Propriétaire</span>
        <select [ngModel]="ownerFilter()" (ngModelChange)="ownerFilter.set($event)">
          <option value="all">Tous</option>
          <option value="furniture">Mobilier</option>
          <option value="exhibition">Expositions</option>
        </select>
      </label>
      <input
        type="search"
        class="search"
        placeholder="Rechercher une story…"
        aria-label="Rechercher une story"
        [ngModel]="search()"
        (ngModelChange)="search.set($event)" />
    </div>

    @if (filtered().length === 0) {
      <p class="empty">Aucune story ne correspond aux filtres.</p>
    }

    <ul class="story-list">
      @for (row of filtered(); track row.id) {
        <li class="story-row">
          <div class="thumb">
            @if (row.coverImage) {
              <app-cropped-image-canvas
                mode="cover"
                [imageUrl]="row.coverImage"
                [crop]="row.coverCrop"
                [alt]="row.title" />
            }
          </div>

          <div class="info">
            <span class="story-title">{{ row.title }}</span>
            <div class="meta">
              <span class="badge" [class.furniture]="row.ownerKind === 'furniture'" [class.exhibition]="row.ownerKind === 'exhibition'">
                {{ row.ownerKind === 'furniture' ? 'Mobilier' : 'Exposition' }}
              </span>
              <span class="owner-title">{{ row.ownerTitle }}</span>
              @if (row.slideCount === 0) {
                <span class="warn">⚠ vide</span>
              } @else {
                <span class="slides">{{ row.slideCount }} slide{{ row.slideCount > 1 ? 's' : '' }}</span>
              }
            </div>
            @if (row.sliders.length > 0) {
              <div class="sliders">
                <span class="sliders-label">Sliders :</span>
                @for (sl of row.sliders; track sl.id) {
                  <span class="slider-chip">{{ sl.title }}</span>
                }
              </div>
            }
          </div>

          <div class="actions">
            <a class="action" [routerLink]="['/admin/stories', row.id]">Éditer</a>
            <button type="button" class="action" (click)="openCover(row)">Cover</button>
            <button
              type="button"
              class="action"
              [attr.aria-expanded]="sliderEditFor() === row.id"
              (click)="sliderEditFor.set(sliderEditFor() === row.id ? null : row.id)">Sliders</button>
            <button type="button" class="action danger" (click)="onDelete(row)">Supprimer</button>
          </div>

          @if (sliderEditFor() === row.id) {
            <div class="slider-panel" role="region" [attr.aria-label]="'Sliders de la story ' + row.title">
              <span class="slider-panel-label">Appartenance aux sliders</span>
              @if (allSliders().length === 0) {
                <p class="empty">Aucun slider disponible.</p>
              }
              <ul class="slider-options">
                @for (s of allSliders(); track s.id) {
                  <li>
                    <label class="slider-option">
                      <input
                        type="checkbox"
                        [checked]="s.storyIds.includes(row.id)"
                        (change)="toggleMembership(s, row.id, $event)" />
                      {{ s.title }}
                    </label>
                  </li>
                }
              </ul>
              <button type="button" class="action" (click)="sliderEditFor.set(null)">Fermer</button>
            </div>
          }
        </li>
      }
    </ul>

    @if (coverEdit(); as row) {
      <div class="cover-editor" role="region" aria-label="Édition du cover">
        <h3 class="cover-editor-title">Cover — {{ row.title }}</h3>
        <app-image-field
          label="Image de couverture"
          [formControl]="coverCtrl"
          [cropEnabled]="true"
          [cropValue]="coverCropSig()"
          (cropChange)="coverCropSig.set($event)" />
        <div class="cover-editor-actions">
          <button type="button" class="primary" (click)="saveCover()">Enregistrer</button>
          <button type="button" class="action" (click)="coverEdit.set(null)">Annuler</button>
        </div>
      </div>
    }

    @if (createOpen()) {
      <app-story-create-modal
        [presetOwner]="presetOwner()"
        (created)="onStoryCreated($event)"
        (cancel)="createOpen.set(false)" />
    }
  `,
  styles: [`
    .page-head { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .page-head h2 { margin: 0; flex: 1; }

    .filters { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 24px; }
    .owner-filter { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: var(--color-mute); }
    select, .search { padding: 8px 10px; background: var(--color-bg); border: 1px solid var(--color-line); font-size: 0.9rem; }
    .search { flex: 1; min-width: 200px; }

    .empty { color: var(--color-mute); font-style: italic; padding: 12px 0; }

    .story-list { list-style: none; margin: 0; padding: 0; }
    .story-row {
      display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
      padding: 12px; border: 1px solid var(--color-line);
      background: var(--color-bg-alt); margin-bottom: 8px;
    }

    .thumb { width: 88px; height: 64px; flex-shrink: 0; background: var(--color-bg); border: 1px solid var(--color-line); overflow: hidden; }

    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .story-title { font-weight: 600; }
    .meta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: 0.85rem; }
    .badge { padding: 2px 8px; border: 1px solid var(--color-line); text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.08em; }
    .badge.furniture { border-color: var(--color-accent); }
    .owner-title { color: var(--color-ink-soft); }
    .slides { color: var(--color-mute); }
    .warn { color: var(--color-accent); font-weight: 600; }

    .sliders { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 0.75rem; }
    .sliders-label { color: var(--color-mute); }
    .slider-chip { padding: 1px 7px; background: var(--color-bg); border: 1px solid var(--color-line); }

    .actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .action {
      padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-ink);
      cursor: pointer; font-size: 0.85rem; text-decoration: none; color: var(--color-ink);
      font-family: inherit; line-height: 1;
    }
    .action.danger { border-color: var(--color-accent); color: var(--color-accent); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    .primary { padding: 8px 16px; background: var(--color-ink); color: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.9rem; }

    .cover-editor {
      margin-top: 24px; padding: 20px;
      border: 1px solid var(--color-line); background: var(--color-bg-alt);
    }
    .cover-editor-title { margin: 0 0 16px; font-size: 1rem; font-weight: 600; }
    .cover-editor-actions { display: flex; gap: 10px; margin-top: 16px; }

    .slider-panel {
      flex-basis: 100%; width: 100%;
      padding: 12px; border: 1px solid var(--color-line); background: var(--color-bg);
    }
    .slider-panel-label { display: block; font-size: 0.8rem; color: var(--color-mute); margin-bottom: 8px; }
    .slider-options { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .slider-option { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; }
  `],
})
export class StoriesAdminComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly rows = signal<StoryAdminView[]>([]);
  protected readonly ownerFilter = signal<'all' | 'furniture' | 'exhibition'>('all');
  protected readonly search = signal('');

  /** Tous les sliders disponibles, pour gérer l'appartenance des stories. */
  protected readonly allSliders = signal<NewsSlider[]>([]);
  /** Id de la story dont le panneau « Sliders » est ouvert (null si aucun). */
  protected readonly sliderEditFor = signal<string | null>(null);
  // Câblés en T5 (création) et T6 (édition cover) ; déclarés ici pour les boutons.
  protected readonly createOpen = signal(false);
  protected readonly coverEdit = signal<StoryAdminView | null>(null);

  /**
   * Owner pré-sélectionné transmis par le lien « Gérer les stories » des fiches
   * via les query params `ownerKind`/`ownerId`. Passé tel quel à la modale de
   * création pour pré-sélectionner le propriétaire.
   */
  protected readonly presetOwner = signal<{ kind: 'furniture' | 'exhibition'; id: string } | null>(null);

  // Contrôle et signal pour le panneau d'édition du cover (Task 6).
  protected readonly coverCtrl = new FormControl('');
  protected readonly coverCropSig = signal<Crop | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    const f = this.ownerFilter();
    return this.rows()
      .filter(r => f === 'all' || r.ownerKind === f)
      .filter(r => !q || r.title.toLowerCase().includes(q) || r.ownerTitle.toLowerCase().includes(q));
  });

  constructor() {
    // Contexte owner transmis depuis une fiche : pré-filtre la liste et arme la modale.
    const qp = this.route.snapshot.queryParamMap;
    const ownerKind = qp.get('ownerKind');
    const ownerId = qp.get('ownerId');
    if (ownerKind === 'furniture' || ownerKind === 'exhibition') {
      this.ownerFilter.set(ownerKind);
      if (ownerId) {
        this.presetOwner.set({ kind: ownerKind, id: ownerId });
      }
    }
    // ?new=1 (raccourci « Nouvelle story » du tableau de bord) : ouvre la modale de création.
    if (qp.get('new') === '1') {
      this.createOpen.set(true);
    }
    this.reload();
    this.reloadSliders();
  }

  protected reload(): void {
    this.portfolio.getStoriesForManagement().subscribe(r => this.rows.set(r));
  }

  /** Recharge la liste des sliders (pour refléter l'appartenance des stories). */
  protected reloadSliders(): void {
    this.portfolio.getAdminSliders().subscribe(s => this.allSliders.set(s));
  }

  /**
   * Ajoute ou retire la story du slider selon l'état de la case à cocher, puis
   * rafraîchit la liste des stories (colonne sliders) et les cases du panneau.
   */
  protected toggleMembership(slider: NewsSlider, storyId: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const ids = checked
      ? [...slider.storyIds, storyId]
      : slider.storyIds.filter(id => id !== storyId);
    this.portfolio.replaceSliderStories(slider.id, ids).subscribe({
      next: () => {
        this.toast.success('Appartenance aux sliders mise à jour.');
        this.reload();
        this.reloadSliders();
      },
      error: () => this.toast.error('Erreur lors de la mise à jour des sliders.'),
    });
  }

  /** Ouvre le panneau d'édition du cover pour la story donnée. */
  openCover(row: StoryAdminView): void {
    this.coverEdit.set(row);
    this.coverCtrl.setValue(row.coverImage);
    this.coverCropSig.set(row.coverCrop ?? null);
  }

  /** Enregistre le cover (image + cadrage) en appelant updateStory avec tous les champs obligatoires. */
  saveCover(): void {
    const row = this.coverEdit();
    if (!row) return;
    this.portfolio.updateStory(row.id, {
      ownerKind: row.ownerKind,
      ownerId: row.ownerId,
      title: row.title,
      coverImage: this.coverCtrl.value ?? '',
      coverCrop: this.coverCropSig(),
    }).subscribe({
      next: () => { this.coverEdit.set(null); this.reload(); this.toast.success('Cover mise à jour.'); },
      error: () => this.toast.error('Erreur lors de la mise à jour du cover.'),
    });
  }

  /** Story créée via la modale : on ferme et on bascule vers l'éditeur de slides. */
  protected onStoryCreated(id: string): void {
    this.createOpen.set(false);
    this.router.navigate(['/admin/stories', id]);
  }

  protected onDelete(row: StoryAdminView): void {
    if (!confirm(`Supprimer la story « ${row.title} » et ses slides ?`)) return;
    this.portfolio.deleteStory(row.id).subscribe({
      next: () => { this.rows.update(a => a.filter(x => x.id !== row.id)); this.toast.success('Story supprimée.'); },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

}
