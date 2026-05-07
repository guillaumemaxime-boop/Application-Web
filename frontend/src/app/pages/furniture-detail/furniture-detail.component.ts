import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';

@Component({
  selector: 'app-furniture-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (loading()) {
      <div class="wrap section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="wrap section not-found">
        <h2>Pièce introuvable</h2>
        <a routerLink="/mobilier" class="back-link">← Retour au catalogue</a>
      </div>
    } @else if (item(); as f) {
      <article>

        <div class="hero">
          <div class="wrap hero-inner">
            <div class="hero-text">
              <a routerLink="/mobilier" class="back">← Mobilier</a>
              <span class="label">{{ f.category }} · {{ f.year }}</span>
              <h1>{{ f.title }}</h1>
              <p class="lead">{{ f.shortDescription }}</p>

              <dl class="specs">
                <div>
                  <dt>Matériaux</dt>
                  <dd>{{ f.material }}</dd>
                </div>
                <div>
                  <dt>Designer</dt>
                  <dd>{{ f.designer }}</dd>
                </div>
                <div>
                  <dt>Dimensions</dt>
                  <dd>
                    <ul class="dims">
                      @for (d of f.dimensions; track d) { <li>{{ d }}</li> }
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>

            <div class="hero-img">
              <img [src]="f.coverImage" [alt]="f.title" />
            </div>
          </div>
        </div>

        <hr />

        <section class="section">
          <div class="wrap narrow">
            <span class="label">Description</span>
            <p class="body-text">{{ f.description }}</p>
          </div>
        </section>

        @if (f.gallery?.length) {
          <hr />
          <section class="section">
            <div class="wrap">
              <div class="gallery">
                @for (img of f.gallery; track img; let i = $index) {
                  <figure [class.tall]="i % 3 === 0">
                    <img [src]="img" [alt]="f.title + ' — vue ' + (i + 1)" loading="lazy" />
                  </figure>
                }
              </div>
            </div>
          </section>
        }

        <hr />

        <section class="section cta">
          <div class="wrap">
            <h2>Une pièce vous intéresse ?</h2>
            <p>Contactez le studio pour les disponibilités et les conditions d'édition.</p>
            <a href="mailto:studio&#64;atelier-lumen.fr" class="cta-link">
              Écrire au studio →
            </a>
          </div>
        </section>

      </article>
    }
  `,
  styles: [`
    /* ── Hero ── */
    .hero { padding: 100px 0 80px; }
    .hero-inner {
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      gap: 72px;
      align-items: start;
    }

    .back {
      display: inline-block;
      margin-bottom: 32px;
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .back:hover { color: var(--ink); }

    .hero-text .label {
      display: block;
      margin-bottom: 14px;
    }
    .hero-text h1 { margin-bottom: 22px; }
    .lead {
      font-size: 1rem;
      max-width: 460px;
      line-height: 1.7;
    }

    .specs {
      margin-top: 40px;
      border-top: 1px solid var(--line);
      padding-top: 28px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .specs > div {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 12px;
      align-items: baseline;
    }
    dt {
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      padding-top: 1px;
    }
    dd { font-size: 0.9375rem; color: var(--ink); }
    .dims { list-style: none; }
    .dims li { padding: 1px 0; }

    .hero-img {
      aspect-ratio: 4 / 5;
      overflow: hidden;
      background: #eeede9;
    }
    .hero-img img { width: 100%; height: 100%; object-fit: cover; }

    /* ── Description ── */
    .narrow { max-width: 720px; }
    .narrow .label { display: block; margin-bottom: 20px; }
    .body-text {
      font-family: var(--serif);
      font-size: clamp(1.125rem, 2.5vw, 1.625rem);
      line-height: 1.6;
      color: var(--ink);
      white-space: pre-line;
    }

    /* ── Gallery ── */
    .gallery {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    figure {
      overflow: hidden;
      background: #eeede9;
      aspect-ratio: 4 / 3;
    }
    figure.tall { aspect-ratio: 2 / 3; }
    figure img { width: 100%; height: 100%; object-fit: cover; }

    /* ── CTA ── */
    .cta { text-align: center; }
    .cta h2 { margin-bottom: 14px; }
    .cta p { margin-bottom: 28px; }
    .cta-link {
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--dim);
      transition: color var(--ease);
    }
    .cta-link:hover { color: var(--ink); }

    /* ── States ── */
    .status { color: var(--muted); }
    .not-found { display: flex; flex-direction: column; gap: 20px; padding-top: 120px; }
    .back-link {
      font-size: 0.65rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      transition: color var(--ease);
    }
    .back-link:hover { color: var(--ink); }

    /* ── Responsive ── */
    @media (max-width: 960px) {
      .hero-inner { grid-template-columns: 1fr; gap: 48px; }
      .gallery { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 540px) {
      .gallery { grid-template-columns: 1fr; }
      .specs > div { grid-template-columns: 1fr; gap: 4px; }
    }
  `]
})
export class FurnitureDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly portfolio = inject(PortfolioService);

  protected readonly item = signal<Furniture | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.portfolio.getFurniture(slug).subscribe({
      next: data => {
        this.item.set(data);
        this.loading.set(false);
        document.title = `${data.title} — Milo GUILLAUME Design`;
      },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
  }
}
