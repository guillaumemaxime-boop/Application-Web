import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { SiteContent } from '../../../models/site-content.model';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-textes',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (loading()) {
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
        </div>

        <div class="texts-section">
          <h2 class="texts-section-title">Studio</h2>

          <div class="texts-group">
            <h3 class="texts-group-label">Présentation</h3>
            <label>
              <span>Texte de présentation (affiché sur la page Studio)</span>
              <textarea rows="5" formControlName="profile_bio"></textarea>
            </label>
          </div>

          <div class="texts-group">
            <h3 class="texts-group-label">Distinctions</h3>
            <label>
              <span>Une distinction par ligne</span>
              <textarea rows="4" formControlName="profile_awards" placeholder="Prix XYZ — 2024&#10;Nomination ABC — 2023"></textarea>
            </label>
          </div>

          <div class="texts-group">
            <h3 class="texts-group-label">Presse</h3>
            <label>
              <span>Une parution par ligne, au format <code>Titre|Année</code></span>
              <textarea rows="4" formControlName="profile_press" placeholder="AD Magazine — Portrait|2024&#10;Le Monde — Cahier Design|2023"></textarea>
            </label>
          </div>

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
  `,
  styles: [`
    .status { color: var(--color-mute); }
    .texts-form { max-width: 760px; display: flex; flex-direction: column; gap: 40px; }
    .texts-section { display: flex; flex-direction: column; gap: 24px; }
    .texts-section-title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0 0 8px; }
    .texts-group { display: flex; flex-direction: column; gap: 14px; padding: 24px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .texts-group-label { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); margin: 0; }
    .texts-group label { display: flex; flex-direction: column; gap: 6px; }
    .texts-group label > span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .texts-group input, .texts-group textarea {
      font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); resize: vertical;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .texts-actions { display: flex; gap: 12px; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 720px) {
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class TextesComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  protected readonly textsForm = this.fb.group({
    home_hero_eyebrow: [''],
    home_hero_title: [''],
    home_hero_lead: [''],
    profile_bio: [''],
    profile_awards: [''],
    profile_press: [''],
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

  constructor() {
    this.portfolio.getContent().subscribe({
      next: content => {
        this.loading.set(false);
        this.textsForm.reset({
          home_hero_eyebrow: content['home.hero.eyebrow'] ?? '',
          home_hero_title: content['home.hero.title'] ?? '',
          home_hero_lead: content['home.hero.lead'] ?? '',
          profile_bio: content['profile.bio'] ?? '',
          profile_awards: content['profile.awards'] ?? '',
          profile_press: content['profile.press'] ?? '',
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
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger les textes.');
      }
    });
  }

  saveTexts(): void {
    const v = this.textsForm.getRawValue();
    const payload: SiteContent = {
      'home.hero.eyebrow': v.home_hero_eyebrow ?? '',
      'home.hero.title': v.home_hero_title ?? '',
      'home.hero.lead': v.home_hero_lead ?? '',
      'profile.bio': v.profile_bio ?? '',
      'profile.awards': v.profile_awards ?? '',
      'profile.press': v.profile_press ?? '',
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
        this.toast.success('Textes mis à jour avec succès.');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Erreur lors de l\'enregistrement des textes.');
      }
    });
  }
}
