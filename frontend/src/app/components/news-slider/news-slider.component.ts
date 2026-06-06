import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsSliderView, SliderStoryRef } from '../../models/news-slider.model';

@Component({
  selector: 'app-news-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="news-slider">
      <header>
        <h2 class="title">{{ slider.title }}</h2>
      </header>
      <div class="track">
        @for (story of slider.stories; track story.id) {
          <button class="card" type="button"
                  [attr.aria-label]="story.ownerLabel + ' — ' + story.title"
                  (click)="onCardClick(story)">
            <div class="thumb">
              <img [src]="story.coverImage" [alt]="story.title" loading="lazy" />
            </div>
            <div class="meta">
              <span class="cat">{{ story.ownerLabel }}</span>
              <h3 class="title">{{ story.title }}</h3>
            </div>
          </button>
        }
      </div>
    </section>
  `,
  styles: [`
    .news-slider { padding: 48px 0; }
    .news-slider > header { padding: 0 32px 24px; max-width: 1280px; margin: 0 auto; }
    h2.title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0; }

    .track {
      display: flex;
      gap: 24px;
      padding: 0 32px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      max-width: 1280px;
      margin: 0 auto;
    }
    .card {
      flex: 0 0 calc((100% - 48px) / 3);
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      text-align: left;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }
    .meta { padding: 16px 2px 0; display: flex; flex-direction: column; gap: 6px; }
    .cat { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); }
    h3.title { font-family: var(--serif); font-weight: 400; font-size: 1.1rem; line-height: 1.2; color: var(--color-ink); margin: 0; }

    @media (max-width: 720px) {
      .card { flex: 0 0 75%; }
    }
  `]
})
export class NewsSliderComponent {
  @Input({ required: true }) slider!: NewsSliderView;
  @Output() storyOpen = new EventEmitter<SliderStoryRef>();

  onCardClick(story: SliderStoryRef): void {
    this.storyOpen.emit(story);
  }
}
