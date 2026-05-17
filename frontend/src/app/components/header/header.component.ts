import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header>
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
          @if (mobilierVisible()) {
            <a routerLink="/mobilier" routerLinkActive="active" (click)="closeMenu()">Mobilier</a>
          }
          @if (expositionsVisible()) {
            <a routerLink="/expositions" routerLinkActive="active" (click)="closeMenu()">Expositions</a>
          }
          @if (studioVisible()) {
            <a routerLink="/studio" routerLinkActive="active" (click)="closeMenu()">Studio</a>
          }
          <a routerLink="/contact" routerLinkActive="active" (click)="closeMenu()">Contact</a>
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
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-line);
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 72px;
    }
    .brand {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .brand-mark {
      font-family: var(--serif);
      font-size: 1.375rem;
      font-weight: 500;
      color: var(--color-ink);
    }
    .brand-name {
      font-size: 0.75rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-ink);
    }
    nav {
      display: flex;
      gap: 36px;
    }
    nav a {
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-mute);
      transition: color var(--transition);
    }
    nav a:hover,
    nav a.active { color: var(--color-ink); }
    .burger {
      display: none;
      width: 24px;
      height: 18px;
      flex-direction: column;
      justify-content: space-between;
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
        top: 72px;
        left: 0;
        right: 0;
        flex-direction: column;
        gap: 0;
        background: var(--color-bg);
        border-bottom: 1px solid var(--color-line);
        max-height: 0;
        overflow: hidden;
        transition: max-height 280ms ease;
      }
      nav.open { max-height: 360px; }
      nav a {
        padding: 16px 24px;
        border-top: 1px solid var(--color-line);
      }
    }
  `]
})
export class HeaderComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly open = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly mobilierVisible = signal(true);
  protected readonly expositionsVisible = signal(true);
  protected readonly studioVisible = signal(true);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.scrolled.set(window.scrollY > 8);
      }, { passive: true });
    }
    this.portfolio.getContent().subscribe(content => {
      this.mobilierVisible.set(content['nav.mobilier.visible'] !== 'false');
      this.expositionsVisible.set(content['nav.expositions.visible'] !== 'false');
      this.studioVisible.set(content['nav.studio.visible'] !== 'false');
    });
  }

  toggleMenu() { this.open.update(v => !v); }
  closeMenu() { this.open.set(false); }
}
