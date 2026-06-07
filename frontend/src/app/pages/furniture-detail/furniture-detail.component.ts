import { Component, computed, inject, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { Furniture } from '../../models/furniture.model';
import { SiteContent } from '../../models/site-content.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';
import { enrichSlides } from '../../utils/display-slides';
import { StoryInlineComponent } from '../../components/story-inline/story-inline.component';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';
import { ContactFormComponent } from '../../components/contact-form/contact-form.component';

@Component({
  selector: 'app-furniture-detail',
  standalone: true,
  imports: [NgStyle, RouterLink, StoryInlineComponent, StoryViewerComponent, ContactFormComponent],
  template: `
    @if (loading()) {
      <div class="container section"><p class="status">Chargement…</p></div>
    } @else if (notFound()) {
      <div class="container section">
        <h1>Pièce introuvable</h1>
        <p><a class="btn-link" routerLink="/mobilier">Retour au catalogue</a></p>
      </div>
    } @else if (item(); as f) {
      <article class="fade-in">
        <header class="hero">
          <div class="hero-bg">
            <img [src]="f.coverImage" [alt]="f.title" />
          </div>
          <div class="container hero-content">
            <a class="back" routerLink="/mobilier">← Retour au mobilier</a>
            <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ f.category }} · {{ f.year }}</span>
            <h1 [ngStyle]="titleStyle()">{{ f.title }}</h1>
            <p class="material">{{ f.material }}</p>
          </div>
        </header>

        <section class="section description">
          <div class="container narrow">
            <p class="lead">{{ f.shortDescription }}</p>
            <p class="body">{{ f.description }}</p>

            <dl class="specs">
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

            @if (f.tags && f.tags.length > 0) {
              <div class="tags-list">
                @for (t of f.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
          </div>
        </section>

        @if (hasSlides()) {
          <app-story-inline [slides]="displaySlides()"></app-story-inline>

          @if (f.showStoryButton) {
            <div class="container narrow viewer-link-wrap">
              <button type="button" class="viewer-link" (click)="openViewer()">
                Voir en plein écran →
              </button>
            </div>
          }
        }

        @if (f.gallery.length > 0) {
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
        }

        <section class="section cta">
          <div class="container">
            <h2 [ngStyle]="sectionTitleStyle()">Une pièce vous intéresse ?</h2>
            <p>Contactez le studio pour les disponibilités et les conditions d'édition.</p>
            <button type="button" class="btn-link cta-btn" (click)="openContact()">Contacter le studio →</button>
          </div>
        </section>
      </article>

      @if (viewerQueue().length > 0) {
        <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
      }

      @if (contactOpen()) {
        <app-contact-form
          [furnitureId]="f.id"
          [furnitureSlug]="f.slug"
          [furnitureTitle]="f.title"
          (closed)="closeContact()"></app-contact-form>
      }
    }
  `,
  styles: [`
    .hero {
      position: relative;
      min-height: 70vh;
      display: flex;
      align-items: flex-end;
      padding: 120px 0 72px;
      overflow: hidden;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }
    .hero-bg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .hero-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 60%, transparent 100%);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      color: #ffffff;
    }
    .hero-content .eyebrow,
    .hero-content .material {
      color: rgba(255, 255, 255, 0.7);
    }
    .hero-content h1 {
      color: #ffffff;
      margin: 16px 0 18px;
      max-width: 880px;
    }
    .back {
      display: inline-block;
      margin-bottom: 32px;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.65);
      transition: color var(--transition);
    }
    .back:hover { color: #ffffff; }
    .material {
      font-size: 0.85rem;
      letter-spacing: 0.08em;
    }

    .narrow { max-width: 760px; }
    .lead {
      font-family: var(--serif);
      font-size: 1.75rem;
      line-height: 1.4;
      color: var(--color-ink);
    }
    .body {
      margin-top: 32px;
      font-size: 1.05rem;
      line-height: 1.8;
      white-space: pre-line;
    }

    .specs {
      margin-top: 48px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-top: 1px solid var(--color-line);
      padding-top: 28px;
    }
    .specs > div { display: grid; grid-template-columns: 160px 1fr; gap: 16px; }
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

    .tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 24px; }
    .tag-chip {
      font-size: 0.78rem; padding: 4px 12px; background: var(--color-bg-alt);
      border: 1px solid var(--color-line); color: var(--color-ink-soft); text-decoration: none;
    }
    .tag-chip:hover { color: var(--color-ink); border-color: var(--color-ink); }

    .viewer-link-wrap {
      display: flex;
      justify-content: center;
      padding: 0 0 96px;
    }
    .viewer-link {
      background: none;
      border: 1px solid var(--color-ink);
      color: var(--color-ink);
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      padding: 14px 28px;
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }
    .viewer-link:hover {
      background: var(--color-ink);
      color: var(--color-bg);
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
    .cta-btn {
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-ink);
      font: inherit;
      cursor: pointer;
    }

    .status { color: var(--color-mute); }

    @media (max-width: 960px) {
      .gallery .g-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .gallery .g-grid { grid-template-columns: 1fr; }
      .specs > div { grid-template-columns: 1fr; gap: 4px; }
      .lead { font-size: 1.4rem; }
    }
  `]
})
export class FurnitureDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected readonly item = signal<Furniture | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly viewerQueue = signal<StoryItem[]>([]);
  protected readonly contactOpen = signal(false);
  protected readonly content = signal<SiteContent>({});

  protected readonly hasSlides = computed(() => {
    const f = this.item();
    if (!f) return false;
    return !!f.coverImage || (f.slides?.length ?? 0) > 0;
  });

  protected readonly displaySlides = computed<DisplaySlide[]>(() => {
    const f = this.item();
    if (!f) return [];
    return enrichSlides({
      slug: f.slug,
      coverImage: f.coverImage,
      slides: f.slides ?? [],
      showStoryLink: f.showStoryLink,
    }, 'furniture');
  });

  protected readonly titleStyle        = computed(() => roleStyle(this.content(), 'title'));
  protected readonly sectionTitleStyle = computed(() => roleStyle(this.content(), 'section-title'));
  protected readonly eyebrowStyle      = computed(() => roleStyle(this.content(), 'eyebrow'));

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loadingSvc.start('page');
    forkJoin({
      furniture: this.portfolio.getFurniture(slug),
      content: this.portfolio.getContent(),
    }).subscribe({
      next: ({ furniture, content }) => {
        this.item.set(furniture);
        this.content.set(content);
        this.loading.set(false);
        document.title = `${furniture.title} — Milo GUILLAUME Design`;
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  protected openViewer() {
    const f = this.item();
    if (!f) return;
    const slides = this.displaySlides();
    if (slides.length === 0) return;
    this.viewerQueue.set([{
      title: f.title,
      subtitle: `${f.category} · ${f.year}`,
      slides,
      kind: 'furniture',
      slug: f.slug,
    }]);
  }

  protected closeViewer() {
    this.viewerQueue.set([]);
  }

  protected openContact() {
    this.contactOpen.set(true);
  }

  protected closeContact() {
    this.contactOpen.set(false);
  }
}
