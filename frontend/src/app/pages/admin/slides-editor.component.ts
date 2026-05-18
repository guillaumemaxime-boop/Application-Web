import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../services/portfolio.service';
import {
  Slide, CoverSlide, ImageSlide, SpecSlide, QuoteSlide, LinkSlide,
} from '../../models/slide.model';
import { ReorderableDirective } from '../../directives/reorderable.directive';

@Component({
  selector: 'app-slides-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReorderableDirective],
  template: `
    <section class="slides-editor">
      <header class="head">
        <h3>Slides ({{ slides().length }})</h3>
        <button type="button" (click)="open.set(!open())">{{ open() ? 'Replier' : 'Déplier' }}</button>
      </header>

      @if (open()) {
        <div class="actions">
          <button type="button" (click)="add('cover')">+ Cover</button>
          <button type="button" (click)="add('image')">+ Image</button>
          <button type="button" (click)="add('spec')">+ Caractéristiques</button>
          <button type="button" (click)="add('quote')">+ Citation</button>
          <button type="button" (click)="add('link')">+ Lien</button>
        </div>

        @if (warnings().length > 0) {
          <ul class="warnings">
            @for (w of warnings(); track w) { <li>⚠ {{ w }}</li> }
          </ul>
        }

        <ul class="list" appReorderable (reordered)="onReorder($event)">
          @for (s of slides(); track s.id || $index; let i = $index) {
            <li class="slide-card">
              <div class="row">
                <span class="handle">⠿</span>
                <span class="type-badge">{{ s.type.toUpperCase() }}</span>
                <button type="button" class="del" (click)="remove(i)">✕</button>
              </div>

              @switch (s.type) {
                @case ('cover') {
                  <label>Image source <input type="text" [ngModel]="$any(s).src" (ngModelChange)="patch(i, { src: $event })" /></label>
                }
                @case ('image') {
                  <label>Image source <input type="text" [ngModel]="$any(s).src" (ngModelChange)="patch(i, { src: $event })" /></label>
                  <label>Légende <input type="text" [ngModel]="$any(s).caption" (ngModelChange)="patch(i, { caption: $event })" /></label>
                }
                @case ('spec') {
                  <div class="specs">
                    @for (entry of $any(s).specs; track $index; let j = $index) {
                      <div class="spec-row">
                        <input type="text" placeholder="Label" [ngModel]="entry.label" (ngModelChange)="patchSpec(i, j, 'label', $event)" />
                        <input type="text" placeholder="Valeur" [ngModel]="entry.value" (ngModelChange)="patchSpec(i, j, 'value', $event)" />
                        <button type="button" (click)="removeSpec(i, j)">✕</button>
                      </div>
                    }
                    <button type="button" (click)="addSpec(i)">+ Entrée</button>
                  </div>
                }
                @case ('quote') {
                  <label>Citation <textarea [ngModel]="$any(s).body" (ngModelChange)="patch(i, { body: $event })"></textarea></label>
                  <label>Source <input type="text" [ngModel]="$any(s).cite" (ngModelChange)="patch(i, { cite: $event })" /></label>
                }
                @case ('link') {
                  <label>Label <input type="text" [ngModel]="$any(s).label" (ngModelChange)="patch(i, { label: $event })" placeholder="Voir la fiche complète" /></label>
                  <label>Description <input type="text" [ngModel]="$any(s).description" (ngModelChange)="patch(i, { description: $event })" /></label>
                  <label>URL <input type="text" [ngModel]="$any(s).href" (ngModelChange)="patch(i, { href: $event })" placeholder="(auto)" /></label>
                }
              }
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
    .warnings { margin: 12px 0; padding-left: 0; list-style: none; color: #b58400; font-size: 0.85rem; }
    .list { list-style: none; padding: 0; }
    .slide-card { border: 1px solid var(--color-line); padding: 12px; margin-bottom: 8px; background: var(--color-bg); }
    .row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .handle { cursor: grab; color: var(--color-mute); }
    .type-badge { font-size: 0.65rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .del { margin-left: auto; background: none; border: none; cursor: pointer; }
    label { display: block; font-size: 0.78rem; color: var(--color-ink-soft); margin: 6px 0; }
    input, textarea { width: 100%; padding: 6px 8px; border: 1px solid var(--color-line); background: #fff; font: inherit; }
    .specs .spec-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; margin-bottom: 6px; }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-line); }
    .primary { background: var(--color-ink); color: var(--color-bg); border: none; padding: 8px 16px; cursor: pointer; }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SlidesEditorComponent implements OnChanges {
  @Input({ required: true }) kind!: 'furniture' | 'exhibition';
  @Input({ required: true }) ownerId!: string;
  @Input() ownerSlug: string | null = null;

  private defaultHref(): string | null {
    if (!this.ownerSlug) return null;
    return this.kind === 'furniture'
      ? `/mobilier/${this.ownerSlug}`
      : `/expositions/${this.ownerSlug}`;
  }

  private portfolio = inject(PortfolioService);

  protected open = signal(false);
  protected slides = signal<Slide[]>([]);
  protected warnings = signal<string[]>([]);

  ngOnChanges(c: SimpleChanges) {
    if (c['ownerId'] || c['kind']) this.reload();
  }

  reload() {
    if (!this.ownerId) return;
    this.portfolio.getSlides(this.kind, this.ownerId).subscribe(slides => {
      const fallback = this.defaultHref();
      const enriched: Slide[] = slides.map(s =>
        s.type === 'link' && !s.href && fallback
          ? { ...s, href: fallback }
          : s
      );
      this.slides.set(enriched);
      this.recomputeWarnings();
    });
  }

  add(type: Slide['type']) {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 8);
    const newSlide: Slide = (() => {
      switch (type) {
        case 'cover': return { type, id, position: 0, src: '' } as CoverSlide;
        case 'image': return { type, id, position: 0, src: '', caption: null } as ImageSlide;
        case 'spec':  return { type, id, position: 0, specs: [{ label: '', value: '' }] } as SpecSlide;
        case 'quote': return { type, id, position: 0, body: '', cite: null } as QuoteSlide;
        case 'link':  return { type, id, position: 0, label: null, description: null, href: this.defaultHref() } as LinkSlide;
      }
    })();
    this.slides.update(s => [...s, newSlide]);
    this.recomputeWarnings();
  }

  remove(index: number) {
    this.slides.update(s => s.filter((_, i) => i !== index));
    this.recomputeWarnings();
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
    this.recomputeWarnings();
  }

  canSave(): boolean {
    return this.slides().every(s => {
      if (s.type === 'image' && !s.src) return false;
      if (s.type === 'cover' && !s.src) return false;
      if (s.type === 'quote' && !s.body) return false;
      if (s.type === 'spec' && s.specs.length === 0) return false;
      return true;
    });
  }

  save() {
    this.portfolio.replaceSlides(this.kind, this.ownerId, this.slides()).subscribe(updated => {
      this.slides.set(updated);
      this.recomputeWarnings();
    });
  }

  private recomputeWarnings() {
    const ws: string[] = [];
    const s = this.slides();
    if (s.length === 0 || s[0]?.type !== 'cover') ws.push('Pas de slide cover en première position.');
    if (s.length === 0 || s[s.length - 1]?.type !== 'link') ws.push('Pas de slide lien en dernière position.');
    this.warnings.set(ws);
  }
}
