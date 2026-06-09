import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgStyle, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HomePageData, HomeFeedItem } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { roleStyle } from '../../utils/title-style';
import { NewsSliderComponent } from '../news-slider/news-slider.component';
import { StoryViewerComponent, StoryItem } from '../story-viewer/story-viewer.component';
import { NewsSliderView, SLIDER_ZONES, SliderStoryRef } from '../../models/news-slider.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [NgStyle, CommonModule, RouterLink, NewsSliderComponent, StoryViewerComponent, CroppedImageCanvasComponent],
  template: `
    @if (data) {
      <section class="hero">
        <div class="container">
          <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ heroEyebrow() }}</span>
          <h1 class="hero-title" [ngStyle]="titleStyle()">{{ heroTitle() }}</h1>
          <p class="lead">{{ heroLead() }}</p>
        </div>
      </section>

      @if (sliderByZone()['home-top']; as s) {
        <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
      }

      @if (sliderByZone()['home-middle']; as s) {
        <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
      }

      <section class="feed">
        <div class="container">
          @if (feedTitleText(); as t) {
            <h2 class="feed-title" [ngStyle]="feedTitleStyle()">{{ t }}</h2>
          }
          @if (data.feed.length > 0) {
            <div class="grid">
              @for (item of data.feed; track item.slug) {
                <a class="card" [routerLink]="cardLink(item)">
                  @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                  <div class="thumb">
                    <app-cropped-image-canvas
                      [imageUrl]="item.cover"
                      [crop]="item.coverCrop ?? null"
                      [alt]="item.title"
                      mode="cover" />
                  </div>
                  <div class="meta">
                    <span class="cat" [ngStyle]="eyebrowStyle()">{{ item.subtitle }}</span>
                    <h3 class="title" [ngStyle]="cardTitleStyle()">{{ item.title }}</h3>
                    @if (item.description) { <p class="excerpt">{{ item.description }}</p> }
                    <span class="cta">Découvrir <span class="arrow" aria-hidden="true">→</span></span>
                  </div>
                </a>
              }
            </div>
          }
        </div>
      </section>

      @if (sliderByZone()['home-bottom']; as s) {
        <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
      }

      @if (viewerQueue.length > 0) {
        <app-story-viewer [queue]="viewerQueue" (closed)="onViewerClosed()"></app-story-viewer>
      }
    }
  `,
  styles: [`
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; white-space: pre-line; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .feed { padding: 64px 0 140px; }
    .feed .feed-title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 24px; }
    .card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; background: transparent; border: none; padding: 0; cursor: pointer; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb app-cropped-image-canvas { width: 100%; height: 100%; display: block; transition: transform 480ms ease; }
    .card:hover .thumb app-cropped-image-canvas { transform: scale(1.03); }
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
export class HomeViewComponent {
  @Input({ required: true }) data: HomePageData | null = null;
  @Input() content: SiteContent = {};
  @Input() sliders: NewsSliderView[] = [];
  @Input() viewerQueue: StoryItem[] = [];

  @Output() storyOpen = new EventEmitter<SliderStoryRef>();
  @Output() viewerClosed = new EventEmitter<void>();

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }
  protected feedTitleStyle(): Record<string, string> { return roleStyle(this.content, 'section-title'); }
  protected cardTitleStyle(): Record<string, string> { return roleStyle(this.content, 'card-title'); }

  protected heroEyebrow(): string {
    return this.content['home.hero.eyebrow'] || 'Atelier Lumen — Portfolio';
  }
  protected heroTitle(): string {
    const t = this.content['home.hero.title'];
    return (t && t.trim()) ? t : 'Mobilier sculpté,\nscénographies vivantes.';
  }
  protected heroLead(): string {
    return this.content['home.hero.lead'] || 'À feuilleter en stories, à explorer en profondeur.';
  }

  protected feedTitleText(): string { return this.content['home.feed.title'] || ''; }

  protected sliderByZone(): Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> {
    const map: Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> = {};
    for (const s of this.sliders) {
      if ((SLIDER_ZONES as readonly string[]).includes(s.zoneKey)) {
        map[s.zoneKey as 'home-top' | 'home-middle' | 'home-bottom'] = s;
      }
    }
    return map;
  }

  protected cardLink(item: HomeFeedItem): string[] {
    return item.kind === 'exhibition' ? ['/expositions', item.slug] : ['/mobilier', item.slug];
  }

  protected onSliderStoryOpen(story: SliderStoryRef): void {
    this.storyOpen.emit(story);
  }

  protected onViewerClosed(): void {
    this.viewerClosed.emit();
  }
}
