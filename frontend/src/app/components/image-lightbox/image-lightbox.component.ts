import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, computed, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { Crop } from '../../models/crop.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

export interface LightboxImage {
  url: string;
  crop?: Crop | null;
  alt: string;
}

/**
 * Lightbox plein écran générique : parcourt une liste d'images (région cropée
 * via <app-cropped-image-canvas mode="fit">), navigation circulaire, flèches
 * clavier, Échap, clic backdrop. Composant pur : émet `closed`.
 */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [A11yModule, CroppedImageCanvasComponent],
  template: `
    <div class="lb-backdrop" role="dialog" aria-modal="true"
         [attr.aria-label]="'Image ' + (index() + 1) + ' sur ' + images.length"
         cdkTrapFocus cdkTrapFocusAutoCapture
         (click)="onBackdropClick($event)">
      <div class="sr-only" aria-live="polite">{{ current().alt }} — {{ index() + 1 }} sur {{ images.length }}</div>

      <button type="button" class="lb-close" aria-label="Fermer" (click)="close()">✕</button>

      @if (images.length > 1) {
        <button type="button" class="lb-nav lb-prev" aria-label="Image précédente" (click)="prev()">‹</button>
        <button type="button" class="lb-nav lb-next" aria-label="Image suivante" (click)="next()">›</button>
      }

      <figure class="lb-figure">
        <app-cropped-image-canvas class="lb-img" mode="fit"
          [imageUrl]="current().url" [crop]="current().crop ?? null" [alt]="current().alt" />
      </figure>

      @if (images.length > 1) {
        <div class="lb-counter">{{ index() + 1 }} / {{ images.length }}</div>
      }
    </div>
  `,
  styles: [`
    .lb-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(10,10,10,0.95); display: flex; align-items: center; justify-content: center; }
    .lb-figure { margin: 0; max-width: 92vw; max-height: 88vh; display: flex; align-items: center; justify-content: center; }
    .lb-img { display: block; max-width: 92vw; max-height: 88vh; }
    .lb-close { position: absolute; top: 18px; right: 22px; background: none; border: none; color: #fff; font-size: 1.4rem; cursor: pointer; opacity: 0.85; padding: 6px 10px; }
    .lb-close:hover, .lb-close:focus-visible { opacity: 1; }
    .lb-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); color: #fff; width: 48px; height: 48px; border-radius: 50%; font-size: 1.8rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .lb-nav:hover, .lb-nav:focus-visible { background: rgba(0,0,0,0.7); }
    .lb-prev { left: 20px; } .lb-next { right: 20px; }
    .lb-counter { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 0.78rem; letter-spacing: 0.14em; opacity: 0.8; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (max-width: 600px) { .lb-nav { width: 40px; height: 40px; font-size: 1.5rem; } .lb-prev { left: 8px; } .lb-next { right: 8px; } }
  `]
})
export class ImageLightboxComponent implements OnInit, OnDestroy {
  @Input({ required: true }) images: LightboxImage[] = [];
  @Input() startIndex = 0;
  @Output() closed = new EventEmitter<void>();

  protected readonly index = signal(0);
  private previousFocus: HTMLElement | null = null;

  protected readonly current = computed<LightboxImage>(() =>
    this.images[this.index()] ?? this.images[0] ?? { url: '', crop: null, alt: '' });

  ngOnInit(): void {
    this.previousFocus = (document.activeElement as HTMLElement | null);
    const n = this.images.length;
    this.index.set(n > 0 ? Math.min(Math.max(this.startIndex, 0), n - 1) : 0);
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus?.();
  }

  protected prev(): void {
    const n = this.images.length;
    if (n <= 1) return;
    this.index.set((this.index() - 1 + n) % n);
  }

  protected next(): void {
    const n = this.images.length;
    if (n <= 1) return;
    this.index.set((this.index() + 1) % n);
  }

  protected close(): void {
    this.closed.emit();
  }

  protected onBackdropClick(ev: MouseEvent): void {
    if ((ev.target as HTMLElement).classList.contains('lb-backdrop')) this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void { this.close(); }

  @HostListener('document:keydown.arrowleft')
  protected onLeft(): void { this.prev(); }

  @HostListener('document:keydown.arrowright')
  protected onRight(): void { this.next(); }
}
