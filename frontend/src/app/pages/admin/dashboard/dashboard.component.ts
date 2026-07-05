import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard">
      <h2>Tableau de bord</h2>
      <p class="hint">Bienvenue dans l'espace d'administration. Choisissez une action rapide ou naviguez via la sidebar.</p>
      <div class="actions-grid">
        <a routerLink="/admin/accueil" [queryParams]="{ preview: 'full' }" class="action-card">
          <span class="action-icon">✎</span>
          <span class="action-label">Éditer</span>
        </a>
        <a routerLink="/admin/mediatheque" [queryParams]="{ import: 1 }" class="action-card">
          <span class="action-icon">↑</span>
          <span class="action-label">Importer photo</span>
        </a>
        <a routerLink="/admin/mediatheque-video" [queryParams]="{ import: 1 }" class="action-card">
          <span class="action-icon">↑</span>
          <span class="action-label">Importer vidéo</span>
        </a>
        <a routerLink="/admin/stories" [queryParams]="{ new: 1 }" class="action-card">
          <span class="action-icon">+</span>
          <span class="action-label">Nouvelle story</span>
        </a>
        <a routerLink="/admin/mobilier" [queryParams]="{ new: 1 }" class="action-card">
          <span class="action-icon">+</span>
          <span class="action-label">Nouvelle pièce</span>
        </a>
        <a routerLink="/admin/expositions" [queryParams]="{ new: 1 }" class="action-card">
          <span class="action-icon">+</span>
          <span class="action-label">Nouvelle exposition</span>
        </a>
        <a routerLink="/admin/analytics" class="action-card">
          <span class="action-icon">📊</span>
          <span class="action-label">Analytics</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 720px; }
    h2 { margin: 0 0 8px; font-family: var(--serif); font-weight: 400; font-size: 2rem; }
    .hint { margin: 0 0 48px; color: var(--color-ink-soft); }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
    }
    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 24px;
      border: 1px solid var(--color-line);
      background: var(--color-bg);
      text-decoration: none;
      color: var(--color-ink);
      transition: background var(--transition), border-color var(--transition);
      text-align: center;
    }
    .action-card:hover { background: var(--color-bg-alt); border-color: var(--color-accent); }
    .action-icon { font-size: 1.8rem; color: var(--color-accent); line-height: 1; }
    .action-label {
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
  `]
})
export class DashboardComponent {}
