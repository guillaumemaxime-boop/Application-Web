import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { HomePageData, HomeFeedItem } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';
import { NewsSliderComponent } from '../../components/news-slider/news-slider.component';
import { NewsSliderView, SliderZone, SLIDER_ZONES, SliderStoryRef } from '../../models/news-slider.model';
import { LoadingService } from '../../services/loading.service';
import { roleStyle } from '../../utils/title-style';
import { enrichSlides } from '../../utils/display-slides';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, StoryViewerComponent, NewsSliderComponent],
  template: `
    <section class="hero">
      <div class="container">
        <span class="eyebrow" [ngStyle]="eyebrowStyleVar()">{{ heroEyebrow() }}</span>
        <h1 class="hero-title" [ngStyle]="titleStyleVar()">{{ heroTitle() }}</h1>
        <p class="lead">{{ heroLead() }}</p>
      </div>
    </section>

    @if (sliderByZone()['home-top']; as s) {
      <app-news-slider [slider]="s" (storyOpen)="openStoryFromSlider($event)" />
    }

    @if (sliderByZone()['home-middle']; as s) {
      <app-news-slider [slider]="s" (storyOpen)="openStoryFromSlider($event)" />
    }

    <section class="feed">
      <div class="container">
        @if (feedTitle(); as t) {
          <h2 class="feed-title" [ngStyle]="sectionTitleStyleVar()">{{ t }}</h2>
        }
        @if (data(); as d) {
          <div class="grid">
            @for (item of d.feed; track item.slug) {
              <a class="card" [routerLink]="cardLink(item)">
                @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                <div class="thumb">
                  <img [src]="item.cover" [alt]="item.title" loading="lazy" />
                </div>
                <div class="meta">
                  <span class="cat" [ngStyle]="eyebrowStyleVar()">{{ item.subtitle }}</span>
                  <h3 class="title" [ngStyle]="cardTitleStyleVar()">{{ item.title }}</h3>
                  @if (item.description) {
                    <p class="excerpt">{{ item.description }}</p>
                  }
                  <span class="cta">Découvrir <span class="arrow" aria-hidden="true">→</span></span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    @if (sliderByZone()['home-bottom']; as s) {
      <app-news-slider [slider]="s" (storyOpen)="openStoryFromSlider($event)" />
    }

    @if (viewerQueue().length > 0) {
      <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
    }
  `,
  styles: [`
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; }
    .hero .hero-title { white-space: pre-line; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .feed { padding: 64px 0 140px; }
    .feed .feed-title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 24px; }
    .card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; background: transparent; border: none; padding: 0; cursor: pointer; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }

    .meta { padding: 18px 2px 0; display: flex; flex-direction: column; gap: 8px; }
    .cat { display: block; font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .title { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; line-height: 1.15; color: var(--color-ink); margin: 0; transition: color 180ms ease; }
    .card:hover .title { color: var(--color-ink-soft); }
    .excerpt { font-size: 0.92rem; line-height: 1.55; color: var(--color-ink-soft); margin: 2px 0 0; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .cta { margin-top: 6px; font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-ink); display: inline-flex; align-items: center; gap: 8px; }
    .cta .arrow { display: inline-block; transition: transform 220ms ease; }
    .card:hover .cta .arrow { transform: translateX(4px); }

    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); gap: 36px 20px; } }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; gap: 48px; }
      .stories-row { gap: 20px; }
      .ring { width: 72px; height: 72px; }
      .title { font-size: 1.35rem; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private portfolio = inject(PortfolioService);
  private readonly loadingSvc = inject(LoadingService);

  protected data = signal<HomePageData | null>(null);
  protected viewerQueue = signal<StoryItem[]>([]);
  protected content = signal<SiteContent>({});
  protected sliders = signal<NewsSliderView[]>([]);
  protected sliderByZone = computed(() => {
    const map: Partial<Record<SliderZone, NewsSliderView>> = {};
    for (const s of this.sliders()) {
      if (SLIDER_ZONES.includes(s.zoneKey)) {
        map[s.zoneKey] = s;
      }
    }
    return map;
  });

  protected heroEyebrow = computed(() => {
    if (this.data() === null) return '';
    return this.content()['home.hero.eyebrow'] || 'Atelier Lumen — Portfolio';
  });
  protected heroTitle = computed(() => {
    if (this.data() === null) return 'En chargement…';
    const t = this.content()['home.hero.title'];
    return (t && t.trim()) ? t : 'Mobilier sculpté,\nscénographies vivantes.';
  });
  protected heroLead = computed(() => {
    if (this.data() === null) return '';
    return this.content()['home.hero.lead'] || 'À feuilleter en stories, à explorer en profondeur.';
  });
  protected feedTitle = computed(() => {
    if (this.data() === null) return '';
    return this.content()['home.feed.title'] || '';
  });
  protected titleStyleVar = computed(() => roleStyle(this.content(), 'title'));
  protected eyebrowStyleVar = computed(() => roleStyle(this.content(), 'eyebrow'));
  protected cardTitleStyleVar = computed(() => roleStyle(this.content(), 'card-title'));
  protected sectionTitleStyleVar = computed(() => roleStyle(this.content(), 'section-title'));

  ngOnInit() {
    this.loadingSvc.start('page');
    forkJoin({
      home: this.portfolio.getHome(),
      content: this.portfolio.getContent(),
      sliders: this.portfolio.getPublicSliders(),
    }).subscribe({
      next: ({ home, content, sliders }) => {
        this.data.set(home);
        this.content.set(content);
        this.sliders.set(sliders);
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
      error: () => {
        this.loadingSvc.stop('page');
        this.loadingSvc.stop('nav');
      },
    });
  }

  openStoryFromSlider(story: SliderStoryRef): void {
    this.portfolio.getStoryBySlug(story.slug).subscribe(({ story: s, slides }) => {
      this.viewerQueue.set([{
        title: s.title,
        subtitle: story.ownerLabel,
        slides: enrichSlides({
          slug: s.slug,
          coverImage: s.coverImage,
          slides: slides ?? [],
          showStoryLink: false,
        }, s.ownerKind),
        kind: s.ownerKind,
        slug: s.slug,
      }]);
    });
  }

  cardLink(item: HomeFeedItem): string {
    return item.kind === 'furniture'
      ? `/mobilier/${item.slug}`
      : `/expositions/${item.slug}`;
  }

  closeViewer() { this.viewerQueue.set([]); }
}
