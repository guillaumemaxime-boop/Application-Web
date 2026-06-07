import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Crop } from '../../../models/crop.model';

/**
 * Rend l'image source + crop optionnel dans un <canvas>. Pixel-perfect grâce
 * à drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) qui clippe exactement la
 * region source vers la cible.
 *
 * Deux modes :
 * - `adaptive` : le canvas adapte sa largeur a l'aspect du crop (le canvas
 *   change de taille). Bon pour une preview unique (ex. cover).
 * - `cover` : le canvas garde une taille fixe et la zone croppée est
 *   cover-fittée. Bon pour une grille de vignettes (gallery).
 */
@Component({
  selector: 'app-cropped-image-canvas',
  standalone: true,
  template: `<canvas #canvas class="cropped-image-canvas" role="img" [attr.aria-label]="alt"></canvas>`,
  styles: [`
    .cropped-image-canvas { display: block; width: 100%; height: 100%; }
  `]
})
export class CroppedImageCanvasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) imageUrl!: string;
  @Input() crop: Crop | null | undefined = null;
  @Input() alt = '';
  /** 'adaptive' = canvas s'ajuste a l'aspect du crop. 'cover' = taille fixe (CSS), cover-fit. */
  @Input() mode: 'adaptive' | 'cover' = 'cover';
  /** Pour mode 'adaptive' : hauteur cible en pixels. */
  @Input() targetHeight = 140;
  /** Pour mode 'adaptive' : largeur max en pixels (clamp si crop tres large). */
  @Input() maxWidth = 240;

  private resizeObserver?: ResizeObserver;
  private cachedImage?: HTMLImageElement;

  ngAfterViewInit(): void {
    this.render();
    // En mode cover, le canvas doit se redessiner quand son conteneur change
    // de taille (resize fenetre, etc.). Pas necessaire en mode adaptive ou la
    // taille du canvas est pilotee par le code, pas par le CSS du parent.
    if (this.mode === 'cover' && this.canvasRef && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.render());
      this.resizeObserver.observe(this.canvasRef.nativeElement);
    }
  }

  ngOnChanges(): void {
    queueMicrotask(() => this.render());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private render(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.imageUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Reutilise l'image cachee si elle correspond a l'URL courante (evite un
    // re-fetch + re-decodage a chaque resize).
    if (this.cachedImage && this.cachedImage.src === this.imageUrl && this.cachedImage.complete) {
      this.draw(ctx, canvas, this.cachedImage);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';  // permet getImageData() ulterieur sans tainted canvas
    img.onload = () => {
      this.cachedImage = img;
      this.draw(ctx, canvas, img);
    };
    img.onerror = () => {
      canvas.width = canvas.width;  // clears the canvas
    };
    img.src = this.imageUrl;
  }

  private draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement): void {
    if (this.mode === 'adaptive') {
      this.renderAdaptive(ctx, canvas, img);
    } else {
      this.renderCoverFit(ctx, canvas, img);
    }
  }

  private renderAdaptive(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement): void {
    const c = this.crop;
    const TH = this.targetHeight;
    const MW = this.maxWidth;
    if (!c || !c.w || !c.h) {
      const aspect = (img.naturalWidth / img.naturalHeight) || 1;
      canvas.height = TH;
      canvas.width = Math.min(TH * aspect, MW);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return;
    }
    const sx = (c.x / 100) * img.naturalWidth;
    const sy = (c.y / 100) * img.naturalHeight;
    const sw = (c.w / 100) * img.naturalWidth;
    const sh = (c.h / 100) * img.naturalHeight;
    const cropAspect = sw / sh || 1;
    canvas.height = TH;
    canvas.width = Math.min(TH * cropAspect, MW);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  private renderCoverFit(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement): void {
    // Mode "cover" : taille canvas calee sur la taille rendue par le CSS du parent.
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, Math.round(rect.width));
    const H = Math.max(1, Math.round(rect.height));
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    const c = this.crop;
    if (!c || !c.w || !c.h) {
      // Pas de crop : cover-fit de l'image entiere
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return;
    }
    const sx = (c.x / 100) * img.naturalWidth;
    const sy = (c.y / 100) * img.naturalHeight;
    const sw = (c.w / 100) * img.naturalWidth;
    const sh = (c.h / 100) * img.naturalHeight;
    // Cover-fit du rectangle source (sx,sy,sw,sh) vers (0,0,W,H)
    const scale = Math.max(W / sw, H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(img, sx, sy, sw, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
}
