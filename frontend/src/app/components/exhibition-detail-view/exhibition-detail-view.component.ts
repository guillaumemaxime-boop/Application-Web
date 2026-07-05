import { Component, EventEmitter, inject, Input, NgZone, OnDestroy, Output, signal } from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TagEditorComponent } from '../tag-editor/tag-editor.component';
import { Exhibition } from '../../models/exhibition.model';
import { SiteContent } from '../../models/site-content.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { roleStyle } from '../../utils/title-style';
import { VideoPlayerComponent } from '../video-player/video-player.component';
import { VideoFieldComponent } from '../../pages/admin/shared/video-field.component';

export type EditableExhibitionField =
  | 'title' | 'venue' | 'city' | 'country'
  | 'curator' | 'shortDescription' | 'description';

@Component({
  selector: 'app-exhibition-detail-view',
  standalone: true,
  imports: [CroppedImageCanvasComponent, ReorderableDirective, NgStyle, RouterLink, TagEditorComponent, VideoPlayerComponent, VideoFieldComponent],
  template: `
    @if (item) {
      <article class="fade-in">
        <header class="hero" [class.editable]="editable">
          <div class="hero-bg">
            <app-cropped-image-canvas
              [imageUrl]="item.coverImage"
              [crop]="item.coverCrop ?? null"
              [alt]="item.title"
              mode="cover"
              [priority]="true" />
            @if (editable) {
              <div class="edit-overlay">
                <button type="button" class="edit-btn" aria-label="Cadrer la cover" (click)="coverEdit.emit('crop')">✂ Cadrer</button>
                <button type="button" class="edit-btn" aria-label="Remplacer la cover" (click)="coverEdit.emit('replace')">🖼 Remplacer</button>
              </div>
            }
          </div>
          <div class="container hero-content">
            @if (editable) {
              <span class="eyebrow-composite" [ngStyle]="eyebrowStyle()">
                <span class="eyebrow-segment editable-text" tabindex="0"
                      [attr.contenteditable]="isEditingField('venue')"
                      (click)="textFieldClick.emit('venue')"
                      (dblclick)="startInlineEdit($event, 'venue')"
                      (blur)="commitInlineEdit($event, 'venue')"
                      (keydown.enter)="onInlineEnter($event, 'venue')"
                      (keydown.escape)="cancelInlineEdit($event)"
                      (keydown.space)="onSpaceWhenNotEditing($event, 'venue')">{{ item.venue }}</span>
                <span class="eyebrow-sep" aria-hidden="true"> · </span>
                <span class="eyebrow-segment editable-text" tabindex="0"
                      [attr.contenteditable]="isEditingField('city')"
                      (click)="textFieldClick.emit('city')"
                      (dblclick)="startInlineEdit($event, 'city')"
                      (blur)="commitInlineEdit($event, 'city')"
                      (keydown.enter)="onInlineEnter($event, 'city')"
                      (keydown.escape)="cancelInlineEdit($event)"
                      (keydown.space)="onSpaceWhenNotEditing($event, 'city')">{{ item.city }}</span>
                <span class="eyebrow-sep" aria-hidden="true">, </span>
                <span class="eyebrow-segment editable-text" tabindex="0"
                      [attr.contenteditable]="isEditingField('country')"
                      (click)="textFieldClick.emit('country')"
                      (dblclick)="startInlineEdit($event, 'country')"
                      (blur)="commitInlineEdit($event, 'country')"
                      (keydown.enter)="onInlineEnter($event, 'country')"
                      (keydown.escape)="cancelInlineEdit($event)"
                      (keydown.space)="onSpaceWhenNotEditing($event, 'country')">{{ item.country }}</span>
              </span>
              <h1 class="editable-text" [ngStyle]="titleStyle()" tabindex="0"
                  [attr.aria-label]="isEditingField('title') ? item.title + ' — en édition' : item.title + ' — double-cliquer pour éditer'"
                  [attr.contenteditable]="isEditingField('title')"
                  (click)="textFieldClick.emit('title')"
                  (dblclick)="startInlineEdit($event, 'title')"
                  (blur)="commitInlineEdit($event, 'title')"
                  (keydown.enter)="onInlineEnter($event, 'title')"
                  (keydown.escape)="cancelInlineEdit($event)"
                  (keydown.space)="onSpaceWhenNotEditing($event, 'title')">{{ item.title }}</h1>
              <p class="dates">
                @if (isEditingDate('startDate')) {
                  <input type="date" class="date-inline" [value]="item.startDate"
                         (blur)="commitDateEdit($event, 'startDate')"
                         (keydown.enter)="onDateEnter($event, 'startDate')"
                         (keydown.escape)="cancelDateEdit()" />
                } @else {
                  <span class="date-segment editable-text" tabindex="0"
                        (click)="textFieldClick.emit('startDate')"
                        (dblclick)="startDateEdit($event, 'startDate')"
                        (keydown.enter)="textFieldClick.emit('startDate')"
                        (keydown.space)="onSpaceWhenNotEditing($event, 'startDate')">{{ formatSingleDate(item.startDate) }}</span>
                }
                <span class="date-sep" aria-hidden="true"> — </span>
                @if (isEditingDate('endDate')) {
                  <input type="date" class="date-inline" [value]="item.endDate"
                         (blur)="commitDateEdit($event, 'endDate')"
                         (keydown.enter)="onDateEnter($event, 'endDate')"
                         (keydown.escape)="cancelDateEdit()" />
                } @else {
                  <span class="date-segment editable-text" tabindex="0"
                        (click)="textFieldClick.emit('endDate')"
                        (dblclick)="startDateEdit($event, 'endDate')"
                        (keydown.enter)="textFieldClick.emit('endDate')"
                        (keydown.space)="onSpaceWhenNotEditing($event, 'endDate')">{{ formatSingleDate(item.endDate) }}</span>
                }
              </p>
            } @else {
              <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ item.venue }} · {{ item.city }}, {{ item.country }}</span>
              <h1 [ngStyle]="titleStyle()">{{ item.title }}</h1>
              <p class="dates">{{ formatRange(item.startDate, item.endDate) }}</p>
            }
          </div>
        </header>

        <section class="section intro">
          <div class="container narrow">
            @if (editable) {
              <span class="eyebrow">Commissariat —
                <span class="editable-text" tabindex="0"
                      [attr.contenteditable]="isEditingField('curator')"
                      (click)="textFieldClick.emit('curator')"
                      (dblclick)="startInlineEdit($event, 'curator')"
                      (blur)="commitInlineEdit($event, 'curator')"
                      (keydown.enter)="onInlineEnter($event, 'curator')"
                      (keydown.escape)="cancelInlineEdit($event)"
                      (keydown.space)="onSpaceWhenNotEditing($event, 'curator')">{{ item.curator }}</span>
              </span>
              <p class="lead editable-text" tabindex="0"
                 [attr.contenteditable]="isEditingField('shortDescription')"
                 (click)="textFieldClick.emit('shortDescription')"
                 (dblclick)="startInlineEdit($event, 'shortDescription')"
                 (blur)="commitInlineEdit($event, 'shortDescription')"
                 (keydown.enter)="onInlineEnter($event, 'shortDescription')"
                 (keydown.escape)="cancelInlineEdit($event)"
                 (keydown.space)="onSpaceWhenNotEditing($event, 'shortDescription')">{{ item.shortDescription }}</p>
              <p class="body editable-text" tabindex="0"
                 [attr.contenteditable]="isEditingField('description')"
                 (click)="textFieldClick.emit('description')"
                 (dblclick)="startInlineEdit($event, 'description')"
                 (blur)="commitInlineEdit($event, 'description')"
                 (keydown.enter)="onInlineEnter($event, 'description')"
                 (keydown.escape)="cancelInlineEdit($event)"
                 (keydown.space)="onSpaceWhenNotEditing($event, 'description')">{{ item.description }}</p>
            } @else {
              <span class="eyebrow" [ngStyle]="eyebrowStyle()">Commissariat — {{ item.curator }}</span>
              <p class="lead">{{ item.shortDescription }}</p>
              <p class="body">{{ item.description }}</p>
            }

            @if (editable) {
              <div class="tags-list editable">
                <app-tag-editor
                  [tags]="item.tags ?? []"
                  [suggestions]="tagSuggestions"
                  (tagsChange)="tagsChange.emit($event)" />
              </div>
            } @else if (item.tags && item.tags.length > 0) {
              <div class="tags-list">
                @for (t of item.tags; track t) {
                  <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
                }
              </div>
            }
          </div>
        </section>

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
                            [imageUrl]="img.url" [crop]="img.crop ?? null"
                            [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" />
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
                    <button type="button" class="gallery-add-btn" aria-label="Ajouter une image" (click)="galleryAdd.emit()">
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
                      <button type="button" class="gallery-open-btn" [attr.aria-label]="'Agrandir la vue ' + (i + 1)" (click)="galleryImageOpen.emit(i)">
                        <div class="gallery-img-wrap">
                          <app-cropped-image-canvas [imageUrl]="img.url" [crop]="img.crop ?? null" [alt]="item.title + ' — vue ' + (i + 1)" mode="cover" [lazy]="true" />
                        </div>
                      </button>
                    </figure>
                  }
                </div>
              }
            </div>
          </section>
        }

        @if (editable) {
          <section class="section video-block">
            <div class="container narrow">
              <app-video-field
                label="{{ item.title }} — vidéo"
                [videoId]="item.videoId ?? null"
                [videoPoster]="item.videoPoster ?? null"
                [videoCaptions]="item.videoCaptions ?? null"
                (videoIdChange)="videoIdChange.emit($event)"
                (videoPosterChange)="videoPosterChange.emit($event)"
                (videoCaptionsChange)="videoCaptionsChange.emit($event)" />
            </div>
          </section>
        } @else if (item.videoUrl) {
          <section class="section video-block">
            <div class="container narrow">
              <h2 class="video-title">Vidéo</h2>
              <app-video-player [src]="item.videoUrl" [hlsSrc]="item.videoHls ?? null"
                [poster]="item.videoPoster ?? null"
                [captions]="item.videoCaptions ?? null" [label]="item.title + ' — vidéo'" />
            </div>
          </section>
        }

      </article>
    }
  `,
  styles: [`
    .hero { position: relative; min-height: 65vh; display: flex; align-items: flex-end; padding: 80px 0; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero-bg app-cropped-image-canvas { width: 100%; height: 100%; display: block; }
    .hero-bg::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 60%, transparent 100%); }
    .hero-content { position: relative; z-index: 1; color: #ffffff; max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    /* Couleur explicite : sinon les regles globales (h1/.eyebrow/p) ecrasent le blanc herite du hero. */
    .hero-content .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.85); }
    .hero-content .eyebrow-composite { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.85); }
    .hero-content h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin: 16px 0; color: #ffffff; }
    .hero-content .dates { font-size: 0.95rem; color: rgba(255,255,255,0.85); }

    .section { padding: 80px 0; }
    .section .container { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
    .container.narrow { max-width: 720px; }
    .intro .eyebrow { display: block; font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); margin-bottom: 24px; }
    .intro .lead { font-size: 1.2rem; line-height: 1.6; color: var(--color-ink); margin-bottom: 24px; }
    .intro .body { font-size: 1rem; line-height: 1.7; color: var(--color-ink-soft); white-space: pre-line; }
    .tags-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
    .tag-chip { padding: 4px 14px; font-size: 0.78rem; border: 1px solid var(--color-ink); border-radius: 999px; background: transparent; color: var(--color-ink); text-decoration: none; }
    .tag-chip:hover { background: var(--color-ink); color: var(--color-bg); }

    .gallery .g-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; grid-auto-rows: 220px; }
    .gallery .g-grid figure { margin: 0; overflow: hidden; height: 100%; }
    .gallery-img-wrap { position: relative; overflow: hidden; width: 100%; height: 100%; }
    .gallery-img-wrap app-cropped-image-canvas { display: block; width: 100%; height: 100%; }
    .gallery-open-btn { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
    .gallery-open-btn:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }

    @media (max-width: 960px) { .gallery .g-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .gallery .g-grid { grid-template-columns: 1fr; } }

    .video-block .narrow { max-width: 880px; }
    .video-title { font-size: 1.375rem; margin-bottom: 16px; }

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

    .eyebrow-composite { display: inline; }
    .eyebrow-segment { display: inline; }
    .eyebrow-sep { display: inline; }

    .date-inline { padding: 2px 6px; font: inherit; border: 2px solid var(--color-accent, #2a9d8f); background: rgba(255,255,255,0.08); color: inherit; }
    .date-segment { display: inline; }
    .date-sep { display: inline; }

    .gallery-img-wrap .edit-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(0,0,0,0.0); opacity: 0.55; transition: opacity 180ms ease, background 180ms ease; z-index: 3;
    }
    .gallery-img-wrap:hover .edit-overlay, .gallery-img-wrap:focus-within .edit-overlay { opacity: 1; background: rgba(0,0,0,0.4); }
    .gallery-img-wrap .edit-btn { padding: 4px 8px; font-size: 0.75rem; }
    .gallery-img-wrap .drag-handle {
      position: absolute; top: 4px; left: 4px; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-ink); color: var(--color-bg); border: 2px solid var(--color-bg); border-radius: 50%;
      font-size: 0.85rem; line-height: 1; font-weight: bold; letter-spacing: -2px;
      cursor: grab; z-index: 4; opacity: 0.85; box-shadow: 0 2px 6px rgba(0,0,0,0.3); user-select: none;
    }
    .gallery-img-wrap .drag-handle:hover { opacity: 1; transform: scale(1.15); }
    .gallery-img-wrap .drag-handle:active { cursor: grabbing; }
    .gallery-img-wrap .resize-handle {
      position: absolute; right: 4px; bottom: 4px; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-ink); color: var(--color-bg); border: 2px solid var(--color-bg); border-radius: 50%;
      font-size: 1rem; line-height: 1; font-weight: bold;
      cursor: nwse-resize; z-index: 4; opacity: 0.85; box-shadow: 0 2px 6px rgba(0,0,0,0.3); user-select: none; touch-action: none;
    }
    .gallery-img-wrap .resize-handle:hover { opacity: 1; transform: scale(1.15); }
    .resize-badge {
      position: absolute; top: 8px; left: 8px; padding: 4px 10px;
      background: var(--color-ink); color: var(--color-bg);
      font-size: 0.85rem; font-weight: 600; border-radius: 3px;
      pointer-events: none; z-index: 5; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
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
      cursor: pointer; font-family: inherit;
    }
    .gallery-add-btn:hover { border-color: var(--color-ink); color: var(--color-ink); }
    .gallery-add-icon { font-size: 2rem; line-height: 1; }
    .gallery-add-label { font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; }
  `]
})
export class ExhibitionDetailViewComponent implements OnDestroy {
  private readonly zone = inject(NgZone);

  @Input({ required: true }) item: Exhibition | null = null;
  @Input() content: SiteContent = {};
  @Input() editable = false;
  @Input() tagSuggestions: string[] = [];

  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() coverEdit = new EventEmitter<'crop' | 'replace'>();
  @Output() galleryItemEdit = new EventEmitter<{ index: number; action: 'crop' | 'replace' | 'remove' }>();
  @Output() galleryReorder = new EventEmitter<number[]>();
  @Output() galleryAdd = new EventEmitter<void>();
  @Output() galleryItemResize = new EventEmitter<{ index: number; colSpan: number; rowSpan: number }>();
  @Output() textFieldClick = new EventEmitter<EditableExhibitionField | 'startDate' | 'endDate'>();
  @Output() textFieldEdit = new EventEmitter<{ field: EditableExhibitionField; value: string }>();
  @Output() dateFieldEdit = new EventEmitter<{ field: 'startDate' | 'endDate'; value: string }>();
  @Output() galleryImageOpen = new EventEmitter<number>();
  @Output() videoIdChange = new EventEmitter<string | null>();
  @Output() videoPosterChange = new EventEmitter<string | null>();
  @Output() videoCaptionsChange = new EventEmitter<string | null>();

  protected editingField: EditableExhibitionField | null = null;
  protected editingDateField: 'startDate' | 'endDate' | null = null;

  protected readonly resizingIndex = signal<number | null>(null);
  protected readonly resizingCols = signal(1);
  protected readonly resizingRows = signal(1);

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }

  protected isEditingField(name: EditableExhibitionField): boolean | null {
    return this.editingField === name ? true : null;
  }

  protected isEditingDate(name: 'startDate' | 'endDate'): boolean {
    return this.editingDateField === name;
  }

  protected startInlineEdit(ev: Event, field: EditableExhibitionField): void {
    ev.preventDefault();
    ev.stopPropagation();
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

  protected commitInlineEdit(ev: FocusEvent, field: EditableExhibitionField): void {
    if (this.editingField !== field) return;
    const el = ev.target as HTMLElement;
    const value = (el.textContent ?? '').trim();
    this.editingField = null;
    this.textFieldEdit.emit({ field, value });
  }

  protected onInlineEnter(ev: Event, field: EditableExhibitionField): void {
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

  protected onSpaceWhenNotEditing(ev: Event, field: EditableExhibitionField | 'startDate' | 'endDate'): void {
    if (this.editingField === field) return;
    ev.preventDefault();
    this.textFieldClick.emit(field);
  }

  protected startDateEdit(ev: Event, field: 'startDate' | 'endDate'): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.editingDateField = field;
  }

  protected commitDateEdit(ev: FocusEvent, field: 'startDate' | 'endDate'): void {
    if (this.editingDateField !== field) return;
    const input = ev.target as HTMLInputElement;
    const value = input.value;
    this.editingDateField = null;
    if (value) this.dateFieldEdit.emit({ field, value });
  }

  protected onDateEnter(ev: Event, field: 'startDate' | 'endDate'): void {
    ev.preventDefault();
    (ev.target as HTMLInputElement).blur();
  }

  protected cancelDateEdit(): void {
    this.editingDateField = null;
  }

  private resizing: {
    index: number; startX: number; startY: number;
    startCol: number; startRow: number; cellW: number; cellH: number;
  } | null = null;

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
    this.resizing = { index, startX: ev.clientX, startY: ev.clientY, startCol, startRow, cellW, cellH };
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

  formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const s = new Date(start).toLocaleDateString('fr-FR', opts);
    const e = new Date(end).toLocaleDateString('fr-FR', opts);
    return `${s} — ${e}`;
  }

  formatSingleDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
