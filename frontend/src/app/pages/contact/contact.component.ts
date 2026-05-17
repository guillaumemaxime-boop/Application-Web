import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../services/portfolio.service';
import { SiteContent } from '../../models/site-content.model';
import { ContactFormComponent } from '../../components/contact-form/contact-form.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ContactFormComponent],
  template: `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Contact</span>
        <h1>Échanger avec le studio.</h1>
        <p class="lead">Acquisitions, commandes sur mesure, demandes presse ou simples bonjours — toute correspondance reçoit une réponse soignée sous quelques jours.</p>
      </div>
    </section>

    <section class="contact-body">
      <div class="container grid">
        <aside class="info">
          <h2 class="info-title">Informations</h2>

          <ul class="channels">
            @if (email()) {
              <li>
                <span class="label">Email</span>
                <a [href]="'mailto:' + email()">{{ email() }}</a>
              </li>
            }
            @if (phone()) {
              <li>
                <span class="label">Téléphone</span>
                <a [href]="'tel:' + phoneHref()">{{ phone() }}</a>
              </li>
            }
            @if (location()) {
              <li>
                <span class="label">Atelier</span>
                <span>{{ location() }}</span>
              </li>
            }
          </ul>

          @if (instagram() || linkedin()) {
            <div class="social">
              <span class="info-title">Suivre le studio</span>
              <div class="social-row">
                @if (instagram()) {
                  <a [href]="instagram()" target="_blank" rel="noopener" class="social-card" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.06 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.35 1.06.41 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.06 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38a3.77 3.77 0 0 1-1.38.9c-.42.16-1.06.35-2.23.41-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.06-1.8-.25-2.23-.41a3.77 3.77 0 0 1-1.38-.9 3.77 3.77 0 0 1-.9-1.38c-.16-.42-.35-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.06-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.35 2.23-.41C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.14 0-3.51 0-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s0 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51 0 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s0-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.42 3.42 0 0 0-.83-1.27 3.42 3.42 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38C15.51 4 15.14 4 12 4Zm0 3.05A4.95 4.95 0 1 1 12 17a4.95 4.95 0 0 1 0-9.95Zm0 1.8a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Zm5.16-2.2a1.16 1.16 0 1 1 0 2.32 1.16 1.16 0 0 1 0-2.32Z"/>
                    </svg>
                    <div>
                      <span class="social-name">Instagram</span>
                      <span class="social-handle">{{ instagramHandle() || 'Voir le compte' }}</span>
                    </div>
                  </a>
                }
                @if (linkedin()) {
                  <a [href]="linkedin()" target="_blank" rel="noopener" class="social-card" aria-label="LinkedIn">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7.5 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.74V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.12 1.43-2.12 2.9V21h-4V9Z"/>
                    </svg>
                    <div>
                      <span class="social-name">LinkedIn</span>
                      <span class="social-handle">Profil du studio</span>
                    </div>
                  </a>
                }
              </div>
            </div>
          }
        </aside>

        <div class="form-wrap">
          <h2 class="info-title">Écrire au studio</h2>
          <p class="form-lead">Précisez votre demande — acquisition d'une pièce, commande sur mesure, sollicitation presse ou autre. Le studio reviendra vers vous dans les meilleurs délais.</p>
          <app-contact-form [inline]="true"></app-contact-form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-head { padding: 120px 0 56px; }
    .page-head .eyebrow {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .page-head h1 {
      font-family: var(--serif);
      font-weight: 400;
      font-size: clamp(2.4rem, 5vw, 4rem);
      line-height: 1.05;
      margin-top: 20px;
      max-width: 820px;
    }
    .page-head .lead {
      max-width: 620px;
      margin-top: 22px;
      font-size: 1.05rem;
      color: var(--color-ink-soft);
    }

    .contact-body { padding: 24px 0 120px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 80px;
      align-items: flex-start;
    }

    .info-title {
      font-family: var(--sans);
      font-weight: 400;
      font-size: 0.7rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-mute);
      margin-bottom: 18px;
      display: block;
    }

    .channels {
      list-style: none;
      padding: 0;
      margin: 0 0 48px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .channels li {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 16px;
      padding: 14px 0;
      border-top: 1px solid var(--color-line);
      align-items: baseline;
    }
    .channels li:first-child { border-top: 1px solid var(--color-ink); }
    .channels .label {
      font-size: 0.7rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .channels a, .channels span:not(.label) {
      font-family: var(--serif);
      font-size: 1.25rem;
      color: var(--color-ink);
      line-height: 1.3;
    }
    .channels a { border-bottom: 1px solid transparent; transition: border-color var(--transition); }
    .channels a:hover { border-bottom-color: var(--color-ink); }

    .social { margin-top: 24px; }
    .social-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .social-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      color: var(--color-ink);
      transition: border-color var(--transition), transform var(--transition);
    }
    .social-card:hover { border-color: var(--color-ink); transform: translateY(-2px); }
    .social-card svg { flex-shrink: 0; color: var(--color-ink); }
    .social-card div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .social-name {
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
    }
    .social-handle {
      font-family: var(--serif);
      font-size: 1rem;
      color: var(--color-ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .form-wrap { border-left: 1px solid var(--color-line); padding-left: 56px; }
    .form-lead {
      font-size: 0.92rem;
      color: var(--color-ink-soft);
      line-height: 1.55;
      margin: -6px 0 28px;
      max-width: 480px;
    }

    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; gap: 56px; }
      .form-wrap { border-left: none; padding-left: 0; border-top: 1px solid var(--color-line); padding-top: 48px; }
    }
    @media (max-width: 600px) {
      .page-head { padding: 100px 0 36px; }
      .social-row { grid-template-columns: 1fr; }
      .channels li { grid-template-columns: 90px 1fr; gap: 10px; }
      .channels a, .channels span:not(.label) { font-size: 1.05rem; }
    }
  `]
})
export class ContactComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly content = signal<SiteContent>({});

  protected readonly email = computed(() => this.content()['profile.contactEmail'] ?? '');
  protected readonly phone = computed(() => this.content()['profile.phone'] ?? '');
  protected readonly location = computed(() => this.content()['profile.location'] ?? '');
  protected readonly instagram = computed(() => this.content()['profile.instagram'] ?? '');
  protected readonly linkedin = computed(() => this.content()['profile.linkedin'] ?? '');

  protected readonly phoneHref = computed(() => (this.phone() || '').replace(/[^+\d]/g, ''));
  protected readonly instagramHandle = computed(() => {
    const url = this.instagram();
    if (!url) return '';
    const match = url.match(/instagram\.com\/([^/?#]+)/i);
    return match ? '@' + match[1] : '';
  });

  constructor() {
    this.portfolio.getContent().subscribe(c => this.content.set(c));
  }
}
