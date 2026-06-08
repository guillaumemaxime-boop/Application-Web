import { ApplicationRef, ChangeDetectorRef, Component, EventEmitter, inject, Input, NgZone, OnDestroy, Output, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';

export type EditableTextField = 'title' | 'category' | 'material' | 'description' | 'shortDescription';
import { Furniture } from '../../models/furniture.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { SiteContent } from '../../models/site-content.model';
import { Story } from '../../models/story.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';
import { StoryInlineComponent } from '../story-inline/story-inline.component';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { StoryItem } from '../story-viewer/story-viewer.component';
import { roleStyle } from '../../utils/title-style';

@Component({
  selector: 'app-furniture-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent, StoryInlineComponent, ReorderableDirective, RouterLink, NgStyle],
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
              <span class="eyebrow editable-text" [ngStyle]="eyebrowStyle()" role="button" tabindex="0"
                    [attr.contenteditable]="isEditingField('category')"
                    (click)="textFieldClick.emit('category')"
                    (dblclick)="startInlineEdit($event, 'category')"
                    (blur)="commitInlineEdit($event, 'category')"
                    (keydown.enter)="onInlineEnter($event, 'category')"
                    (keydown.escape)="cancelInlineEdit($event)"
                    (keydown.space)="onSpaceWhenNotEditing($event, 'category')">{{ item.category }} · {{ item.year }}</span>
              <h1 class="editable-text" [ngStyle]="titleStyle()" role="button" tabindex="0"
                  [attr.contenteditable]="isEditingField('title')"
                  (click)="textFieldClick.emit('title')"
                  (dblclick)="startInlineEdit($event, 'title')"
                  (blur)="commitInlineEdit($event, 'title')"
                  (keydown.enter)="onInlineEnter($event, 'title')"
                  (keydown.escape)="cancelInlineEdit($event)"
                  (keydown.space)="onSpaceWhenNotEditing($event, 'title')">{{ item.title }}</h1>
              <p class="material editable-text" role="button" tabindex="0"
                 [attr.contenteditable]="isEditingField('material')"
                 (click)="textFieldClick.emit('material')"
                 (dblclick)="startInlineEdit($event, 'material')"
                 (blur)="commitInlineEdit($event, 'material')"
                 (keydown.enter)="onInlineEnter($event, 'material')"
                 (keydown.escape)="cancelInlineEdit($event)"
                 (keydown.space)="onSpaceWhenNotEditing($event, 'material')">{{ item.material }}</p>
            } @else {
              <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ item.category }} · {{ item.year }}</span>
              <h1 [ngStyle]="titleStyle()">{{ item.title }}</h1>
              <p class="material">{{ item.material }}</p>
            }
          </div>
        </header>

        <section class="section description">
          <div class="container narrow">
            @if (editable) {
              <p class="lead editable-text" role="button" tabindex="0"
                 [attr.contenteditable]="isEditingField('shortDescription')"
                 (click)="textFieldClick.emit('shortDescription')"
                 (dblclick)="startInlineEdit($event, 'shortDescription')"
                 (blur)="commitInlineEdit($event, 'shortDescription')"
                 (keydown.enter)="onInlineEnter($event, 'shortDescription')"
                 (keydown.escape)="cancelInlineEdit($event)"
                 (keydown.space)="onSpaceWhenNotEditing($event, 'shortDescription')">{{ item.shortDescription }}</p>
            } @else {
              <p class="lead">{{ item.shortDescription }}</p>
            }
            @if (editable) {
              <p class="body editable-text" role="button" tabindex="0"
                 [attr.contenteditable]="isEditingField('description')"
                 (click)="textFieldClick.emit('description')"
                 (dblclick)="startInlineEdit($event, 'description')"
                 (blur)="commitInlineEdit($event, 'description')"
                 (keydown.enter)="onInlineEnter($event, 'description')"
                 (keydown.escape)="cancelInlineEdit($event)"
                 (keydown.space)="onSpaceWhenNotEditing($event, 'description')">{{ item.description }}</p>
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

            @if (item.tags && item.tags.length > 0) {
              <div class="tags-list">
                @for (t of item.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
          </div>
        </section>

        @if (displaySlides.length > 0) {
          <app-story-inline [slides]="displaySlides"></app-story-inline>

          @if (item.showStoryButton) {
            <div class="container narrow viewer-link-wrap">
              <button type="button" class="viewer-link" aria-label="Voir en plein écran" (click)="onViewerOpen()">
                Voir en plein écran →
              </button>
            </div>
          }
        }

        @if (item.gallery.length > 0 || editable) {
          <section class="section gallery">
            <div class="container">
              @if (editable) {
                <ul class="g-grid editable" appReorderable (reordered)="galleryReorder.emit($event)">
                  @for (img of item.gallery; track img.url; let i = $index) {
                    <li class="g-item-draggable"
                        [style.grid-column]="'span ' + (img.colSpan ?? 1)"
                        [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
                      <figure>
                        <div class="gallery-img-wrap">
                          <app-cropped-image-canvas
                            [imageUrl]="img.url"
                            [crop]="img.crop ?? null"
                            [alt]="item.title + ' — vue ' + (i + 1)"
                            mode="cover" />
                          <div class="drag-handle" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</div>
                          <div class="edit-overlay">
                            <button type="button" class="edit-btn" aria-label="Cadrer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'crop' })">✂</button>
                            <button type="button" class="edit-btn" aria-label="Remplacer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'replace' })">🖼</button>
                            <button type="button" class="edit-btn edit-btn-danger" aria-label="Retirer cette image" (click)="galleryItemEdit.emit({ index: i, action: 'remove' })">×</button>
                          </div>
                          <div class="resize-handle"
                               (pointerdown)="onResizeStart($event, i)"
                               title="Glisser pour redimensionner ({{ img.colSpan ?? 1 }}×{{ img.rowSpan ?? 1 }})"
                               aria-hidden="true">⤡</div>
                          @if (resizingIndex() === i) {
                            <div class="resize-badge">{{ resizingCols() }} × {{ resizingRows() }}</div>
                          }
                        </div>
                      </figure>
                    </li>
                  }
                  <li class="gallery-add-tile" data-no-drag>
                    <button type="button" class="gallery-add-btn" aria-label="Ajouter une image à la galerie" (click)="galleryAdd.emit()">
                      <span class="gallery-add-icon">+</span>
                      <span class="gallery-add-label">Ajouter une image</span>
                    </button>
                  </li>
                </ul>
              } @else {
                <div class="g-grid">
                  @for (img of item.gallery; track img.url; let i = $index) {
                    <figure [style.grid-column]="'span ' + (img.colSpan ?? 1)"
                            [style.grid-row]="'span ' + (img.rowSpan ?? 1)">
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
    .hero { position: relative; min-height: 70vh; display: flex; align-items: flex-end; padding: 120px 0 72px; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero-bg app-cropped-image-canvas { width: 100%; height: 100%; display: block; }
    .hero-bg::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 60%, transparent 100%); }
    .hero-content { position: relative; z-index: 1; color: #ffffff; }
    .hero-content .eyebrow,
    .hero-content .material { color: rgba(255, 255, 255, 0.7); }
    .hero-content h1 { color: #ffffff; margin: 16px 0 18px; max-width: 880px; }
    .material { font-size: 0.85rem; letter-spacing: 0.08em; }

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
      grid-auto-rows: 220px;
      gap: 16px;
    }
    figure { overflow: hidden; background: var(--color-bg-alt); }
    .gallery-img-wrap { position: relative; overflow: hidden; width: 100%; height: 100%; }
    .gallery-img-wrap app-cropped-image-canvas { display: block; width: 100%; height: 100%; }

    .tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 24px; }
    .tag-chip {
      font-size: 0.78rem; padding: 4px 12px; background: var(--color-bg-alt);
      border: 1px solid var(--color-line); color: var(--color-ink-soft); text-decoration: none;
    }
    .tag-chip:hover { color: var(--color-ink); border-color: var(--color-ink); }

    .viewer-link-wrap {
      display: flex;
      justify-content: center;
      padding: 0 0 96px;
    }
    .viewer-link {
      background: none;
      border: 1px solid var(--color-ink);
      color: var(--color-ink);
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      padding: 14px 28px;
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
    }
    .viewer-link:hover {
      background: var(--color-ink);
      color: var(--color-bg);
    }

    @media (max-width: 960px) {
      .gallery .g-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .gallery .g-grid { grid-template-columns: 1fr; }
      .specs > div { grid-template-columns: 1fr; gap: 4px; }
      .lead { font-size: 1.4rem; }
    }

    .editable .hero-bg { cursor: pointer; outline: 1px dashed rgba(255,255,255,0.25); outline-offset: -2px; }
    .hero-bg .edit-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 12px;
      background: rgba(0,0,0,0.0); opacity: 0.55; transition: opacity 180ms ease, background 180ms ease; z-index: 3;
    }
    .hero-bg:hover .edit-overlay, .hero-bg:focus-within .edit-overlay { opacity: 1; background: rgba(0,0,0,0.4); }
    .edit-btn {
      padding: 8px 14px; background: var(--color-bg); border: 1px solid var(--color-line);
      color: var(--color-ink); font-size: 0.85rem; cursor: pointer; font-family: inherit;
    }
    .edit-btn:hover { background: var(--color-ink); color: var(--color-bg); }
    .edit-btn-danger:hover { background: #c44; color: #fff; border-color: #c44; }
    .editable-text { cursor: pointer; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color 180ms ease; border-radius: 2px; }
    .editable-text:hover, .editable-text:focus-visible { outline-color: currentColor; }
    .editable-text[contenteditable="true"] { outline: 2px solid var(--color-accent, #2a9d8f); outline-offset: 4px; background: rgba(255,255,255,0.08); cursor: text; }
    .editable-text[contenteditable="true"]:focus { outline-color: var(--color-accent, #2a9d8f); }
    .gallery-img-wrap { position: relative; }
    .gallery-img-wrap .edit-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(0,0,0,0.0); opacity: 0.55; transition: opacity 180ms ease, background 180ms ease; z-index: 3;
    }
    .gallery-img-wrap:hover .edit-overlay, .gallery-img-wrap:focus-within .edit-overlay { opacity: 1; background: rgba(0,0,0,0.4); }
    .gallery-img-wrap .edit-btn { padding: 4px 8px; font-size: 0.75rem; }
    .gallery-img-wrap .resize-handle {
      position: absolute; right: 4px; bottom: 4px;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-ink); color: var(--color-bg);
      border: 2px solid var(--color-bg);
      border-radius: 50%;
      font-size: 1rem; line-height: 1; font-weight: bold;
      cursor: nwse-resize; z-index: 4;
      opacity: 0.85; transition: opacity 180ms ease, transform 180ms ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      user-select: none;
      touch-action: none;
    }
    .gallery-img-wrap .resize-handle:hover { opacity: 1; transform: scale(1.15); }
    .gallery-img-wrap .drag-handle {
      position: absolute; top: 4px; left: 4px;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-ink); color: var(--color-bg);
      border: 2px solid var(--color-bg);
      border-radius: 50%;
      font-size: 0.85rem; line-height: 1; font-weight: bold; letter-spacing: -2px;
      cursor: grab; z-index: 4;
      opacity: 0.85; transition: opacity 180ms ease, transform 180ms ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      user-select: none;
    }
    .gallery-img-wrap .drag-handle:hover { opacity: 1; transform: scale(1.15); }
    .gallery-img-wrap .drag-handle:active { cursor: grabbing; }
    .g-item-draggable[draggable="true"]:active { cursor: grabbing; }
    .resize-badge {
      position: absolute; top: 8px; left: 8px;
      padding: 4px 10px; background: var(--color-ink); color: var(--color-bg);
      font-size: 0.85rem; font-weight: 600; border-radius: 3px;
      pointer-events: none; z-index: 5;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .g-grid.editable { list-style: none; padding: 0; margin: 0; }
    .g-grid.editable > li { position: relative; display: block; }
    .g-grid.editable > li[draggable="true"] { cursor: grab; }
    .g-grid.editable > li[draggable="true"]:active { cursor: grabbing; }
    .gallery-add-tile { display: block; }
    .gallery-add-btn {
      width: 100%; height: 100%; min-height: 200px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      background: transparent; border: 2px dashed var(--color-line); color: var(--color-ink-soft);
      cursor: pointer; font-family: inherit; transition: border-color 180ms ease, color 180ms ease;
    }
    .gallery-add-btn:hover { border-color: var(--color-ink); color: var(--color-ink); }
    .gallery-add-icon { font-size: 2rem; line-height: 1; }
    .gallery-add-label { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .g-grid.editable li { display: block; }
  `]
})
export class FurnitureDetailViewComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly appRef = inject(ApplicationRef);

  @Input({ required: true }) item: Furniture | null = null;
  @Input() story: Story | null = null;
  @Input() displaySlides: DisplaySlide[] = [];
  @Input() content: SiteContent = {};
  @Input() editable = false;

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle():   Record<string, string> { return roleStyle(this.content, 'title'); }

  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() galleryAdd = new EventEmitter<void>();
  @Output() textFieldClick = new EventEmitter<EditableTextField>();
  @Output() textFieldEdit = new EventEmitter<{ field: EditableTextField; value: string }>();
  @Output() viewerOpen = new EventEmitter<StoryItem[]>();
  @Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();

  protected editingField: EditableTextField | null = null;

  protected isEditingField(name: EditableTextField): boolean | null {
    return this.editingField === name ? true : null;
  }

  protected startInlineEdit(ev: Event, field: EditableTextField): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (field === 'category') return;  // category combine "categorie · annee", non editable inline
    this.editingField = field;
    const el = ev.currentTarget as HTMLElement;
    queueMicrotask(() => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  protected commitInlineEdit(ev: FocusEvent, field: EditableTextField): void {
    if (this.editingField !== field) return;
    const el = ev.target as HTMLElement;
    const value = (el.textContent ?? '').trim();
    this.editingField = null;
    this.textFieldEdit.emit({ field, value });
  }

  protected onInlineEnter(ev: Event, field: EditableTextField): void {
    if (this.editingField === field) {
      ev.preventDefault();
      (ev.target as HTMLElement).blur();
    } else {
      this.textFieldClick.emit(field);
    }
  }

  protected cancelInlineEdit(ev: Event): void {
    if (!this.editingField) return;
    ev.preventDefault();
    this.editingField = null;
    (ev.target as HTMLElement).blur();
  }

  protected onSpaceWhenNotEditing(ev: Event, field: EditableTextField): void {
    if (this.editingField === field) return;  // espace normal en édition
    ev.preventDefault();
    this.textFieldClick.emit(field);
  }

  private resizing: { index: number; startX: number; startY: number; startCol: number; startRow: number; cellW: number; cellH: number } | null = null;

  protected readonly resizingIndex = signal<number | null>(null);
  protected readonly resizingCols = signal(1);
  protected readonly resizingRows = signal(1);

  protected onResizeStart(ev: PointerEvent, index: number): void {
    ev.preventDefault();
    ev.stopPropagation();
    const item = this.item?.gallery[index];
    if (!item) return;
    const grid = (ev.target as HTMLElement).closest('.g-grid') as HTMLElement | null;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const cols = 3;
    const gap = 16;
    const cellW = (rect.width - gap * (cols - 1)) / cols;
    const cellH = 220;
    const startCol = item.colSpan ?? 1;
    const startRow = item.rowSpan ?? 1;
    this.resizing = {
      index,
      startX: ev.clientX, startY: ev.clientY,
      startCol, startRow,
      cellW, cellH,
    };
    this.resizingIndex.set(index);
    this.resizingCols.set(startCol);
    this.resizingRows.set(startRow);
    window.addEventListener('pointermove', this.onResizeMove);
    window.addEventListener('pointerup', this.onResizeEnd);
    (ev.target as HTMLElement & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(ev.pointerId);
  }

  private readonly onResizeMove = (ev: PointerEvent): void => {
    if (!this.resizing) return;
    const dx = ev.clientX - this.resizing.startX;
    const dy = ev.clientY - this.resizing.startY;
    const newCol = Math.max(1, Math.min(3, this.resizing.startCol + Math.round(dx / (this.resizing.cellW + 16))));
    const newRow = Math.max(1, Math.min(4, this.resizing.startRow + Math.round(dy / (this.resizing.cellH + 16))));
    // Le pointermove ecoute via window est hors NgZone : re-enter pour
    // que les bindings template du parent (preview) se reevaluent pendant
    // le drag, sans attendre une autre interaction utilisateur.
    this.zone.run(() => {
      this.resizingCols.set(newCol);
      this.resizingRows.set(newRow);
      this.galleryItemResize.emit({ index: this.resizing!.index, colSpan: newCol, rowSpan: newRow });
    });
  };

  private readonly onResizeEnd = (): void => {
    this.zone.run(() => {
      this.resizing = null;
      this.resizingIndex.set(null);
    });
    window.removeEventListener('pointermove', this.onResizeMove);
    window.removeEventListener('pointerup', this.onResizeEnd);
  };

  ngOnDestroy(): void {
    window.removeEventListener('pointermove', this.onResizeMove);
    window.removeEventListener('pointerup', this.onResizeEnd);
  }

  onViewerOpen(): void {
    const f = this.item;
    if (!f) return;
    if (this.displaySlides.length === 0) return;
    this.viewerOpen.emit([{
      title: f.title,
      subtitle: `${f.category} · ${f.year}`,
      slides: this.displaySlides,
      kind: 'furniture',
      slug: f.slug,
    }]);
  }
}
