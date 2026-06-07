import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { Slide, ImageSlide, VideoSlide, SpecSlide, QuoteSlide } from '../../../models/slide.model';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { ImageFieldComponent } from './image-field.component';
import { parseVideoUrl } from '../../../utils/video-url';

@Component({
  selector: 'app-slides-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReorderableDirective, ImageFieldComponent],
  template: `
    <section class="slides-editor">
      <header class="head">
        <h3>Slides ({{ slides().length }})</h3>
        <button type="button" (click)="open.set(!open())">{{ open() ? 'Replier' : 'Déplier' }}</button>
      </header>

      @if (open()) {
        <div class="actions">
          <button type="button" (click)="add('image')">+ Image</button>
          <button type="button" (click)="add('video')">+ Vidéo</button>
          <button type="button" (click)="add('spec')">+ Caractéristiques</button>
          <button type="button" (click)="add('quote')">+ Citation</button>
        </div>

        <ul class="list" appReorderable (reordered)="onReorder($event)">
          @for (s of slides(); track s.id || $index; let i = $index) {
            <li class="slide-card">
              <div class="preview">
                @switch (s.type) {
                  @case ('image') {
                    @if ($any(s).src) {
                      <img [src]="$any(s).src" alt="" />
                    } @else {
                      <div class="preview-empty">image</div>
                    }
                  }
                  @case ('video') {
                    <div class="preview-video">
                      <span class="play">▶</span>
                      @if (detectedPlatform(i); as p) {
                        <span class="badge" [class.yt]="p === 'youtube'" [class.vimeo]="p === 'vimeo'">
                          {{ p === 'youtube' ? 'YT' : 'V' }}
                        </span>
                      }
                    </div>
                  }
                  @case ('spec') {
                    <div class="preview-spec">
                      @for (e of $any(s).specs.slice(0, 2); track $index) {
                        <div><span class="lbl">{{ e.label }}</span><span class="val">{{ e.value }}</span></div>
                      }
                    </div>
                  }
                  @case ('quote') {
                    <div class="preview-quote">« {{ ($any(s).body || '').slice(0, 80) }}{{ ($any(s).body?.length ?? 0) > 80 ? '…' : '' }} »</div>
                  }
                }
              </div>

              <div class="form">
                <div class="row">
                  <span class="handle" aria-hidden="true">⠿</span>
                  <span class="type-badge">{{ s.type.toUpperCase() }}</span>
                  <button type="button" class="del" (click)="remove(i)">✕</button>
                </div>

                @switch (s.type) {
                  @case ('image') {
                    <label>
                      <span>Image principale</span>
                      <app-image-field
                        [ngModel]="$any(s).src"
                        (ngModelChange)="patch(i, { src: $event })"
                        label="" />
                    </label>
                    <label>
                      <span>Légende</span>
                      <input type="text" [ngModel]="$any(s).caption" (ngModelChange)="patch(i, { caption: $event })" />
                    </label>
                  }
                  @case ('video') {
                    <label>
                      <span>URL YouTube ou Vimeo</span>
                      <input type="url" [ngModel]="$any(s).src" (ngModelChange)="patch(i, { src: $event })" placeholder="https://www.youtube.com/watch?v=..." />
                    </label>
                    <p class="video-detect">
                      @if (detectedPlatform(i); as p) {
                        ✓ {{ p === 'youtube' ? 'YouTube' : 'Vimeo' }} détecté · ID {{ detectedId(i) }}
                      } @else if ($any(s).src) {
                        ⚠ URL non reconnue (YouTube ou Vimeo attendue)
                      }
                    </p>
                    <label>
                      <span>Légende (optionnel)</span>
                      <input type="text" [ngModel]="$any(s).caption" (ngModelChange)="patch(i, { caption: $event })" />
                    </label>
                  }
                  @case ('spec') {
                    <div class="specs">
                      @for (entry of $any(s).specs; track $index; let j = $index) {
                        <div class="spec-row">
                          <input type="text" placeholder="Label" aria-label="Label de caracteristique" [ngModel]="entry.label" (ngModelChange)="patchSpec(i, j, 'label', $event)" />
                          <input type="text" placeholder="Valeur" aria-label="Valeur de caracteristique" [ngModel]="entry.value" (ngModelChange)="patchSpec(i, j, 'value', $event)" />
                          <button type="button" aria-label="Retirer la caracteristique" (click)="removeSpec(i, j)">✕</button>
                        </div>
                      }
                      <button type="button" (click)="addSpec(i)">+ Entrée</button>
                    </div>
                  }
                  @case ('quote') {
                    <label>
                      <span>Citation</span>
                      <textarea [ngModel]="$any(s).body" (ngModelChange)="patch(i, { body: $event })"></textarea>
                    </label>
                    <label>
                      <span>Source</span>
                      <input type="text" [ngModel]="$any(s).cite" (ngModelChange)="patch(i, { cite: $event })" />
                    </label>
                  }
                }
              </div>
            </li>
          }
        </ul>

        <footer class="foot">
          <button type="button" (click)="reload()">Annuler</button>
          <button type="button" class="primary" (click)="save()" [disabled]="!canSave()">Enregistrer les slides</button>
        </footer>
      }
    </section>
  `,
  styles: [`
    .slides-editor { border: 1px solid var(--color-line); padding: 16px; margin-top: 24px; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .list { list-style: none; padding: 0; }
    .slide-card {
      display: grid; grid-template-columns: 140px 1fr; gap: 12px;
      border: 1px solid var(--color-line); padding: 10px; margin-bottom: 8px; background: var(--color-bg);
    }
    .preview {
      width: 140px; height: 84px; background: #f0ece4; border: 1px solid var(--color-line);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .preview img { width: 100%; height: 100%; object-fit: cover; }
    .preview-empty { color: var(--color-mute); font-size: 0.78rem; }
    .preview-video { background: #111; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
    .preview-video .play { font-size: 1.6rem; }
    .preview-video .badge { position: absolute; top: 4px; right: 4px; font-size: 0.6rem; padding: 1px 4px; }
    .preview-video .badge.yt { background: #FF0000; }
    .preview-video .badge.vimeo { background: #1ab7ea; }
    .preview-spec { padding: 6px; font-size: 0.65rem; line-height: 1.3; }
    .preview-spec .lbl { color: var(--color-mute); margin-right: 6px; }
    .preview-spec .val { font-family: var(--serif); }
    .preview-quote { padding: 6px; font-style: italic; font-size: 0.7rem; color: var(--color-ink-soft); }
    .row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .handle { cursor: grab; color: var(--color-mute); }
    .type-badge { font-size: 0.65rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .del { margin-left: auto; background: none; border: none; cursor: pointer; }
    label { display: block; font-size: 0.78rem; color: var(--color-ink-soft); margin: 6px 0; }
    label > span { display: block; margin-bottom: 4px; }
    input, textarea { width: 100%; padding: 6px 8px; border: 1px solid var(--color-line); background: #fff; font: inherit; }
    .video-detect { font-size: 0.78rem; color: var(--color-mute); margin: 4px 0; }
    .specs .spec-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; margin-bottom: 6px; }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-line); }
    .primary { background: var(--color-ink); color: var(--color-bg); border: none; padding: 8px 16px; cursor: pointer; }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SlidesEditorComponent implements OnChanges {
  @Input({ required: true }) storyId!: string;
  @Input() ownerSlug: string | null = null;

  private portfolio = inject(PortfolioService);

  protected open = signal(false);
  protected slides = signal<Slide[]>([]);

  ngOnChanges(c: SimpleChanges) {
    if (c['storyId']) this.reload();
  }

  reload() {
    if (!this.storyId) return;
    this.portfolio.getStorySlides(this.storyId).subscribe(slides => {
      // Filtre défensif : ne pas afficher les rows legacy cover/link
      const filtered = slides.filter(s => s.type !== ('cover' as any) && s.type !== ('link' as any));
      this.slides.set(filtered as Slide[]);
    });
  }

  add(type: Slide['type']) {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 8);
    const newSlide: Slide = (() => {
      switch (type) {
        case 'image': return { type, id, position: 0, src: '', caption: null } as ImageSlide;
        case 'video': return { type, id, position: 0, src: '', caption: null } as VideoSlide;
        case 'spec':  return { type, id, position: 0, specs: [{ label: '', value: '' }] } as SpecSlide;
        case 'quote': return { type, id, position: 0, body: '', cite: null } as QuoteSlide;
      }
    })();
    this.slides.update(s => [...s, newSlide]);
  }

  remove(index: number) {
    this.slides.update(s => s.filter((_, i) => i !== index));
  }

  patch(index: number, partial: Partial<Slide>) {
    this.slides.update(s => s.map((slide, i) => i === index ? { ...slide, ...partial } as Slide : slide));
  }

  patchSpec(slideIdx: number, entryIdx: number, field: 'label' | 'value', value: string) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      const specs = slide.specs.map((e, j) => j === entryIdx ? { ...e, [field]: value } : e);
      return { ...slide, specs };
    }));
  }

  addSpec(slideIdx: number) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      return { ...slide, specs: [...slide.specs, { label: '', value: '' }] };
    }));
  }

  removeSpec(slideIdx: number, entryIdx: number) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      return { ...slide, specs: slide.specs.filter((_, j) => j !== entryIdx) };
    }));
  }

  onReorder(order: number[]) {
    const current = this.slides();
    this.slides.set(order.map(i => current[i]));
  }

  detectedPlatform(index: number): 'youtube' | 'vimeo' | null {
    const s = this.slides()[index];
    if (s?.type !== 'video') return null;
    return parseVideoUrl(s.src)?.platform ?? null;
  }

  detectedId(index: number): string | null {
    const s = this.slides()[index];
    if (s?.type !== 'video') return null;
    return parseVideoUrl(s.src)?.id ?? null;
  }

  canSave(): boolean {
    return this.slides().every(s => {
      if (s.type === 'image' && !s.src) return false;
      if (s.type === 'video' && !s.src) return false;
      if (s.type === 'quote' && !s.body) return false;
      if (s.type === 'spec' && s.specs.length === 0) return false;
      return true;
    });
  }

  save() {
    this.portfolio.replaceStorySlides(this.storyId, this.slides()).subscribe(updated => {
      const filtered = updated.filter(s => s.type !== ('cover' as any) && s.type !== ('link' as any));
      this.slides.set(filtered as Slide[]);
    });
  }
}
