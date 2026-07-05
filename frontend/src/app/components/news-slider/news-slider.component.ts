import { Component, ElementRef, EventEmitter, Input, Output, computed, input, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsSliderView, SliderStoryRef } from '../../models/news-slider.model';
import { SiteContent } from '../../models/site-content.model';
import { roleStyle } from '../../utils/title-style';
import { cropTransform, CropStyle } from '../../utils/crop-transform';
import { srcsetFor } from '../../utils/image-variant';

@Component({
  selector: 'app-news-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="news-slider">
      <header>
        <h2 class="title" [ngStyle]="titleStyle()">{{ slider.title }}</h2>
        <div class="nav" role="group" aria-label="Navigation du slider">
          <button type="button" class="arrow" aria-label="Précédent"
                  [disabled]="atStart()"
                  (click)="scrollPrev()">←</button>
          <button type="button" class="arrow" aria-label="Suivant"
                  [disabled]="atEnd()"
                  (click)="scrollNext()">→</button>
        </div>
      </header>
      <div #track class="track" (scroll)="onScroll()">
        @for (story of slider.stories; track story.id) {
          <div class="card-wrap">
            <button class="card" type="button"
                    [attr.aria-label]="story.ownerLabel + ' — ' + story.title"
                    (click)="onCardClick(story)">
              <div class="thumb">
                <img [src]="story.coverImage" [alt]="story.title" loading="lazy" decoding="async"
                     [attr.srcset]="srcsetFor(story.coverImage) || null"
                     sizes="(max-width: 600px) 100vw, 400px"
                     [style.transform]="storyCoverStyle(story).transform"
                     [style.transform-origin]="storyCoverStyle(story).transformOrigin" />
              </div>
              <div class="meta">
                <span class="cat">{{ story.ownerLabel }}</span>
                <h3 class="title">{{ story.title }}</h3>
              </div>
            </button>
            @if (editable) {
              <button type="button" class="story-edit-btn"
                      [attr.aria-label]="'Ouvrir la story : ' + story.title"
                      (click)="storyEdit.emit(story)">✎ Ouvrir la story</button>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .news-slider { padding: 48px 0; }
    .news-slider > header {
      padding: 0 32px 24px; max-width: 1280px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 24px;
    }
    h2.title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0; }

    .nav { display: flex; gap: 8px; }
    .arrow {
      width: 40px; height: 40px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--color-bg); border: 1px solid var(--color-ink);
      color: var(--color-ink); font-size: 1rem; cursor: pointer;
      transition: background 180ms ease, color 180ms ease, opacity 180ms ease;
    }
    .arrow:hover:not(:disabled) { background: var(--color-ink); color: var(--color-bg); }
    .arrow:disabled { opacity: 0.25; cursor: not-allowed; }

    .track {
      display: flex;
      gap: 24px;
      padding: 0 32px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      max-width: 1280px;
      margin: 0 auto;
      /* Masque la scrollbar — la navigation passe par les fleches */
      scrollbar-width: none;
    }
    .track::-webkit-scrollbar { display: none; }

    .card-wrap {
      flex: 0 0 calc((100% - 48px) / 3);
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card {
      display: flex;
      flex-direction: column;
      text-align: left;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      width: 100%;
    }
    .story-edit-btn {
      align-self: flex-start;
      padding: 5px 10px;
      background: var(--color-bg); color: var(--color-ink);
      border: 1px solid var(--color-line); cursor: pointer;
      font: inherit; font-size: 0.75rem;
    }
    .story-edit-btn:hover { background: var(--color-ink); color: var(--color-bg); }
    .story-edit-btn:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }
    .meta { padding: 16px 2px 0; display: flex; flex-direction: column; gap: 6px; }
    .cat { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); }
    h3.title { font-family: var(--serif); font-weight: 400; font-size: 1.1rem; line-height: 1.2; color: var(--color-ink); margin: 0; }

    @media (max-width: 720px) {
      .card-wrap { flex: 0 0 75%; }
    }
  `]
})
export class NewsSliderComponent {
  @Input({ required: true }) slider!: NewsSliderView;
  readonly content = input<SiteContent>({});
  @Input() editable = false;
  @Output() storyOpen = new EventEmitter<SliderStoryRef>();
  @Output() storyEdit = new EventEmitter<SliderStoryRef>();

  protected readonly titleStyle = computed(() => roleStyle(this.content(), 'section-title'));
  protected readonly srcsetFor = srcsetFor;

  protected trackRef = viewChild<ElementRef<HTMLDivElement>>('track');
  protected atStart = signal(true);
  protected atEnd = signal(false);

  protected storyCoverStyle(story: SliderStoryRef): CropStyle {
    return cropTransform(story.coverCrop);
  }

  onCardClick(story: SliderStoryRef): void {
    this.storyOpen.emit(story);
  }

  scrollPrev(): void {
    this.scrollByCard(-1);
  }

  scrollNext(): void {
    this.scrollByCard(1);
  }

  onScroll(): void {
    const el = this.trackRef()?.nativeElement;
    if (!el) return;
    this.atStart.set(el.scrollLeft <= 1);
    this.atEnd.set(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }

  private scrollByCard(direction: 1 | -1): void {
    const el = this.trackRef()?.nativeElement;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.card');
    const step = card ? card.offsetWidth + 24 /* gap */ : el.clientWidth;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  }
}
