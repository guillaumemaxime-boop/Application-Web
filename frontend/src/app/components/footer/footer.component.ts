import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer>
      <div class="container">
        <div class="grid">
          <div>
            <h3 class="title">Atelier Lumen</h3>
            <p>Mobilier sculpté & scénographies sensibles, depuis Lyon.</p>
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
              <li>+33 (0)4 78 00 00 00</li>
              <li>3 quai Saint-Vincent, 69001 Lyon</li>
            </ul>
          </div>
        </div>

        <div class="legal">
          <span>© {{ year }} Atelier Lumen — Tous droits réservés.</span>
          <span>Conçu en France.</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    footer {
      background: var(--color-bg-alt);
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
  protected readonly year = new Date().getFullYear();
}
