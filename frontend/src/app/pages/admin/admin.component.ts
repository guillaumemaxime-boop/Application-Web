import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { Photo } from '../../models/photo.model';
import { AdminFeedEntry, AdminCategoryView, AdminExhibitionMetaView } from '../../models/home.model';
import { PortfolioService } from '../../services/portfolio.service';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { SlidesEditorComponent } from './slides-editor.component';
import { MailSettingsComponent } from './mail-settings/mail-settings.component';
import { TITLE_FONTS, TITLE_STYLES, titleStyle, TypoRole, TYPO_ROLES } from '../../utils/title-style';

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

type Tab = 'furniture' | 'exhibitions' | 'texts' | 'photos' | 'home' | 'typography' | 'analytics' | 'email';
type PickerTarget = 'furniture-cover' | 'furniture-gallery' | 'exhibition-cover' | 'exhibition-gallery';

interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgStyle, ReorderableDirective, SlidesEditorComponent, MailSettingsComponent],
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
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'typography'"
              [class.active]="tab() === 'typography'"
              (click)="switchTab('typography')">Typographie</button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'analytics'"
              [class.active]="tab() === 'analytics'"
              (click)="switchTab('analytics')">Analytics</button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'email'"
              [class.active]="tab() === 'email'"
              (click)="switchTab('email')">Email</button>
          </nav>

          <div class="admin-content">

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

              <div class="field-with-picker">
                <label>
                  <span>Image principale (URL)</span>
                  <input type="url" formControlName="coverImage" />
                </label>
                <button type="button" class="btn-pick" (click)="openPicker('furniture-cover')" title="Choisir depuis la médiathèque">
                  Médiathèque
                </button>
              </div>

              <div class="gallery-block">
                <div class="gallery-block-head">
                  <span class="gallery-label">Galerie</span>
                  <button type="button" class="btn-pick" (click)="openPicker('furniture-gallery')" title="Ajouter depuis la médiathèque">
                    + Ajouter
                  </button>
                </div>
                @if (furnitureGallery().length === 0) {
                  <p class="gallery-empty">Aucune image. Cliquez sur « Ajouter » pour insérer une photo depuis la médiathèque.</p>
                } @else {
                  <ul class="gallery-thumbs" appReorderable (reordered)="onFurnitureGalleryReorder($event)">
                    @for (url of furnitureGallery(); track url) {
                      <li class="gallery-thumb">
                        <img [src]="url" alt="" />
                        <button type="button" class="thumb-remove" (click)="removeFurnitureGalleryImage(url)" aria-label="Retirer">×</button>
                      </li>
                    }
                  </ul>
                  <p class="gallery-hint">Glisse une vignette pour réordonner.</p>
                }
              </div>

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
              <div class="form-head">
                <h2>Nouvelle exposition</h2>
                @if (editingExhibitionSlug(); as s) {
                  <a class="view-link" [href]="'/expositions/' + s" target="_blank" rel="noopener" title="Voir sur le site">Voir sur le site ↗</a>
                }
              </div>

              <label>
                <span>Titre *</span>
                <input type="text" formControlName="title" />
              </label>
              @if (editingExhibitionSlug()) {
                <label class="readonly-row">
                  <span>Slug</span>
                  <input type="text" formControlName="slug" readonly />
                </label>
              }
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

              <div class="gallery-block">
                <div class="gallery-block-head">
                  <span class="gallery-label">Galerie</span>
                  <button type="button" class="btn-pick" (click)="openPicker('exhibition-gallery')" title="Ajouter depuis la médiathèque">
                    + Ajouter
                  </button>
                </div>
                @if (exhibitionGallery().length === 0) {
                  <p class="gallery-empty">Aucune image. Cliquez sur « Ajouter » pour insérer une photo depuis la médiathèque.</p>
                } @else {
                  <ul class="gallery-thumbs" appReorderable (reordered)="onExhibitionGalleryReorder($event)">
                    @for (url of exhibitionGallery(); track url) {
                      <li class="gallery-thumb">
                        <img [src]="url" alt="" />
                        <button type="button" class="thumb-remove" (click)="removeExhibitionGalleryImage(url)" aria-label="Retirer">×</button>
                      </li>
                    }
                  </ul>
                  <p class="gallery-hint">Glisse une vignette pour réordonner.</p>
                }
              </div>

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
                    class="chip-input-field"
                  />
                </div>
              </label>
              <label>
                <span>Description courte</span>
                <textarea rows="2" formControlName="shortDescription"></textarea>
              </label>
              <label>
                <span>Description longue</span>
                <textarea rows="5" formControlName="description"></textarea>
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
                <h2 class="texts-section-title">Contact &amp; réseaux sociaux</h2>

                <div class="texts-group">
                  <label>
                    <span>Localisation</span>
                    <input type="text" formControlName="profile_location" />
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
                  <div class="row-2">
                    <label>
                      <span>Instagram (URL)</span>
                      <input type="url" formControlName="profile_instagram" placeholder="https://instagram.com/votre-handle" />
                    </label>
                    <label>
                      <span>LinkedIn (URL)</span>
                      <input type="url" formControlName="profile_linkedin" placeholder="https://www.linkedin.com/in/votre-profil" />
                    </label>
                  </div>
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

        @if (tab() === 'typography') {
          <div class="typo-editor">
            <p class="hint">Choisis une police et un style pour chaque rôle typographique. Les changements s'appliquent automatiquement à toutes les zones du site qui partagent ce rôle.</p>
            <form [formGroup]="typoForm" (ngSubmit)="saveTypo()">
              <div class="typo-grid">
                @for (role of typoRoles; track role.value) {
                  <article class="typo-card">
                    <header>
                      <h3>{{ role.label }}</h3>
                      <span class="role-key">typo.{{ role.value }}</span>
                    </header>

                    <div class="typo-controls">
                      <label>
                        <span>Police</span>
                        <select [formControlName]="role.value + '_font'">
                          <option value="">— par défaut —</option>
                          @for (f of titleFonts; track f.value) {
                            <option [value]="f.value">{{ f.label }}</option>
                          }
                        </select>
                      </label>
                      <label>
                        <span>Style</span>
                        <select [formControlName]="role.value + '_style'">
                          <option value="">— par défaut —</option>
                          @for (s of titleStyles; track s.value) {
                            <option [value]="s.value">{{ s.label }}</option>
                          }
                        </select>
                      </label>
                    </div>

                    <div class="typo-preview" [class.eyebrow-preview]="role.value === 'eyebrow'" [ngStyle]="previewStyleFor(role.value)">
                      {{ role.preview }}
                    </div>
                  </article>
                }
              </div>

              <div class="texts-actions">
                <button type="submit" class="btn-primary" [disabled]="savingTypo()">
                  {{ savingTypo() ? 'Enregistrement…' : 'Enregistrer la typographie' }}
                </button>
              </div>
            </form>
          </div>
        }

        @if (tab() === 'analytics') {
          @if (umamiConfigured()) {
            <iframe
              class="umami-frame"
              [src]="umamiIframeUrl()"
              title="Analytics Umami"
              loading="lazy"></iframe>
          } @else {
            <div class="umami-fallback">
              <h2>Analytics</h2>
              <p>Configuration analytics manquante. Renseignez <code>UMAMI_WEBSITE_ID</code> et <code>UMAMI_SHARE_TOKEN</code> dans les variables d'environnement du conteneur frontend, puis redémarrez-le.</p>
            </div>
          }
        }

        @if (tab() === 'email') {
          <app-mail-settings></app-mail-settings>
        }
          </div>
        </div>
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

    .admin-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 40px;
      align-items: start;
    }
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
      .admin-layout {
        grid-template-columns: 1fr;
        gap: 0;
      }
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
    @media (max-width: 600px) {
      .toast-stack {
        left: 12px;
        right: 12px;
        bottom: 12px;
        max-width: none;
      }
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
    .form h2 { margin: 0; font-size: 1.5rem; }
    .form-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .view-link {
      font-size: 0.78rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-mute);
      text-decoration: none;
      white-space: nowrap;
    }
    .view-link:hover { color: var(--color-accent); }
    .readonly-row input[readonly] {
      background: var(--color-bg-alt);
      color: var(--color-ink-soft);
      cursor: default;
    }

    .chips-input {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      min-height: 40px;
      align-items: center;
    }
    .chips-input:focus-within { border-color: var(--color-accent); }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 4px 4px 10px;
      background: var(--color-bg-alt);
      border: 1px solid var(--color-line);
      font-size: 0.82rem;
      color: var(--color-ink);
    }
    .chip-remove {
      background: none;
      border: none;
      font-size: 1rem;
      line-height: 1;
      padding: 2px 6px;
      color: var(--color-mute);
      cursor: pointer;
    }
    .chip-remove:hover { color: #b1532a; }
    .chip-input-field {
      flex: 1;
      min-width: 140px;
      padding: 6px 8px;
      border: none;
      background: transparent;
      font-size: 0.9rem;
      outline: none;
    }

    .gallery-block {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .gallery-block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .gallery-label {
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    .gallery-block .btn-pick { height: auto; padding: 8px 14px; }
    .gallery-empty {
      margin: 0;
      padding: 16px;
      font-size: 0.85rem;
      color: var(--color-ink-soft);
      font-style: italic;
      background: var(--color-bg-alt);
      border: 1px dashed var(--color-line);
      text-align: center;
    }
    .gallery-thumbs {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
    }
    .gallery-thumb {
      position: relative;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      border: 1px solid var(--color-line);
      background: var(--color-bg-alt);
      cursor: grab;
    }
    .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      border: none;
      color: #fff;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .thumb-remove:hover { background: rgba(0, 0, 0, 0.9); }
    .gallery-hint {
      margin: 0;
      font-size: 0.75rem;
      color: var(--color-mute);
      font-style: italic;
    }

    .dim-fieldset {
      border: 1px solid var(--color-line);
      padding: 16px;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .dim-fieldset legend {
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
      padding: 0 8px;
    }
    .dim-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .dim-cell { gap: 4px; }
    .dim-cell span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .dim-notes { gap: 4px; }
    .dim-notes span { font-size: 0.78rem; color: var(--color-ink-soft); }
    @media (max-width: 600px) {
      .dim-grid { grid-template-columns: 1fr; }
    }

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

    .umami-frame {
      width: 100%;
      height: calc(100vh - 280px);
      min-height: 600px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .umami-fallback {
      padding: 48px;
      border: 1px dashed var(--color-line);
      background: var(--color-bg-alt);
      text-align: center;
    }
    .umami-fallback h2 { margin: 0 0 16px; font-size: 1.5rem; }
    .umami-fallback p { margin: 0; color: var(--color-ink-soft); }
    .umami-fallback code {
      background: var(--color-bg);
      padding: 2px 6px;
      border: 1px solid var(--color-line);
      font-size: 0.85rem;
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
    .ordering-list, .cat-list, .nav-vis-list { list-style: none; padding: 0; margin: 0; }

    .typo-editor { max-width: 920px; }
    .typo-editor .hint { margin: 0 0 32px; color: var(--color-ink-soft); font-size: 0.92rem; }
    .typo-grid { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
    .typo-card {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 24px;
      align-items: center;
      padding: 24px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
    }
    .typo-card header { display: flex; flex-direction: column; gap: 6px; }
    .typo-card header h3 { font-family: var(--serif); font-weight: 400; font-size: 1.3rem; line-height: 1.2; margin: 0; color: var(--color-ink); }
    .typo-card .role-key {
      font-size: 0.7rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .typo-controls {
      grid-column: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    .typo-controls label { display: flex; flex-direction: column; gap: 6px; }
    .typo-controls label > span {
      font-size: 0.7rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .typo-controls select {
      font: inherit;
      padding: 8px 10px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      color: var(--color-ink);
    }
    .typo-preview {
      grid-column: 2;
      grid-row: 1 / span 2;
      padding: 24px;
      background: var(--color-bg-alt);
      border-left: 2px solid var(--color-ink);
      font-size: 1.6rem;
      line-height: 1.25;
      color: var(--color-ink);
    }
    .typo-preview.eyebrow-preview {
      font-size: 0.78rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    @media (max-width: 720px) {
      .typo-card { grid-template-columns: 1fr; }
      .typo-controls { grid-column: 1; }
      .typo-preview { grid-column: 1; grid-row: auto; }
    }
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
  private readonly sanitizer = inject(DomSanitizer);

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
  protected readonly savingTypo = signal(false);
  protected readonly uploading = signal(false);
  protected readonly sidebarOpen = signal(false);
  private readonly tabLabels: Record<Tab, string> = {
    furniture: 'Mobilier',
    exhibitions: 'Expositions',
    texts: 'Textes du site',
    photos: 'Médiathèque',
    home: 'Accueil',
    typography: 'Typographie',
    analytics: 'Analytics',
    email: 'Email',
  };
  protected readonly currentTabLabel = computed(() => this.tabLabels[this.tab()]);

  protected readonly toasts = signal<Toast[]>([]);
  private toastCounter = 0;
  // Computed pour rétro-compatibilité des tests existants qui lisent message()/messageType()
  protected readonly message = computed<string | null>(() => {
    const list = this.toasts();
    return list.length === 0 ? null : list[list.length - 1].text;
  });
  protected readonly messageType = computed<'success' | 'error'>(() => {
    const list = this.toasts();
    return list.length === 0 ? 'success' : list[list.length - 1].type;
  });
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
    dimW: [null as number | null],
    dimD: [null as number | null],
    dimH: [null as number | null],
    dimNotes: [''],
    shortDescription: [''],
    description: [''],
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
    shortDescription: [''],
    description: [''],
  });

  protected readonly furnitureGallery = signal<string[]>([]);
  protected readonly exhibitionGallery = signal<string[]>([]);
  protected readonly exhibitionTags = signal<string[]>([]);
  protected readonly newExhibitionTag = signal('');

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
    profile_contactEmail: [''],
    profile_phone: [''],
    profile_location: [''],
    profile_instagram: [''],
    profile_linkedin: [''],
  });

  protected readonly titleFonts = TITLE_FONTS;
  protected readonly titleStyles = TITLE_STYLES;
  protected readonly typoRoles = TYPO_ROLES;

  protected readonly typoForm = this.fb.group({
    'title_font': [''],
    'title_style': [''],
    'section-title_font': [''],
    'section-title_style': [''],
    'subtitle_font': [''],
    'subtitle_style': [''],
    'card-title_font': [''],
    'card-title_style': [''],
    'eyebrow_font': [''],
    'eyebrow_style': [''],
  });

  constructor() {
    this.refreshFurniture();
    this.refreshExhibitions();
    this.refreshTexts();
    this.refreshPhotos();
  }

  switchTab(tab: Tab) {
    this.tab.set(tab);
    this.sidebarOpen.set(false);
    if (tab === 'home') this.loadHomeTab();
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  protected readonly homeItems = signal<HomeAdminItem[] | null>(null);
  protected readonly categoryMeta = signal<AdminCategoryView[] | null>(null);
  protected readonly exhibitionsMeta = signal<ExhibitionMetaRow[] | null>(null);

  protected readonly navMobilierVisible = signal(true);
  protected readonly navExpositionsVisible = signal(true);
  protected readonly navStudioVisible = signal(true);

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
          profile_contactEmail: content['profile.contactEmail'] ?? '',
          profile_phone: content['profile.phone'] ?? '',
          profile_location: content['profile.location'] ?? '',
          profile_instagram: content['profile.instagram'] ?? '',
          profile_linkedin: content['profile.linkedin'] ?? '',
        });
        this.hydrateTypoRoles(content);
        this.navMobilierVisible.set(content['nav.mobilier.visible'] !== 'false');
        this.navExpositionsVisible.set(content['nav.expositions.visible'] !== 'false');
        this.navStudioVisible.set(content['nav.studio.visible'] !== 'false');
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
      'profile.contactEmail': v.profile_contactEmail ?? '',
      'profile.phone': v.profile_phone ?? '',
      'profile.location': v.profile_location ?? '',
      'profile.instagram': v.profile_instagram ?? '',
      'profile.linkedin': v.profile_linkedin ?? '',
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

  private hydrateTypoRoles(content: SiteContent) {
    this.typoForm.reset({
      'title_font': content['typo.title.font'] ?? '',
      'title_style': content['typo.title.style'] ?? '',
      'section-title_font': content['typo.section-title.font'] ?? '',
      'section-title_style': content['typo.section-title.style'] ?? '',
      'subtitle_font': content['typo.subtitle.font'] ?? '',
      'subtitle_style': content['typo.subtitle.style'] ?? '',
      'card-title_font': content['typo.card-title.font'] ?? '',
      'card-title_style': content['typo.card-title.style'] ?? '',
      'eyebrow_font': content['typo.eyebrow.font'] ?? '',
      'eyebrow_style': content['typo.eyebrow.style'] ?? '',
    });
  }

  protected previewStyleFor(role: TypoRole): { [prop: string]: string } {
    const v = this.typoForm.getRawValue();
    const synthetic: SiteContent = {
      [`typo.${role}.font`]: (v[`${role}_font` as keyof typeof v] as string) ?? '',
      [`typo.${role}.style`]: (v[`${role}_style` as keyof typeof v] as string) ?? '',
    };
    return titleStyle(synthetic, `typo.${role}`);
  }

  saveTypo() {
    const v = this.typoForm.getRawValue();
    const payload: SiteContent = {
      'typo.title.font': v['title_font'] ?? '',
      'typo.title.style': v['title_style'] ?? '',
      'typo.section-title.font': v['section-title_font'] ?? '',
      'typo.section-title.style': v['section-title_style'] ?? '',
      'typo.subtitle.font': v['subtitle_font'] ?? '',
      'typo.subtitle.style': v['subtitle_style'] ?? '',
      'typo.card-title.font': v['card-title_font'] ?? '',
      'typo.card-title.style': v['card-title_style'] ?? '',
      'typo.eyebrow.font': v['eyebrow_font'] ?? '',
      'typo.eyebrow.style': v['eyebrow_style'] ?? '',
    };
    this.savingTypo.set(true);
    this.portfolio.updateContent(payload).subscribe({
      next: () => {
        this.savingTypo.set(false);
        this.flash('Typographie enregistrée.', 'success');
      },
      error: () => {
        this.savingTypo.set(false);
        this.flash('Erreur lors de l\'enregistrement de la typographie.', 'error');
      }
    });
  }

  newFurniture() {
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

  loadFurniture(item: Furniture) {
    this.editingFurnitureSlug.set(item.slug);
    this.editingFurnitureId.set(item.id ?? null);
    const dims = this.parseDimensions(item.dimensions ?? []);
    this.furnitureForm.reset({
      title: item.title,
      slug: item.slug,
      category: item.category,
      year: item.year,
      material: item.material ?? '',
      designer: item.designer ?? '',
      coverImage: item.coverImage ?? '',
      dimW: dims.w,
      dimD: dims.d,
      dimH: dims.h,
      dimNotes: dims.notes,
      shortDescription: item.shortDescription ?? '',
      description: item.description ?? '',
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

  removeFurnitureGalleryImage(url: string) {
    this.furnitureGallery.update(g => g.filter(u => u !== url));
  }

  onFurnitureGalleryReorder(order: number[]) {
    const current = this.furnitureGallery();
    this.furnitureGallery.set(order.map(i => current[i]));
  }

  saveFurniture() {
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
      shortDescription: '', description: '',
    });
    this.exhibitionGallery.set([]);
    this.exhibitionTags.set([]);
    this.newExhibitionTag.set('');
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
      shortDescription: item.shortDescription ?? '',
      description: item.description ?? '',
    });
    this.exhibitionGallery.set([...(item.gallery ?? [])]);
    this.exhibitionTags.set([...(item.tags ?? [])]);
    this.newExhibitionTag.set('');
  }

  removeExhibitionGalleryImage(url: string) {
    this.exhibitionGallery.update(g => g.filter(u => u !== url));
  }

  onExhibitionGalleryReorder(order: number[]) {
    const current = this.exhibitionGallery();
    this.exhibitionGallery.set(order.map(i => current[i]));
  }

  addExhibitionTag(event: Event) {
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

  removeExhibitionTag(tag: string) {
    this.exhibitionTags.update(tags => tags.filter(t => t !== tag));
  }

  onTagBackspace(event: Event) {
    if (this.newExhibitionTag() !== '') return;
    event.preventDefault();
    this.exhibitionTags.update(tags => tags.slice(0, -1));
  }

  saveExhibition() {
    if (this.exhibitionForm.invalid) return;
    const v = this.exhibitionForm.getRawValue();
    const slug = this.editingExhibitionSlug();
    const existing = slug ? this.exhibitions().find(e => e.slug === slug) : null;
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
      gallery: [...this.exhibitionGallery()],
      tags: [...this.exhibitionTags()],
      shortDescription: v.shortDescription ?? '',
      description: v.description ?? '',
      featured: existing?.featured ?? false,
    };

    this.saving.set(true);
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
      this.furnitureGallery.update(g => g.includes(photo.url) ? g : [...g, photo.url]);
    } else if (target === 'exhibition-cover') {
      this.exhibitionForm.patchValue({ coverImage: photo.url });
    } else if (target === 'exhibition-gallery') {
      this.exhibitionGallery.update(g => g.includes(photo.url) ? g : [...g, photo.url]);
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

  protected umamiConfigured(): boolean {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    return !!(env && env.websiteId && env.shareToken);
  }

  protected umamiIframeUrl(): SafeResourceUrl {
    const env = (window as unknown as { __UMAMI__?: { websiteId?: string; shareToken?: string } }).__UMAMI__;
    const url = `/umami/share/${env?.shareToken ?? ''}/${env?.websiteId ?? ''}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private splitLines(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
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
