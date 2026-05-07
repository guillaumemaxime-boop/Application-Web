import { Component, inject, signal } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { Profile } from '../../models/profile.model';

@Component({
  selector: 'app-studio',
  standalone: true,
  template: `
    <section class="section page-head">
      <div class="container">
        <span class="eyebrow">Studio</span>

        @if (profile(); as p) {
          <h1 class="fade-in">{{ p.tagline }}</h1>
          <div class="grid">
            <div>
              <p class="bio">{{ p.bio }}</p>
              <p class="contact">
                <span>{{ p.location }}</span>
                <a [href]="'mailto:' + p.contactEmail">{{ p.contactEmail }}</a>
              </p>
            </div>

            <aside>
              <h3>Distinctions</h3>
              <ul class="awards">
                @for (a of p.awards; track a) { <li>{{ a }}</li> }
              </ul>

              <h3>Presse</h3>
              <ul class="press">
                @for (item of p.press; track item.title) {
                  <li>
                    <span class="t">{{ item.title }}</span>
                    <span class="y">{{ item.year }}</span>
                  </li>
                }
              </ul>
            </aside>
          </div>
        } @else if (loading()) {
          <p class="status">Chargement…</p>
        } @else {
          <p class="status error">Impossible de charger le profil. Vérifiez le backend.</p>
        }
      </div>
    </section>

    <section class="section process">
      <div class="container">
        <span class="eyebrow proc-label">Processus</span>
        <div class="proc-list">
          <div class="step">
            <span class="num">01</span>
            <div>
              <h3>Dessin</h3>
              <p>Chaque pièce naît d'une succession de croquis et de maquettes à l'échelle, jusqu'à ce que la silhouette s'impose.</p>
            </div>
          </div>
          <div class="step">
            <span class="num">02</span>
            <div>
              <h3>Matière</h3>
              <p>Le bois est sélectionné en forêt, séché plusieurs années. Marbres et cuirs proviennent d'ateliers européens partenaires.</p>
            </div>
          </div>
          <div class="step">
            <span class="num">03</span>
            <div>
              <h3>Façonnage</h3>
              <p>La taille, l'assemblage et la finition sont réalisés à la main dans nos ateliers parisiens.</p>
            </div>
          </div>
          <div class="step">
            <span class="num">04</span>
            <div>
              <h3>Signature</h3>
              <p>Chaque pièce est numérotée, signée et accompagnée d'un certificat d'édition.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-head { padding-top: 64px; }
    .page-head h1 { margin-top: 16px; max-width: 880px; }

    .grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 80px;
      margin-top: 64px;
    }

    .bio {
      font-family: var(--serif);
      font-size: 1.5rem;
      line-height: 1.5;
      color: var(--color-ink);
      white-space: pre-line;
    }
    .contact {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 40px;
      padding-top: 32px;
      border-top: 1px solid var(--color-line);
      font-size: 0.95rem;
      color: var(--color-ink-soft);
    }
    .contact a {
      color: var(--color-ink);
      transition: opacity var(--transition);
    }
    .contact a:hover { opacity: 0.5; }

    aside h3 {
      font-size: 0.75rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--color-mute);
      font-family: var(--sans);
      font-weight: 500;
      margin-bottom: 16px;
    }
    aside h3:not(:first-child) { margin-top: 40px; }

    .awards, .press { list-style: none; }
    .awards li {
      padding: 10px 0;
      font-size: 0.95rem;
      border-bottom: 1px solid var(--color-line);
    }
    .press li {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 0;
      font-size: 0.95rem;
      border-bottom: 1px solid var(--color-line);
    }
    .press .y { color: var(--color-mute); flex-shrink: 0; }

    .process { border-top: 1px solid var(--color-line); }
    .proc-label { display: block; margin-bottom: 40px; }
    .proc-list { display: flex; flex-direction: column; }
    .step {
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 32px;
      padding: 40px 0;
      border-bottom: 1px solid var(--color-line);
      align-items: start;
    }
    .num {
      font-family: var(--serif);
      font-size: 2rem;
      color: var(--color-ink);
      line-height: 1;
    }
    .step h3 { font-size: 1.375rem; margin-bottom: 12px; }
    .step p { font-size: 0.95rem; }

    .status { color: var(--color-mute); margin-top: 32px; }
    .status.error { color: #c0392b; }

    @media (max-width: 960px) {
      .grid { grid-template-columns: 1fr; gap: 48px; }
    }
    @media (max-width: 600px) {
      .step { grid-template-columns: 56px 1fr; gap: 16px; }
    }
  `]
})
export class StudioComponent {
  private readonly portfolio = inject(PortfolioService);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.portfolio.getProfile().subscribe({
      next: data => { this.profile.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
