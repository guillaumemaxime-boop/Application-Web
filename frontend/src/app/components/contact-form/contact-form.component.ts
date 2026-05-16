import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../services/portfolio.service';
import { ContactRequestInput } from '../../models/contact.model';

type Status = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="onBackdropClick($event)">
      <div class="panel" role="dialog" aria-modal="true" [attr.aria-labelledby]="'contact-title'">
        <button type="button" class="close" (click)="close()" aria-label="Fermer">✕</button>

        <header class="head">
          <span class="eyebrow">Contact</span>
          <h2 id="contact-title">{{ furnitureTitle ? 'Demande — ' + furnitureTitle : 'Contacter le studio' }}</h2>
          <p class="lead">Une question, une demande d'acquisition ou un projet sur mesure ? Le studio vous répond sous quelques jours.</p>
        </header>

        @if (status() === 'success') {
          <div class="success">
            <p class="eyebrow">Demande envoyée</p>
            <p class="thanks">Merci. Votre message est bien arrivé au studio — vous recevrez une réponse à <strong>{{ form.email }}</strong>.</p>
            <button type="button" class="btn-link" (click)="close()">Fermer</button>
          </div>
        } @else {
          <form (ngSubmit)="submit()" #f="ngForm" novalidate>
            <div class="row">
              <label>
                <span>Nom <em>*</em></span>
                <input type="text" name="name" [(ngModel)]="form.name" required maxlength="200" autocomplete="name" />
              </label>
              <label>
                <span>Email <em>*</em></span>
                <input type="email" name="email" [(ngModel)]="form.email" required maxlength="300" autocomplete="email" />
              </label>
            </div>

            <label>
              <span>Téléphone <small>(optionnel)</small></span>
              <input type="tel" name="phone" [(ngModel)]="form.phone" maxlength="50" autocomplete="tel" />
            </label>

            <fieldset class="interest">
              <legend>Votre demande <em>*</em></legend>
              <label class="radio">
                <input type="radio" name="interest" value="acquisition" [(ngModel)]="form.interest" required />
                <span>Acquisition</span>
              </label>
              <label class="radio">
                <input type="radio" name="interest" value="order" [(ngModel)]="form.interest" />
                <span>Commande spéciale</span>
              </label>
              <label class="radio">
                <input type="radio" name="interest" value="press" [(ngModel)]="form.interest" />
                <span>Presse</span>
              </label>
              <label class="radio">
                <input type="radio" name="interest" value="other" [(ngModel)]="form.interest" />
                <span>Autre</span>
              </label>
            </fieldset>

            <label>
              <span>Message <em>*</em></span>
              <textarea name="message" [(ngModel)]="form.message" required minlength="5" maxlength="5000" rows="5"></textarea>
            </label>

            @if (status() === 'error') {
              <p class="error">L'envoi a échoué. Vérifiez votre message ou réessayez dans un instant.</p>
            }

            <div class="actions">
              <button type="button" class="cancel" (click)="close()" [disabled]="status() === 'submitting'">Annuler</button>
              <button type="submit" class="primary" [disabled]="status() === 'submitting' || f.invalid">
                {{ status() === 'submitting' ? 'Envoi…' : 'Envoyer la demande' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 10, 10, 0.62);
      z-index: 200;
      display: flex;
      justify-content: flex-end;
    }
    .panel {
      position: relative;
      width: min(520px, 100%);
      height: 100%;
      background: var(--color-bg);
      padding: 80px 48px 48px;
      overflow-y: auto;
      box-shadow: -24px 0 64px rgba(0,0,0,0.15);
    }
    .close {
      position: absolute;
      top: 24px;
      right: 24px;
      background: none;
      border: none;
      font-size: 1rem;
      color: var(--color-ink);
      cursor: pointer;
      opacity: 0.7;
      transition: opacity var(--transition);
    }
    .close:hover { opacity: 1; }

    .head { margin-bottom: 32px; }
    .head .eyebrow { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .head h2 { font-family: var(--serif); font-weight: 400; font-size: 1.9rem; margin: 12px 0 16px; line-height: 1.2; }
    .head .lead { font-size: 0.92rem; color: var(--color-ink-soft); line-height: 1.5; }

    form { display: flex; flex-direction: column; gap: 22px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

    label {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    label > span {
      font-size: 0.7rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    label small { text-transform: none; letter-spacing: 0; font-size: 0.78rem; opacity: 0.8; }
    label em { color: var(--color-ink); font-style: normal; }

    input, textarea {
      font: inherit;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      color: var(--color-ink);
      padding: 12px 14px;
      font-size: 0.95rem;
      transition: border-color var(--transition);
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--color-ink);
    }
    textarea { resize: vertical; min-height: 110px; font-family: inherit; }

    fieldset.interest {
      border: 1px solid var(--color-line);
      padding: 16px 18px 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 14px 22px;
    }
    fieldset.interest legend {
      font-size: 0.7rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
      padding: 0 6px;
    }
    .radio {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-direction: row;
    }
    .radio span {
      text-transform: none;
      letter-spacing: 0;
      font-size: 0.92rem;
      color: var(--color-ink);
    }
    .radio input { accent-color: var(--color-ink); }

    .error {
      background: rgba(180, 60, 50, 0.08);
      border-left: 2px solid #b43c32;
      color: #b43c32;
      padding: 10px 14px;
      font-size: 0.9rem;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .cancel, .primary {
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      padding: 14px 24px;
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }
    .cancel {
      background: none;
      border: 1px solid var(--color-line);
      color: var(--color-mute);
    }
    .cancel:hover:not(:disabled) { color: var(--color-ink); border-color: var(--color-ink); }
    .primary {
      background: var(--color-ink);
      color: var(--color-bg);
      border: 1px solid var(--color-ink);
    }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .primary:hover:not(:disabled) { background: var(--color-bg); color: var(--color-ink); }

    .success { padding: 24px 0; }
    .success .eyebrow { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); display: block; margin-bottom: 14px; }
    .success .thanks { font-family: var(--serif); font-size: 1.3rem; line-height: 1.4; margin-bottom: 32px; }

    @media (max-width: 600px) {
      .panel { width: 100%; padding: 72px 24px 32px; }
      .row { grid-template-columns: 1fr; }
    }
  `]
})
export class ContactFormComponent {
  private readonly portfolio = inject(PortfolioService);

  @Input() furnitureId: string | null = null;
  @Input() furnitureSlug: string | null = null;
  @Input() furnitureTitle: string | null = null;
  @Output() closed = new EventEmitter<void>();

  protected readonly status = signal<Status>('idle');

  protected form: ContactRequestInput = {
    name: '',
    email: '',
    phone: '',
    interest: 'acquisition',
    message: '',
    furnitureId: '',
    furnitureSlug: '',
    furnitureTitle: '',
  };

  submit() {
    this.status.set('submitting');
    const payload: ContactRequestInput = {
      ...this.form,
      furnitureId: this.furnitureId ?? '',
      furnitureSlug: this.furnitureSlug ?? '',
      furnitureTitle: this.furnitureTitle ?? '',
    };
    this.portfolio.submitContact(payload).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error'),
    });
  }

  close() {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop')) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.status() !== 'submitting') this.close();
  }
}
