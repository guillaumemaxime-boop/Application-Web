import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { Photo } from '../../models/photo.model';
import { AdminFeedEntry, AdminExhibitionMetaView } from '../../models/home.model';
import { PortfolioService } from '../../services/portfolio.service';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { SlidesEditorComponent } from './slides-editor.component';
import { MailSettingsComponent } from './mail-settings/mail-settings.component';

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

type Tab = 'exhibitions' | 'home' | 'email';
type PickerTarget = 'exhibition-cover' | 'exhibition-gallery';

interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ReorderableDirective, SlidesEditorComponent, MailSettingsComponent],
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
              [attr.aria-selected]="tab() === 'exhibitions'"
              [class.active]="tab() === 'exhibitions'"
              (click)="switchTab('exhibitions')">Expositions</button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'home'"
              [class.active]="tab() === 'home'"
              (click)="switchTab('home')">Accueil</button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'email'"
              [class.active]="tab() === 'email'"
              (click)="switchTab('email')">Email</button>
          </nav>

          <div class="admin-content">

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

        @if (tab() === 'email') {
          <app-mail-settings></app-mail-settings>
        }
          </div>
        </div>
      </div>
    </section>

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

    .form label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form label > span {
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .form input[type="text"],
    .form input[type="number"],
    .form input[type="url"],
    .form input[type="date"],
    .form textarea {
      padding: 10px 12px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      font: inherit;
      color: var(--color-ink);
      border-radius: 0;
    }
    .form input:focus,
    .form textarea:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form textarea {
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
    }

    /* Onglet Accueil (ordre éditorial) */
    .home-editor h2 { margin: 32px 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .home-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .ordering-list, .nav-vis-list, .exh-list { list-style: none; padding: 0; margin: 0; }

    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .home-row .handle { color: var(--color-mute); font-size: 1.1rem; cursor: grab; user-select: none; }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .thumb { width: 40px; height: 40px; object-fit: cover; flex-shrink: 0; }
    .home-row .thumb-round { width: 40px; height: 40px; object-fit: cover; border-radius: 50%; flex-shrink: 0; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }

    /* Hint sous le formulaire expo quand pas encore enregistré */
    .slides-hint { margin-top: 24px; padding: 12px 16px; background: var(--color-bg-alt); border-left: 3px solid var(--color-mute); font-size: 0.85rem; color: var(--color-ink-soft); font-style: italic; }
  `]
})
export class AdminComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<Tab>('exhibitions');
  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly loadingExhibitions = signal(true);
  protected readonly loadingPhotos = signal(false);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly editingExhibitionId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly sidebarOpen = signal(false);
  private readonly tabLabels: Record<Tab, string> = {
    exhibitions: 'Expositions',
    home: 'Accueil',
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

  protected readonly exhibitionGallery = signal<string[]>([]);
  protected readonly exhibitionTags = signal<string[]>([]);
  protected readonly newExhibitionTag = signal('');

  constructor() {
    this.refreshExhibitions();
    this.portfolio.getContent().subscribe(c => {
      this.navMobilierVisible.set(c['nav.mobilier.visible'] !== 'false');
      this.navExpositionsVisible.set(c['nav.expositions.visible'] !== 'false');
      this.navStudioVisible.set(c['nav.studio.visible'] !== 'false');
    });
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

  private refreshExhibitions() {
    this.loadingExhibitions.set(true);
    this.portfolio.getAllExhibitions().subscribe({
      next: data => { this.exhibitions.set(data); this.loadingExhibitions.set(false); },
      error: () => { this.loadingExhibitions.set(false); this.flash('Impossible de charger les expositions.', 'error'); }
    });
  }

  private refreshPhotos() {
    this.loadingPhotos.set(true);
    this.portfolio.getPhotos().subscribe({
      next: data => { this.photos.set(data); this.loadingPhotos.set(false); },
      error: () => { this.loadingPhotos.set(false); }
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
    return t === 'exhibition-gallery';
  }

  selectPhoto(photo: Photo) {
    const target = this.photoPicker();
    if (target === 'exhibition-cover') {
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
