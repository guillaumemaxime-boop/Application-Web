import { Component, inject, signal, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Profile } from '../../models/profile.model';
import { SiteContent } from '../../models/site-content.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [NgStyle],
  template: `
    <section class="section page-head">
      <div class="container">
        <span class="eyebrow" [ngStyle]="eyebrowStyleVar()">Studio</span>

        @if (profile(); as p) {
          <h1 class="fade-in" [ngStyle]="titleStyleVar()">{{ p.tagline }}</h1>
          <div class="grid">
            <div>
              <p class="bio">{{ p.bio }}</p>
              <p class="contact">
                <span>{{ p.location }}</span>
                @if (content()['profile.phone']) {
                  <span>{{ content()['profile.phone'] }}</span>
                }
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
        <span class="eyebrow proc-label" [ngStyle]="eyebrowStyleVar()">Processus</span>
        <div class="proc-list">
          @for (step of steps(); track step.num) {
            <div class="step">
              <span class="num">{{ step.num }}</span>
              <div>
                <h3 [ngStyle]="subtitleStyleVar()">{{ step.title }}</h3>
                <p>{{ step.desc }}</p>
              </div>
            </div>
          }
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
  private readonly loadingSvc = inject(LoadingService);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loading = signal(true);
  protected readonly content = signal<SiteContent>({});

  protected readonly titleStyleVar = computed(() => roleStyle(this.content(), 'title'));
  protected readonly subtitleStyleVar = computed(() => roleStyle(this.content(), 'subtitle'));
  protected readonly eyebrowStyleVar = computed(() => roleStyle(this.content(), 'eyebrow'));

  protected readonly steps = computed(() => {
    const c = this.content();
    return [
      { num: '01', title: c['studio.step1.title'] ?? 'Dessin',    desc: c['studio.step1.desc'] ?? '' },
      { num: '02', title: c['studio.step2.title'] ?? 'Matière',   desc: c['studio.step2.desc'] ?? '' },
      { num: '03', title: c['studio.step3.title'] ?? 'Façonnage', desc: c['studio.step3.desc'] ?? '' },
      { num: '04', title: c['studio.step4.title'] ?? 'Signature', desc: c['studio.step4.desc'] ?? '' },
    ];
  });

  constructor() {
    this.loadingSvc.start('page');
    forkJoin({
      profile: this.portfolio.getProfile(),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ profile, content }) => {
        this.profile.set(profile);
        this.content.set(content);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }
}
