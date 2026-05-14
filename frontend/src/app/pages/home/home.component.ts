import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { HomePageData, HomeFeedItem, HomeCategoryView, HomeExhibitionView } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, StoryViewerComponent],
  template: `
    <section class="hero">
      <div class="container">
        <span class="eyebrow">{{ heroEyebrow() }}</span>
        <h1 [innerHTML]="heroTitle()"></h1>
        <p class="lead">{{ heroLead() }}</p>
      </div>
    </section>

    <section class="stories">
      <div class="container">
        @if (data(); as d) {
          <div class="stories-row">
            @for (cat of d.categories; track cat.slug) {
              <button class="story" (click)="openCategory(cat)">
                <div class="ring"><img [src]="cat.cover" [alt]="cat.category" /></div>
                <span class="label">{{ cat.category }}</span>
              </button>
            }
            <div class="sep" aria-hidden="true">·</div>
            @for (exh of d.exhibitions; track exh.slug) {
              <button class="story expo" (click)="openExhibition(exh)">
                <div class="ring expo-ring"><img [src]="exh.cover" [alt]="exh.title" /></div>
                <span class="label">{{ exh.title }}</span>
              </button>
            }
          </div>
        }
      </div>
    </section>

    <section class="feed">
      <div class="container">
        @if (data(); as d) {
          <div class="grid">
            @for (item of d.feed; track item.slug) {
              <a class="card" [routerLink]="cardLink(item)">
                @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                <div class="thumb">
                  <img [src]="item.cover" [alt]="item.title" loading="lazy" />
                </div>
                <div class="meta">
                  <span class="cat">{{ item.subtitle }}</span>
                  <span class="title">{{ item.title }}</span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>

    @if (viewerQueue().length > 0) {
      <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
    }
  `,
  styles: [`
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .stories { position: sticky; top: 72px; z-index: 30; background: var(--color-bg); border-top: 1px solid var(--color-line); border-bottom: 1px solid var(--color-line); padding: 24px 0; }
    .stories-row { display: flex; gap: 32px; overflow-x: auto; align-items: flex-start; }
    .story { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 88px; background: none; border: none; cursor: pointer; padding: 0; }
    .ring { width: 84px; height: 84px; border-radius: 50%; padding: 3px; background: var(--color-bg); border: 1px solid var(--color-ink); }
    .ring img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .expo-ring { padding: 4px; border: none; box-shadow: inset 0 0 0 1px var(--color-bg), inset 0 0 0 2px var(--color-ink); }
    .label { font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-ink-soft); }
    .sep { align-self: stretch; display: flex; align-items: center; padding: 0 4px; color: var(--color-line); font-size: 1.4rem; }

    .feed { padding: 64px 0 140px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .card { position: relative; overflow: hidden; cursor: pointer; background: var(--color-bg-alt); display: block; width: 100%; border: none; padding: 0; text-decoration: none; color: inherit; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 220ms ease; }
    .card:hover .thumb img { transform: scale(1.02); }
    .meta { position: absolute; inset: auto 0 0 0; padding: 20px; background: linear-gradient(transparent, rgba(26,24,21,0.7)); color: #fff; opacity: 0; transition: opacity 200ms ease; pointer-events: none; text-align: left; }
    .card:hover .meta { opacity: 1; }
    .cat { display: block; font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px; }
    .title { font-family: var(--serif); font-size: 1.4rem; line-height: 1.15; }
    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .stories-row { gap: 20px; } .ring { width: 72px; height: 72px; } }
  `]
})
export class HomeComponent implements OnInit {
  private portfolio = inject(PortfolioService);

  protected data = signal<HomePageData | null>(null);
  protected viewerQueue = signal<StoryItem[]>([]);
  protected content = signal<SiteContent>({});

  protected heroEyebrow = computed(() => this.content()['home.hero.eyebrow'] || 'Atelier Lumen — Portfolio');
  protected heroTitle = computed(() => {
    const t = this.content()['home.hero.title'];
    return (t && t.trim()) ? t.replace(/\n/g, '<br/>') : 'Mobilier sculpté,<br/>scénographies vivantes.';
  });
  protected heroLead = computed(() => this.content()['home.hero.lead'] || 'À feuilleter en stories, à explorer en profondeur.');

  ngOnInit() {
    this.portfolio.getHome().subscribe(d => this.data.set(d));
    this.portfolio.getContent().subscribe(c => this.content.set(c));
  }

  openCategory(cat: HomeCategoryView) {
    if (cat.itemSlugs.length === 0) return;
    const requests = cat.itemSlugs.map(slug => this.portfolio.getFurniture(slug));
    forkJoin(requests).subscribe(furnitureList => {
      const queue: StoryItem[] = furnitureList.map(f => ({
        title: f.title,
        subtitle: `${f.category} · ${f.year}`,
        slides: f.slides,
        kind: 'furniture',
        slug: f.slug,
      }));
      this.viewerQueue.set(queue);
    });
  }

  openExhibition(exh: HomeExhibitionView) {
    this.portfolio.getExhibition(exh.slug).subscribe(e => {
      this.viewerQueue.set([{
        title: e.title,
        subtitle: `${e.venue} · ${exh.period}`,
        slides: e.slides,
        kind: 'exhibition',
        slug: e.slug,
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
