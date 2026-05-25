import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import {
  MailSettingsInput,
  MailSettingsView,
  MailTestResult,
} from '../../../models/mail-settings.model';

@Component({
  selector: 'app-mail-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="mail-settings">
      <header class="head">
        <h2>Configuration email</h2>
        <p class="hint">
          Les demandes du formulaire <code>/contact</code> sont relayées via <strong>Resend</strong>.
          L'adresse expéditrice doit être sur un domaine vérifié dans ton compte Resend.
        </p>
      </header>

      @if (apiKeyConfigured()) {
        <p class="status">✓ Clé API Resend configurée côté serveur.</p>
      } @else {
        <p class="status error">
          ⚠ <code>RESEND_API_KEY</code> non définie côté serveur — les envois sont désactivés.
        </p>
      }

      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="row">
          <label>Adresse expéditeur
            <input type="email" formControlName="fromAddress" placeholder="noreply@atelier.com" />
            <small>Doit être sur un domaine vérifié dans Resend.</small>
          </label>
        </div>

        <div class="row">
          <label>Adresse destinataire
            <input type="email" formControlName="toAddress" placeholder="studio@atelier.com" />
            <small>Où arrivent les demandes du formulaire /contact.</small>
          </label>
        </div>

        <div class="actions">
          <button type="submit" class="primary" [disabled]="saving()">Enregistrer</button>
          <button type="button" (click)="test()" [disabled]="testDisabled() || testing()">
            Envoyer un mail de test
          </button>
        </div>

        @if (statusMessage()) {
          <p class="status" [class.error]="statusError()">{{ statusMessage() }}</p>
        }

        @if (testResult(); as r) {
          <p class="status" [class.error]="!r.success">
            @if (r.success) { Test envoyé avec succès. } @else { Échec : {{ r.error }} }
          </p>
        }

        @if (updatedAt()) {
          <p class="meta">Dernière mise à jour : {{ updatedAt() }}</p>
        }
      </form>
    </div>
  `,
  styles: [`
    .mail-settings { max-width: 720px; }
    .row { margin-bottom: 16px; }
    .row label { display: block; font-size: 14px; }
    .row input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; }
    .row small { display: block; color: #666; font-size: 12px; margin-top: 4px; }
    .actions { display: flex; gap: 12px; margin-top: 16px; }
    button { padding: 10px 18px; border: 1px solid #222; background: #fff; cursor: pointer; }
    button.primary { background: #222; color: #fff; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 12px; font-size: 14px; }
    .status.error { color: #b00020; }
    .meta { color: #666; font-size: 12px; margin-top: 8px; }
    code { background: #f5f5f5; padding: 0 4px; border-radius: 2px; }
  `],
})
export class MailSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PortfolioService);

  readonly form: FormGroup = this.fb.group({
    fromAddress: ['', [Validators.email]],
    toAddress: ['', [Validators.email]],
  });

  readonly apiKeyConfigured = signal(false);
  readonly updatedAt = signal<string | null>(null);
  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly statusError = signal(false);
  readonly testResult = signal<MailTestResult | null>(null);

  // Reactive forms ne sont pas natifs signal — on tick ce compteur sur chaque
  // form event pour que les computed qui lisent le form se rafraichissent.
  private readonly formTick = signal(0);

  readonly testDisabled = computed(() => {
    this.formTick();
    if (this.form.dirty) return true;
    if (!this.apiKeyConfigured()) return true;
    const v = this.form.value;
    return !v.fromAddress || !v.toAddress;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    merge(this.form.valueChanges, this.form.events)
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => this.formTick.update(n => n + 1));
    this.reload();
  }

  reload(): void {
    this.api.getMailSettings().subscribe({
      next: view => this.applyView(view),
      error: () => this.setStatus('Impossible de charger la configuration.', true),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.setStatus('Formulaire invalide.', true);
      return;
    }
    const v = this.form.value;
    const payload: MailSettingsInput = {
      fromAddress: emptyToNull(v.fromAddress),
      toAddress: emptyToNull(v.toAddress),
    };

    this.saving.set(true);
    this.testResult.set(null);
    this.api.saveMailSettings(payload).subscribe({
      next: view => {
        this.applyView(view);
        this.form.markAsPristine();
        this.saving.set(false);
        this.setStatus('Configuration enregistrée.', false);
      },
      error: () => {
        this.saving.set(false);
        this.setStatus('Échec de l’enregistrement.', true);
      },
    });
  }

  test(): void {
    this.testing.set(true);
    this.testResult.set(null);
    this.api.testMail().subscribe({
      next: r => {
        this.testResult.set(r);
        this.testing.set(false);
      },
      error: err => {
        this.testResult.set({
          success: false,
          error: err?.error?.error ?? 'Erreur inattendue',
        });
        this.testing.set(false);
      },
    });
  }

  private applyView(view: MailSettingsView): void {
    this.form.patchValue({
      fromAddress: view.fromAddress ?? '',
      toAddress: view.toAddress ?? '',
    });
    this.form.markAsPristine();
    this.apiKeyConfigured.set(view.apiKeyConfigured);
    this.updatedAt.set(view.updatedAt);
  }

  private setStatus(text: string, isError: boolean): void {
    this.statusMessage.set(text);
    this.statusError.set(isError);
  }
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}
