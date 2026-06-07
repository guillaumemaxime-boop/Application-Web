import { Component, EventEmitter, Input, Output, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Photo } from '../../../models/photo.model';
import { Crop } from '../../../models/crop.model';
import { PhotoPickerComponent } from './photo-picker.component';
import { ImageCropPickerComponent } from './image-crop-picker.component';
import { CroppedImageCanvasComponent } from './cropped-image-canvas.component';

@Component({
  selector: 'app-image-field',
  standalone: true,
  imports: [PhotoPickerComponent, ImageCropPickerComponent, CroppedImageCanvasComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageFieldComponent),
      multi: true,
    },
  ],
  template: `
    <div class="image-field">
      <label>
        <span>{{ label }}</span>
        <div class="image-field-row">
          <input
            type="url"
            [value]="value()"
            [disabled]="disabled()"
            (input)="onInput($event)"
            (blur)="onTouched()" />
          <button type="button" class="btn-pick" [disabled]="disabled()" (click)="openPicker()" title="Choisir depuis la médiathèque">
            Médiathèque
          </button>
          @if (cropEnabled) {
            <button type="button" class="btn-pick" [disabled]="disabled() || !value()" (click)="openCrop()" title="Cadrer cette image">
              Cadrer
            </button>
          }
        </div>
      </label>

      @if (cropEnabled && value()) {
        <div class="crop-preview">
          <app-cropped-image-canvas
            class="crop-preview-canvas"
            [imageUrl]="value()"
            [crop]="cropValue ?? null"
            mode="adaptive"
            [targetHeight]="140"
            [maxWidth]="240"
            alt="Aperçu de l'image cadrée" />
          <span class="crop-preview-label">
            @if (cropValue) {
              Cadrée — {{ cropValue.w.toFixed(0) }}% × {{ cropValue.h.toFixed(0) }}%
            } @else {
              Image entière — aucun cadrage défini
            }
          </span>
        </div>
      }
    </div>

    @if (pickerOpen()) {
      <app-photo-picker
        target="cover"
        [photos]="photos()"
        (selected)="onSelected($event)"
        (closed)="pickerOpen.set(false)" />
    }

    @if (cropOpen()) {
      <app-image-crop-picker
        [imageUrl]="value()"
        [initialCrop]="cropValue ?? null"
        (validated)="onCropValidated($event)"
        (cancelled)="cropOpen.set(false)" />
    }
  `,
  styles: [`
    .image-field label { display: flex; flex-direction: column; gap: 6px; }
    .image-field label > span { font-size: 0.78rem; color: var(--color-ink-soft); }
    .image-field-row { display: flex; gap: 8px; align-items: stretch; }
    .image-field-row input {
      flex: 1; font: inherit; padding: 8px 10px;
      border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink);
    }
    .image-field-row input:focus { outline: none; border-color: var(--color-accent); }
    .image-field-row input:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .btn-pick {
      background: transparent; border: 1px solid var(--color-line); padding: 6px 14px;
      font-size: 0.78rem; cursor: pointer; color: var(--color-ink-soft); white-space: nowrap;
    }
    .btn-pick:hover:not(:disabled) { color: var(--color-ink); border-color: var(--color-ink); }
    .btn-pick:disabled { opacity: 0.5; cursor: not-allowed; }
    .crop-preview { display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
    .crop-preview-canvas {
      max-width: 240px; max-height: 160px;
      border: 1px solid var(--color-line); background: var(--color-bg-alt);
      flex-shrink: 0;
    }
    .crop-preview-label {
      font-size: 0.78rem; color: var(--color-mute); line-height: 1.4;
    }
    @media (max-width: 600px) {
      .image-field-row { flex-direction: column; }
    }
  `]
})
export class ImageFieldComponent implements ControlValueAccessor {
  private readonly portfolio = inject(PortfolioService);

  @Input() label = 'Image';
  @Input() cropEnabled = false;
  @Input() cropValue: Crop | null | undefined = null;
  @Output() cropChange = new EventEmitter<Crop | null>();

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly pickerOpen = signal(false);
  protected readonly cropOpen = signal(false);
  protected readonly photos = signal<Photo[]>([]);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const url = (event.target as HTMLInputElement).value;
    this.value.set(url);
    this.onChange(url);
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
    this.portfolio.getPhotos().subscribe(p => this.photos.set(p));
  }

  protected openCrop(): void {
    this.cropOpen.set(true);
  }


  protected onCropValidated(crop: Crop): void {
    this.cropChange.emit(crop);
    this.cropOpen.set(false);
  }

  protected onSelected(photo: Photo): void {
    this.value.set(photo.url);
    this.onChange(photo.url);
    this.onTouched();
    this.pickerOpen.set(false);
  }
}
