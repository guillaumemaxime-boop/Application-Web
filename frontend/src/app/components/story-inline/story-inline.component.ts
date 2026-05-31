import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ImageSlide, SpecSlide, QuoteSlide } from '../../models/slide.model';
import { DisplaySlide, VideoDisplaySlide } from '../../models/display-slide.model';
import { parseVideoUrl } from '../../utils/video-url';

type InlineSlide = ImageSlide | VideoDisplaySlide | SpecSlide | QuoteSlide;

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
            @case ('video') {
              <figure class="block video">
                @if (videoEmbedUrl(s.src); as url) {
                  <div class="video-frame">
                    <iframe
                      [src]="url"
                      title="Vidéo"
                      allow="autoplay; fullscreen; encrypted-media"
                      allowfullscreen></iframe>
                  </div>
                }
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
    .image figcaption,
    .video figcaption {
      margin-top: 18px;
      font-family: var(--serif);
      font-size: 1.15rem;
      line-height: 1.5;
      color: var(--color-ink);
    }
    .video-frame {
      position: relative;
      width: 100%;
      padding-top: 56.25%;
    }
    .video-frame iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly _slides = signal<DisplaySlide[]>([]);

  @Input({ required: true })
  set slides(value: DisplaySlide[]) {
    this._slides.set(value ?? []);
  }

  protected readonly sections = computed<InlineSlide[]>(() =>
    this._slides().filter(
      (s): s is InlineSlide =>
        s.type === 'image' || s.type === 'video' || s.type === 'spec' || s.type === 'quote'
    )
  );

  protected videoEmbedUrl(src: string): SafeResourceUrl | null {
    const parsed = parseVideoUrl(src);
    if (!parsed) return null;
    const url = parsed.platform === 'youtube'
      ? `https://www.youtube.com/embed/${parsed.id}`
      : `https://player.vimeo.com/video/${parsed.id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
