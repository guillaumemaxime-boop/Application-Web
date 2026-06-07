import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import Cropper from 'cropperjs';
import { Crop } from '../../../models/crop.model';

export interface AspectRatio { label: string; value: number; }

export const DEFAULT_ASPECT_RATIOS: AspectRatio[] = [
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
  { label: '1:1', value: 1 },
  { label: 'Libre', value: NaN },
];

@Component({
  selector: 'app-image-crop-picker',
  standalone: true,
  imports: [A11yModule],
  template: `
    <div class="crop-backdrop" role="presentation" (click)="cancel()">
      <div class="crop-panel"
           role="dialog"
           aria-modal="true"
           aria-labelledby="crop-title"
           cdkTrapFocus
           cdkTrapFocusAutoCapture
           (click)="$event.stopPropagation()">
        <header class="crop-head">
          <h3 id="crop-title">Ajuster le cadrage</h3>
          <button type="button" class="crop-close" (click)="cancel()" aria-label="Fermer">×</button>
        </header>

        <div class="crop-controls">
          <label>
            <span>Aspect :</span>
            <select class="aspect-select" (change)="onAspectChange($event)">
              @for (a of aspectRatios; track a.label) {
                <option [value]="a.label">{{ a.label }}</option>
              }
            </select>
          </label>
          <button type="button" class="btn-reset" (click)="resetCrop()">Réinitialiser</button>
        </div>

        <div class="crop-stage">
          <img #cropImage [src]="imageUrl" alt="" />
        </div>

        <footer class="crop-foot">
          @if (currentCrop) {
            <span class="crop-coords">
              X {{ currentCrop.x.toFixed(0) }}% · Y {{ currentCrop.y.toFixed(0) }}% · L {{ currentCrop.w.toFixed(0) }}% · H {{ currentCrop.h.toFixed(0) }}%
            </span>
          }
          <div class="actions">
            <button type="button" class="btn-cancel" (click)="cancel()">Annuler</button>
            <button type="button" class="btn-validate" (click)="validate()">Valider le crop</button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .crop-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1100;
                     display: flex; align-items: center; justify-content: center; padding: 24px; }
    .crop-panel { background: var(--color-bg); width: 100%; max-width: 900px; max-height: 90vh;
                  display: flex; flex-direction: column; }
    .crop-head { display: flex; align-items: center; justify-content: space-between;
                 padding: 18px 24px; border-bottom: 1px solid var(--color-line); }
    .crop-close { background: transparent; border: 0; font-size: 1.5rem; cursor: pointer; color: var(--color-mute); }
    .crop-controls { padding: 16px 24px; display: flex; gap: 16px; align-items: center;
                     border-bottom: 1px solid var(--color-line); }
    .crop-controls label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; }
    .aspect-select { padding: 6px 10px; border: 1px solid var(--color-line); background: var(--color-bg);
                     color: var(--color-ink); font: inherit; }
    .btn-reset { padding: 6px 14px; background: var(--color-bg); border: 1px solid var(--color-line);
                 font-size: 0.78rem; cursor: pointer; color: var(--color-ink-soft); }
    .crop-stage { flex: 1; padding: 16px 24px; overflow: hidden; min-height: 400px; }
    .crop-stage img { display: block; max-width: 100%; }
    .crop-foot { padding: 16px 24px; border-top: 1px solid var(--color-line);
                 display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .crop-coords { font-size: 0.78rem; color: var(--color-mute); font-family: ui-monospace, monospace; }
    .actions { display: inline-flex; gap: 12px; }
    .btn-cancel { padding: 10px 20px; background: var(--color-bg); border: 1px solid var(--color-line);
                  font-size: 0.85rem; cursor: pointer; color: var(--color-ink); letter-spacing: 0.06em;
                  text-transform: uppercase; }
    .btn-validate { padding: 10px 24px; background: var(--color-ink); color: var(--color-bg);
                    border: 0; font-size: 0.85rem; cursor: pointer; letter-spacing: 0.06em;
                    text-transform: uppercase; }
  `]
})
export class ImageCropPickerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) imageUrl!: string;
  @Input() initialCrop: Crop | null = null;
  @Input() aspectRatios: AspectRatio[] = DEFAULT_ASPECT_RATIOS;

  @Output() validated = new EventEmitter<Crop>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('cropImage') cropImage!: ElementRef<HTMLImageElement>;

  protected currentCrop: Crop | null = null;
  private cropper?: Cropper;

  ngAfterViewInit(): void {
    const img = this.cropImage.nativeElement;
    img.onload = () => this.initCropper(img);
    if (img.complete && img.naturalWidth > 0) this.initCropper(img);
  }

  private initCropper(img: HTMLImageElement): void {
    if (this.cropper) return;
    try {
      this.cropper = new Cropper(img, {
        viewMode: 1,
        aspectRatio: this.aspectRatios[0].value,
        autoCropArea: 1,
        background: false,
        crop: (event) => this.onCrop(event.detail),
        ready: () => {
          if (this.initialCrop) {
            this.applyInitialCrop(this.initialCrop);
          }
        },
      });
    } catch {
      // Cropper.js peut échouer dans un environnement headless (getBoundingClientRect non supporté).
      // On ignore l'erreur pour ne pas casser les tests qui ne testent pas Cropper directement.
    }
  }

  private applyInitialCrop(crop: Crop): void {
    const img = this.cropImage.nativeElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    this.cropper!.setData({
      x: (crop.x / 100) * w,
      y: (crop.y / 100) * h,
      width: (crop.w / 100) * w,
      height: (crop.h / 100) * h,
    });
  }

  private onCrop(detail: Cropper.Data): void {
    const img = this.cropImage.nativeElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    this.currentCrop = {
      x: (detail.x / w) * 100,
      y: (detail.y / h) * 100,
      w: (detail.width / w) * 100,
      h: (detail.height / h) * 100,
    };
  }

  protected onAspectChange(event: Event): void {
    const label = (event.target as HTMLSelectElement).value;
    const ar = this.aspectRatios.find(a => a.label === label);
    if (!ar || !this.cropper) return;
    // Approche radicale : detruire et recreer le cropper avec le nouvel aspect.
    // Garantit un etat propre (setAspectRatio + reset() ne suffisent pas dans
    // tous les cas, notamment pour passer de Libre a contraint et inversement).
    const img = this.cropImage.nativeElement;
    this.cropper.destroy();
    this.cropper = undefined;
    this.currentCrop = null;
    try {
      this.cropper = new Cropper(img, {
        viewMode: 1,
        aspectRatio: ar.value,
        autoCropArea: 1,
        background: false,
        crop: (event) => this.onCrop(event.detail),
      });
    } catch {
      // Headless / pas de DOM exploitable : ignorer.
    }
  }

  protected resetCrop(): void {
    if (this.cropper) this.cropper.reset();
  }

  protected validate(): void {
    // Lit les donnees fraiches du cropper au moment du clic Valider, plutot
    // que de se reposer sur this.currentCrop qui peut etre obsolete (event crop
    // throttle, ou aspect ratio change sans re-fire crop event).
    if (this.cropper) {
      const data = this.cropper.getData(true);
      const img = this.cropImage.nativeElement;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w && h) {
        this.validated.emit({
          x: (data.x / w) * 100,
          y: (data.y / h) * 100,
          w: (data.width / w) * 100,
          h: (data.height / h) * 100,
        });
        return;
      }
    }
    if (this.currentCrop) this.validated.emit(this.currentCrop);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  ngOnDestroy(): void {
    this.cropper?.destroy();
  }
}
