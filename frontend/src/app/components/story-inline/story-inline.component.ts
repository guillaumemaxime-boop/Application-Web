import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Slide, ImageSlide, SpecSlide, QuoteSlide } from '../../models/slide.model';

type InlineSlide = ImageSlide | SpecSlide | QuoteSlide;

@Component({
  selector: 'app-story-inline',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (sections().length > 0) {
      <section class="story-inline">
        <div class="container narrow header">
          <span class="eyebrow">Histoire de la pièce</span>
        </div>

        @for (s of sections(); track s.id) {
          @switch (s.type) {
            @case ('image') {
              <figure class="block image">
                <img [src]="s.src" [alt]="s.caption ?? ''" loading="lazy" />
                @if (s.caption) {
                  <figcaption class="container narrow">{{ s.caption }}</figcaption>
                }
              </figure>
            }
            @case ('spec') {
              <div class="block spec">
                <div class="container narrow">
                  <span class="eyebrow">Caractéristiques</span>
                  <dl>
                    @for (e of s.specs; track e.label) {
                      <div>
                        <dt>{{ e.label }}</dt>
                        <dd>{{ e.value }}</dd>
                      </div>
                    }
                  </dl>
                </div>
              </div>
            }
            @case ('quote') {
              <div class="block quote">
                <div class="container narrow">
                  <blockquote>{{ s.body }}</blockquote>
                  @if (s.cite) {
                    <cite>{{ s.cite }}</cite>
                  }
                </div>
              </div>
            }
          }
        }
      </section>
    }
  `,
  styles: [`
    .story-inline { padding: 96px 0 64px; }
    .header { margin-bottom: 56px; }

    .block { margin: 0 0 64px; }
    .block:last-child { margin-bottom: 0; }

    .image img {
      display: block;
      width: 100%;
      max-height: 88vh;
      object-fit: cover;
    }
    .image figcaption {
      margin-top: 18px;
      font-family: var(--serif);
      font-size: 1.15rem;
      line-height: 1.5;
      color: var(--color-ink);
    }

    .spec dl {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      border-top: 1px solid var(--color-line);
      padding-top: 28px;
      margin-top: 16px;
    }
    .spec dl > div {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 24px;
    }
    .spec dt {
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      padding-top: 4px;
    }
    .spec dd {
      font-family: var(--serif);
      font-size: 1.2rem;
      color: var(--color-ink);
    }

    .quote { text-align: center; padding: 24px 0; }
    .quote blockquote {
      font-family: var(--serif);
      font-size: 1.9rem;
      line-height: 1.4;
      color: var(--color-ink);
      max-width: 640px;
      margin: 0 auto;
    }
    .quote cite {
      display: block;
      font-style: normal;
      margin-top: 24px;
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    @media (max-width: 600px) {
      .story-inline { padding: 64px 0 48px; }
      .block { margin-bottom: 48px; }
      .spec dl > div { grid-template-columns: 1fr; gap: 4px; }
      .quote blockquote { font-size: 1.5rem; }
    }
  `]
})
export class StoryInlineComponent {
  private readonly _slides = signal<Slide[]>([]);

  @Input({ required: true })
  set slides(value: Slide[]) {
    this._slides.set(value ?? []);
  }

  protected readonly sections = computed<InlineSlide[]>(() =>
    this._slides().filter(
      (s): s is InlineSlide => s.type === 'image' || s.type === 'spec' || s.type === 'quote'
    )
  );
}
