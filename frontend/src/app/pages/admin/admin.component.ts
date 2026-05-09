import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { PortfolioService } from '../../services/portfolio.service';

type Tab = 'furniture' | 'exhibitions' | 'texts';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
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
              <label>
                <span>Image principale (URL)</span>
                <input type="url" formControlName="coverImage" />
              </label>
              <label>
                <span>Galerie (une URL par ligne)</span>
                <textarea rows="3" formControlName="gallery"></textarea>
              </label>
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
              <label>
                <span>Image principale (URL)</span>
                <input type="url" formControlName="coverImage" />
              </label>
              <label>
                <span>Galerie (une URL par ligne)</span>
                <textarea rows="3" formControlName="gallery"></textarea>
              </label>
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
      </div>
    </section>
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

    @media (max-width: 960px) {
      .grid-admin { grid-template-columns: 1fr; }
      .list { position: static; max-height: none; }
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<Tab>('furniture');
  protected readonly furniture = signal<Furniture[]>([]);
  protected readonly exhibitions = signal<Exhibition[]>([]);
  protected readonly loadingFurniture = signal(true);
  protected readonly loadingExhibitions = signal(true);
  protected readonly loadingTexts = signal(true);
  protected readonly editingFurnitureSlug = signal<string | null>(null);
  protected readonly editingExhibitionSlug = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly messageType = signal<'success' | 'error'>('success');

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
  }

  switchTab(tab: Tab) {
    this.tab.set(tab);
    this.message.set(null);
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
    this.furnitureForm.reset({
      title: '', slug: '', category: '', year: new Date().getFullYear(),
      material: '', designer: 'Milo GUILLAUME Design', coverImage: '',
      gallery: '', dimensions: '', shortDescription: '', description: '', featured: false,
    });
    this.message.set(null);
  }

  loadFurniture(item: Furniture) {
    this.editingFurnitureSlug.set(item.slug);
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
    this.exhibitionForm.reset({
      title: '', slug: '', venue: '', city: '', country: '',
      startDate: '', endDate: '', curator: '', coverImage: '',
      gallery: '', tags: '', shortDescription: '', description: '', featured: false,
    });
    this.message.set(null);
  }

  loadExhibition(item: Exhibition) {
    this.editingExhibitionSlug.set(item.slug);
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
