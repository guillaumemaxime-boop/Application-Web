import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgStyle, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HomePageData, HomeFeedItem } from '../../models/home.model';
import { SiteContent } from '../../models/site-content.model';
import { roleStyle } from '../../utils/title-style';
import { NewsSliderComponent } from '../news-slider/news-slider.component';
import { StoryViewerComponent, StoryItem } from '../story-viewer/story-viewer.component';
import { NewsSliderView, SLIDER_ZONES, SliderStoryRef, SliderZone } from '../../models/news-slider.model';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';
import { ReorderableDirective } from '../../directives/reorderable.directive';

export type EditableHomeContentKey =
  | 'home.hero.eyebrow' | 'home.hero.title' | 'home.hero.lead';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [NgStyle, CommonModule, RouterLink, NewsSliderComponent, StoryViewerComponent, CroppedImageCanvasComponent, ReorderableDirective],
  template: `
    @if (data) {
      <section class="hero" [class.editable]="editable">
        <div class="container">
          @if (editable) {
            <span class="eyebrow editable-text" tabindex="0" [ngStyle]="eyebrowStyle()"
                  [attr.contenteditable]="isEditingKey('home.hero.eyebrow')"
                  (click)="textFieldEdit.emit({ key: 'home.hero.eyebrow', value: heroEyebrow() })"
                  (dblclick)="startInlineEdit($event, 'home.hero.eyebrow')"
                  (blur)="commitInlineEdit($event, 'home.hero.eyebrow')"
                  (keydown.enter)="onInlineEnter($event, 'home.hero.eyebrow')"
                  (keydown.escape)="cancelInlineEdit($event)">{{ heroEyebrow() }}</span>
            <h1 class="hero-title editable-text" tabindex="0" [ngStyle]="titleStyle()"
                [attr.contenteditable]="isEditingKey('home.hero.title')"
                (click)="textFieldEdit.emit({ key: 'home.hero.title', value: heroTitle() })"
                (dblclick)="startInlineEdit($event, 'home.hero.title')"
                (blur)="commitInlineEdit($event, 'home.hero.title')"
                (keydown.enter)="onInlineEnter($event, 'home.hero.title')"
                (keydown.escape)="cancelInlineEdit($event)">{{ heroTitle() }}</h1>
            <p class="lead editable-text" tabindex="0"
               [attr.contenteditable]="isEditingKey('home.hero.lead')"
               (click)="textFieldEdit.emit({ key: 'home.hero.lead', value: heroLead() })"
               (dblclick)="startInlineEdit($event, 'home.hero.lead')"
               (blur)="commitInlineEdit($event, 'home.hero.lead')"
               (keydown.enter)="onInlineEnter($event, 'home.hero.lead')"
               (keydown.escape)="cancelInlineEdit($event)">{{ heroLead() }}</p>
          } @else {
            <span class="eyebrow" [ngStyle]="eyebrowStyle()">{{ heroEyebrow() }}</span>
            <h1 class="hero-title" [ngStyle]="titleStyle()">{{ heroTitle() }}</h1>
            <p class="lead">{{ heroLead() }}</p>
          }
        </div>
      </section>

      @if (sliderByZone()['home-top']; as s) {
        @if (editable) {
          <div class="slider-wrap editable">
            <div class="slider-edit-bar">
              <span class="slider-title-edit" contenteditable="true" role="textbox"
                    aria-label="Titre du slider"
                    (blur)="onSliderTitleBlur(s.id, $event)">{{ s.title }}</span>
              <button type="button" class="slider-compose-btn" (click)="sliderCompositionRequested.emit(s.id)">Composer</button>
              <select class="slider-zone-select" aria-label="Zone du slider"
                    (change)="onSliderZoneSelect(s.id, $event)">
                <option value="" [selected]="!s.zoneKey">Désactivé (hors accueil)</option>
                @for (z of editableZones; track z) { <option [value]="z" [selected]="z === s.zoneKey">{{ z }}</option> }
              </select>
              <button type="button" class="slider-delete-btn" aria-label="Supprimer ce slider"
                      (click)="sliderDelete.emit(s.id)">×</button>
            </div>
            <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
          </div>
        } @else {
          <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
        }
      } @else if (editable) {
        <div class="slider-create-placeholder">
          @if (disabledSliders.length > 0) {
            <select class="slider-insert-select" aria-label="Insérer un slider existant dans home-top"
                    (change)="onSliderInsertSelect('home-top', $event)">
              <option value="" selected>Insérer un slider existant…</option>
              @for (d of disabledSliders; track d.id) { <option [value]="d.id">{{ d.title }}</option> }
            </select>
          }
          <button type="button" class="slider-create-btn" (click)="sliderCreate.emit('home-top')">+ Créer un slider ici (home-top)</button>
        </div>
      }

      @if (sliderByZone()['home-middle']; as s) {
        @if (editable) {
          <div class="slider-wrap editable">
            <div class="slider-edit-bar">
              <span class="slider-title-edit" contenteditable="true" role="textbox"
                    aria-label="Titre du slider"
                    (blur)="onSliderTitleBlur(s.id, $event)">{{ s.title }}</span>
              <button type="button" class="slider-compose-btn" (click)="sliderCompositionRequested.emit(s.id)">Composer</button>
              <select class="slider-zone-select" aria-label="Zone du slider"
                    (change)="onSliderZoneSelect(s.id, $event)">
                <option value="" [selected]="!s.zoneKey">Désactivé (hors accueil)</option>
                @for (z of editableZones; track z) { <option [value]="z" [selected]="z === s.zoneKey">{{ z }}</option> }
              </select>
              <button type="button" class="slider-delete-btn" aria-label="Supprimer ce slider"
                      (click)="sliderDelete.emit(s.id)">×</button>
            </div>
            <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
          </div>
        } @else {
          <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
        }
      } @else if (editable) {
        <div class="slider-create-placeholder">
          @if (disabledSliders.length > 0) {
            <select class="slider-insert-select" aria-label="Insérer un slider existant dans home-middle"
                    (change)="onSliderInsertSelect('home-middle', $event)">
              <option value="" selected>Insérer un slider existant…</option>
              @for (d of disabledSliders; track d.id) { <option [value]="d.id">{{ d.title }}</option> }
            </select>
          }
          <button type="button" class="slider-create-btn" (click)="sliderCreate.emit('home-middle')">+ Créer un slider ici (home-middle)</button>
        </div>
      }

      <section class="feed">
        <div class="container">
          @if (feedTitleText(); as t) {
            <h2 class="feed-title" [ngStyle]="feedTitleStyle()">{{ t }}</h2>
          }
          @if (data.feed.length > 0) {
            @if (editable) {
              <ul class="grid editable" appReorderable (reordered)="feedReorder.emit($event)">
                @for (item of data.feed; track item.kind + ':' + item.slug; let i = $index) {
                  <li class="card editable" [class.excluded]="!isIncluded(item)">
                    @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                    @if (!isIncluded(item)) { <span class="excluded-badge">Exclu</span> }
                    <div class="thumb">
                      <app-cropped-image-canvas
                        [imageUrl]="item.cover"
                        [crop]="item.coverCrop ?? null"
                        [alt]="item.title"
                        mode="cover" />
                    </div>
                    <div class="meta">
                      <span class="cat">{{ item.subtitle }}</span>
                      <h3 class="title">{{ item.title }}</h3>
                    </div>
                    <div class="edit-overlay">
                      <button type="button" class="overlay-btn crop-btn"
                              aria-label="Cadrer l'image de cette card"
                              (click)="feedItemCropEdit.emit({ kind: item.kind, slug: item.slug })">✂ Cadrer</button>
                      <label class="incl-toggle">
                        <input type="checkbox" [checked]="isIncluded(item)" (change)="onToggleInclude(item, $event)" />
                        <span>Inclus</span>
                      </label>
                      <div class="drag-handle" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</div>
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <div class="grid">
                @for (item of data.feed; track item.kind + ':' + item.slug) {
                  <a class="card" [routerLink]="cardLink(item)">
                    @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                    <div class="thumb">
                      <app-cropped-image-canvas
                        [imageUrl]="item.cover"
                        [crop]="item.coverCrop ?? null"
                        [alt]="item.title"
                        mode="cover"
                        [lazy]="true" />
                    </div>
                    <div class="meta">
                      <span class="cat" [ngStyle]="eyebrowStyle()">{{ item.subtitle }}</span>
                      <h3 class="title" [ngStyle]="cardTitleStyle()">{{ item.title }}</h3>
                      @if (item.description) { <p class="excerpt">{{ item.description }}</p> }
                      <span class="cta">Découvrir <span class="arrow" aria-hidden="true">→</span></span>
                    </div>
                  </a>
                }
              </div>
            }
          }
        </div>
      </section>

      @if (sliderByZone()['home-bottom']; as s) {
        @if (editable) {
          <div class="slider-wrap editable">
            <div class="slider-edit-bar">
              <span class="slider-title-edit" contenteditable="true" role="textbox"
                    aria-label="Titre du slider"
                    (blur)="onSliderTitleBlur(s.id, $event)">{{ s.title }}</span>
              <button type="button" class="slider-compose-btn" (click)="sliderCompositionRequested.emit(s.id)">Composer</button>
              <select class="slider-zone-select" aria-label="Zone du slider"
                    (change)="onSliderZoneSelect(s.id, $event)">
                <option value="" [selected]="!s.zoneKey">Désactivé (hors accueil)</option>
                @for (z of editableZones; track z) { <option [value]="z" [selected]="z === s.zoneKey">{{ z }}</option> }
              </select>
              <button type="button" class="slider-delete-btn" aria-label="Supprimer ce slider"
                      (click)="sliderDelete.emit(s.id)">×</button>
            </div>
            <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
          </div>
        } @else {
          <app-news-slider [slider]="s" [content]="content" (storyOpen)="onSliderStoryOpen($event)" />
        }
      } @else if (editable) {
        <div class="slider-create-placeholder">
          @if (disabledSliders.length > 0) {
            <select class="slider-insert-select" aria-label="Insérer un slider existant dans home-bottom"
                    (change)="onSliderInsertSelect('home-bottom', $event)">
              <option value="" selected>Insérer un slider existant…</option>
              @for (d of disabledSliders; track d.id) { <option [value]="d.id">{{ d.title }}</option> }
            </select>
          }
          <button type="button" class="slider-create-btn" (click)="sliderCreate.emit('home-bottom')">+ Créer un slider ici (home-bottom)</button>
        </div>
      }

      @if (viewerQueue.length > 0) {
        <app-story-viewer [queue]="viewerQueue" (closed)="onViewerClosed()"></app-story-viewer>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; white-space: pre-line; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .feed { padding: 64px 0 140px; }
    .feed .feed-title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 24px; }
    .card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; background: transparent; border: none; padding: 0; cursor: pointer; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb app-cropped-image-canvas { width: 100%; height: 100%; display: block; transition: transform 480ms ease; }
    .card:hover .thumb app-cropped-image-canvas { transform: scale(1.03); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }

    .meta { padding: 18px 2px 0; display: flex; flex-direction: column; gap: 8px; }
    .cat { display: block; font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .title { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; line-height: 1.15; color: var(--color-ink); margin: 0; transition: color 180ms ease; }
    .card:hover .title { color: var(--color-ink-soft); }
    .excerpt { font-size: 0.92rem; line-height: 1.55; color: var(--color-ink-soft); margin: 2px 0 0; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .cta { margin-top: 6px; font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-ink); display: inline-flex; align-items: center; gap: 8px; }
    .cta .arrow { display: inline-block; transition: transform 220ms ease; }
    .card:hover .cta .arrow { transform: translateX(4px); }

    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); gap: 36px 20px; } }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; gap: 48px; }
      .stories-row { gap: 20px; }
      .ring { width: 72px; height: 72px; }
      .title { font-size: 1.35rem; }
    }

    /* Editable styles */
    .editable-text { cursor: pointer; outline: 1px dashed transparent; outline-offset: 4px; transition: outline-color 180ms ease; border-radius: 2px; }
    .editable-text:hover, .editable-text:focus-visible { outline-color: currentColor; }
    .editable-text[contenteditable="true"] { outline: 2px solid var(--color-accent, #2a9d8f); outline-offset: 4px; background: rgba(0,0,0,0.03); cursor: text; }

    .slider-wrap { position: relative; }
    .slider-edit-bar { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line); margin-bottom: 8px; }
    .slider-title-edit { flex: 1; padding: 2px 4px; outline: 1px dashed transparent; }
    .slider-title-edit:hover, .slider-title-edit:focus { outline-color: var(--color-accent); }
    .slider-edit-bar button, .slider-zone-select { padding: 4px 8px; font-size: 0.8rem; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; }
    .slider-create-placeholder { padding: 16px; text-align: center; border: 1px dashed var(--color-line); margin: 12px 0; }
    .slider-create-btn { padding: 8px 16px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; }
    .slider-insert-select { padding: 6px 10px; margin-right: 8px; font-size: 0.85rem; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; }

    .grid.editable { list-style: none; padding: 0; }
    .grid.editable > li.card { position: relative; }
    .grid.editable > li.card.excluded { opacity: 0.35; }
    .excluded-badge { position: absolute; top: 14px; right: 14px; background: #c44; color: #fff; font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; z-index: 2; }
    .card.editable .edit-overlay {
      position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: space-between;
      background: rgba(0,0,0,0.0); opacity: 0; transition: opacity 180ms ease, background 180ms ease;
      padding: 12px; z-index: 3;
    }
    .card.editable:hover .edit-overlay { opacity: 1; background: rgba(0,0,0,0.45); }
    .card.editable .incl-toggle {
      background: var(--color-bg); color: var(--color-ink); padding: 6px 10px;
      display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; cursor: pointer;
    }
    .card.editable .drag-handle {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      background: var(--color-ink); color: var(--color-bg); border: 2px solid var(--color-bg);
      border-radius: 50%; font-size: 0.85rem; letter-spacing: -2px; cursor: grab;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .card.editable .drag-handle:active { cursor: grabbing; }
    .card.editable .overlay-btn {
      padding: 6px 10px; background: var(--color-bg); color: var(--color-ink);
      border: 1px solid var(--color-line); cursor: pointer; font-family: inherit;
      font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px;
    }
    .card.editable .overlay-btn:hover { background: var(--color-ink); color: var(--color-bg); }
  `]
})
export class HomeViewComponent {
  @Input({ required: true }) data: HomePageData | null = null;
  @Input() content: SiteContent = {};
  @Input() sliders: NewsSliderView[] = [];
  @Input() disabledSliders: { id: string; title: string }[] = [];
  @Input() viewerQueue: StoryItem[] = [];
  @Input() editable = false;
  @Input() includedSlugs: Set<string> = new Set();

  @Output() storyOpen = new EventEmitter<SliderStoryRef>();
  @Output() viewerClosed = new EventEmitter<void>();
  @Output() feedReorder = new EventEmitter<number[]>();
  @Output() feedItemToggleInclude = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string; included: boolean }>();
  @Output() textFieldEdit = new EventEmitter<{ key: EditableHomeContentKey; value: string }>();
  @Output() sliderTitleEdit = new EventEmitter<{ id: string; title: string }>();
  @Output() sliderCompositionRequested = new EventEmitter<string>();
  @Output() sliderDelete = new EventEmitter<string>();
  @Output() sliderZoneChange = new EventEmitter<{ id: string; zoneKey: SliderZone | null }>();
  @Output() sliderCreate = new EventEmitter<'home-top' | 'home-middle' | 'home-bottom'>();
  @Output() sliderAssign = new EventEmitter<{ id: string; zoneKey: SliderZone }>();
  @Output() feedItemCropEdit = new EventEmitter<{ kind: 'furniture' | 'exhibition'; slug: string }>();

  protected editingKey: EditableHomeContentKey | null = null;

  protected eyebrowStyle(): Record<string, string> { return roleStyle(this.content, 'eyebrow'); }
  protected titleStyle(): Record<string, string> { return roleStyle(this.content, 'title'); }
  protected feedTitleStyle(): Record<string, string> { return roleStyle(this.content, 'section-title'); }
  protected cardTitleStyle(): Record<string, string> { return roleStyle(this.content, 'card-title'); }

  protected heroEyebrow(): string {
    return this.content['home.hero.eyebrow'] || 'Atelier Lumen — Portfolio';
  }
  protected heroTitle(): string {
    const t = this.content['home.hero.title'];
    return (t && t.trim()) ? t : 'Mobilier sculpté,\nscénographies vivantes.';
  }
  protected heroLead(): string {
    return this.content['home.hero.lead'] || 'À feuilleter en stories, à explorer en profondeur.';
  }

  protected feedTitleText(): string { return this.content['home.feed.title'] || ''; }

  protected sliderByZone(): Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> {
    const map: Partial<Record<'home-top' | 'home-middle' | 'home-bottom', NewsSliderView>> = {};
    for (const s of this.sliders) {
      if ((SLIDER_ZONES as readonly string[]).includes(s.zoneKey)) {
        map[s.zoneKey as 'home-top' | 'home-middle' | 'home-bottom'] = s;
      }
    }
    return map;
  }

  protected cardLink(item: HomeFeedItem): string[] {
    return item.kind === 'exhibition' ? ['/expositions', item.slug] : ['/mobilier', item.slug];
  }

  protected isEditingKey(k: EditableHomeContentKey): boolean | null {
    return this.editingKey === k ? true : null;
  }

  protected isIncluded(item: HomeFeedItem): boolean {
    return this.includedSlugs.has(item.kind + ':' + item.slug);
  }

  protected onToggleInclude(item: HomeFeedItem, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.feedItemToggleInclude.emit({ kind: item.kind, slug: item.slug, included: checked });
  }

  protected startInlineEdit(ev: Event, key: EditableHomeContentKey): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.editingKey = key;
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

  protected commitInlineEdit(ev: FocusEvent, key: EditableHomeContentKey): void {
    if (this.editingKey !== key) return;
    const el = ev.target as HTMLElement;
    const value = (el.textContent ?? '').trim();
    this.editingKey = null;
    this.textFieldEdit.emit({ key, value });
  }

  protected onInlineEnter(ev: Event, key: EditableHomeContentKey): void {
    if (this.editingKey === key) {
      ev.preventDefault();
      (ev.target as HTMLElement).blur();
    }
  }

  protected cancelInlineEdit(ev: Event): void {
    if (!this.editingKey) return;
    ev.preventDefault();
    this.editingKey = null;
    (ev.target as HTMLElement).blur();
  }

  protected readonly editableZones: ('home-top' | 'home-middle' | 'home-bottom')[] = ['home-top', 'home-middle', 'home-bottom'];

  protected onSliderTitleBlur(id: string, ev: Event): void {
    const title = (ev.target as HTMLElement).textContent?.trim() ?? '';
    if (title) this.sliderTitleEdit.emit({ id, title });
  }

  protected onSliderZoneSelect(id: string, ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value;
    const zoneKey = value === '' ? null : (value as SliderZone);
    this.sliderZoneChange.emit({ id, zoneKey });
  }

  protected onSliderInsertSelect(zoneKey: SliderZone, ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value;
    if (id) this.sliderAssign.emit({ id, zoneKey });
  }

  protected onSliderStoryOpen(story: SliderStoryRef): void {
    this.storyOpen.emit(story);
  }

  protected onViewerClosed(): void {
    this.viewerClosed.emit();
  }
}
