import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

export interface FocalPoint {
  x: number;
  y: number;
}

/**
 * Outil d'ajustement du point focal d'une image de couverture.
 *
 * Affiche l'image en preview. L'admin clique sur la zone a toujours garder
 * visible (ex. le visage, le sujet decentre). Les coordonnees sont normalisees
 * en pourcentages (0-100) et emises via {@link focalChange}. L'image n'est ni
 * recadree ni alteree cote serveur : seuls 2 nombres sont stockes.
 *
 * Affichage cote public : <code>img { object-position: X% Y% }</code> garde
 * le point focal toujours visible quel que soit le crop dicte par
 * object-fit: cover. Sans valeurs (X = Y = null), le navigateur centre par
 * defaut (50% 50%).
 */
@Component({
  selector: 'app-focal-point-picker',
  standalone: true,
  template: `
    @if (imageUrl) {
      <div class="focal-wrap">
        <div class="focal-stage" (click)="onClick($event, img)">
          <img #img [src]="imageUrl" [alt]="alt" />
          @if (hasFocal()) {
            <span class="focal-marker"
                  [style.left.%]="focalX ?? 50"
                  [style.top.%]="focalY ?? 50"
                  aria-hidden="true"></span>
          }
        </div>
        <div class="focal-controls">
          <span class="focal-label">
            Point focal :
            @if (hasFocal()) {
              <strong>X {{ (focalX ?? 50).toFixed(0) }}% · Y {{ (focalY ?? 50).toFixed(0) }}%</strong>
            } @else {
              <em>centre par defaut</em>
            }
          </span>
          <button type="button" class="reset-btn" (click)="reset()" [disabled]="!hasFocal()">
            Reinitialiser
          </button>
        </div>
        <p class="focal-hint">Clique sur la zone a toujours garder visible. L'image affichee en bandeau sur la fiche publique sera cadree autour de ce point.</p>
      </div>
    } @else {
      <p class="focal-empty">Renseigne d'abord une image de couverture pour ajuster le point focal.</p>
    }
  `,
  styles: [`
    .focal-wrap { display: flex; flex-direction: column; gap: 8px; }
    .focal-stage {
      position: relative; cursor: crosshair; max-width: 480px;
      border: 1px solid var(--color-line); background: var(--color-bg-alt);
      overflow: hidden; line-height: 0;
    }
    .focal-stage img { width: 100%; height: auto; display: block; user-select: none; -webkit-user-drag: none; }
    .focal-marker {
      position: absolute; width: 24px; height: 24px;
      border: 2px solid #ffffff; border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(0, 0, 0, 0.6);
      transform: translate(-50%, -50%); pointer-events: none;
      background: rgba(255, 255, 255, 0.15);
    }
    .focal-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .focal-label { font-size: 0.85rem; color: var(--color-ink); }
    .focal-label strong { font-weight: 500; color: var(--color-ink); }
    .focal-label em { color: var(--color-mute); font-style: italic; }
    .reset-btn {
      padding: 6px 14px; background: var(--color-bg); color: var(--color-ink);
      border: 1px solid var(--color-line); font-size: 0.78rem; cursor: pointer;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .reset-btn:hover:not(:disabled) { border-color: var(--color-ink); }
    .reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .focal-hint { font-size: 0.78rem; color: var(--color-mute); margin: 0; line-height: 1.5; }
    .focal-empty { font-size: 0.85rem; color: var(--color-mute); font-style: italic; }
  `]
})
export class FocalPointPickerComponent {
  @Input() imageUrl: string | null | undefined = '';
  @Input() alt = 'Image de couverture';
  @Input() focalX: number | null | undefined = null;
  @Input() focalY: number | null | undefined = null;

  @Output() focalChange = new EventEmitter<FocalPoint | null>();

  protected readonly hasFocal = computed(() => this.focalXSignal() !== null && this.focalYSignal() !== null);

  private readonly focalXSignal = signal<number | null>(null);
  private readonly focalYSignal = signal<number | null>(null);

  ngOnChanges(): void {
    this.focalXSignal.set(this.focalX ?? null);
    this.focalYSignal.set(this.focalY ?? null);
  }

  protected onClick(event: MouseEvent, img: HTMLImageElement): void {
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const clamped = {
      x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)),
      y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)),
    };
    this.focalXSignal.set(clamped.x);
    this.focalYSignal.set(clamped.y);
    this.focalChange.emit(clamped);
  }

  protected reset(): void {
    this.focalXSignal.set(null);
    this.focalYSignal.set(null);
    this.focalChange.emit(null);
  }
}
