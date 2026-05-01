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
        <div class="proc-grid">
          <div class="step">
            <span class="num">01</span>
            <h3>Dessin</h3>
            <p>Chaque pièce naît d'une succession de croquis et de maquettes à l'échelle, jusqu'à ce que la silhouette s'impose.</p>
          </div>
          <div class="step">
            <span class="num">02</span>
            <h3>Matière</h3>
            <p>Le bois est sélectionné en forêt, séché plusieurs années. Marbres et cuirs proviennent d'ateliers européens partenaires.</p>
          </div>
          <div class="step">
            <span class="num">03</span>
            <h3>Façonnage</h3>
            <p>La taille, l'assemblage et la finition sont réalisés à la main dans nos ateliers lyonnais.</p>
          </div>
          <div class="step">
            <span class="num">04</span>
            <h3>Signature</h3>
            <p>Chaque pièce est numérotée, signée et accompagnée d'un certificat d'édition.</p>
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
    }
    .contact a { color: var(--color-accent-deep); border-bottom: 1px solid var(--color-line); padding-bottom: 2px; }

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
    .press .y { color: var(--color-mute); }

    .process { background: var(--color-bg-alt); }
    .proc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 32px;
    }
    .step {
      padding: 32px;
      background: var(--color-bg);
      border: 1px solid var(--color-line);
    }
    .num {
      display: inline-block;
      font-family: var(--serif);
      font-size: 2.5rem;
      color: var(--color-accent);
      margin-bottom: 12px;
    }
    .step h3 { font-size: 1.25rem; margin-bottom: 8px; }
    .step p { font-size: 0.9rem; }

    .status { color: var(--color-mute); margin-top: 32px; }
    .status.error { color: #b1532a; }

    @media (max-width: 960px) {
      .grid { grid-template-columns: 1fr; gap: 48px; }
      .proc-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .proc-grid { grid-template-columns: 1fr; }
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
