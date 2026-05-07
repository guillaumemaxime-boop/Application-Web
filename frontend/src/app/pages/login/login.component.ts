import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="card-head">
          <em class="brand">M·G</em>
          <span class="label">Administration</span>
        </div>

        @if (error()) {
          <p class="error-msg">Identifiants incorrects.</p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="username" class="label">Identifiant</label>
            <input
              id="username"
              type="text"
              formControlName="username"
              autocomplete="username"
              placeholder="admin" />
          </div>

          <div class="field">
            <label for="password" class="label">Mot de passe</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              placeholder="••••••••" />
          </div>

          <button
            type="submit"
            class="submit"
            [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
    }

    .card {
      width: 100%;
      max-width: 380px;
    }

    .card-head {
      display: flex;
      align-items: baseline;
      gap: 14px;
      margin-bottom: 40px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--line);
    }
    .brand {
      font-family: var(--serif);
      font-style: italic;
      font-size: 1.5rem;
      font-weight: 400;
      color: var(--ink);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field .label { display: block; }

    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--line);
      background: var(--bg);
      font: inherit;
      font-size: 0.9375rem;
      color: var(--ink);
      transition: border-color var(--ease);
    }
    input::placeholder { color: var(--muted); }
    input:focus {
      outline: none;
      border-color: var(--ink);
    }

    .submit {
      margin-top: 8px;
      padding: 12px 24px;
      background: var(--ink);
      color: var(--bg);
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      align-self: flex-start;
      transition: opacity var(--ease);
    }
    .submit:hover:not(:disabled) { opacity: 0.72; }
    .submit:disabled { opacity: 0.4; cursor: not-allowed; }

    .error-msg {
      padding: 10px 14px;
      margin-bottom: 8px;
      border-left: 2px solid #b53030;
      color: #b53030;
      font-size: 0.875rem;
      background: rgba(181, 48, 48, 0.04);
    }
  `]
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  protected readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(false);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username!, password!).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: () => { this.loading.set(false); this.error.set(true); },
    });
  }
}
