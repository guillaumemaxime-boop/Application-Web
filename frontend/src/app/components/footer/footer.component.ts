import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer>
      <div class="wrap">
        <div class="top">
          <em class="studio">Milo GUILLAUME Design</em>
          <nav>
            <a routerLink="/mobilier">Mobilier</a>
            <a routerLink="/expositions">Expositions</a>
            <a routerLink="/studio">Studio</a>
            <a href="mailto:studio&#64;atelier-lumen.fr">Contact</a>
          </nav>
        </div>
        <div class="bottom">
          <span>© {{ year }} Milo GUILLAUME Design</span>
          <span>Paris, France</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    footer {
      border-top: 1px solid var(--line);
      padding: 40px 0;
    }

    .top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 20px;
    }

    .studio {
      font-family: var(--serif);
      font-style: italic;
      font-size: 1.625rem;
      font-weight: 400;
      color: var(--ink);
      letter-spacing: -0.01em;
    }

    nav {
      display: flex;
      gap: 28px;
      flex-wrap: wrap;
    }
    nav a {
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    nav a:hover { color: var(--ink); }

    .bottom {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 0.6rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }

    @media (max-width: 540px) {
      .top { flex-direction: column; gap: 16px; }
    }
  `]
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
