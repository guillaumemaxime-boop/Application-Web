import { Component, inject, signal } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { Profile } from '../../models/profile.model';

@Component({
  selector: 'app-studio',
  standalone: true,
  template: `
    <div class="page-head">
      <div class="wrap">
        <span class="label">Studio</span>

        @if (loading()) {
          <p class="status">Chargement…</p>
        } @else if (!profile()) {
          <p class="status err">Impossible de charger le profil. Vérifiez le backend.</p>
        } @else if (profile(); as p) {
          <h1>{{ p.tagline }}</h1>

          <div class="bio-grid">
            <div class="bio-col">
              <p class="bio">{{ p.bio }}</p>
              <div class="contact">
                <span>{{ p.location }}</span>
                <a [href]="'mailto:' + p.contactEmail">{{ p.contactEmail }}</a>
              </div>
            </div>

            <aside class="side-col">
              <section class="side-block">
                <h4>Distinctions</h4>
                <ul>
                  @for (a of p.awards; track a) {
                    <li>{{ a }}</li>
                  }
                </ul>
              </section>

              <section class="side-block">
                <h4>Presse</h4>
                <ul class="press">
                  @for (item of p.press; track item.title) {
                    <li>
                      <span>{{ item.title }}</span>
                      <span class="yr">{{ item.year }}</span>
                    </li>
                  }
                </ul>
              </section>
            </aside>
          </div>
        }
      </div>
    </div>

    <hr />

    <section class="section">
      <div class="wrap">
        <span class="label process-label">Processus</span>
        <ol class="steps">
          <li class="step">
            <span class="num">01</span>
            <div>
              <h3>Dessin</h3>
              <p>Chaque pièce naît d'une succession de croquis et de maquettes à l'échelle, jusqu'à ce que la silhouette s'impose.</p>
            </div>
          </li>
          <li class="step">
            <span class="num">02</span>
            <div>
              <h3>Matière</h3>
              <p>Le bois est sélectionné en forêt, séché plusieurs années. Marbres et cuirs proviennent d'ateliers européens partenaires.</p>
            </div>
          </li>
          <li class="step">
            <span class="num">03</span>
            <div>
              <h3>Façonnage</h3>
              <p>La taille, l'assemblage et la finition sont réalisés à la main dans nos ateliers parisiens.</p>
            </div>
          </li>
          <li class="step">
            <span class="num">04</span>
            <div>
              <h3>Signature</h3>
              <p>Chaque pièce est numérotée, signée et accompagnée d'un certificat d'édition.</p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  `,
  styles: [`
    .page-head {
      padding: 100px 0 80px;
    }
    .page-head .label { display: block; margin-bottom: 20px; }
    .page-head h1 { margin-bottom: 56px; max-width: 900px; }

    .bio-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 72px;
      align-items: start;
    }

    .bio {
      font-family: var(--serif);
      font-size: clamp(1.125rem, 2.5vw, 1.625rem);
      line-height: 1.55;
      color: var(--ink);
      white-space: pre-line;
    }

    .contact {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid var(--line);
      font-size: 0.9rem;
      color: var(--muted);
    }
    .contact a {
      color: var(--ink);
      transition: opacity var(--ease);
    }
    .contact a:hover { opacity: 0.5; }

    .side-col { display: flex; flex-direction: column; gap: 36px; }
    .side-block {}
    .side-block h4 {
      font-family: var(--sans);
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 16px;
    }

    .side-block ul { list-style: none; }
    .side-block li {
      padding: 9px 0;
      font-size: 0.9rem;
      color: var(--dim);
      border-bottom: 1px solid var(--line);
    }
    .side-block li:first-child { border-top: 1px solid var(--line); }

    .press li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .yr {
      font-size: 0.8125rem;
      color: var(--muted);
      flex-shrink: 0;
    }

    .process-label { display: block; margin-bottom: 40px; }

    .steps { list-style: none; }
    .step {
      display: grid;
      grid-template-columns: 60px 1fr;
      gap: 28px;
      padding: 36px 0;
      border-bottom: 1px solid var(--line);
      align-items: start;
    }
    .steps li:first-child { border-top: 1px solid var(--line); }
    .num {
      font-family: var(--serif);
      font-size: 1.75rem;
      font-style: italic;
      color: var(--muted);
      line-height: 1;
      padding-top: 4px;
    }
    .step h3 { margin-bottom: 10px; }
    .step p { font-size: 0.9rem; }

    .status { color: var(--muted); margin-top: 24px; }
    .status.err { color: #b53030; }

    @media (max-width: 960px) {
      .bio-grid { grid-template-columns: 1fr; gap: 48px; }
    }
    @media (max-width: 540px) {
      .step { grid-template-columns: 44px 1fr; gap: 16px; }
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
