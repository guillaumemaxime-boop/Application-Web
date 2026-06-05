import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastsComponent } from './shared/toasts.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastsComponent],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <span class="eyebrow">Console d'administration</span>
          <h1>Gérer le contenu</h1>
          <p class="lead">Ajoutez, modifiez ou supprimez les pièces de mobilier et les expositions présentées sur le site.</p>
        </div>

        <div class="admin-layout">
          <button type="button" class="sidebar-toggle" (click)="toggleSidebar()"
                  [attr.aria-expanded]="sidebarOpen()" aria-controls="admin-nav">
            <span class="burger-icon" aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>

          <nav id="admin-nav" class="sidebar" aria-label="Console d'administration" [class.open]="sidebarOpen()" (click)="onNavClick()">
            <a class="nav-item nav-dashboard" routerLink="/admin" routerLinkActive="active"
               [routerLinkActiveOptions]="{exact: true}">Tableau de bord</a>

            <span class="nav-group">CONTENU</span>
            <a class="nav-item" routerLink="/admin/mobilier" routerLinkActive="active">Mobilier</a>
            <a class="nav-item" routerLink="/admin/expositions" routerLinkActive="active">Expositions</a>
            <a class="nav-item" routerLink="/admin/textes" routerLinkActive="active">Textes du site</a>
            <a class="nav-item" routerLink="/admin/mediatheque" routerLinkActive="active">Médiathèque</a>

            <span class="nav-group">SITE</span>
            <a class="nav-item" routerLink="/admin/accueil" routerLinkActive="active">Accueil</a>
            <a class="nav-item" routerLink="/admin/navigation" routerLinkActive="active">Navigation</a>
            <a class="nav-item" routerLink="/admin/sliders" routerLinkActive="active">Sliders</a>
            <a class="nav-item" routerLink="/admin/typographie" routerLinkActive="active">Typographie</a>
            <a class="nav-item" routerLink="/admin/email" routerLinkActive="active">Email</a>

            <span class="nav-group">MESURES</span>
            <a class="nav-item" routerLink="/admin/analytics" routerLinkActive="active">Analytics</a>
          </nav>

          <div class="admin-content">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
    </section>

    <app-toasts></app-toasts>
  `,
  styles: [`
    .section { padding: 128px 0 96px; }
    .head { max-width: 720px; margin-bottom: 48px; }
    .head h1 { margin-top: 16px; }
    .lead { margin-top: 16px; color: var(--color-ink-soft); }

    .admin-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 40px;
      align-items: start;
    }
    .admin-content { min-width: 0; }

    .sidebar-toggle {
      display: none;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      width: 100%;
      background: var(--color-bg-alt);
      border: 1px solid var(--color-line);
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-ink);
      cursor: pointer;
      grid-column: 1 / -1;
    }
    .burger-icon { font-size: 1.1rem; }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: sticky;
      top: 96px;
      border-right: 1px solid var(--color-line);
      padding-right: 12px;
    }

    .nav-group {
      font-size: 0.65rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
      padding: 16px 14px 4px;
      display: block;
    }
    .nav-group:first-of-type { padding-top: 4px; }

    .nav-item {
      background: transparent;
      border: 0;
      padding: 10px 14px;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      color: var(--color-ink-soft);
      cursor: pointer;
      text-align: left;
      border-left: 2px solid transparent;
      transition: color var(--transition), border-color var(--transition), background var(--transition);
      text-decoration: none;
      display: block;
    }
    .nav-item:hover { color: var(--color-ink); background: var(--color-bg-alt); }
    .nav-item.active {
      color: var(--color-ink);
      border-left-color: var(--color-accent);
      background: var(--color-bg-alt);
      font-weight: 500;
    }
    .nav-dashboard { margin-bottom: 8px; font-weight: 500; }

    @media (max-width: 720px) {
      .admin-layout { grid-template-columns: 1fr; gap: 0; }
      .sidebar-toggle { display: flex; margin-bottom: 16px; }
      .sidebar {
        position: static;
        border-right: none;
        padding-right: 0;
        margin-bottom: 24px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 240ms ease;
      }
      .sidebar.open { max-height: 700px; }
    }
  `]
})
export class AdminLayoutComponent {
  protected readonly sidebarOpen = signal(false);
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  onNavClick(): void { this.sidebarOpen.set(false); }
}
