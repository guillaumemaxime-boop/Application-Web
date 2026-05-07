import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
          <span></span><span></span><span></span>
        </button>

        <nav [class.open]="open()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Accueil</a>
          <a routerLink="/mobilier" routerLinkActive="active" (click)="closeMenu()">Mobilier</a>
          <a routerLink="/expositions" routerLinkActive="active" (click)="closeMenu()">Expositions</a>
          <a routerLink="/studio" routerLinkActive="active" (click)="closeMenu()">Studio</a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/admin" routerLinkActive="active" class="admin-link" (click)="closeMenu()">Admin</a>
          }
        </nav>
      </div>
    </header>
  `,
  styles: [`
    header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: rgba(246, 243, 238, 0.86);
      backdrop-filter: saturate(160%) blur(14px);
      -webkit-backdrop-filter: saturate(160%) blur(14px);
      border-bottom: 1px solid transparent;
      transition: border-color 320ms ease, background 320ms ease;
    }
    header.scrolled {
      border-bottom-color: var(--color-line);
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 88px;
    }
    .brand {
      display: flex;
      align-items: baseline;
      gap: 14px;
      letter-spacing: 0.02em;
    }
    .brand-mark {
      font-family: var(--serif);
      font-size: 1.5rem;
      font-weight: 500;
      color: var(--color-accent-deep);
    }
    .brand-name {
      font-size: 0.875rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-ink);
    }
    nav {
      display: flex;
      gap: 40px;
    }
    nav a {
      position: relative;
      font-size: 0.875rem;
      letter-spacing: 0.06em;
      color: var(--color-ink-soft);
      padding: 4px 0;
    }
    nav a:hover { color: var(--color-ink); }
    nav a.active { color: var(--color-ink); }
    nav a.active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -2px;
      height: 1px;
      background: var(--color-accent);
    }
    nav a.admin-link {
      padding: 6px 14px;
      border: 1px solid var(--color-line);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 0.75rem;
    }
    nav a.admin-link.active::after { display: none; }
    nav a.admin-link.active,
    nav a.admin-link:hover {
      border-color: var(--color-accent);
      color: var(--color-accent-deep);
    }
    .burger {
      display: none;
      width: 28px;
      height: 28px;
      flex-direction: column;
      justify-content: space-around;
    }
    .burger span {
      display: block;
      height: 1px;
      background: var(--color-ink);
    }

    @media (max-width: 720px) {
      .brand-name { display: none; }
      .burger { display: flex; }
      nav {
        position: absolute;
        top: 88px;
        left: 0;
        right: 0;
        flex-direction: column;
        gap: 0;
        background: var(--color-bg);
        border-bottom: 1px solid var(--color-line);
        max-height: 0;
        overflow: hidden;
        transition: max-height 320ms ease;
      }
      nav.open { max-height: 320px; }
      nav a {
        padding: 18px 24px;
        border-top: 1px solid var(--color-line);
      }
    }
  `]
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
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
