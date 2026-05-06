import { Component, inject, signal } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { Profile } from '../../models/profile.model';

@Component({
  selector: 'app-studio',
  standalone: true,
  template: `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Studio</span>

        @if (profile(); as p) {
          <h1 class="fade-in">{{ p.tagline }}</h1>
          <div class="bio-grid">
            <div>
              <p class="bio">{{ p.bio }}</p>
              <p class="contact">
                <span>{{ p.location }}</span>
                <a [href]="'mailto:' + p.contactEmail">{{ p.contactEmail }}</a>
              </p>
            </div>

            <aside>
              <div class="aside-block">
                <h3>Distinctions</h3>
                <ul class="list">
                  @for (a of p.awards; track a) { <li>{{ a }}</li> }
                </ul>
              </div>

              <div class="aside-block">
                <h3>Presse</h3>
                <ul class="list press">
                  @for (item of p.press; track item.title) {
                    <li>
                      <span class="press-title">{{ item.title }}</span>
                      <span class="press-year">{{ item.year }}</span>
                    </li>
                  }
                </ul>
              </div>
            </aside>
          </div>
        } @else if (loading()) {
          <p class="status">Chargement…</p>
        } @else {
          <p class="status error">Impossible de charger le profil. Vérifiez le backend.</p>
        }
      </div>
    </section>

    <section class="section ruled">
      <div class="container">
        <span class="eyebrow sec-label">Processus</span>
        <div class="steps">
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
    .page-head {
      padding-top: 120px;
      padding-bottom: 80px;
      border-bottom: 1px solid var(--color-line);
    }
    .page-head .eyebrow { display: block; margin-bottom: 20px; }
    .page-head h1 { max-width: 880px; margin-bottom: 64px; }

    .bio-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 80px;
    }
    .bio {
      font-family: var(--serif);
      font-size: clamp(1.25rem, 2.5vw, 1.625rem);
      line-height: 1.55;
      color: var(--color-ink);
      white-space: pre-line;
    }
    .contact {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 40px;
      padding-top: 28px;
      border-top: 1px solid var(--color-line);
      font-size: 0.9375rem;
      color: var(--color-mute);
    }
    .contact a { color: var(--color-ink); transition: opacity var(--transition); }
    .contact a:hover { opacity: 0.50; }

    .aside-block { margin-bottom: 40px; }
    .aside-block:last-child { margin-bottom: 0; }
    aside h3 {
      font-family: var(--sans);
      font-size: 0.62rem;
      letter-spacing: 0.20em;
      text-transform: uppercase;
      color: var(--color-mute);
      font-weight: 500;
      margin-bottom: 16px;
    }

    .list { list-style: none; }
    .list li {
      padding: 10px 0;
      font-size: 0.9375rem;
      color: var(--color-ink-soft);
      border-bottom: 1px solid var(--color-line);
    }
    .press li {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .press-year { color: var(--color-mute); flex-shrink: 0; font-size: 0.875rem; }

    .ruled { border-top: 1px solid var(--color-line); }
    .sec-label { display: block; margin-bottom: 48px; }

    .steps { display: flex; flex-direction: column; }
    .step {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 32px;
      padding: 40px 0;
      border-bottom: 1px solid var(--color-line);
      align-items: start;
    }
    .num {
      font-family: var(--serif);
      font-size: 1.875rem;
      font-style: italic;
      color: var(--color-mute);
      line-height: 1;
      padding-top: 4px;
    }
    .step h3 { font-size: 1.375rem; margin-bottom: 12px; }
    .step p { font-size: 0.9375rem; }

    .status { color: var(--color-mute); margin-top: 32px; }
    .status.error { color: #b53535; }

    @media (max-width: 960px) {
      .bio-grid { grid-template-columns: 1fr; gap: 48px; }
    }
    @media (max-width: 600px) {
      .step { grid-template-columns: 48px 1fr; gap: 20px; }
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
