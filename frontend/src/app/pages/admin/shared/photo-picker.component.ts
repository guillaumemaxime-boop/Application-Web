import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Photo } from '../../../models/photo.model';

@Component({
  selector: 'app-photo-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="picker-backdrop" (click)="emitClose()">
      <div class="picker-panel" (click)="$event.stopPropagation()">
        <div class="picker-head">
          <h3>
            @if (target === 'gallery') { Ajouter à la galerie } @else { Choisir une image }
          </h3>
          <button type="button" class="picker-close" (click)="emitClose()" aria-label="Fermer">×</button>
        </div>
        @if (target === 'gallery') {
          <p class="picker-hint">Cliquez sur une photo pour l'ajouter à la galerie.</p>
        } @else {
          <p class="picker-hint">Cliquez sur une photo pour la sélectionner comme image principale.</p>
        }
        @if (photos.length === 0) {
          <p class="picker-empty">Aucune photo disponible. Importez des images dans la Médiathèque.</p>
        } @else {
          <div class="picker-search">
            <input
              type="search"
              class="picker-search-input"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="Rechercher par nom de fichier…"
              aria-label="Rechercher une photo" />
          </div>
          @if (filtered().length === 0) {
            <p class="picker-empty">Aucun résultat pour « {{ query() }} ».</p>
          } @else {
            <div class="picker-grid">
              @for (photo of filtered(); track photo.id) {
                <button type="button" class="picker-item" (click)="select(photo)" [title]="photo.originalName">
                  <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .picker-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .picker-panel {
      background: var(--color-bg); width: 100%; max-width: 860px; max-height: 80vh;
      display: flex; flex-direction: column;
    }
    .picker-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid var(--color-line); flex-shrink: 0;
    }
    .picker-head h3 { margin: 0; font-size: 1.1rem; }
    .picker-close {
      background: transparent; border: 0; font-size: 1.5rem; color: var(--color-mute);
      cursor: pointer; line-height: 1; padding: 4px 8px;
    }
    .picker-close:hover { color: var(--color-ink); }
    .picker-hint { padding: 12px 24px 0; font-size: 0.85rem; color: var(--color-mute); flex-shrink: 0; margin: 0; }
    .picker-search { padding: 12px 24px 0; flex-shrink: 0; }
    .picker-search-input {
      width: 100%; box-sizing: border-box; font: inherit; padding: 8px 12px;
      border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink);
    }
    .picker-search-input:focus { outline: none; border-color: var(--color-accent); }
    .picker-empty { padding: 32px 24px; color: var(--color-mute); font-size: 0.9rem; }
    .picker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px; padding: 16px 24px 24px; overflow-y: auto;
    }
    .picker-item {
      border: 2px solid var(--color-line); background: var(--color-bg-alt); padding: 0;
      cursor: pointer; aspect-ratio: 1; overflow: hidden;
    }
    .picker-item:hover { border-color: var(--color-accent); }
    .picker-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `]
})
export class PhotoPickerComponent {
  @Input() target: 'cover' | 'gallery' = 'cover';
  @Input() photos: Photo[] = [];

  @Output() selected = new EventEmitter<Photo>();
  @Output() closed = new EventEmitter<void>();

  protected readonly query = signal('');

  protected filtered(): Photo[] {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.photos;
    return this.photos.filter(p => p.originalName.toLowerCase().includes(q));
  }

  select(photo: Photo): void {
    this.selected.emit(photo);
  }

  emitClose(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
