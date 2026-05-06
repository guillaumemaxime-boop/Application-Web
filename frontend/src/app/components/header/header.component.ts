import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header [class.scrolled]="scrolled()">
      <div class="container nav">
        <a routerLink="/" class="brand" (click)="closeMenu()">
          <span class="brand-mark">M·G</span>
          <span class="brand-name">Milo GUILLAUME Design</span>
        </a>

        <button class="burger" type="button" (click)="toggleMenu()" [attr.aria-expanded]="open()">
          <span></span><span></span>
        </button>

        <nav [class.open]="open()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Accueil</a>
          <a routerLink="/mobilier" routerLinkActive="active" (click)="closeMenu()">Mobilier</a>
          <a routerLink="/expositions" routerLinkActive="active" (click)="closeMenu()">Expositions</a>
          <a routerLink="/studio" routerLinkActive="active" (click)="closeMenu()">Studio</a>
          <a routerLink="/admin" routerLinkActive="active" class="admin-link" (click)="closeMenu()">Admin</a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    header {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      background: transparent;
      border-bottom: 1px solid transparent;
      transition: background var(--transition), border-color var(--transition);
    }
    header.scrolled {
      background: rgba(248, 247, 244, 0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom-color: var(--color-line);
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 72px;
    }
    .brand { display: flex; align-items: baseline; gap: 14px; }
    .brand-mark {
      font-family: var(--serif);
      font-size: 1.375rem;
      font-weight: 500;
      font-style: italic;
      color: var(--color-ink);
      letter-spacing: -0.01em;
    }
    .brand-name {
      font-size: 0.65rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--color-ink);
    }
    nav { display: flex; gap: 40px; }
    nav a {
      font-size: 0.68rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      transition: color var(--transition);
    }
    nav a:hover { color: var(--color-ink); }
    nav a.active { color: var(--color-ink); }
    nav a.admin-link { opacity: 0.5; }
    nav a.admin-link:hover { opacity: 1; }

    .burger {
      display: none;
      width: 22px;
      height: 12px;
      flex-direction: column;
      justify-content: space-between;
    }
    .burger span { display: block; height: 1px; background: var(--color-ink); }

    @media (max-width: 720px) {
      .brand-name { display: none; }
      .burger { display: flex; }
      nav {
        position: absolute;
        top: 72px; left: 0; right: 0;
        flex-direction: column;
        gap: 0;
        background: var(--color-bg);
        border-bottom: 1px solid var(--color-line);
        max-height: 0;
        overflow: hidden;
        transition: max-height 300ms ease;
      }
      nav.open { max-height: 280px; }
      nav a { padding: 16px 24px; border-top: 1px solid var(--color-line); }
    }
  `]
})
export class HeaderComponent {
  protected readonly open = signal(false);
  protected readonly scrolled = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.scrolled.set(window.scrollY > 8);
      }, { passive: true });
    }
  }

  toggleMenu() { this.open.update(v => !v); }
  closeMenu() { this.open.set(false); }
}
