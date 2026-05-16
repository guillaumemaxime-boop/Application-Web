import { Component, HostListener, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { Photo } from '../../models/photo.model';
import { AdminFeedEntry, AdminCategoryView, AdminExhibitionMetaView } from '../../models/home.model';
import { PortfolioService } from '../../services/portfolio.service';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { SlidesEditorComponent } from './slides-editor.component';

interface HomeAdminItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  included: boolean;
}

interface ExhibitionMetaRow {
  slug: string;
  title: string;
  cover: string;
  position: number;
  visible: boolean;
}

type Tab = 'furniture' | 'exhibitions' | 'texts' | 'photos' | 'home';
type PickerTarget = 'furniture-cover' | 'furniture-gallery' | 'exhibition-cover' | 'exhibition-gallery';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ReorderableDirective, SlidesEditorComponent],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <span class="eyebrow">Console d'administration</span>
          <h1>Gérer le contenu</h1>
          <p class="lead">Ajoutez, modifiez ou supprimez les pièces de mobilier et les expositions présentées sur le site.</p>
        </div>

        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'furniture'"
            [class.active]="tab() === 'furniture'"
            (click)="switchTab('furniture')">Mobilier</button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'exhibitions'"
            [class.active]="tab() === 'exhibitions'"
            (click)="switchTab('exhibitions')">Expositions</button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'texts'"
            [class.active]="tab() === 'texts'"
            (click)="switchTab('texts')">Textes du site</button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'photos'"
            [class.active]="tab() === 'photos'"
            (click)="switchTab('photos')">Médiathèque</button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'home'"
            [class.active]="tab() === 'home'"
            (click)="switchTab('home')">Accueil</button>
        </div>

        @if (message()) {
          <p class="flash" [class.error]="messageType() === 'error'">{{ message() }}</p>
        }

        @if (tab() === 'furniture') {
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
              <h2>{{ editingFurnitureSlug() ? 'Modifier la pièce' : 'Nouvelle pièce' }}</h2>

              <label>
                <span>Titre *</span>
                <input type="text" formControlName="title" />
              </label>
              <label>
                <span>Slug</span>
                <input type="text" formControlName="slug" placeholder="auto-généré si vide" />
              </label>
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

              <div class="field-with-picker">
                <label>
                  <span>Image principale (URL)</span>
                  <input type="url" formControlName="coverImage" />
                </label>
                <button type="button" class="btn-pick" (click)="openPicker('furniture-cover')" title="Choisir depuis la médiathèque">
                  Médiathèque
                </button>
              </div>

              <div class="field-with-picker">
                <label>
                  <span>Galerie (une URL par ligne)</span>
                  <textarea rows="3" formControlName="gallery"></textarea>
                </label>
                <button type="button" class="btn-pick" (click)="openPicker('furniture-gallery')" title="Ajouter depuis la médiathèque">
                  Médiathèque
                </button>
              </div>

              <label>
                <span>Dimensions (une par ligne)</span>
                <textarea rows="3" formControlName="dimensions"></textarea>
              </label>
              <label>
                <span>Description courte</span>
                <textarea rows="2" formControlName="shortDescription"></textarea>
              </label>
              <label>
                <span>Description longue</span>
                <textarea rows="5" formControlName="description"></textarea>
              </label>
              <label class="check">
                <input type="checkbox" formControlName="featured" />
                <span>Pièce phare (mise en avant sur l'accueil)</span>
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
        }

        @if (tab() === 'exhibitions') {
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
              <h2>{{ editingExhibitionSlug() ? 'Modifier l\'exposition' : 'Nouvelle exposition' }}</h2>

              <label>
                <span>Titre *</span>
                <input type="text" formControlName="title" />
              </label>
              <label>
                <span>Slug</span>
                <input type="text" formControlName="slug" placeholder="auto-généré si vide" />
              </label>
              <label>
                <span>Lieu</span>
                <input type="text" formControlName="venue" />
              </label>
              <div class="row-2">
                <label>
                  <span>Ville</span>
                  <input type="text" formControlName="city" />
                </label>
                <label>
                  <span>Pays</span>
                  <input type="text" formControlName="country" />
                </label>
              </div>
              <div class="row-2">
                <label>
                  <span>Date de début *</span>
                  <input type="date" formControlName="startDate" />
                </label>
                <label>
                  <span>Date de fin *</span>
                  <input type="date" formControlName="endDate" />
                </label>
              </div>
              <label>
                <span>Commissaire</span>
                <input type="text" formControlName="curator" />
              </label>

              <div class="field-with-picker">
                <label>
                  <span>Image principale (URL)</span>
                  <input type="url" formControlName="coverImage" />
                </label>
                <button type="button" class="btn-pick" (click)="openPicker('exhibition-cover')" title="Choisir depuis la médiathèque">
                  Médiathèque
                </button>
              </div>

              <div class="field-with-picker">
                <label>
                  <span>Galerie (une URL par ligne)</span>
                  <textarea rows="3" formControlName="gallery"></textarea>
                </label>
                <button type="button" class="btn-pick" (click)="openPicker('exhibition-gallery')" title="Ajouter depuis la médiathèque">
                  Médiathèque
                </button>
              </div>

              <label>
                <span>Tags (un par ligne)</span>
                <textarea rows="2" formControlName="tags"></textarea>
              </label>
              <label>
                <span>Description courte</span>
                <textarea rows="2" formControlName="shortDescription"></textarea>
              </label>
              <label>
                <span>Description longue</span>
                <textarea rows="5" formControlName="description"></textarea>
              </label>
              <label class="check">
                <input type="checkbox" formControlName="featured" />
                <span>Exposition phare</span>
              </label>

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
        }

        @if (tab() === 'texts') {
          @if (loadingTexts()) {
            <p class="status">Chargement des textes…</p>
          } @else {
            <form class="texts-form" [formGroup]="textsForm" (ngSubmit)="saveTexts()">

              <div class="texts-section">
                <h2 class="texts-section-title">Page d'accueil</h2>

                <div class="texts-group">
                  <h3 class="texts-group-label">Bloc héro</h3>
                  <label>
                    <span>Chapeau</span>
                    <input type="text" formControlName="home_hero_eyebrow" />
                  </label>
                  <label>
                    <span>Titre (saut de ligne avec ↵)</span>
                    <textarea rows="2" formControlName="home_hero_title"></textarea>
                  </label>
                  <label>
                    <span>Accroche</span>
                    <textarea rows="3" formControlName="home_hero_lead"></textarea>
                  </label>
                </div>

                <div class="texts-group">
                  <h3 class="texts-group-label">Section mobilier phare</h3>
                  <label>
                    <span>Chapeau</span>
                    <input type="text" formControlName="home_featured_eyebrow" />
                  </label>
                  <label>
                    <span>Titre</span>
                    <input type="text" formControlName="home_featured_title" />
                  </label>
                </div>

                <div class="texts-group">
                  <h3 class="texts-group-label">Section expositions</h3>
                  <label>
                    <span>Chapeau</span>
                    <input type="text" formControlName="home_exhibitions_eyebrow" />
                  </label>
                  <label>
                    <span>Titre</span>
                    <input type="text" formControlName="home_exhibitions_title" />
                  </label>
                </div>

                <div class="texts-group">
                  <h3 class="texts-group-label">Citation</h3>
                  <label>
                    <span>Texte de la citation</span>
                    <textarea rows="2" formControlName="home_quote_text"></textarea>
                  </label>
                  <label>
                    <span>Attribution</span>
                    <input type="text" formControlName="home_quote_cite" />
                  </label>
                </div>
              </div>

              <div class="texts-section">
                <h2 class="texts-section-title">Studio — Processus de création</h2>

                @for (i of [1,2,3,4]; track i) {
                  <div class="texts-group">
                    <h3 class="texts-group-label">Étape 0{{ i }}</h3>
                    <div class="row-2">
                      <label>
                        <span>Titre</span>
                        <input type="text" [formControlName]="'studio_step' + i + '_title'" />
                      </label>
                    </div>
                    <label>
                      <span>Description</span>
                      <textarea rows="3" [formControlName]="'studio_step' + i + '_desc'"></textarea>
                    </label>
                  </div>
                }
              </div>

              <div class="texts-section">
                <h2 class="texts-section-title">Profil du studio</h2>

                <div class="texts-group">
                  <div class="row-2">
                    <label>
                      <span>Nom du studio</span>
                      <input type="text" formControlName="profile_studio" />
                    </label>
                    <label>
                      <span>Localisation</span>
                      <input type="text" formControlName="profile_location" />
                    </label>
                  </div>
                  <label>
                    <span>Tagline</span>
                    <input type="text" formControlName="profile_tagline" />
                  </label>
                  <label>
                    <span>Biographie</span>
                    <textarea rows="5" formControlName="profile_bio"></textarea>
                  </label>
                  <div class="row-2">
                    <label>
                      <span>Email de contact</span>
                      <input type="email" formControlName="profile_contactEmail" />
                    </label>
                    <label>
                      <span>Téléphone</span>
                      <input type="tel" formControlName="profile_phone" />
                    </label>
                  </div>
                  <label>
                    <span>Distinctions (une par ligne)</span>
                    <textarea rows="4" formControlName="profile_awards"></textarea>
                  </label>
                  <label>
                    <span>Presse (format : Titre|Année, une par ligne)</span>
                    <textarea rows="4" formControlName="profile_press" placeholder="AD Magazine — Portrait|2024"></textarea>
                  </label>
                </div>
              </div>

              <div class="texts-actions">
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  {{ saving() ? 'Enregistrement…' : 'Enregistrer les textes' }}
                </button>
              </div>
            </form>
          }
        }

        @if (tab() === 'photos') {
          <div class="photos-tab">
            <div class="photos-upload-zone">
              <h2>Importer des photos</h2>
              <p class="photos-upload-hint">Formats acceptés : JPG, PNG, WebP, GIF · Taille max : 20 Mo par fichier</p>
              <input
                #fileInput
                type="file"
                accept="image/*"
                multiple
                style="display:none"
                (change)="uploadFiles($event)"
              />
              <button
                type="button"
                class="btn-primary"
                [disabled]="uploading()"
                (click)="fileInput.click()">
                {{ uploading() ? 'Importation en cours…' : 'Choisir des fichiers' }}
              </button>
            </div>

            @if (loadingPhotos()) {
              <p class="status">Chargement de la médiathèque…</p>
            } @else if (photos().length === 0) {
              <p class="status photos-empty">Aucune photo importée. Commencez par importer des images ci-dessus.</p>
            } @else {
              <div class="photos-count">{{ photos().length }} photo{{ photos().length > 1 ? 's' : '' }}</div>
              <div class="photos-grid">
                @for (photo of photos(); track photo.id) {
                  <div class="photo-card">
                    <div class="photo-thumb">
                      <button type="button" class="photo-thumb-btn" (click)="openViewer(photo)" [title]="photo.originalName">
                        <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
                      </button>
                    </div>
                    <div class="photo-info">
                      <span class="photo-name" [title]="photo.originalName">{{ photo.originalName }}</span>
                    </div>
                    <div class="photo-actions">
                      <button type="button" class="btn-copy" (click)="copyUrl(photo.url)" title="Copier l'URL">
                        Copier URL
                      </button>
                      <button type="button" class="photo-del" (click)="removePhoto(photo)" aria-label="Supprimer">×</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (tab() === 'home') {
          <div class="home-editor">
            <h2>Ordre éditorial du masonry</h2>
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

            <h2 style="margin-top: 48px">Catégories de mobilier</h2>
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

            <h2 style="margin-top: 48px">Bandeau des expositions</h2>
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
          </div>
        }
      </div>
    </section>

    @if (viewingPhoto()) {
      <div class="viewer-backdrop" (click)="closeViewer()">
        <div class="viewer-panel" (click)="$event.stopPropagation()">
          <button type="button" class="viewer-close" (click)="closeViewer()" aria-label="Fermer">×</button>

          <div class="viewer-img-wrap">
            <img [src]="viewingPhoto()!.url" [alt]="viewingPhoto()!.originalName" />
          </div>

          <div class="viewer-caption">
            <span class="viewer-name">{{ viewingPhoto()!.originalName }}</span>
          </div>
        </div>
      </div>
    }

    @if (photoPicker()) {
      <div class="picker-backdrop" (click)="closePicker()">
        <div class="picker-panel" (click)="$event.stopPropagation()">
          <div class="picker-head">
            <h3>
              @if (pickerIsGallery()) { Ajouter à la galerie } @else { Choisir une image }
            </h3>
            <button type="button" class="picker-close" (click)="closePicker()">×</button>
          </div>
          @if (pickerIsGallery()) {
            <p class="picker-hint">Cliquez sur une photo pour l'ajouter à la galerie.</p>
          } @else {
            <p class="picker-hint">Cliquez sur une photo pour la sélectionner comme image principale.</p>
          }
          @if (photos().length === 0) {
            <p class="picker-empty">Aucune photo disponible. Importez des images dans l'onglet Médiathèque.</p>
          } @else {
            <div class="picker-grid">
              @for (photo of photos(); track photo.id) {
                <button type="button" class="picker-item" (click)="selectPhoto(photo)" [title]="photo.originalName">
                  <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .section { padding: 128px 0 96px; }
    .head { max-width: 720px; margin-bottom: 48px; }
    .head h1 { margin-top: 16px; }
    .lead { margin-top: 16px; color: var(--color-ink-soft); }

    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--color-line);
    }
    .tabs button {
      background: transparent;
      border: 0;
      padding: 14px 20px;
      font-size: 0.875rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tabs button.active {
      color: var(--color-ink);
      border-bottom-color: var(--color-accent);
    }

    .flash {
      padding: 12px 16px;
      margin-bottom: 24px;
      background: rgba(139, 111, 71, 0.08);
      border-left: 3px solid var(--color-accent);
      font-size: 0.95rem;
    }
    .flash.error {
      background: rgba(177, 83, 42, 0.08);
      border-left-color: #b1532a;
      color: #8a3d1f;
    }

    .grid-admin {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 48px;
      align-items: start;
    }

    .list {
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      position: sticky;
      top: 112px;
      max-height: calc(100vh - 144px);
      overflow-y: auto;
    }
    .list-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-line);
      background: var(--color-bg-alt);
    }
    .list-head h2 { font-size: 1rem; margin: 0; letter-spacing: 0.04em; }
    .list ul { list-style: none; margin: 0; padding: 0; }
    .list li {
      display: flex;
      align-items: stretch;
      border-bottom: 1px solid var(--color-line);
    }
    .list li:last-child { border-bottom: 0; }
    .list li.selected { background: rgba(139, 111, 71, 0.08); }
    .row {
      flex: 1;
      text-align: left;
      background: transparent;
      border: 0;
      padding: 14px 20px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .row:hover { background: var(--color-bg-alt); }
    .row-title { color: var(--color-ink); font-size: 0.95rem; }
    .row-meta { font-size: 0.75rem; color: var(--color-mute); letter-spacing: 0.06em; text-transform: uppercase; }
    .row-del {
      background: transparent;
      border: 0;
      padding: 0 16px;
      color: var(--color-mute);
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
    }
    .row-del:hover { color: #b1532a; }

    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 32px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .form h2 { margin: 0 0 8px; font-size: 1.5rem; }

    .field-with-picker {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }
    .field-with-picker label { flex: 1; }
    .btn-pick {
      flex-shrink: 0;
      padding: 10px 14px;
      background: var(--color-bg-alt);
      border: 1px solid var(--color-line);
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
      cursor: pointer;
      white-space: nowrap;
      height: 40px;
      align-self: flex-end;
    }
    .btn-pick:hover { border-color: var(--color-accent); color: var(--color-accent); }

    .form label, .texts-form label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form label > span, .texts-form label > span {
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .form input[type="text"],
    .form input[type="number"],
    .form input[type="url"],
    .form input[type="date"],
    .form textarea,
    .texts-form input[type="text"],
    .texts-form input[type="email"],
    .texts-form input[type="tel"],
    .texts-form textarea {
      padding: 10px 12px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      font: inherit;
      color: var(--color-ink);
      border-radius: 0;
    }
    .form input:focus,
    .form textarea:focus,
    .texts-form input:focus,
    .texts-form textarea:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form textarea, .texts-form textarea {
      font-family: var(--sans, inherit);
      resize: vertical;
    }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .check {
      flex-direction: row !important;
      align-items: center;
      gap: 10px !important;
    }
    .check span {
      text-transform: none !important;
      letter-spacing: 0 !important;
      font-size: 0.95rem !important;
      color: var(--color-ink) !important;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-top: 8px;
    }
    .btn-primary {
      padding: 12px 28px;
      background: var(--color-ink);
      color: var(--color-bg);
      border: 0;
      font-size: 0.875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background var(--transition);
    }
    .btn-primary:hover:not(:disabled) { background: var(--color-accent-deep); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-link {
      background: none;
      border: 0;
      color: var(--color-accent);
      font-size: 0.875rem;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }

    .status { color: var(--color-mute); padding: 16px 20px; }

    /* Texts tab */
    .texts-form {
      display: flex;
      flex-direction: column;
      gap: 48px;
    }
    .texts-section {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .texts-section-title {
      font-size: 1.25rem;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--color-ink);
      margin: 0;
    }
    .texts-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .texts-group-label {
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      font-family: var(--sans);
      font-weight: 500;
      margin: 0 0 4px;
    }
    .texts-actions {
      padding-top: 8px;
    }

    /* Photos tab */
    .photos-tab {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .photos-upload-zone {
      padding: 32px;
      border: 2px dashed var(--color-line);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .photos-upload-zone h2 { margin: 0; font-size: 1.25rem; }
    .photos-upload-hint { margin: 0; font-size: 0.85rem; color: var(--color-mute); }
    .photos-count { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-mute); }
    .photos-empty { padding: 0; }
    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .photo-card {
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      display: flex;
      flex-direction: column;
    }
    .photo-thumb {
      aspect-ratio: 4/3;
      overflow: hidden;
      background: var(--color-bg-alt);
    }
    .photo-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-info {
      padding: 8px 10px 4px;
    }
    .photo-name {
      font-size: 0.75rem;
      color: var(--color-mute);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .photo-actions {
      display: flex;
      align-items: center;
      padding: 4px 6px 8px;
      gap: 6px;
    }
    .btn-copy {
      flex: 1;
      padding: 6px 8px;
      background: transparent;
      border: 1px solid var(--color-line);
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
      cursor: pointer;
    }
    .btn-copy:hover { border-color: var(--color-accent); color: var(--color-accent); }
    .photo-del {
      background: transparent;
      border: 0;
      color: var(--color-mute);
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px 6px;
    }
    .photo-del:hover { color: #b1532a; }

    /* Photo thumb button */
    .photo-thumb-btn {
      display: block;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 0;
      background: none;
      cursor: zoom-in;
    }
    .photo-thumb-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-thumb-btn:hover img { opacity: 0.85; }

    /* Photo viewer (lightbox) */
    .viewer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .viewer-panel {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 64px 80px 56px;
      box-sizing: border-box;
    }
    .viewer-img-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      max-height: 100%;
    }
    .viewer-img-wrap img {
      max-width: 100%;
      max-height: calc(100vh - 120px);
      object-fit: contain;
      display: block;
      box-shadow: 0 8px 48px rgba(0,0,0,0.6);
    }
    .viewer-close {
      position: absolute;
      top: 16px;
      right: 20px;
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.7);
      font-size: 2.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 4px 10px;
      z-index: 10;
    }
    .viewer-close:hover { color: #fff; }
    .viewer-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 24px;
      background: rgba(0,0,0,0.5);
      color: rgba(255,255,255,0.75);
      font-size: 0.8rem;
      letter-spacing: 0.06em;
    }
    .viewer-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Photo picker overlay */
    .picker-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .picker-panel {
      background: var(--color-bg);
      width: 100%;
      max-width: 860px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }
    .picker-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--color-line);
      flex-shrink: 0;
    }
    .picker-head h3 { margin: 0; font-size: 1.1rem; }
    .picker-close {
      background: transparent;
      border: 0;
      font-size: 1.5rem;
      color: var(--color-mute);
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
    }
    .picker-close:hover { color: var(--color-ink); }
    .picker-hint {
      padding: 12px 24px 0;
      font-size: 0.85rem;
      color: var(--color-mute);
      flex-shrink: 0;
      margin: 0;
    }
    .picker-empty {
      padding: 32px 24px;
      color: var(--color-mute);
      font-size: 0.9rem;
    }
    .picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
      padding: 16px 24px 24px;
      overflow-y: auto;
    }
    .picker-item {
      border: 2px solid var(--color-line);
      background: var(--color-bg-alt);
      padding: 0;
      cursor: pointer;
      aspect-ratio: 1;
      overflow: hidden;
    }
    .picker-item:hover { border-color: var(--color-accent); }
    .picker-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
      .field-with-picker { flex-direction: column; align-items: stretch; }
      .btn-pick { align-self: flex-start; }
      .photos-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    }

    /* Onglet Accueil (ordre éditorial + catégories) */
    .home-editor h2 { margin: 32px 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .home-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .ordering-list, .cat-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; cursor: grab; user-select: none; }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .thumb { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; }
    .home-row .thumb-round { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }

    /* Hint sous le formulaire pièce/expo quand pas encore enregistré */
    .slides-hint { margin-top: 24px; padding: 12px 16px; background: var(--color-bg-alt); border-left: 3px solid var(--color-mute); font-size: 0.85rem; color: var(--color-ink-soft); font-style: italic; }
  `]
})
export class AdminComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<Tab>('furniture');
  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly loadingExhibitions = signal(true);
  protected readonly loadingTexts = signal(true);
  protected readonly loadingPhotos = signal(false);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingFurnitureId = signal<string | null>(null);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly editingExhibitionId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly messageType = signal<'success' | 'error'>('success');
  protected readonly photoPicker = signal<PickerTarget | null>(null);
  protected readonly viewingPhoto = signal<Photo | null>(null);

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

  protected readonly textsForm = this.fb.group({
    home_hero_eyebrow: [''],
    home_hero_title: [''],
    home_hero_lead: [''],
    home_featured_eyebrow: [''],
    home_featured_title: [''],
    home_exhibitions_eyebrow: [''],
    home_exhibitions_title: [''],
    home_quote_text: [''],
    home_quote_cite: [''],
    studio_step1_title: [''],
    studio_step1_desc: [''],
    studio_step2_title: [''],
    studio_step2_desc: [''],
    studio_step3_title: [''],
    studio_step3_desc: [''],
    studio_step4_title: [''],
    studio_step4_desc: [''],
    profile_studio: [''],
    profile_tagline: [''],
    profile_bio: [''],
    profile_contactEmail: [''],
    profile_phone: [''],
    profile_location: [''],
    profile_awards: [''],
    profile_press: [''],
  });

  constructor() {
    this.refreshFurniture();
    this.refreshExhibitions();
    this.refreshTexts();
    this.refreshPhotos();
  }

  switchTab(tab: Tab) {
    this.tab.set(tab);
    this.message.set(null);
    if (tab === 'home') this.loadHomeTab();
  }

  protected readonly homeItems = signal<HomeAdminItem[] | null>(null);
  protected readonly categoryMeta = signal<AdminCategoryView[] | null>(null);
  protected readonly exhibitionsMeta = signal<ExhibitionMetaRow[] | null>(null);

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

    this.portfolio.getAdminCategories().subscribe(c => this.categoryMeta.set(c));

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

  onCategoryReorder(order: number[]) {
    const current = this.categoryMeta();
    if (!current) return;
    this.categoryMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
    this.persistCategories();
  }

  toggleCategoryVisibility(c: AdminCategoryView, event: Event) {
    const visible = (event.target as HTMLInputElement).checked;
    this.categoryMeta.update(cats => cats?.map(x => x.category === c.category ? { ...x, visible } : x) ?? null);
    this.persistCategories();
  }

  private persistCategories() {
    const cats = this.categoryMeta() ?? [];
    const requests = cats.map(c => this.portfolio.updateAdminCategory(c.category, c));
    if (requests.length === 0) return;
    forkJoin(requests).subscribe({
      next: () => this.flash('Catégories enregistrées.', 'success'),
      error: () => this.flash('Impossible d\'enregistrer les catégories.', 'error'),
    });
  }

  onExhibitionMetaReorder(order: number[]) {
    const current = this.exhibitionsMeta();
    if (!current) return;
    this.exhibitionsMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
    this.persistExhibitionsMeta();
  }

  toggleExhibitionVisibility(row: ExhibitionMetaRow, event: Event) {
    const visible = (event.target as HTMLInputElement).checked;
    this.exhibitionsMeta.update(rows => rows?.map(x => x.slug === row.slug ? { ...x, visible } : x) ?? null);
    this.persistExhibitionsMeta();
  }

  private persistExhibitionsMeta() {
    const rows = this.exhibitionsMeta() ?? [];
    const requests = rows.map(r => this.portfolio.updateAdminExhibitionMeta(r.slug, {
      slug: r.slug, position: r.position, visible: r.visible,
    }));
    if (requests.length === 0) return;
    forkJoin(requests).subscribe({
      next: () => this.flash('Expositions enregistrées.', 'success'),
      error: () => this.flash('Impossible d\'enregistrer les expositions.', 'error'),
    });
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

  private refreshTexts() {
    this.loadingTexts.set(true);
    this.portfolio.getContent().subscribe({
      next: content => {
        this.loadingTexts.set(false);
        this.textsForm.reset({
          home_hero_eyebrow: content['home.hero.eyebrow'] ?? '',
          home_hero_title: content['home.hero.title'] ?? '',
          home_hero_lead: content['home.hero.lead'] ?? '',
          home_featured_eyebrow: content['home.featured.eyebrow'] ?? '',
          home_featured_title: content['home.featured.title'] ?? '',
          home_exhibitions_eyebrow: content['home.exhibitions.eyebrow'] ?? '',
          home_exhibitions_title: content['home.exhibitions.title'] ?? '',
          home_quote_text: content['home.quote.text'] ?? '',
          home_quote_cite: content['home.quote.cite'] ?? '',
          studio_step1_title: content['studio.step1.title'] ?? '',
          studio_step1_desc: content['studio.step1.desc'] ?? '',
          studio_step2_title: content['studio.step2.title'] ?? '',
          studio_step2_desc: content['studio.step2.desc'] ?? '',
          studio_step3_title: content['studio.step3.title'] ?? '',
          studio_step3_desc: content['studio.step3.desc'] ?? '',
          studio_step4_title: content['studio.step4.title'] ?? '',
          studio_step4_desc: content['studio.step4.desc'] ?? '',
          profile_studio: content['profile.studio'] ?? '',
          profile_tagline: content['profile.tagline'] ?? '',
          profile_bio: content['profile.bio'] ?? '',
          profile_contactEmail: content['profile.contactEmail'] ?? '',
          profile_phone: content['profile.phone'] ?? '',
          profile_location: content['profile.location'] ?? '',
          profile_awards: content['profile.awards'] ?? '',
          profile_press: content['profile.press'] ?? '',
        });
      },
      error: () => { this.loadingTexts.set(false); this.flash('Impossible de charger les textes.', 'error'); }
    });
  }

  private refreshPhotos() {
    this.loadingPhotos.set(true);
    this.portfolio.getPhotos().subscribe({
      next: data => { this.photos.set(data); this.loadingPhotos.set(false); },
      error: () => { this.loadingPhotos.set(false); }
    });
  }

  saveTexts() {
    const v = this.textsForm.getRawValue();
    const payload: SiteContent = {
      'home.hero.eyebrow': v.home_hero_eyebrow ?? '',
      'home.hero.title': v.home_hero_title ?? '',
      'home.hero.lead': v.home_hero_lead ?? '',
      'home.featured.eyebrow': v.home_featured_eyebrow ?? '',
      'home.featured.title': v.home_featured_title ?? '',
      'home.exhibitions.eyebrow': v.home_exhibitions_eyebrow ?? '',
      'home.exhibitions.title': v.home_exhibitions_title ?? '',
      'home.quote.text': v.home_quote_text ?? '',
      'home.quote.cite': v.home_quote_cite ?? '',
      'studio.step1.title': v.studio_step1_title ?? '',
      'studio.step1.desc': v.studio_step1_desc ?? '',
      'studio.step2.title': v.studio_step2_title ?? '',
      'studio.step2.desc': v.studio_step2_desc ?? '',
      'studio.step3.title': v.studio_step3_title ?? '',
      'studio.step3.desc': v.studio_step3_desc ?? '',
      'studio.step4.title': v.studio_step4_title ?? '',
      'studio.step4.desc': v.studio_step4_desc ?? '',
      'profile.studio': v.profile_studio ?? '',
      'profile.tagline': v.profile_tagline ?? '',
      'profile.bio': v.profile_bio ?? '',
      'profile.contactEmail': v.profile_contactEmail ?? '',
      'profile.phone': v.profile_phone ?? '',
      'profile.location': v.profile_location ?? '',
      'profile.awards': v.profile_awards ?? '',
      'profile.press': v.profile_press ?? '',
    };

    this.saving.set(true);
    this.portfolio.updateContent(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.flash('Textes mis à jour avec succès.', 'success');
      },
      error: () => {
        this.saving.set(false);
        this.flash('Erreur lors de l\'enregistrement des textes.', 'error');
      }
    });
  }

  newFurniture() {
    this.editingFurnitureSlug.set(null);
    this.editingFurnitureId.set(null);
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '',
      gallery: '', dimensions: '', shortDescription: '', description: '', featured: false,
    });
    this.message.set(null);
  }

  loadFurniture(item: Furniture) {
    this.editingFurnitureSlug.set(item.slug);
    this.editingFurnitureId.set(item.id ?? null);
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
    this.editingExhibitionId.set(null);
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '',
      gallery: '', tags: '', shortDescription: '', description: '', featured: false,
    });
    this.message.set(null);
  }

  loadExhibition(item: Exhibition) {
    this.editingExhibitionSlug.set(item.slug);
    this.editingExhibitionId.set(item.id ?? null);
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

  uploadFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    this.uploading.set(true);
    let remaining = files.length;
    let errors = 0;

    for (const file of files) {
      this.portfolio.uploadPhoto(file).subscribe({
        next: photo => {
          this.photos.update(list => [photo, ...list]);
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            const msg = errors > 0
              ? `${files.length - errors} photo(s) importée(s), ${errors} erreur(s).`
              : `${files.length} photo(s) importée(s) avec succès.`;
            this.flash(msg, errors > 0 ? 'error' : 'success');
          }
        },
        error: () => {
          errors++;
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            this.flash(`${files.length - errors} photo(s) importée(s), ${errors} erreur(s).`, 'error');
          }
        }
      });
    }

    input.value = '';
  }

  removePhoto(photo: Photo) {
    if (!confirm(`Supprimer la photo "${photo.originalName}" ?`)) return;
    this.portfolio.deletePhoto(photo.id).subscribe({
      next: () => {
        this.photos.update(list => list.filter(p => p.id !== photo.id));
        this.flash('Photo supprimée.', 'success');
      },
      error: () => this.flash('Erreur lors de la suppression.', 'error')
    });
  }

  copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.flash('URL copiée dans le presse-papier.', 'success');
    });
  }

  openPicker(target: PickerTarget) {
    this.photoPicker.set(target);
    if (this.photos().length === 0) {
      this.refreshPhotos();
    }
  }

  closePicker() {
    this.photoPicker.set(null);
  }

  protected pickerIsGallery(): boolean {
    const t = this.photoPicker();
    return t === 'furniture-gallery' || t === 'exhibition-gallery';
  }

  selectPhoto(photo: Photo) {
    const target = this.photoPicker();
    if (target === 'furniture-cover') {
      this.furnitureForm.patchValue({ coverImage: photo.url });
    } else if (target === 'furniture-gallery') {
      const current = this.furnitureForm.get('gallery')!.value ?? '';
      const updated = current.trim() ? current.trim() + '\n' + photo.url : photo.url;
      this.furnitureForm.patchValue({ gallery: updated });
    } else if (target === 'exhibition-cover') {
      this.exhibitionForm.patchValue({ coverImage: photo.url });
    } else if (target === 'exhibition-gallery') {
      const current = this.exhibitionForm.get('gallery')!.value ?? '';
      const updated = current.trim() ? current.trim() + '\n' + photo.url : photo.url;
      this.exhibitionForm.patchValue({ gallery: updated });
    }
    if (!this.pickerIsGallery()) {
      this.photoPicker.set(null);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (this.viewingPhoto() && event.key === 'Escape') {
      this.closeViewer(); event.preventDefault();
    } else if (this.photoPicker() && event.key === 'Escape') {
      this.closePicker(); event.preventDefault();
    }
  }

  openViewer(photo: Photo) {
    this.viewingPhoto.set(photo);
  }

  closeViewer() {
    this.viewingPhoto.set(null);
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
