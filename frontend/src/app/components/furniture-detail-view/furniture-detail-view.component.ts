import { Component, Input } from '@angular/core';
import { Furniture } from '../../models/furniture.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

@Component({
  selector: 'app-furniture-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent],
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
  `]
})
export class FurnitureDetailViewComponent {
  @Input({ required: true }) item: Furniture | null = null;
}
