import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { Slide } from '../../../models/slide.model';
import { Crop } from '../../../models/crop.model';
import { StoryAdminView } from '../../../models/story.model';
import { DisplaySlide } from '../../../models/display-slide.model';
import { parseVideoUrl } from '../../../utils/video-url';
import { ReorderableDirective } from '../../../directives/reorderable.directive';
import { CroppedImageCanvasComponent } from '../shared/cropped-image-canvas.component';
import { ImageFieldComponent } from '../shared/image-field.component';
import { StoryViewerComponent, StoryItem } from '../../../components/story-viewer/story-viewer.component';

/**
 * Éditeur de slides deux panneaux (`/admin/stories/:id`).
 *
 * Rail gauche : vignettes des slides (sélection, réordonnancement par drag via
 * `appReorderable`, ajout par type, suppression). Panneau droit : éditeur du
 * slide sélectionné selon son type (image / vidéo / spec / citation), avec la
 * logique d'édition reprise fidèlement de `story-inline.component`. Chaque
 * mutation déclenche un auto-save via `replaceStorySlides`.
 */
@Component({
  selector: 'app-story-slide-editor',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ReorderableDirective,
    CroppedImageCanvasComponent,
    ImageFieldComponent,
    StoryViewerComponent,
  ],
  template: `
    <header class="editor-head">
      <a class="back" routerLink="/admin/stories">← Stories</a>
      <h2 class="editor-title">{{ storyTitle() || 'Édition d’une story' }}</h2>
      <button type="button" class="preview-btn" (click)="openPreview()" [disabled]="slides().length === 0">
        Aperçu
      </button>
    </header>

    <p class="sr-only" aria-live="polite">{{ liveMessage() }}</p>

    <div class="two-panes">
      <!-- Rail gauche : vignettes -->
      <nav class="rail" aria-label="Slides de la story">
        @if (slides().length === 0) {
          <p class="rail-empty">Aucun slide. Ajoutez-en un ci-dessous.</p>
        }
        <ul class="rail-list" appReorderable (reordered)="onReorder($event)">
          @for (s of slides(); track s.id; let i = $index) {
            <li class="rail-li">
              <button
                type="button"
                class="rail-item"
                [class.selected]="selectedIndex() === i"
                [attr.aria-current]="selectedIndex() === i ? 'true' : null"
                (click)="selectedIndex.set(i)">
                <span class="rail-index" aria-hidden="true">{{ i + 1 }}</span>
                <span class="rail-thumb" aria-hidden="true">
                  @switch (s.type) {
                    @case ('image') {
                      @if ($any(s).src) {
                        <app-cropped-image-canvas mode="cover" [imageUrl]="$any(s).src" [crop]="$any(s).crop ?? null" alt="" />
                      } @else {
                        <span class="thumb-ph">🖼</span>
                      }
                    }
                    @case ('video') { <span class="thumb-ph">▶</span> }
                    @case ('spec')  { <span class="thumb-ph">▤</span> }
                    @case ('quote') { <span class="thumb-ph">❝</span> }
                  }
                </span>
                <span class="rail-type">{{ typeLabel(s.type) }}</span>
              </button>
              <div class="rail-move">
                <button
                  type="button"
                  class="rail-up"
                  [attr.aria-label]="'Monter le slide ' + (i + 1)"
                  [disabled]="i === 0"
                  (click)="moveSlideUp(i)">↑</button>
                <button
                  type="button"
                  class="rail-down"
                  [attr.aria-label]="'Descendre le slide ' + (i + 1)"
                  [disabled]="i === slides().length - 1"
                  (click)="moveSlideDown(i)">↓</button>
              </div>
              <button
                type="button"
                class="rail-del"
                [attr.aria-label]="'Supprimer le slide ' + (i + 1)"
                (click)="deleteSlide(i)">×</button>
            </li>
          }
        </ul>

        <div class="add-bar">
          <button type="button" (click)="addSlide('image')">+ Image</button>
          <button type="button" (click)="addSlide('video')">+ Vidéo</button>
          <button type="button" (click)="addSlide('spec')">+ Spec</button>
          <button type="button" (click)="addSlide('quote')">+ Citation</button>
        </div>
      </nav>

      <!-- Panneau droit : éditeur du slide sélectionné -->
      <section class="editor-pane" aria-label="Édition du slide sélectionné">
        @if (current(); as s) {
          <div class="editor-card">
            <span class="editor-card-type">{{ typeLabel(s.type) }}</span>

            @switch (s.type) {
              @case ('image') {
                <app-image-field
                  label="Image"
                  [cropEnabled]="true"
                  [ngModel]="$any(s).src"
                  (ngModelChange)="onImageSrcChange($any(s).id, $event)"
                  [cropValue]="$any(s).crop ?? null"
                  (cropChange)="onImageCropChange($any(s).id, $event)" />
                <label class="field">
                  <span>Légende</span>
                  <input type="text" [value]="$any(s).caption ?? ''" placeholder="Légende de l’image"
                         aria-label="Légende de l’image" (change)="onCaptionChange($any(s).id, $event)" />
                </label>
              }
              @case ('video') {
                <label class="field">
                  <span>URL YouTube ou Vimeo</span>
                  <input type="url" [value]="$any(s).src" placeholder="https://www.youtube.com/watch?v=…"
                         aria-label="URL de la vidéo" (change)="onVideoUrlChange($any(s).id, $event)" />
                </label>
                <div class="video-frame">
                  @if (videoEmbedUrl($any(s).src); as url) {
                    <iframe [src]="url" [title]="'Vidéo — ' + ($any(s).caption || 'sans titre')"
                            allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>
                  } @else {
                    <span class="video-ph">Aperçu de la vidéo</span>
                  }
                </div>
                <label class="field">
                  <span>Légende</span>
                  <input type="text" [value]="$any(s).caption ?? ''" placeholder="Légende de la vidéo"
                         aria-label="Légende de la vidéo" (change)="onCaptionChange($any(s).id, $event)" />
                </label>
              }
              @case ('spec') {
                <span class="eyebrow">Caractéristiques</span>
                <div class="specs">
                  @for (e of $any(s).specs; track $index; let j = $index) {
                    <div class="spec-row">
                      <input type="text" placeholder="Libellé" aria-label="Libellé"
                             [value]="e.label" (change)="onSpecCellChange($any(s).id, j, 'label', $event)" />
                      <input type="text" placeholder="Valeur" aria-label="Valeur"
                             [value]="e.value" (change)="onSpecCellChange($any(s).id, j, 'value', $event)" />
                      <button type="button" class="spec-row-del" aria-label="Retirer cette ligne"
                              (click)="removeSpecRow($any(s).id, j)">×</button>
                    </div>
                  }
                </div>
                <button type="button" class="spec-add" (click)="addSpecRow($any(s).id)">＋ Entrée</button>
              }
              @case ('quote') {
                <label class="field">
                  <span>Citation</span>
                  <textarea rows="3" aria-label="Citation" placeholder="Le texte de la citation"
                            (change)="onQuoteChange($any(s).id, 'body', $event)">{{ $any(s).body }}</textarea>
                </label>
                <label class="field">
                  <span>Source</span>
                  <input type="text" [value]="$any(s).cite ?? ''" placeholder="Auteur, ouvrage…"
                         aria-label="Source" (change)="onQuoteChange($any(s).id, 'cite', $event)" />
                </label>
              }
            }
          </div>
        } @else {
          <p class="editor-empty">Sélectionnez un slide à gauche ou ajoutez-en un.</p>
        }
      </section>
    </div>

    @if (previewQueue(); as queue) {
      <app-story-viewer [queue]="queue" (closed)="closePreview()" />
    }
  `,
  styles: [`
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    .editor-head { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .editor-head .back {
      padding: 6px 12px; border: 1px solid var(--color-line); text-decoration: none;
      color: var(--color-ink); font-size: 0.85rem; line-height: 1;
    }
    .editor-head .back:hover { border-color: var(--color-ink); }
    .editor-title { margin: 0; flex: 1; font-size: 1.3rem; }
    .preview-btn {
      padding: 8px 16px; background: var(--color-ink); color: var(--color-bg);
      border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.9rem;
    }
    .preview-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .two-panes { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }

    .rail { border: 1px solid var(--color-line); background: var(--color-bg-alt); padding: 12px; }
    .rail-empty { color: var(--color-mute); font-style: italic; font-size: 0.85rem; padding: 8px 4px; }
    .rail-list { list-style: none; margin: 0 0 12px; padding: 0; }
    .rail-li { position: relative; margin-bottom: 8px; }
    .rail-item {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
      padding: 8px; background: var(--color-bg); border: 1px solid var(--color-line);
      cursor: pointer; font: inherit; color: var(--color-ink);
    }
    .rail-item.selected { border-color: var(--color-ink); box-shadow: inset 0 0 0 1px var(--color-ink); }
    .rail-item:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    .rail-index { font-size: 0.75rem; color: var(--color-mute); min-width: 1.2em; text-align: center; }
    .rail-thumb {
      width: 48px; height: 36px; flex-shrink: 0; background: var(--color-bg-alt);
      border: 1px solid var(--color-line); overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .rail-thumb app-cropped-image-canvas { width: 100%; height: 100%; }
    .thumb-ph { font-size: 1rem; color: var(--color-mute); }
    .rail-type { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-ink-soft); }
    .rail-del {
      position: absolute; top: 2px; right: 2px;
      background: var(--color-bg); border: 1px solid var(--color-line);
      cursor: pointer; padding: 0 6px; line-height: 1.4; font-size: 0.9rem;
    }
    .rail-del:hover { color: var(--color-accent); border-color: var(--color-accent); }
    .rail-item.reorder-dragging { opacity: 0.5; }

    .rail-move {
      position: absolute; top: 2px; right: 28px;
      display: flex; gap: 2px;
    }
    .rail-move button {
      background: var(--color-bg); border: 1px solid var(--color-line);
      cursor: pointer; padding: 0 5px; line-height: 1.4; font-size: 0.8rem;
      color: var(--color-ink);
    }
    .rail-move button:hover:not(:disabled) { border-color: var(--color-ink); }
    .rail-move button:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 1px; }
    .rail-move button:disabled { opacity: 0.35; cursor: not-allowed; }

    .add-bar { display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px dashed var(--color-line); padding-top: 12px; }
    .add-bar button {
      background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer;
      padding: 5px 10px; font-size: 0.78rem;
    }

    .editor-pane { border: 1px solid var(--color-line); background: var(--color-bg-alt); padding: 20px; min-height: 320px; }
    .editor-empty { color: var(--color-mute); font-style: italic; }
    .editor-card-type { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .field { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; font-size: 0.78rem; color: var(--color-ink-soft); }
    .field input, .field textarea {
      padding: 8px 10px; border: 1px solid var(--color-line); background: var(--color-bg);
      color: var(--color-ink); font: inherit;
    }
    .field input:focus-visible, .field textarea:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }

    .video-frame { position: relative; width: 100%; padding-top: 56.25%; margin-top: 16px; background: #000; }
    .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .video-frame .video-ph {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      color: var(--color-mute); font-size: 0.85rem;
    }

    .eyebrow { display: block; font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); margin-top: 16px; }
    .specs { margin-top: 8px; }
    .spec-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; margin-bottom: 6px; }
    .spec-row input { padding: 6px 8px; border: 1px solid var(--color-line); background: var(--color-bg); font: inherit; }
    .spec-row-del, .spec-add {
      background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer;
      padding: 4px 8px; font-size: 0.8rem;
    }

    @media (max-width: 720px) {
      .two-panes { grid-template-columns: 1fr; }
    }
  `],
})
export class StorySlideEditorComponent {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly storyId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly slides = signal<Slide[]>([]);
  readonly selectedIndex = signal(0);

  /** Métadonnées de la story (titre/owner) pour l'en-tête et l'aperçu. */
  private readonly story = signal<StoryAdminView | null>(null);
  protected readonly storyTitle = computed(() => this.story()?.title ?? '');

  protected readonly liveMessage = signal('');

  /** File d'aperçu (`StoryItem[]`) passée à `<app-story-viewer>` ; null = fermé. */
  protected readonly previewQueue = signal<StoryItem[] | null>(null);

  protected readonly current = computed<Slide | null>(() => {
    const all = this.slides();
    const i = this.selectedIndex();
    return all[i] ?? null;
  });

  constructor() {
    if (this.storyId) {
      this.portfolio.getStorySlides(this.storyId).subscribe(slides => {
        // Filtre défensif : ne pas afficher d'éventuelles rows legacy cover/link.
        const narrative = slides.filter(
          s => s.type === 'image' || s.type === 'video' || s.type === 'spec' || s.type === 'quote',
        );
        this.slides.set(narrative);
        if (this.selectedIndex() >= narrative.length) {
          this.selectedIndex.set(Math.max(0, narrative.length - 1));
        }
      });
      // Métadonnées (titre + owner) pour l'en-tête et l'aperçu — best effort,
      // tolérant si l'API de gestion n'est pas disponible (ex. tests ciblés).
      const manage = this.portfolio.getStoriesForManagement?.bind(this.portfolio);
      manage?.().subscribe({
        next: views => this.story.set(views.find(v => v.id === this.storyId) ?? null),
        error: () => { /* en-tête/aperçu best-effort : on ignore */ },
      });
    }
  }

  protected typeLabel(type: Slide['type']): string {
    switch (type) {
      case 'image': return 'Image';
      case 'video': return 'Vidéo';
      case 'spec':  return 'Spec';
      case 'quote': return 'Citation';
    }
  }

  // --- Création / mutation ---------------------------------------------------

  private newSlide(type: Slide['type']): Slide {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 10);
    switch (type) {
      case 'image': return { id, type, position: 0, src: '', caption: null, crop: null };
      case 'video': return { id, type, position: 0, src: '', caption: null };
      case 'spec':  return { id, type, position: 0, specs: [{ label: '', value: '' }] };
      case 'quote': return { id, type, position: 0, body: '', cite: null };
    }
  }

  addSlide(type: Slide['type']): void {
    const next = [...this.slides(), this.newSlide(type)].map((s, i) => ({ ...s, position: i }));
    this.commit(next);
    this.selectedIndex.set(next.length - 1);
    this.liveMessage.set(`Slide ${this.typeLabel(type)} ajouté en position ${next.length}.`);
  }

  protected deleteSlide(index: number): void {
    const next = this.slides()
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, position: i }));
    this.commit(next);
    if (this.selectedIndex() >= next.length) {
      this.selectedIndex.set(Math.max(0, next.length - 1));
    }
    this.liveMessage.set(`Slide ${index + 1} supprimé. ${next.length} slide(s) restant(s).`);
  }

  protected onReorder(order: number[]): void {
    const cur = this.slides();
    const next = order
      .map((srcIdx, i) => {
        const s = cur[srcIdx];
        return s ? { ...s, position: i } : null;
      })
      .filter((s): s is Slide => s !== null);
    this.commit(next);
    this.selectedIndex.set(0);
    this.liveMessage.set('Slides réordonnés.');
  }

  /**
   * Repli clavier du réordonnancement (RGAA) : échange le slide `index` avec son
   * voisin et auto-save via le même `commit` que le drag. Garde la sélection sur
   * le slide déplacé et annonce le déplacement en `aria-live`.
   */
  private swapSlides(index: number, target: number): void {
    const cur = this.slides();
    if (index < 0 || target < 0 || index >= cur.length || target >= cur.length) return;
    const next = [...cur];
    [next[index], next[target]] = [next[target], next[index]];
    const repositioned = next.map((s, i) => ({ ...s, position: i }));
    this.commit(repositioned);
    this.selectedIndex.set(target);
    this.liveMessage.set(`Slide déplacé en position ${target + 1}.`);
  }

  protected moveSlideUp(index: number): void {
    this.swapSlides(index, index - 1);
  }

  protected moveSlideDown(index: number): void {
    this.swapSlides(index, index + 1);
  }

  /** Met à jour un slide ciblé par id et auto-save. */
  private patchSlide(id: string, patch: Partial<Slide>): void {
    this.commit(this.slides().map(s => (s.id === id ? ({ ...s, ...patch } as Slide) : s)));
  }

  /**
   * Source de vérité des mutations : pose le nouvel état localement puis
   * persiste via `replaceStorySlides` (auto-save). On réinjecte les slides
   * sauvegardées (ids définitifs côté serveur) en conservant la sélection.
   */
  private commit(next: Slide[]): void {
    this.slides.set(next);
    if (!this.storyId) return;
    this.portfolio.replaceStorySlides(this.storyId, next).subscribe({
      next: saved => {
        const narrative = saved.filter(
          s => s.type === 'image' || s.type === 'video' || s.type === 'spec' || s.type === 'quote',
        );
        this.slides.set(narrative);
        if (this.selectedIndex() >= narrative.length) {
          this.selectedIndex.set(Math.max(0, narrative.length - 1));
        }
      },
      error: () => this.toast.error('Erreur lors de l’enregistrement.'),
    });
  }

  // --- Handlers d'édition par type (repris de story-inline) ------------------

  protected onCaptionChange(id: string, ev: Event): void {
    this.patchSlide(id, { caption: (ev.target as HTMLInputElement).value.trim() || null } as Partial<Slide>);
  }

  protected onImageSrcChange(id: string, value: string): void {
    this.patchSlide(id, { src: value.trim() } as Partial<Slide>);
  }

  protected onImageCropChange(id: string, crop: Crop | null): void {
    this.patchSlide(id, { crop } as Partial<Slide>);
  }

  protected onVideoUrlChange(id: string, ev: Event): void {
    this.patchSlide(id, { src: (ev.target as HTMLInputElement).value.trim() } as Partial<Slide>);
  }

  protected onQuoteChange(id: string, field: 'body' | 'cite', ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement | HTMLInputElement).value.trim();
    this.patchSlide(id, (field === 'body' ? { body: v } : { cite: v || null }) as Partial<Slide>);
  }

  protected onSpecCellChange(id: string, idx: number, field: 'label' | 'value', ev: Event): void {
    const v = (ev.target as HTMLInputElement).value.trim();
    this.commit(this.slides().map(s => {
      if (s.id !== id || s.type !== 'spec') return s;
      const specs = s.specs.map((e, i) => (i === idx ? { ...e, [field]: v } : e));
      return { ...s, specs };
    }));
  }

  protected addSpecRow(id: string): void {
    this.commit(this.slides().map(s =>
      s.id === id && s.type === 'spec' ? { ...s, specs: [...s.specs, { label: '', value: '' }] } : s));
  }

  protected removeSpecRow(id: string, idx: number): void {
    this.commit(this.slides().map(s =>
      s.id === id && s.type === 'spec' ? { ...s, specs: s.specs.filter((_, i) => i !== idx) } : s));
  }

  protected videoEmbedUrl(src: string): SafeResourceUrl | null {
    const parsed = parseVideoUrl(src);
    if (!parsed) return null;
    const url = parsed.platform === 'youtube'
      ? `https://www.youtube.com/embed/${parsed.id}`
      : `https://player.vimeo.com/video/${parsed.id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // --- Aperçu ----------------------------------------------------------------

  /**
   * Ouvre `<app-story-viewer>` avec la story courante. Le viewer attend un
   * `queue: StoryItem[]` (title/subtitle/slides/kind/slug). On préfixe, comme
   * les fiches publiques, un slide `cover` synthétique construit depuis la
   * coverImage de la story si elle est connue.
   */
  protected openPreview(): void {
    if (this.slides().length === 0) return;
    const meta = this.story();
    const slides: DisplaySlide[] = [];
    if (meta?.coverImage) {
      slides.push({
        type: 'cover',
        id: 'cover-preview',
        position: 0,
        src: meta.coverImage,
        coverCrop: meta.coverCrop ?? null,
      });
    }
    slides.push(...this.slides());
    const item: StoryItem = {
      title: meta?.title ?? this.storyTitle() ?? 'Story',
      subtitle: meta?.ownerTitle ?? '',
      slides,
      kind: meta?.ownerKind,
      slug: meta?.slug,
    };
    this.previewQueue.set([item]);
  }

  protected closePreview(): void {
    this.previewQueue.set(null);
  }
}
