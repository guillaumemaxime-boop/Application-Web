import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="wrap">
      <div class="box">
        <span class="eyebrow">Administration</span>
        <h1>Connexion</h1>

        @if (error()) {
          <p class="flash-error" role="alert">Identifiants incorrects.</p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            <span>Identifiant</span>
            <input type="text" formControlName="username" autocomplete="username" />
          </label>
          <label>
            <span>Mot de passe</span>
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </section>
  `,
  styles: [`
    .wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding: 0 24px;
    }
    .box { max-width: 400px; width: 100%; }
    h1 { margin: 16px 0 40px; }

    form { display: flex; flex-direction: column; gap: 20px; }
    label { display: flex; flex-direction: column; gap: 6px; }
    label > span {
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    input {
      padding: 10px 12px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      font: inherit;
      color: var(--color-ink);
    }
    input:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; border-color: var(--color-ink); }

    .btn-primary {
      margin-top: 8px;
      padding: 14px 28px;
      background: var(--color-ink);
      color: var(--color-bg);
      border: 0;
      font-size: 0.875rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      align-self: flex-start;
      transition: opacity var(--transition);
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.7; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .flash-error {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-left: 3px solid #c0392b;
      color: #c0392b;
      font-size: 0.95rem;
      background: rgba(192, 57, 43, 0.05);
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
