import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Slide, ImageSlide, VideoSlide, SpecSlide, QuoteSlide } from '../../models/slide.model';
import { DisplaySlide } from '../../models/display-slide.model';
import { parseVideoUrl } from '../../utils/video-url';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { CroppedImageCanvasComponent } from '../../pages/admin/shared/cropped-image-canvas.component';

type InlineSlide = ImageSlide | VideoSlide | SpecSlide | QuoteSlide;

@Component({
  selector: 'app-story-inline',
  standalone: true,
  imports: [CommonModule, ReorderableDirective, CroppedImageCanvasComponent],
  template: `
    @if (editable) {
      <section class="story-inline editable">
        <div class="container narrow header"><span class="eyebrow">Histoire de la pièce</span></div>
        <ul class="slides-edit-list" appReorderable (reordered)="onReorder($event)">
          @for (s of workingSlides(); track s.id; let i = $index) {
            <li class="slide-edit-block">
              <div class="slide-insert-point">
                <button type="button" class="insert-btn" aria-label="Insérer un slide avant celui-ci"
                        (click)="insertMenuAt.set(insertMenuAt() === i ? null : i)">＋</button>
                @if (insertMenuAt() === i) {
                  <div class="insert-menu">
                    <button type="button" (click)="insertSlide(i, 'image')">Image</button>
                    <button type="button" (click)="insertSlide(i, 'video')">Vidéo</button>
                    <button type="button" (click)="insertSlide(i, 'spec')">Spec</button>
                    <button type="button" (click)="insertSlide(i, 'quote')">Citation</button>
                  </div>
                }
              </div>
              <div class="slide-edit-toolbar">
                <span class="slide-drag" title="Glisser pour réordonner" aria-hidden="true">⋮⋮</span>
                <span class="slide-type">{{ s.type }}</span>
                <button type="button" class="slide-del" aria-label="Supprimer ce slide" (click)="deleteSlide(s.id)">×</button>
              </div>
              @switch (s.type) {
                @case ('image') {
                  <figure class="block image">
                    <app-cropped-image-canvas [imageUrl]="$any(s).src" [crop]="$any(s).crop ?? null" mode="fit" [alt]="$any(s).caption ?? ''" />
                    <button type="button" class="slide-img-replace" (click)="imageReplaceRequest.emit(s.id)">🖼 Remplacer l'image</button>
                    <button type="button" class="slide-img-crop" (click)="imageCropRequest.emit(s.id)">✂ Cadrer</button>
                    <figcaption class="container narrow slide-caption" contenteditable="true" role="textbox"
                                aria-label="Légende de l'image" (blur)="onCaptionBlur(s.id, $event)">{{ $any(s).caption }}</figcaption>
                  </figure>
                }
                @case ('video') {
                  <figure class="block video">
                    <div class="video-frame">@if (videoEmbedUrl($any(s).src); as url) {<iframe [src]="url" [title]="'Vidéo — ' + ($any(s).caption || 'sans titre')"></iframe>}</div>
                    <div class="container narrow">
                      <input type="url" class="slide-video-url" [value]="$any(s).src" placeholder="URL YouTube ou Vimeo"
                             aria-label="URL de la vidéo" (change)="onVideoUrlChange(s.id, $event)" />
                      <figcaption class="slide-caption" contenteditable="true" role="textbox"
                                  aria-label="Légende de la vidéo" (blur)="onCaptionBlur(s.id, $event)">{{ $any(s).caption }}</figcaption>
                    </div>
                  </figure>
                }
                @case ('spec') {
                  <div class="block spec"><div class="container narrow">
                    <span class="eyebrow">Caractéristiques</span>
                    <dl>
                      @for (e of $any(s).specs; track $index; let j = $index) {
                        <div>
                          <dt class="spec-label" contenteditable="true" role="textbox" aria-label="Libellé"
                              (blur)="onSpecCellBlur(s.id, j, 'label', $event)">{{ e.label }}</dt>
                          <dd class="spec-value" contenteditable="true" role="textbox" aria-label="Valeur"
                              (blur)="onSpecCellBlur(s.id, j, 'value', $event)">{{ e.value }}</dd>
                          <button type="button" class="spec-row-del" aria-label="Retirer cette ligne" (click)="removeSpecRow(s.id, j)">×</button>
                        </div>
                      }
                    </dl>
                    <button type="button" class="spec-add" (click)="addSpecRow(s.id)">＋ Entrée</button>
                  </div></div>
                }
                @case ('quote') {
                  <div class="block quote"><div class="container narrow">
                    <blockquote class="quote-body" contenteditable="true" role="textbox" aria-label="Citation"
                                (blur)="onQuoteBlur(s.id, 'body', $event)">{{ $any(s).body }}</blockquote>
                    <cite class="quote-cite" contenteditable="true" role="textbox" aria-label="Source"
                          (blur)="onQuoteBlur(s.id, 'cite', $event)">{{ $any(s).cite }}</cite>
                  </div></div>
                }
              }
            </li>
          }
        </ul>
        <div class="add-bar">
          <button type="button" class="add-bar-image" (click)="addSlide('image')">+ Image</button>
          <button type="button" class="add-bar-video" (click)="addSlide('video')">+ Vidéo</button>
          <button type="button" class="add-bar-spec" (click)="addSlide('spec')">+ Spec</button>
          <button type="button" class="add-bar-quote" (click)="addSlide('quote')">+ Citation</button>
        </div>
      </section>
    } @else {
      @if (sections().length > 0) {
        <section class="story-inline">
          <div class="container narrow header">
            <span class="eyebrow">Histoire de la pièce</span>
          </div>

          @for (s of sections(); track s.id) {
            @switch (s.type) {
              @case ('image') {
                <figure class="block image">
                  <img [src]="s.src" [alt]="s.caption ?? ''" loading="lazy" />
                  @if (s.caption) {
                    <figcaption class="container narrow">{{ s.caption }}</figcaption>
                  }
                </figure>
              }
              @case ('video') {
                <figure class="block video">
                  @if (videoEmbedUrl(s.src); as url) {
                    <div class="video-frame">
                      <iframe
                        [src]="url"
                        [title]="'Vidéo — ' + (s.caption || 'sans titre')"
                        allow="autoplay; fullscreen; encrypted-media"
                        allowfullscreen></iframe>
                    </div>
                  }
                  @if (s.caption) {
                    <figcaption class="container narrow">{{ s.caption }}</figcaption>
                  }
                </figure>
              }
              @case ('spec') {
                <div class="block spec">
                  <div class="container narrow">
                    <span class="eyebrow">Caractéristiques</span>
                    <dl>
                      @for (e of s.specs; track e.label) {
                        <div>
                          <dt>{{ e.label }}</dt>
                          <dd>{{ e.value }}</dd>
                        </div>
                      }
                    </dl>
                  </div>
                </div>
              }
              @case ('quote') {
                <div class="block quote">
                  <div class="container narrow">
                    <blockquote>{{ s.body }}</blockquote>
                    @if (s.cite) {
                      <cite>{{ s.cite }}</cite>
                    }
                  </div>
                </div>
              }
            }
          }
        </section>
      }
    }
  `,
  styles: [`
    .story-inline { padding: 96px 0 64px; }
    .header { margin-bottom: 56px; }

    .block { margin: 0 0 64px; }
    .block:last-child { margin-bottom: 0; }

    .image img {
      display: block;
      width: 100%;
      max-height: 88vh;
      object-fit: cover;
    }
    .image figcaption,
    .video figcaption {
      margin-top: 18px;
      font-family: var(--serif);
      font-size: 1.15rem;
      line-height: 1.5;
      color: var(--color-ink);
    }
    .video-frame {
      position: relative;
      width: 100%;
      padding-top: 56.25%;
    }
    .video-frame iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }

    .spec dl {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      border-top: 1px solid var(--color-line);
      padding-top: 28px;
      margin-top: 16px;
    }
    .spec dl > div {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 24px;
    }
    .spec dt {
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-mute);
      padding-top: 4px;
    }
    .spec dd {
      font-family: var(--serif);
      font-size: 1.2rem;
      color: var(--color-ink);
    }

    .quote { text-align: center; padding: 24px 0; }
    .quote blockquote {
      font-family: var(--serif);
      font-size: 1.9rem;
      line-height: 1.4;
      color: var(--color-ink);
      max-width: 640px;
      margin: 0 auto;
    }
    .quote cite {
      display: block;
      font-style: normal;
      margin-top: 24px;
      font-size: 0.72rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-mute);
    }

    @media (max-width: 600px) {
      .story-inline { padding: 64px 0 48px; }
      .block { margin-bottom: 48px; }
      .spec dl > div { grid-template-columns: 1fr; gap: 4px; }
      .quote blockquote { font-size: 1.5rem; }
    }

    .slides-edit-list { list-style: none; padding: 0; margin: 0; }
    .slide-edit-block { position: relative; border: 1px dashed var(--color-line); padding: 12px; margin: 0 16px 16px; }
    .slide-edit-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .slide-drag { cursor: grab; color: var(--color-mute); }
    .slide-type { font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .slide-del { margin-left: auto; background: transparent; border: 1px solid var(--color-line); cursor: pointer; padding: 2px 8px; }
    .slide-del:hover { color: #b1532a; border-color: #b1532a; }
    .slide-edit-block [contenteditable]:hover, .slide-edit-block [contenteditable]:focus { outline: 1px dashed var(--color-accent); outline-offset: 2px; }
    .slide-video-url { width: 100%; padding: 6px 8px; border: 1px solid var(--color-line); margin: 8px 0; font: inherit; }
    .spec-row-del, .spec-add { background: transparent; border: 1px solid var(--color-line); cursor: pointer; padding: 2px 8px; font-size: 0.78rem; }
    .slide-edit-block .image app-cropped-image-canvas { display: block; max-height: 70vh; background: var(--color-bg-alt); }
    .slide-img-replace { display: inline-block; margin: 8px 16px; padding: 4px 10px; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; font-size: 0.8rem; }
    .slide-insert-point { text-align: center; min-height: 8px; position: relative; margin-bottom: 6px; }
    .insert-btn { opacity: 0; background: var(--color-bg); border: 1px solid var(--color-line); border-radius: 999px; cursor: pointer; padding: 0 8px; }
    .slide-insert-point:hover .insert-btn, .insert-btn:focus { opacity: 1; }
    .insert-menu { display: inline-flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
    .insert-menu button { background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; padding: 2px 8px; font-size: 0.78rem; }
    .add-bar { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; padding: 16px; border-top: 1px dashed var(--color-line); margin: 0 16px; }
    .add-bar button { background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; padding: 6px 14px; font-size: 0.85rem; }
  `]
})
export class StoryInlineComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly _slides = signal<DisplaySlide[]>([]);

  @Input() editable = false;
  @Output() slidesChange = new EventEmitter<Slide[]>();
  @Output() imageReplaceRequest = new EventEmitter<string>();
  @Output() imageCropRequest = new EventEmitter<string>();

  @Input({ required: true })
  set slides(value: DisplaySlide[]) {
    this._slides.set(value ?? []);
    this.workingSlides.set(
      (value ?? []).filter(
        (s): s is Slide => s.type === 'image' || s.type === 'video' || s.type === 'spec' || s.type === 'quote',
      ),
    );
  }

  protected readonly sections = computed<InlineSlide[]>(() =>
    this._slides().filter(
      (s): s is InlineSlide =>
        s.type === 'image' || s.type === 'video' || s.type === 'spec' || s.type === 'quote'
    )
  );

  protected readonly workingSlides = signal<Slide[]>([]);

  private commit(next: Slide[]): void {
    this.workingSlides.set(next);
    this.slidesChange.emit(next);
  }

  protected deleteSlide(id: string): void {
    this.commit(this.workingSlides().filter(s => s.id !== id));
  }

  protected onReorder(order: number[]): void {
    const cur = this.workingSlides();
    this.commit(order.map(i => cur[i]).filter((s): s is Slide => !!s));
  }

  private patchSlide(id: string, patch: Partial<Slide>): void {
    this.commit(this.workingSlides().map(s => s.id === id ? ({ ...s, ...patch } as Slide) : s));
  }

  protected onCaptionBlur(id: string, ev: Event): void {
    this.patchSlide(id, { caption: (ev.target as HTMLElement).textContent?.trim() || null } as Partial<Slide>);
  }

  protected onVideoUrlChange(id: string, ev: Event): void {
    this.patchSlide(id, { src: (ev.target as HTMLInputElement).value.trim() } as Partial<Slide>);
  }

  protected onQuoteBlur(id: string, field: 'body' | 'cite', ev: Event): void {
    const v = (ev.target as HTMLElement).textContent?.trim() ?? '';
    this.patchSlide(id, (field === 'body' ? { body: v } : { cite: v || null }) as Partial<Slide>);
  }

  protected onSpecCellBlur(id: string, idx: number, field: 'label' | 'value', ev: Event): void {
    const v = (ev.target as HTMLElement).textContent?.trim() ?? '';
    this.commit(this.workingSlides().map(s => {
      if (s.id !== id || s.type !== 'spec') return s;
      const specs = s.specs.map((e, i) => i === idx ? { ...e, [field]: v } : e);
      return { ...s, specs };
    }));
  }

  protected addSpecRow(id: string): void {
    this.commit(this.workingSlides().map(s =>
      s.id === id && s.type === 'spec' ? { ...s, specs: [...s.specs, { label: '', value: '' }] } : s));
  }

  protected removeSpecRow(id: string, idx: number): void {
    this.commit(this.workingSlides().map(s =>
      s.id === id && s.type === 'spec' ? { ...s, specs: s.specs.filter((_, i) => i !== idx) } : s));
  }

  private newSlide(type: Slide['type']): Slide {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 8);
    switch (type) {
      case 'image': return { id, type, position: 0, src: '', caption: null };
      case 'video': return { id, type, position: 0, src: '', caption: null };
      case 'spec':  return { id, type, position: 0, specs: [{ label: '', value: '' }] };
      case 'quote': return { id, type, position: 0, body: '', cite: null };
    }
  }

  protected addSlide(type: Slide['type']): void {
    this.commit([...this.workingSlides(), this.newSlide(type)]);
  }

  protected insertSlide(index: number, type: Slide['type']): void {
    const next = [...this.workingSlides()];
    next.splice(index, 0, this.newSlide(type));
    this.commit(next);
    this.insertMenuAt.set(null);
  }

  protected readonly insertMenuAt = signal<number | null>(null);

  protected videoEmbedUrl(src: string): SafeResourceUrl | null {
    const parsed = parseVideoUrl(src);
    if (!parsed) return null;
    const url = parsed.platform === 'youtube'
      ? `https://www.youtube.com/embed/${parsed.id}`
      : `https://player.vimeo.com/video/${parsed.id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
