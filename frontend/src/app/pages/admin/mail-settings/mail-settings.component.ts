import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge } from 'rxjs';
import { PortfolioService } from '../../../services/portfolio.service';
import {
  MailEncryption,
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
          Paramètres SMTP utilisés pour relayer les demandes de contact reçues sur le site.
          La connexion est testée avec la configuration <strong>enregistrée</strong> — pensez à sauvegarder avant de tester.
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <div class="row">
          <label>Hôte SMTP
            <input type="text" formControlName="host" placeholder="smtp.example.com" />
          </label>
          <label>Port
            <input type="number" formControlName="port" min="1" max="65535" />
          </label>
        </div>

        <div class="row">
          <label>Chiffrement
            <select formControlName="encryption">
              <option value="NONE">Aucun</option>
              <option value="STARTTLS">STARTTLS</option>
              <option value="SSL">SSL</option>
            </select>
          </label>
          <label>Identifiant
            <input type="text" formControlName="username" autocomplete="off" />
          </label>
        </div>

        <div class="row">
          <label>Mot de passe
            <input
              type="password"
              formControlName="password"
              autocomplete="new-password"
              [placeholder]="hasPassword() ? '••••• défini (laisser vide pour conserver)' : 'aucun mot de passe enregistré'"
            />
          </label>
        </div>

        <div class="row">
          <label>Adresse expéditeur
            <input type="email" formControlName="fromAddress" />
          </label>
          <label>Adresse destinataire
            <input type="email" formControlName="toAddress" />
          </label>
        </div>

        <div class="actions">
          <button type="submit" class="primary" [disabled]="saving()">Enregistrer</button>
          <button type="button" (click)="test()" [disabled]="testDisabled() || testing()">Envoyer un mail de test</button>
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
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .row label { display: block; font-size: 14px; }
    .row input, .row select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; }
    .actions { display: flex; gap: 12px; margin-top: 16px; }
    button { padding: 10px 18px; border: 1px solid #222; background: #fff; cursor: pointer; }
    button.primary { background: #222; color: #fff; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 12px; font-size: 14px; }
    .status.error { color: #b00020; }
    .meta { color: #666; font-size: 12px; margin-top: 8px; }
  `],
})
export class MailSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PortfolioService);

  readonly form: FormGroup = this.fb.group({
    host: [''],
    port: [null as number | null, [Validators.min(1), Validators.max(65535)]],
    encryption: ['NONE' as MailEncryption],
    username: [''],
    password: [''],
    fromAddress: ['', [Validators.email]],
    toAddress: ['', [Validators.email]],
  });

  readonly hasPassword = signal(false);
  readonly updatedAt = signal<string | null>(null);
  readonly saving = signal(false);
  readonly testing = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly statusError = signal(false);
  readonly testResult = signal<MailTestResult | null>(null);

  // Signal-friendly mirror of the form state. Reactive forms are not natively
  // observable as signals, so we tick this counter whenever the form emits a
  // value change or a control-event (notably PristineChangeEvent). Computed
  // signals that read it will then recompute on form changes.
  private readonly formTick = signal(0);

  readonly testDisabled = computed(() => {
    this.formTick();
    if (this.form.dirty) return true;
    const v = this.form.value;
    return !v.host || !v.port || !v.fromAddress || !v.toAddress;
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
      host: emptyToNull(v.host),
      port: v.port ?? null,
      username: emptyToNull(v.username),
      encryption: (v.encryption ?? 'NONE') as MailEncryption,
      fromAddress: emptyToNull(v.fromAddress),
      toAddress: emptyToNull(v.toAddress),
    };
    if (v.password && v.password.length > 0) {
      payload.password = v.password;
    }

    this.saving.set(true);
    this.testResult.set(null);
    this.api.saveMailSettings(payload).subscribe({
      next: view => {
        this.applyView(view);
        this.form.patchValue({ password: '' });
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
      host: view.host ?? '',
      port: view.port,
      encryption: view.encryption,
      username: view.username ?? '',
      password: '',
      fromAddress: view.fromAddress ?? '',
      toAddress: view.toAddress ?? '',
    });
    this.form.markAsPristine();
    this.hasPassword.set(view.hasPassword);
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
