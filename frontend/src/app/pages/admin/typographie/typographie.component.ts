import { Component, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { SiteContent } from '../../../models/site-content.model';
import { TITLE_FONTS, TITLE_SIZES, TITLE_STYLES, titleStyle, TypoRole, TYPO_ROLES } from '../../../utils/title-style';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-typographie',
  standalone: true,
  imports: [ReactiveFormsModule, NgStyle],
  template: `
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
                <label>
                  <span>Taille</span>
                  <select [formControlName]="role.value + '_size'">
                    <option value="">— par défaut —</option>
                    @for (sz of titleSizes; track sz.value) {
                      <option [value]="sz.value">{{ sz.label }}</option>
                    }
                  </select>
                </label>
              </div>

              <div class="typo-preview"
                   [class.eyebrow-preview]="role.value === 'eyebrow'"
                   [ngStyle]="previewStyleFor(role.value)">
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
  `,
  styles: [`
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
    .typo-card .role-key { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .typo-controls { grid-column: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
    .typo-controls label { display: flex; flex-direction: column; gap: 6px; }
    .typo-controls label > span { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .typo-controls select { font: inherit; padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink); }
    .typo-preview { grid-column: 2; grid-row: 1 / span 2; padding: 24px; background: var(--color-bg-alt); border-left: 2px solid var(--color-ink); font-size: 1.6rem; line-height: 1.25; color: var(--color-ink); }
    .typo-preview.eyebrow-preview { font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .texts-actions { display: flex; gap: 12px; }
    .btn-primary { padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0; cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 720px) {
      .typo-card { grid-template-columns: 1fr; }
      .typo-controls { grid-column: 1; }
      .typo-preview { grid-column: 1; grid-row: auto; }
    }
  `]
})
export class TypographieComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly savingTypo = signal(false);
  protected readonly titleFonts = TITLE_FONTS;
  protected readonly titleStyles = TITLE_STYLES;
  protected readonly titleSizes = TITLE_SIZES;
  protected readonly typoRoles = TYPO_ROLES;

  protected readonly typoForm = this.fb.group({
    'title_font': [''],
    'title_style': [''],
    'title_size': [''],
    'section-title_font': [''],
    'section-title_style': [''],
    'section-title_size': [''],
    'subtitle_font': [''],
    'subtitle_style': [''],
    'subtitle_size': [''],
    'card-title_font': [''],
    'card-title_style': [''],
    'card-title_size': [''],
    'eyebrow_font': [''],
    'eyebrow_style': [''],
    'eyebrow_size': [''],
  });

  constructor() {
    this.portfolio.getContent().subscribe({
      next: content => this.hydrateTypoRoles(content),
      error: () => this.toast.error('Impossible de charger la typographie.'),
    });
  }

  private hydrateTypoRoles(content: SiteContent): void {
    this.typoForm.reset({
      'title_font': content['typo.title.font'] ?? '',
      'title_style': content['typo.title.style'] ?? '',
      'title_size': content['typo.title.size'] ?? '',
      'section-title_font': content['typo.section-title.font'] ?? '',
      'section-title_style': content['typo.section-title.style'] ?? '',
      'section-title_size': content['typo.section-title.size'] ?? '',
      'subtitle_font': content['typo.subtitle.font'] ?? '',
      'subtitle_style': content['typo.subtitle.style'] ?? '',
      'subtitle_size': content['typo.subtitle.size'] ?? '',
      'card-title_font': content['typo.card-title.font'] ?? '',
      'card-title_style': content['typo.card-title.style'] ?? '',
      'card-title_size': content['typo.card-title.size'] ?? '',
      'eyebrow_font': content['typo.eyebrow.font'] ?? '',
      'eyebrow_style': content['typo.eyebrow.style'] ?? '',
      'eyebrow_size': content['typo.eyebrow.size'] ?? '',
    });
  }

  protected previewStyleFor(role: TypoRole): { [prop: string]: string } {
    const v = this.typoForm.getRawValue();
    const synthetic: SiteContent = {
      [`typo.${role}.font`]: (v[`${role}_font` as keyof typeof v] as string) ?? '',
      [`typo.${role}.style`]: (v[`${role}_style` as keyof typeof v] as string) ?? '',
      [`typo.${role}.size`]: (v[`${role}_size` as keyof typeof v] as string) ?? '',
    };
    return titleStyle(synthetic, `typo.${role}`);
  }

  saveTypo(): void {
    const v = this.typoForm.getRawValue();
    const payload: SiteContent = {
      'typo.title.font': v['title_font'] ?? '',
      'typo.title.style': v['title_style'] ?? '',
      'typo.title.size': v['title_size'] ?? '',
      'typo.section-title.font': v['section-title_font'] ?? '',
      'typo.section-title.style': v['section-title_style'] ?? '',
      'typo.section-title.size': v['section-title_size'] ?? '',
      'typo.subtitle.font': v['subtitle_font'] ?? '',
      'typo.subtitle.style': v['subtitle_style'] ?? '',
      'typo.subtitle.size': v['subtitle_size'] ?? '',
      'typo.card-title.font': v['card-title_font'] ?? '',
      'typo.card-title.style': v['card-title_style'] ?? '',
      'typo.card-title.size': v['card-title_size'] ?? '',
      'typo.eyebrow.font': v['eyebrow_font'] ?? '',
      'typo.eyebrow.style': v['eyebrow_style'] ?? '',
      'typo.eyebrow.size': v['eyebrow_size'] ?? '',
    };
    this.savingTypo.set(true);
    this.portfolio.updateContent(payload).subscribe({
      next: () => {
        this.savingTypo.set(false);
        this.toast.success('Typographie enregistrée.');
      },
      error: () => {
        this.savingTypo.set(false);
        this.toast.error('Erreur lors de l\'enregistrement de la typographie.');
      }
    });
  }
}
