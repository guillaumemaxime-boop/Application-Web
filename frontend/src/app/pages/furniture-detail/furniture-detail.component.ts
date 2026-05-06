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
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h2>Pièce introuvable</h2>
        <p><a class="btn-link" routerLink="/mobilier">Retour au catalogue</a></p>
      </div>
    } @else if (item(); as f) {
      <article class="fade-in">
        <header class="hero">
          <div class="container hero-grid">
            <div class="hero-text">
              <a class="back" routerLink="/mobilier">← Retour au mobilier</a>
              <span class="eyebrow">{{ f.category }} · {{ f.year }}</span>
              <h1>{{ f.title }}</h1>
              <p class="lead">{{ f.shortDescription }}</p>
              <dl class="specs">
                <div><dt>Matériaux</dt><dd>{{ f.material }}</dd></div>
                <div><dt>Designer</dt><dd>{{ f.designer }}</dd></div>
                <div>
                  <dt>Dimensions</dt>
                  <dd>
                    <ul>
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
        </header>

        <section class="section description">
          <div class="container narrow">
            <span class="eyebrow">Description</span>
            <p class="body">{{ f.description }}</p>
          </div>
        </section>

        <section class="section gallery">
          <div class="container">
            <div class="g-grid">
              @for (img of f.gallery; track img; let i = $index) {
                <figure [class.tall]="i % 3 === 0">
                  <img [src]="img" [alt]="f.title + ' — vue ' + (i + 1)" loading="lazy" />
                </figure>
              }
            </div>
          </div>
        </section>

        <section class="section cta">
          <div class="container">
            <h2>Une pièce vous intéresse ?</h2>
            <p>Contactez le studio pour les disponibilités et les conditions d'édition.</p>
            <a class="btn-link" href="mailto:studio&#64;atelier-lumen.fr">Écrire au studio</a>
          </div>
        </section>
      </article>
    }
  `,
  styles: [`
    .hero {
      padding: 64px 0 96px;
      border-bottom: 1px solid var(--color-line);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      gap: 80px;
      align-items: center;
    }
    .back {
      display: inline-block;
      margin-bottom: 32px;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-mute);
      transition: color var(--transition);
    }
    .back:hover { color: var(--color-accent); }
    .hero-text h1 { margin: 16px 0 24px; }
    .lead { font-size: 1.1rem; max-width: 540px; }

    .specs {
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-top: 1px solid var(--color-line);
      padding-top: 28px;
    }
    .specs > div { display: grid; grid-template-columns: 140px 1fr; gap: 16px; }
    .specs dt {
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      padding-top: 4px;
    }
    .specs dd { color: var(--color-ink); font-size: 0.95rem; }
    .specs ul { list-style: none; }
    .specs li { padding: 2px 0; }

    .hero-img { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .hero-img img { width: 100%; height: 100%; object-fit: cover; }

    .narrow { max-width: 760px; }
    .body {
      font-family: var(--serif);
      font-size: 1.5rem;
      line-height: 1.5;
      color: var(--color-ink);
      margin-top: 24px;
      white-space: pre-line;
    }

    .gallery .g-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    figure {
      overflow: hidden;
      background: var(--color-bg-alt);
      aspect-ratio: 4 / 3;
    }
    figure.tall { aspect-ratio: 3 / 4; }
    figure img { width: 100%; height: 100%; object-fit: cover; }

    .cta { text-align: center; border-top: 1px solid var(--color-line); }
    .cta p { margin: 16px 0 32px; }
    .cta .btn-link { margin: 0 auto; }

    .status { color: var(--color-mute); }

    @media (max-width: 960px) {
      .hero-grid { grid-template-columns: 1fr; gap: 48px; }
      .gallery .g-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .gallery .g-grid { grid-template-columns: 1fr; }
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
