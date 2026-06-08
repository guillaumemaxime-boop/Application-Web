import { Component, Input } from '@angular/core';
import { Furniture } from '../../models/furniture.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { SiteContent } from '../../models/site-content.model';
import { Story } from '../../models/story.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';
import { StoryInlineComponent } from '../story-inline/story-inline.component';

@Component({
  selector: 'app-furniture-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent, StoryInlineComponent],
  template: `
    @if (item) {
      <article class="fade-in">
        <header class="hero">
          <div class="hero-bg">
            <app-cropped-image-canvas
              [imageUrl]="item.coverImage"
              [crop]="item.coverCrop ?? null"
              [alt]="item.title"
              mode="cover" />
          </div>
          <div class="container hero-content">
            <span class="eyebrow">{{ item.category }} · {{ item.year }}</span>
            <h1>{{ item.title }}</h1>
            <p class="material">{{ item.material }}</p>
          </div>
        </header>

        <section class="section description">
          <div class="container narrow">
            <p class="lead">{{ item.shortDescription }}</p>
            <p class="body">{{ item.description }}</p>

            <dl class="specs">
              <div><dt>Designer</dt><dd>{{ item.designer }}</dd></div>
              <div>
                <dt>Dimensions</dt>
                <dd>
                  <ul>
                    @for (d of item.dimensions; track d) { <li>{{ d }}</li> }
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        @if (displaySlides.length > 0) {
          <app-story-inline [slides]="displaySlides"></app-story-inline>
        }

        @if (item.gallery.length > 0) {
          <section class="section gallery">
            <div class="container">
              <div class="g-grid">
                @for (img of item.gallery; track img.url; let i = $index) {
                  <figure [class.tall]="i % 3 === 0">
                    <div class="gallery-img-wrap">
                      <app-cropped-image-canvas
                        [imageUrl]="img.url"
                        [crop]="img.crop ?? null"
                        [alt]="item.title + ' — vue ' + (i + 1)"
                        mode="cover" />
                    </div>
                  </figure>
                }
              </div>
            </div>
          </section>
        }

        <ng-content select="[ctaSlot]"></ng-content>
      </article>
    }
  `,
  styles: [`
    .hero { position: relative; min-height: 70vh; display: flex; align-items: flex-end; padding: 80px 0; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero-bg app-cropped-image-canvas { width: 100%; height: 100%; display: block; }
    .hero-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 100%); }
    .hero-content { position: relative; z-index: 1; color: #fff; max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .hero-content .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.85; }
    .hero-content h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin: 16px 0; }
    .hero-content .material { font-size: 0.95rem; opacity: 0.85; }

    .section { padding: 80px 0; }
    .section .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .narrow { max-width: 760px; }

    .lead { font-family: var(--serif); font-size: 1.75rem; line-height: 1.4; color: var(--color-ink); }
    .body { margin-top: 32px; font-size: 1.05rem; line-height: 1.8; white-space: pre-line; }

    .specs {
      margin-top: 48px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-top: 1px solid var(--color-line);
      padding-top: 28px;
    }
    .specs > div { display: grid; grid-template-columns: 160px 1fr; gap: 16px; }
    .specs dt { font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-mute); padding-top: 4px; }
    .specs dd { color: var(--color-ink); font-size: 0.95rem; }
    .specs ul { list-style: none; }
    .specs li { padding: 2px 0; }

    .gallery .g-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    figure { overflow: hidden; background: var(--color-bg-alt); aspect-ratio: 4 / 3; }
    figure.tall { aspect-ratio: 3 / 4; }
    .gallery-img-wrap { position: relative; overflow: hidden; width: 100%; height: 100%; }
    .gallery-img-wrap app-cropped-image-canvas { display: block; width: 100%; height: 100%; }

    @media (max-width: 960px) {
      .gallery .g-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .gallery .g-grid { grid-template-columns: 1fr; }
      figure.tall { aspect-ratio: 4 / 3; }
      .specs > div { grid-template-columns: 1fr; gap: 4px; }
      .lead { font-size: 1.4rem; }
    }
  `]
})
export class FurnitureDetailViewComponent {
  @Input({ required: true }) item: Furniture | null = null;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};
}
