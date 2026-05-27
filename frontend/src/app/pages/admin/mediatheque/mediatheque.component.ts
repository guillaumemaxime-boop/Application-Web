import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PortfolioService } from '../../../services/portfolio.service';
import { Photo } from '../../../models/photo.model';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-mediatheque',
  standalone: true,
  template: `
    <div class="photos-tab">
      <div class="photos-upload-zone">
        <h2>Importer des photos</h2>
        <p class="photos-upload-hint">Formats acceptés : JPG, PNG, WebP, GIF · Taille max : 20 Mo par fichier</p>
        <input #fileInput type="file" accept="image/*" multiple style="display:none" (change)="uploadFiles($event)" />
        <button type="button" class="btn-primary" [disabled]="uploading()" (click)="fileInput.click()">
          {{ uploading() ? 'Importation en cours…' : 'Choisir des fichiers' }}
        </button>
      </div>

      @if (loading()) {
        <p class="status">Chargement de la médiathèque…</p>
      } @else if (photos().length === 0) {
        <p class="status photos-empty">Aucune photo importée. Commencez par importer des images ci-dessus.</p>
      } @else {
        <div class="photos-count">{{ photos().length }} photo{{ photos().length > 1 ? 's' : '' }}</div>
        <div class="photos-grid">
          @for (photo of photos(); track photo.id) {
            <div class="photo-card">
              <div class="photo-thumb">
                <button type="button" class="photo-thumb-btn" (click)="openViewer(photo)" [title]="photo.originalName">
                  <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
                </button>
              </div>
              <div class="photo-info">
                <span class="photo-name" [title]="photo.originalName">{{ photo.originalName }}</span>
              </div>
              <div class="photo-actions">
                <button type="button" class="btn-copy" (click)="copyUrl(photo.url)" title="Copier l'URL">
                  Copier URL
                </button>
                <button type="button" class="photo-del" (click)="removePhoto(photo)" aria-label="Supprimer">×</button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (viewingPhoto()) {
      <div class="viewer-backdrop" (click)="closeViewer()">
        <div class="viewer-panel" (click)="$event.stopPropagation()">
          <button type="button" class="viewer-close" (click)="closeViewer()" aria-label="Fermer">×</button>
          <div class="viewer-img-wrap">
            <img [src]="viewingPhoto()!.url" [alt]="viewingPhoto()!.originalName" />
          </div>
          <div class="viewer-caption">
            <span class="viewer-name">{{ viewingPhoto()!.originalName }}</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .photos-tab { display: flex; flex-direction: column; gap: 24px; }
    .photos-upload-zone {
      padding: 32px; border: 1px dashed var(--color-line); background: var(--color-bg-alt); text-align: center;
    }
    .photos-upload-zone h2 { margin: 0 0 8px; font-size: 1.3rem; }
    .photos-upload-hint { margin: 0 0 20px; color: var(--color-mute); font-size: 0.85rem; }
    .btn-primary {
      padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0;
      cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { color: var(--color-mute); }
    .photos-count { font-size: 0.85rem; color: var(--color-mute); }
    .photos-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;
    }
    .photo-card { display: flex; flex-direction: column; border: 1px solid var(--color-line); background: var(--color-bg); }
    .photo-thumb { aspect-ratio: 1; overflow: hidden; }
    .photo-thumb-btn {
      background: transparent; border: 0; padding: 0; cursor: pointer; width: 100%; height: 100%; display: block;
    }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .photo-info { padding: 8px 12px; }
    .photo-name { font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
    .photo-actions { display: flex; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--color-line); }
    .btn-copy { background: transparent; border: 1px solid var(--color-line); padding: 4px 10px; font-size: 0.75rem; cursor: pointer; }
    .photo-del { background: transparent; border: 0; color: var(--color-mute); font-size: 1.2rem; cursor: pointer; padding: 0 6px; }
    .photo-del:hover { color: #b1532a; }

    .viewer-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1100;
      display: flex; align-items: center; justify-content: center;
    }
    .viewer-panel {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 100%; height: 100%; padding: 64px 80px 56px; box-sizing: border-box;
    }
    .viewer-img-wrap { display: flex; align-items: center; justify-content: center; max-width: 100%; max-height: 100%; }
    .viewer-img-wrap img {
      max-width: 100%; max-height: calc(100vh - 120px); object-fit: contain; display: block;
      box-shadow: 0 8px 48px rgba(0,0,0,0.6);
    }
    .viewer-close {
      position: absolute; top: 16px; right: 20px; background: transparent; border: 0;
      color: rgba(255,255,255,0.7); font-size: 2.5rem; line-height: 1; cursor: pointer; padding: 4px 10px; z-index: 10;
    }
    .viewer-close:hover { color: #fff; }
    .viewer-caption {
      position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 24px;
      background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.75);
      font-size: 0.8rem; letter-spacing: 0.06em;
    }
    .viewer-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `]
})
export class MediathequeComponent implements AfterViewInit {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  protected readonly photos = signal<Photo[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly viewingPhoto = signal<Photo | null>(null);

  constructor() {
    this.refresh();
  }

  ngAfterViewInit(): void {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('import') === '1') {
        setTimeout(() => this.fileInput?.nativeElement.click(), 0);
      }
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.portfolio.getPhotos().subscribe({
      next: data => { this.photos.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger la médiathèque.'); }
    });
  }

  uploadFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    this.uploading.set(true);
    let remaining = files.length;
    let errors = 0;

    for (const file of files) {
      this.portfolio.uploadPhoto(file).subscribe({
        next: photo => {
          this.photos.update(list => [photo, ...list]);
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            const msg = errors > 0
              ? `${files.length - errors} photo(s) importée(s), ${errors} erreur(s).`
              : `${files.length} photo(s) importée(s) avec succès.`;
            if (errors > 0) this.toast.error(msg); else this.toast.success(msg);
          }
        },
        error: () => {
          errors++;
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            this.toast.error(`${files.length - errors} photo(s) importée(s), ${errors} erreur(s).`);
          }
        }
      });
    }
    input.value = '';
  }

  removePhoto(photo: Photo): void {
    if (!confirm(`Supprimer la photo "${photo.originalName}" ?`)) return;
    this.portfolio.deletePhoto(photo.id).subscribe({
      next: () => {
        this.photos.update(list => list.filter(p => p.id !== photo.id));
        this.toast.success('Photo supprimée.');
      },
      error: () => this.toast.error('Erreur lors de la suppression.')
    });
  }

  copyUrl(url: string): void {
    navigator.clipboard.writeText(url).then(() => this.toast.success('URL copiée dans le presse-papier.'));
  }

  openViewer(photo: Photo): void { this.viewingPhoto.set(photo); }
  closeViewer(): void { this.viewingPhoto.set(null); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewingPhoto()) this.closeViewer();
  }
}
