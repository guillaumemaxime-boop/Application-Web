import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer>
      <div class="container">
        <div class="brand-block">
          <span class="brand-name">Milo GUILLAUME Design</span>
        </div>

        <div class="grid">
          <div class="about">
            <p>Mobilier sculpté & scénographies sensibles, depuis Paris.</p>
          </div>

          <div>
            <span class="eyebrow">Navigation</span>
            <ul>
              <li><a routerLink="/mobilier">Mobilier</a></li>
              <li><a routerLink="/expositions">Expositions</a></li>
              <li><a routerLink="/studio">Studio</a></li>
            </ul>
          </div>

          <div>
            <span class="eyebrow">Contact</span>
            <ul>
              <li><a href="mailto:studio@atelier-lumen.fr">studio&#64;atelier-lumen.fr</a></li>
              <li>3 quai Saint-Vincent<br>75001 Paris</li>
              <li><a href="https://www.instagram.com/milo_gllm?igsh=MWZpYmUxOHZmenZnZg==" target="_blank" rel="noopener noreferrer">Instagram</a></li>
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
    footer { background: var(--color-bg-dark); }

    .brand-block {
      padding: 72px 0 48px;
      border-bottom: 1px solid var(--color-line-on-dark);
      margin-bottom: 56px;
    }
    .brand-name {
      font-family: var(--serif);
      font-size: clamp(2.25rem, 5vw, 4rem);
      font-weight: 400;
      font-style: italic;
      color: var(--color-ink-on-dark);
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 64px;
      padding-bottom: 56px;
      border-bottom: 1px solid var(--color-line-on-dark);
    }
    .about p {
      font-size: 0.9375rem;
      color: rgba(248, 247, 244, 0.38);
      line-height: 1.65;
      max-width: 300px;
    }

    .eyebrow {
      display: block;
      margin-bottom: 20px;
      color: rgba(248, 247, 244, 0.28);
      letter-spacing: 0.22em;
    }
    ul { list-style: none; }
    li {
      padding: 5px 0;
      font-size: 0.875rem;
      color: rgba(248, 247, 244, 0.44);
      line-height: 1.55;
    }
    li a { transition: color var(--transition); }
    li a:hover { color: var(--color-ink-on-dark); }

    .legal {
      display: flex;
      justify-content: space-between;
      padding: 28px 0 56px;
      font-size: 0.62rem;
      letter-spacing: 0.14em;
      color: rgba(255, 255, 255, 0.18);
    }

    @media (max-width: 960px) {
      .grid { grid-template-columns: 1fr 1fr; gap: 40px; }
      .about { display: none; }
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; gap: 36px; }
      .legal { flex-direction: column; gap: 8px; }
    }
  `]
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
