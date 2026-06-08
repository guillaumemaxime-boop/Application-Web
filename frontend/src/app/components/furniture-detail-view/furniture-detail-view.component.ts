import { Component, EventEmitter, Input, Output } from '@angular/core';

export type EditableTextField = 'title' | 'category' | 'material' | 'description' | 'shortDescription';
import { Furniture } from '../../models/furniture.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { SiteContent } from '../../models/site-content.model';
import { Story } from '../../models/story.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';
import { StoryInlineComponent } from '../story-inline/story-inline.component';
import { ReorderableDirective } from '../../directives/reorderable.directive';

@Component({
  selector: 'app-furniture-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent, StoryInlineComponent, ReorderableDirective],
  template: `
    @if (item) {
      <article class="fade-in">
        <header class="hero" [class.editable]="editable">
          <div class="hero-bg">
            <app-cropped-image-canvas
              [imageUrl]="item.coverImage"
              [crop]="item.coverCrop ?? null"
              [alt]="item.title"
              mode="cover" />
            @if (editable) {
              <div class="edit-overlay">
                <button type="button" class="edit-btn" aria-label="Cadrer la cover" (click)="coverEdit.emit('crop')">✂ Cadrer</button>
                <button type="button" class="edit-btn" aria-label="Remplacer la cover" (click)="coverEdit.emit('replace')">🖼 Remplacer</button>
              </div>
            }
          </div>
          <div class="container hero-content">
            @if (editable) {
              <span class="eyebrow editable-text" role="button" tabindex="0"
                    (click)="textFieldClick.emit('category')"
                    (keydown.enter)="textFieldClick.emit('category')"
                    (keydown.space)="textFieldClick.emit('category'); $event.preventDefault()">{{ item.category }} · {{ item.year }}</span>
              <h1 class="editable-text" role="button" tabindex="0"
                  (click)="textFieldClick.emit('title')"
                  (keydown.enter)="textFieldClick.emit('title')"
                  (keydown.space)="textFieldClick.emit('title'); $event.preventDefault()">{{ item.title }}</h1>
              <p class="material editable-text" role="button" tabindex="0"
                 (click)="textFieldClick.emit('material')"
                 (keydown.enter)="textFieldClick.emit('material')"
                 (keydown.space)="textFieldClick.emit('material'); $event.preventDefault()">{{ item.material }}</p>
            } @else {
              <span class="eyebrow">{{ item.category }} · {{ item.year }}</span>
              <h1>{{ item.title }}</h1>
              <p class="material">{{ item.material }}</p>
            }
          </div>
        </header>

        <section class="section description">
          <div class="container narrow">
            @if (editable) {
              <p class="lead editable-text" role="button" tabindex="0"
                 (click)="textFieldClick.emit('shortDescription')"
                 (keydown.enter)="textFieldClick.emit('shortDescription')"
                 (keydown.space)="textFieldClick.emit('shortDescription'); $event.preventDefault()">{{ item.shortDescription }}</p>
            } @else {
              <p class="lead">{{ item.shortDescription }}</p>
            }
            @if (editable) {
              <p class="body editable-text" role="button" tabindex="0"
                 (click)="textFieldClick.emit('description')"
                 (keydown.enter)="textFieldClick.emit('description')"
                 (keydown.space)="textFieldClick.emit('description'); $event.preventDefault()">{{ item.description }}</p>
            } @else {
              <p class="body">{{ item.description }}</p>
            }

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
              @if (editable) {
                <ul class="g-grid editable" appReorderable (reordered)="galleryReorder.emit($event)">
                  @for (img of item.gallery; track img.url; let i = $index) {
                    <li>
                      <figure [class.tall]="i % 3 === 0">
                        <div class="gallery-img-wrap">
                          <app-cropped-image-canvas
                            [imageUrl]="img.url"
                            [crop]="img.crop ?? null"
                            [alt]="item.title + ' — vue ' + (i + 1)"
                            mode="cover" />
                          <div class="edit-overlay">
                            <button type="button" class="edit-btn" aria-label="Cadrer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'crop' })">✂</button>
                            <button type="button" class="edit-btn" aria-label="Remplacer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'replace' })">🖼</button>
                            <button type="button" class="edit-btn edit-btn-danger" aria-label="Retirer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'remove' })">×</button>
                          </div>
                        </div>
                      </figure>
                    </li>
                  }
                </ul>
              } @else {
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
              }
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

    .editable .hero-bg { cursor: pointer; outline: 1px dashed rgba(255,255,255,0.25); outline-offset: -2px; }
    .hero-bg .edit-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 12px;
      background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 180ms ease; z-index: 2;
    }
    .hero-bg:hover .edit-overlay, .hero-bg:focus-within .edit-overlay { opacity: 1; }
    .edit-btn {
      padding: 8px 14px; background: var(--color-bg); border: 1px solid var(--color-line);
      color: var(--color-ink); font-size: 0.85rem; cursor: pointer; font-family: inherit;
    }
    .edit-btn:hover { background: var(--color-ink); color: var(--color-bg); }
    .edit-btn-danger:hover { background: #c44; color: #fff; border-color: #c44; }
    .editable-text { cursor: pointer; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color 180ms ease; border-radius: 2px; }
    .editable-text:hover, .editable-text:focus-visible { outline-color: currentColor; }
    .gallery-img-wrap { position: relative; }
    .gallery-img-wrap .edit-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 180ms ease; z-index: 2;
    }
    .gallery-img-wrap:hover .edit-overlay, .gallery-img-wrap:focus-within .edit-overlay { opacity: 1; }
    .gallery-img-wrap .edit-btn { padding: 4px 8px; font-size: 0.75rem; }
    .g-grid.editable { list-style: none; padding: 0; margin: 0; }
    .g-grid.editable li { display: block; }
  `]
})
export class FurnitureDetailViewComponent {
  @Input({ required: true }) item: Furniture | null = null;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};
  @Input() editable = false;

  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() textFieldClick = new EventEmitter<EditableTextField>();
}
