import { Component, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';

type NavSection = 'mobilier' | 'expositions' | 'studio' | 'creations';

@Component({
  selector: 'app-navigation',
  standalone: true,
  template: `
    <div class="nav-editor">
      <h2>Sections visibles dans le menu</h2>
      <p class="hint">Active ou désactive l'apparition de chaque section dans l'en-tête et le pied de page. Les pages restent accessibles via leur URL si elles existent.</p>
      <ul class="nav-vis-list">
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Mobilier</span>
          <label class="incl">
            <input type="checkbox" [checked]="navMobilierVisible()" (change)="toggleNavSection('mobilier', $event)" /> Visible
          </label>
        </li>
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Expositions</span>
          <label class="incl">
            <input type="checkbox" [checked]="navExpositionsVisible()" (change)="toggleNavSection('expositions', $event)" /> Visible
          </label>
        </li>
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Créations</span>
          <label class="incl">
            <input type="checkbox" [checked]="navCreationsVisible()" (change)="toggleNavSection('creations', $event)" /> Visible
          </label>
        </li>
        <li class="home-row">
          <span class="kind-badge">MENU</span>
          <span class="title">Studio</span>
          <label class="incl">
            <input type="checkbox" [checked]="navStudioVisible()" (change)="toggleNavSection('studio', $event)" /> Visible
          </label>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .nav-editor h2 { margin: 0 0 8px; font-family: var(--serif); font-weight: 400; font-size: 1.5rem; }
    .nav-editor .hint { font-size: 0.85rem; color: var(--color-mute); margin-bottom: 16px; }
    .nav-vis-list { list-style: none; padding: 0; margin: 0; }
    .home-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px solid var(--color-line); background: var(--color-bg); }
    .home-row .kind-badge { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); min-width: 64px; }
    .home-row .title { flex: 1; font-size: 0.9rem; color: var(--color-ink); }
    .home-row .incl { font-size: 0.78rem; color: var(--color-ink-soft); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  `]
})
export class NavigationComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  protected readonly navMobilierVisible = signal(true);
  protected readonly navExpositionsVisible = signal(true);
  protected readonly navCreationsVisible = signal(true);
  protected readonly navStudioVisible = signal(true);

  constructor() {
    this.portfolio.getContent().subscribe({
      next: content => {
        this.navMobilierVisible.set(content['nav.mobilier.visible'] !== 'false');
        this.navExpositionsVisible.set(content['nav.expositions.visible'] !== 'false');
        this.navCreationsVisible.set(content['nav.creations.visible'] !== 'false');
        this.navStudioVisible.set(content['nav.studio.visible'] !== 'false');
      },
      error: () => this.toast.error('Impossible de charger la navigation.'),
    });
  }

  toggleNavSection(section: NavSection, event: Event): void {
    const visible = (event.target as HTMLInputElement).checked;
    if (section === 'mobilier') this.navMobilierVisible.set(visible);
    else if (section === 'expositions') this.navExpositionsVisible.set(visible);
    else if (section === 'creations') this.navCreationsVisible.set(visible);
    else this.navStudioVisible.set(visible);
    this.portfolio.updateContent({ [`nav.${section}.visible`]: visible ? 'true' : 'false' }).subscribe({
      next: () => this.toast.success('Visibilité de la section enregistrée.'),
      error: () => this.toast.error('Impossible d\'enregistrer la visibilité.'),
    });
  }
}
