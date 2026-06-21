import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { PortfolioService } from '../../../services/portfolio.service';
import { Photo } from '../../../models/photo.model';
import { ToastService } from '../shared/toast.service';
import { TagEditorComponent } from '../../../components/tag-editor/tag-editor.component';

@Component({
  selector: 'app-mediatheque',
  standalone: true,
  imports: [FormsModule, A11yModule, TagEditorComponent],
  template: `
    <div class="photos-tab">
      <div class="photos-upload-zone">
        <h2>Importer des photos</h2>
        <p class="photos-upload-hint">Formats acceptés : JPG, PNG, WebP, GIF · Taille max : 50 Mo par fichier · JPEG/PNG > 1920px sont automatiquement redimensionnés</p>
        <input #fileInput type="file" accept="image/*" multiple style="display:none" (change)="uploadFiles($event)" />
        <div class="photos-upload-actions">
          <button type="button" class="btn-primary" [disabled]="uploading()" (click)="fileInput.click()">
            {{ uploading() ? 'Importation en cours…' : 'Choisir des fichiers' }}
          </button>
          <button type="button" class="btn-secondary" [disabled]="optimizing()" (click)="optimizeAll()">
            {{ optimizing() ? 'Optimisation en cours…' : 'Optimiser les images existantes' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="status">Chargement de la médiathèque…</p>
      } @else if (photos().length === 0) {
        <p class="status photos-empty">Aucune photo importée. Commencez par importer des images ci-dessus.</p>
      } @else {
        <input
          type="search"
          class="photos-search"
          placeholder="Rechercher (nom de fichier ou tag)…"
          aria-label="Rechercher dans la mediatheque (nom de fichier ou tag)"
          [ngModel]="search()"
          (ngModelChange)="search.set($event)"
        />
        <div class="photos-filter">
          <app-tag-editor
            class="photos-filter-editor"
            [tags]="tagFilter()"
            [suggestions]="allTags()"
            placeholder="Filtrer par tag…"
            ariaLabel="Filtrer par tag"
            (tagsChange)="setTagFilter($event)"
          />
          <button
            type="button"
            class="no-tag-toggle"
            [class.active]="noTagOnly()"
            [attr.aria-pressed]="noTagOnly()"
            (click)="toggleNoTag()"
          >Sans tag</button>
        </div>
        <div class="photos-count">
          @if (search().trim()) {
            {{ filtered().length }} / {{ photos().length }} photo{{ photos().length > 1 ? 's' : '' }}
          } @else {
            {{ photos().length }} photo{{ photos().length > 1 ? 's' : '' }}
          }
        </div>
        <div class="photos-grid">
          @for (photo of filtered(); track photo.id) {
            <div class="photo-card">
              <div class="photo-thumb">
                <button type="button" class="photo-thumb-btn" (click)="openViewer(photo)" [title]="photo.originalName">
                  <img [src]="photo.url" [alt]="photo.originalName" loading="lazy" />
                </button>
              </div>
              <div class="photo-info">
                <span class="photo-name" [title]="photo.originalName">{{ photo.originalName }}</span>
                <span class="photo-meta">
                  @if (photo.format) { <span class="meta-chip">{{ photo.format }}</span> }
                  @if (photo.sizeBytes !== undefined && photo.sizeBytes !== null && photo.sizeBytes > 0) {
                    <span class="meta-size">{{ formatSize(photo.sizeBytes) }}</span>
                  }
                </span>
              </div>
              <div class="photo-tags">
                <app-tag-editor
                  [tags]="photo.tags ?? []"
                  [suggestions]="allTags()"
                  placeholder="+ tag"
                  ariaLabel="Ajouter un tag"
                  (tagsChange)="persistTags(photo, $event)"
                />
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
      <div class="viewer-backdrop" role="presentation" (click)="closeViewer()">
        <div class="viewer-panel"
             role="dialog"
             aria-modal="true"
             [attr.aria-labelledby]="'viewer-title'"
             cdkTrapFocus
             cdkTrapFocusAutoCapture
             (click)="$event.stopPropagation()">
          <button type="button" class="viewer-close" (click)="closeViewer()" aria-label="Fermer">×</button>
          <div class="viewer-img-wrap">
            <img [src]="viewingPhoto()!.url" [alt]="viewingPhoto()!.originalName" />
          </div>
          <div class="viewer-caption">
            <span id="viewer-title" class="viewer-name">{{ viewingPhoto()!.originalName }}</span>
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
    .photos-upload-actions { display: inline-flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
    .btn-primary {
      padding: 12px 28px; background: var(--color-ink); color: var(--color-bg); border: 0;
      cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      padding: 12px 28px; background: var(--color-bg); color: var(--color-ink); border: 1px solid var(--color-ink);
      cursor: pointer; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .btn-secondary:hover:not(:disabled) { background: var(--color-ink); color: var(--color-bg); }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .status { color: var(--color-mute); }
    .photos-search {
      display: block; width: 100%; max-width: 360px; padding: 10px 14px;
      font-size: 0.9rem; border: 1px solid var(--color-line); background: var(--color-bg);
      font-family: inherit; color: var(--color-ink); box-sizing: border-box;
    }
    .photos-search:focus { outline: 1px dashed var(--color-mute); outline-offset: 1px; }
    .photos-filter {
      display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px;
    }
    .photos-filter-editor { flex: 1; min-width: 240px; max-width: 480px; display: block; }
    .no-tag-toggle {
      align-self: stretch; padding: 6px 16px; font-size: 0.8rem; letter-spacing: 0.04em;
      border: 1px solid var(--color-line); background: var(--color-bg); color: var(--color-ink);
      cursor: pointer; font-family: inherit; white-space: nowrap;
    }
    .no-tag-toggle:hover { background: var(--color-bg-alt); }
    .no-tag-toggle:focus-visible { outline: 1px dashed var(--color-mute); outline-offset: 1px; }
    .no-tag-toggle.active {
      background: var(--color-ink); color: var(--color-bg); border-color: var(--color-ink);
    }
    .photos-count { font-size: 0.85rem; color: var(--color-mute); }
    .photos-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;
    }
    .photo-card { display: flex; flex-direction: column; border: 1px solid var(--color-line); background: var(--color-bg); }
    .photo-thumb { aspect-ratio: 1; overflow: hidden; }
    .photo-thumb-btn {
      background: transparent; border: 0; padding: 0; cursor: pointer; width: 100%; height: 100%; display: block;
    }
    .photo-thumb img { width: 100%; height: 100%; object-fit: contain; }
    .photo-info { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
    .photo-name { font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
    .photo-meta { display: inline-flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--color-mute); }
    .meta-chip {
      display: inline-block; padding: 1px 6px; border: 1px solid var(--color-line);
      letter-spacing: 0.08em; font-weight: 500; color: var(--color-ink-soft);
      background: var(--color-bg-alt);
    }
    .meta-size { color: var(--color-mute); }
    .photo-tags {
      padding: 8px 12px; border-top: 1px solid var(--color-line);
    }
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

  /**
   * Formate des octets en chaine compacte : "812 o", "12 Ko", "1.4 Mo".
   * Convention SI binaire (1 Ko = 1024 o) — coherente avec ce qu'affichent
   * la plupart des explorateurs de fichiers OS.
   */
  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  protected readonly photos = signal<Photo[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly optimizing = signal(false);
  protected readonly viewingPhoto = signal<Photo | null>(null);
  protected readonly search = signal('');

  /** Tags actifs du filtre (logique ET). Mutuellement exclusif avec `noTagOnly`. */
  protected readonly tagFilter = signal<string[]>([]);
  /** Filtre « sans tag ». Mutuellement exclusif avec `tagFilter`. */
  protected readonly noTagOnly = signal(false);

  /** Univers des tags : tags distincts de toutes les photos, tries alphabetiquement. */
  protected readonly allTags = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.photos()) {
      for (const t of p.tags ?? []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  protected readonly filtered = computed<Photo[]>(() => {
    const q = this.search().trim().toLowerCase();
    let list = this.photos();
    if (q) {
      list = list.filter(p =>
        p.originalName.toLowerCase().includes(q) ||
        (p.tags ?? []).some(t => t.includes(q))
      );
    }
    if (this.noTagOnly()) {
      return list.filter(p => (p.tags ?? []).length === 0);
    }
    const tags = this.tagFilter();
    if (tags.length > 0) {
      return list.filter(p => {
        const photoTags = p.tags ?? [];
        return tags.every(t => photoTags.includes(t));
      });
    }
    return list;
  });

  /**
   * Definit les tags du filtre. Normalise chaque entree (trim + minuscules,
   * vides ignores, dedoublonnage) pour garantir la correspondance avec les tags
   * persistes (le backend met deja tout en minuscules). Une selection non vide
   * desactive le filtre « sans tag » (exclusion mutuelle).
   */
  protected setTagFilter(next: string[]): void {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const raw of next) {
      const t = raw.trim().toLowerCase();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      normalized.push(t);
    }
    this.tagFilter.set(normalized);
    if (normalized.length > 0) this.noTagOnly.set(false);
  }

  /** Bascule le filtre « sans tag » ; l'activer vide la selection de tags (exclusion mutuelle). */
  protected toggleNoTag(): void {
    this.noTagOnly.update(v => !v);
    if (this.noTagOnly()) this.tagFilter.set([]);
  }

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

  optimizeAll(): void {
    this.optimizing.set(true);
    this.portfolio.optimizeAllPhotos().subscribe({
      next: report => {
        this.optimizing.set(false);
        const mb = (report.bytesSaved / (1024 * 1024)).toFixed(1);
        this.toast.success(
          `${report.optimized} / ${report.count} image(s) optimisée(s) — ${mb} Mo économisés.`
        );
      },
      error: () => {
        this.optimizing.set(false);
        this.toast.error('Erreur lors de l\'optimisation des images.');
      }
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
        error: (err) => {
          const reason =
            err?.status === 413 ? 'fichier trop volumineux' :
            err?.status === 401 || err?.status === 403 ? 'session expirée — reconnecte-toi' :
            err?.status === 0 ? 'pas de connexion au serveur' :
            err?.status ? `erreur HTTP ${err.status}` : 'erreur inconnue';
          console.error('[mediatheque] upload failed:', err);
          errors++;
          remaining--;
          if (remaining === 0) {
            this.uploading.set(false);
            this.toast.error(`${files.length - errors} importée(s), ${errors} erreur(s) (${reason}).`);
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

  /**
   * Persiste le tableau complet de tags d'une photo (gere ajout ET retrait).
   * Update optimiste immediat, puis appel `updatePhotoTags` ; en cas d'echec,
   * revert local et toast d'erreur. Branche sur l'output `tagsChange` de
   * `<app-tag-editor>`, qui emet a chaque fois le tableau neuf complet.
   */
  protected persistTags(photo: Photo, next: string[]): void {
    // Optimistic update
    this.photos.update(list => list.map(p => p.id === photo.id ? { ...p, tags: next } : p));
    this.portfolio.updatePhotoTags(photo.id, next).subscribe({
      next: updated => {
        this.photos.update(list => list.map(p => p.id === photo.id ? updated : p));
      },
      error: () => {
        this.toast.error('Impossible d\'enregistrer les tags.');
        this.photos.update(list => list.map(p => p.id === photo.id ? photo : p));
      }
    });
  }

  private viewerPreviousFocus: HTMLElement | null = null;

  openViewer(photo: Photo): void {
    if (typeof document !== 'undefined') {
      this.viewerPreviousFocus = document.activeElement as HTMLElement | null;
    }
    this.viewingPhoto.set(photo);
  }
  closeViewer(): void {
    this.viewingPhoto.set(null);
    const target = this.viewerPreviousFocus;
    this.viewerPreviousFocus = null;
    if (target && typeof target.focus === 'function') {
      setTimeout(() => {
        try { target.focus(); } catch { /* ignore */ }
      }, 0);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewingPhoto()) this.closeViewer();
  }
}
