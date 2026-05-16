import { Component, inject, signal } from '@angular/core';
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
          <div>
            <h3 class="title">Milo GUILLAUME Design</h3>
            <p>Mobilier sculpté & scénographies sensibles, depuis Paris.</p>
          </div>

          <div>
            <span class="eyebrow">Navigation</span>
            <ul>
              <li><a routerLink="/">Accueil</a></li>
              <li><a routerLink="/studio">Studio</a></li>
            </ul>
          </div>

          <div>
            <span class="eyebrow">Contact</span>
            <ul>
              @if (email()) {
                <li><a href="mailto:{{ email() }}">{{ email() }}</a></li>
              }
              @if (phone()) {
                <li>{{ phone() }}</li>
              }
              @if (location()) {
                <li>{{ location() }}</li>
              }
            </ul>
          </div>
        </div>

        <div class="legal">
          <span>© {{ year }} Milo GUILLAUME Design — Tous droits réservés.</span>
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
      grid-template-columns: 2fr 1fr 1fr;
      gap: 64px;
      padding-bottom: 64px;
      border-bottom: 1px solid var(--color-line);
    }
    .title {
      font-family: var(--serif);
      font-size: 1.75rem;
      margin-bottom: 16px;
    }
    .eyebrow { display: block; margin-bottom: 20px; }
    ul { list-style: none; }
    li { padding: 6px 0; font-size: 0.9rem; color: var(--color-ink-soft); }
    li a:hover { color: var(--color-ink); }
    .legal {
      display: flex;
      justify-content: space-between;
      padding-top: 32px;
      font-size: 0.75rem;
      color: var(--color-mute);
      letter-spacing: 0.08em;
    }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; gap: 40px; }
      .legal { flex-direction: column; gap: 8px; }
    }
  `]
})
export class FooterComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly year = new Date().getFullYear();
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly location = signal('');

  constructor() {
    this.portfolio.getContent().subscribe(content => {
      this.email.set(content['profile.contactEmail'] ?? '');
      this.phone.set(content['profile.phone'] ?? '');
      this.location.set(content['profile.location'] ?? '');
    });
  }
}
