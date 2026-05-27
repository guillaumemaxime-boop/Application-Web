import { Component } from '@angular/core';
import { MailSettingsComponent } from './mail-settings/mail-settings.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [MailSettingsComponent],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <span class="eyebrow">Console d'administration</span>
          <h1>Configuration email</h1>
          <p class="lead">Cet espace legacy n'expose plus que la configuration email. Utilisez le nouveau tableau de bord <a routerLink="/admin">/admin</a> pour accéder aux autres sections.</p>
        </div>
        <app-mail-settings></app-mail-settings>
      </div>
    </section>
  `,
  styles: [`
    .section { padding: 128px 0 96px; }
    .head { max-width: 720px; margin-bottom: 48px; }
    .head h1 { margin-top: 16px; }
    .lead { margin-top: 16px; color: var(--color-ink-soft); }
    .lead a { color: var(--color-accent); }
  `]
})
export class AdminComponent {}
