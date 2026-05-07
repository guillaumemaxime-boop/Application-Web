import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header [class.scrolled]="scrolled()">
      <div class="wrap nav-wrap">

        <a routerLink="/" class="brand" (click)="closeMenu()">
          <em>M·G</em>
          <span>Milo GUILLAUME Design</span>
        </a>

        <button class="burger" type="button"
          (click)="toggleMenu()"
          [attr.aria-expanded]="open()"
          aria-label="Menu">
          <span></span>
          <span></span>
        </button>

        <nav [class.open]="open()">
          <a routerLink="/" routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="closeMenu()">Accueil</a>
          <a routerLink="/mobilier" routerLinkActive="active"
            (click)="closeMenu()">Mobilier</a>
          <a routerLink="/expositions" routerLinkActive="active"
            (click)="closeMenu()">Expositions</a>
          <a routerLink="/studio" routerLinkActive="active"
            (click)="closeMenu()">Studio</a>
          <a routerLink="/admin" routerLinkActive="active" class="admin"
            (click)="closeMenu()">Admin</a>
        </nav>

      </div>
    </header>
  `,
  styles: [`
    header {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      height: 60px;
      background: transparent;
      border-bottom: 1px solid transparent;
      transition: background var(--ease), border-color var(--ease);
    }
    header.scrolled {
      background: rgba(249, 249, 248, 0.94);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom-color: var(--line);
    }

    .nav-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
    }

    .brand {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .brand em {
      font-family: var(--serif);
      font-style: italic;
      font-size: 1.25rem;
      font-weight: 400;
      color: var(--ink);
      letter-spacing: -0.01em;
    }
    .brand span {
      font-size: 0.58rem;
      font-weight: 500;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--ink);
    }

    nav {
      display: flex;
      gap: 32px;
      align-items: center;
    }
    nav a {
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    nav a:hover,
    nav a.active { color: var(--ink); }
    nav a.admin { opacity: 0.35; }
    nav a.admin:hover { opacity: 1; }

    .burger {
      display: none;
      flex-direction: column;
      justify-content: space-between;
      width: 22px;
      height: 11px;
      padding: 0;
    }
    .burger span {
      display: block;
      height: 1px;
      background: var(--ink);
      transition: opacity var(--ease);
    }

    @media (max-width: 720px) {
      .brand span { display: none; }
      .burger { display: flex; }

      nav {
        position: absolute;
        top: 60px; left: 0; right: 0;
        flex-direction: column;
        gap: 0;
        background: var(--bg);
        border-bottom: 1px solid var(--line);
        max-height: 0;
        overflow: hidden;
        transition: max-height 280ms ease;
      }
      nav.open { max-height: 300px; }
      nav a {
        display: block;
        padding: 15px clamp(20px, 5vw, 96px);
        border-top: 1px solid var(--line);
        font-size: 0.65rem;
      }
    }
  `]
})
export class HeaderComponent {
  protected readonly open = signal(false);
  protected readonly scrolled = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.scrolled.set(window.scrollY > 4);
      }, { passive: true });
    }
  }

  toggleMenu() { this.open.update(v => !v); }
  closeMenu() { this.open.set(false); }
}
