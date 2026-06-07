import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { Photo } from '../../../models/photo.model';
import { GalleryItem } from '../../../models/gallery-item.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { PhotoPickerComponent } from './photo-picker.component';

@Component({
  selector: 'app-gallery-editor',
  standalone: true,
  imports: [ReorderableDirective, PhotoPickerComponent],
  template: `
    <div class="gallery-block">
      <div class="gallery-block-head">
        <span class="gallery-label">Galerie</span>
        <button type="button" class="btn-pick" (click)="openPicker()" title="Ajouter depuis la médiathèque">
          + Ajouter
        </button>
      </div>
      @if (images.length === 0) {
        <p class="gallery-empty">Aucune image. Cliquez sur « Ajouter » pour insérer une photo depuis la médiathèque.</p>
      } @else {
        <ul class="gallery-thumbs" appReorderable (reordered)="onReorder($event)">
          @for (item of images; track item.url) {
            <li class="gallery-thumb">
              <img [src]="item.url" alt="" />
              <button type="button" class="thumb-remove" (click)="removeImage(item.url)" aria-label="Retirer">×</button>
            </li>
          }
        </ul>
        <p class="gallery-hint">Glisse une vignette pour réordonner.</p>
      }
    </div>

    @if (pickerOpen()) {
      <app-photo-picker
        target="gallery"
        [photos]="photos()"
        (selected)="onPhotoSelected($event)"
        (closed)="closePicker()" />
    }
  `,
  styles: [`
    .gallery-block { display: flex; flex-direction: column; gap: 10px; }
    .gallery-block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .gallery-label {
      font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    .btn-pick {
      padding: 8px 14px; background: var(--color-bg-alt); border: 1px solid var(--color-line);
      font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--color-ink-soft); cursor: pointer; white-space: nowrap;
    }
    .btn-pick:hover { border-color: var(--color-accent); color: var(--color-accent); }
    .gallery-empty {
      margin: 0; padding: 16px; font-size: 0.85rem; color: var(--color-ink-soft);
      font-style: italic; background: var(--color-bg-alt); border: 1px dashed var(--color-line);
      text-align: center;
    }
    .gallery-thumbs {
      list-style: none; margin: 0; padding: 0; display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;
    }
    .gallery-thumb {
      position: relative; aspect-ratio: 4 / 3; overflow: hidden;
      border: 1px solid var(--color-line); background: var(--color-bg-alt); cursor: grab;
    }
    .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-remove {
      position: absolute; top: 4px; right: 4px; width: 24px; height: 24px;
      border-radius: 50%; background: rgba(0, 0, 0, 0.7); border: none; color: #fff;
      font-size: 1rem; line-height: 1; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
    }
    .thumb-remove:hover { background: rgba(0, 0, 0, 0.9); }
    .gallery-hint { margin: 0; font-size: 0.75rem; color: var(--color-mute); font-style: italic; }
  `]
})
export class GalleryEditorComponent {
  private readonly portfolio = inject(PortfolioService);

  @Input() images: GalleryItem[] = [];
  @Output() imagesChange = new EventEmitter<GalleryItem[]>();

  protected readonly pickerOpen = signal(false);
  protected readonly photos = signal<Photo[]>([]);

  openPicker(): void {
    this.pickerOpen.set(true);
    this.portfolio.getPhotos().subscribe(p => this.photos.set(p));
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  onPhotoSelected(photo: Photo): void {
    if (!this.images.some(i => i.url === photo.url)) {
      this.imagesChange.emit([...this.images, { url: photo.url, crop: null }]);
    }
  }

  removeImage(url: string): void {
    this.imagesChange.emit(this.images.filter(i => i.url !== url));
  }

  onReorder(order: number[]): void {
    this.imagesChange.emit(order.map(i => this.images[i]));
  }
}
