import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer>
      <div class="container">
        <div class="grid">
          <nav aria-label="Pied de page">
            <span class="eyebrow">Navigation</span>
            <ul>
              <li><a routerLink="/">Accueil</a></li>
              @if (mobilierVisible()) { <li><a routerLink="/mobilier">Mobilier</a></li> }
              @if (expositionsVisible()) { <li><a routerLink="/expositions">Expositions</a></li> }
              @if (studioVisible()) { <li><a routerLink="/studio">Studio</a></li> }
              <li><a routerLink="/contact">Contact</a></li>
            </ul>
          </nav>

          <div>
            <span class="eyebrow">Contact</span>
            <ul>
              @if (email()) {
                <li><a [href]="'mailto:' + email()">{{ email() }}</a></li>
              }
              @if (phone()) {
                <li><a [href]="'tel:' + phoneHref()">{{ phone() }}</a></li>
              }
              @if (location()) {
                <li><a routerLink="/contact">{{ location() }}</a></li>
              }
            </ul>
          </div>
        </div>

        <div class="legal">
          <span>© {{ year }} Milo GUILLAUME Design — Tous droits réservés.</span>

          @if (instagram() || linkedin()) {
            <div class="social">
              @if (instagram()) {
                <a [href]="instagram()" target="_blank" rel="noopener" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.06 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.35 1.06.41 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.06 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38a3.77 3.77 0 0 1-1.38.9c-.42.16-1.06.35-2.23.41-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.06-1.8-.25-2.23-.41a3.77 3.77 0 0 1-1.38-.9 3.77 3.77 0 0 1-.9-1.38c-.16-.42-.35-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.06-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.35 2.23-.41C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.14 0-3.51 0-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s0 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51 0 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s0-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.42 3.42 0 0 0-.83-1.27 3.42 3.42 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38C15.51 4 15.14 4 12 4Zm0 3.05A4.95 4.95 0 1 1 12 17a4.95 4.95 0 0 1 0-9.95Zm0 1.8a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Zm5.16-2.2a1.16 1.16 0 1 1 0 2.32 1.16 1.16 0 0 1 0-2.32Z"/>
                  </svg>
                </a>
              }
              @if (linkedin()) {
                <a [href]="linkedin()" target="_blank" rel="noopener" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7.5 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.74V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.12 1.43-2.12 2.9V21h-4V9Z"/>
                  </svg>
                </a>
              }
            </div>
          }

          <span>Conçu en France.</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    footer {
      padding: 80px 0 32px;
      margin-top: 96px;
      border-top: 1px solid var(--color-line);
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      padding-bottom: 64px;
      border-bottom: 1px solid var(--color-line);
    }
    .eyebrow { display: block; margin-bottom: 20px; }
    ul { list-style: none; }
    li { padding: 6px 0; font-size: 0.9rem; color: var(--color-ink-soft); }
    li a:hover { color: var(--color-ink); }
    .legal {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding-top: 32px;
      font-size: 0.75rem;
      color: var(--color-mute);
      letter-spacing: 0.08em;
    }
    .social {
      display: inline-flex;
      gap: 18px;
      align-items: center;
    }
    .social a {
      display: inline-flex;
      width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      color: var(--color-mute);
      transition: color var(--transition);
    }
    .social a:hover { color: var(--color-ink); }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; gap: 40px; }
      .legal { flex-direction: column; gap: 16px; }
    }
  `]
})
export class FooterComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly year = new Date().getFullYear();
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly phoneHref = computed(() => this.phone().replace(/[\s.]/g, ''));
  protected readonly location = signal('');
  protected readonly mobilierVisible = signal(true);
  protected readonly expositionsVisible = signal(true);
  protected readonly studioVisible = signal(true);
  protected readonly instagram = signal('');
  protected readonly linkedin = signal('');

  constructor() {
    this.portfolio.getContent().subscribe(content => {
      this.email.set(content['profile.contactEmail'] ?? '');
      this.phone.set(content['profile.phone'] ?? '');
      this.location.set(content['profile.location'] ?? '');
      this.mobilierVisible.set(content['nav.mobilier.visible'] !== 'false');
      this.expositionsVisible.set(content['nav.expositions.visible'] !== 'false');
      this.studioVisible.set(content['nav.studio.visible'] !== 'false');
      this.instagram.set(content['profile.instagram'] ?? '');
      this.linkedin.set(content['profile.linkedin'] ?? '');
    });
  }
}
