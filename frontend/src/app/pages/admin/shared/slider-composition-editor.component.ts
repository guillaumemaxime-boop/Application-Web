import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import {
  CdkDropList, CdkDrag, CdkDropListGroup, CdkDragDrop, moveItemInArray,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Story } from '../../../models/story.model';

/**
 * Modale de composition d'un slider : deux colonnes (Disponibles / Composition)
 * reliées en drag & drop (CDK connected drop lists), avec équivalents clavier
 * (Ajouter / Retirer / ↑ / ↓) et annonces aria-live. Extraite pour être
 * réutilisée form-side ET depuis le preview accueil. Piloté par inputs, émet
 * `save` (liste d'ids ordonnée) ou `cancel`. La persistance est faite par le
 * consommateur. API inputs/outputs inchangée.
 */
@Component({
  selector: 'app-slider-composition-editor',
  standalone: true,
  imports: [A11yModule, FormsModule, CdkDropListGroup, CdkDropList, CdkDrag],
  template: `
    <div class="composition-modal" role="dialog" aria-modal="true" aria-labelledby="composition-title"
         cdkTrapFocus cdkTrapFocusAutoCapture>
      <div class="composition-panel">
        <header>
          <h3 id="composition-title">Composition de "{{ title() }}"</h3>
          <button type="button" class="comp-cancel" (click)="cancel.emit()" aria-label="Fermer">Fermer</button>
        </header>
        <p class="comp-hint">Seules les stories ayant au moins un slide sont proposées (une story sans contenu n'apparaît pas sur le site).</p>
        <p class="comp-hint">Glissez-déposez les stories entre les colonnes, ou utilisez les boutons « Ajouter », « ↑ / ↓ » et « Retirer ».</p>
        <p class="sr-only" aria-live="polite">{{ status() }}</p>
        <div class="composition-grid" cdkDropListGroup>
          <aside class="available">
            <h4>Stories disponibles</h4>
            <input type="text" [ngModel]="storyFilter()" (ngModelChange)="storyFilter.set($event)" placeholder="Rechercher..." aria-label="Filtrer les stories" />
            <ul class="drop-list" id="available" cdkDropList [cdkDropListData]="availableIds()"
                (cdkDropListDropped)="onDrop($event)">
              @for (story of filteredAvailable(); track story.id) {
                <li class="story-option" cdkDrag [cdkDragData]="story.id">
                  <span>{{ story.title }} <small>({{ story.ownerKind }} {{ story.ownerId }})</small></span>
                  <button type="button" class="story-add" (click)="add(story.id)"
                          [attr.aria-label]="'Ajouter ' + story.title + ' à la composition'">Ajouter →</button>
                </li>
              }
              @if (filteredAvailable().length === 0) {
                <li class="empty">Aucune story disponible.</li>
              }
            </ul>
          </aside>
          <aside class="composition">
            <h4>Composition courante</h4>
            <ul class="drop-list comp-list" id="composition" [cdkDropListData]="pendingStoryIds()"
                cdkDropList (cdkDropListDropped)="onDrop($event)">
              @if (pendingStoryIds().length === 0) {
                <li class="empty">Aucune story sélectionnée. Glissez-en une ici ou utilisez « Ajouter ».</li>
              }
              @for (storyId of pendingStoryIds(); track storyId; let i = $index) {
                <li class="comp-item" cdkDrag [cdkDragData]="storyId">
                  <span>{{ storyTitle(storyId) }}</span>
                  <button type="button" class="comp-up" (click)="moveUp(storyId)" [disabled]="i === 0"
                          [attr.aria-label]="'Monter ' + storyTitle(storyId) + ' dans l’ordre'">↑</button>
                  <button type="button" class="comp-down" (click)="moveDown(storyId)"
                          [disabled]="i === pendingStoryIds().length - 1"
                          [attr.aria-label]="'Descendre ' + storyTitle(storyId) + ' dans l’ordre'">↓</button>
                  <button type="button" class="comp-remove" (click)="removeFromComposition(storyId)"
                          [attr.aria-label]="'Retirer ' + storyTitle(storyId)">× Retirer</button>
                </li>
              }
            </ul>
            <button type="button" class="primary comp-save" (click)="save.emit(pendingStoryIds())">Enregistrer</button>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .composition-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1300;
      display: flex; align-items: center; justify-content: center;
    }
    .composition-panel { width: 90%; max-width: 900px; max-height: 80vh; overflow: auto; background: var(--color-bg); padding: 24px; border: 1px solid var(--color-ink); }
    .composition-panel header { display: flex; align-items: center; justify-content: space-between; }
    .composition-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .available, .composition { display: flex; flex-direction: column; gap: 8px; }
    .drop-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; min-height: 80px; }
    .comp-list.cdk-drop-list-receiving, .available .drop-list.cdk-drop-list-receiving { outline: 2px dashed var(--color-ink); outline-offset: 2px; }
    .story-option, .comp-item { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .story-option > span:first-child, .comp-item > span:first-child { flex: 1; }
    .story-option small { color: var(--color-mute); }
    .empty { color: var(--color-mute); font-style: italic; padding: 12px 0; cursor: default; border: none; }
    button { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.85rem; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    button.primary { background: var(--color-ink); color: var(--color-bg); }
    .comp-hint { margin: 12px 0 0; font-size: 0.82rem; color: var(--color-mute); font-style: italic; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    /* Feedback CDK */
    .cdk-drag-preview { box-shadow: 0 4px 12px rgba(0,0,0,0.3); background: var(--color-bg); border: 1px solid var(--color-ink); padding: 6px 8px; }
    .cdk-drag-placeholder { opacity: 0.4; }
    .cdk-drag-animating { transition: transform 180ms cubic-bezier(0,0,0.2,1); }
    .drop-list.cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) { transition: transform 180ms cubic-bezier(0,0,0.2,1); }
  `]
})
export class SliderCompositionEditorComponent {
  readonly title = input<string>('');
  readonly storyIds = input<string[]>([]);
  readonly allStories = input<Story[]>([]);
  /** Identité du slider en cours d'édition. L'éditeur ne réinitialise sa
   *  composition pendante que lorsque cet id change (pas à chaque nouvelle
   *  référence de `storyIds`), pour ne pas écraser les modifications en cours. */
  readonly sliderId = input<string | null>(null);
  readonly save = output<string[]>();
  readonly cancel = output<void>();

  protected readonly pendingStoryIds = signal<string[]>([]);
  protected readonly status = signal('');
  protected readonly storyFilter = signal('');

  private lastSliderId: string | null | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.sliderId();
      if (id === this.lastSliderId) return;
      this.lastSliderId = id;
      this.pendingStoryIds.set([...untracked(() => this.storyIds())]);
    });
  }

  protected readonly filteredAvailable = computed(() => {
    const pending = new Set(this.pendingStoryIds());
    const q = this.storyFilter().toLowerCase();
    return this.allStories()
      .filter(s => !pending.has(s.id))
      .filter(s => !q || s.title.toLowerCase().includes(q) || s.ownerId.toLowerCase().includes(q));
  });

  protected readonly availableIds = computed(() => this.filteredAvailable().map(s => s.id));

  protected storyTitle(id: string): string {
    return this.allStories().find(s => s.id === id)?.title ?? id;
  }

  /** Drag & drop : ajoute (available→composition), retire (composition→available)
   *  ou réordonne (intra-composition). L'id déplacé est lu dans event.item.data.
   *  On NE se fie PAS à l'id du conteneur CDK (non garanti = id HTML) : la
   *  direction est déduite de l'appartenance de movedId à la composition. */
  onDrop(event: CdkDragDrop<string[]>): void {
    const movedId = event.item.data as string;

    // Même conteneur = réordonnancement (seul celui de la composition compte ;
    // la liste « disponibles » est dérivée, son réordre est sans effet).
    if (event.previousContainer === event.container) {
      if (this.pendingStoryIds().includes(movedId)) {
        this.pendingStoryIds.update(arr => {
          const copy = [...arr];
          moveItemInArray(copy, event.previousIndex, event.currentIndex);
          return copy;
        });
        this.status.set(this.storyTitle(movedId) + ' déplacée en position ' + (event.currentIndex + 1) + '.');
      }
      return;
    }

    // Conteneurs différents : si la story est déjà dans la composition, elle en
    // sort (retrait) ; sinon elle y entre (ajout à l'index de drop).
    if (this.pendingStoryIds().includes(movedId)) {
      this.pendingStoryIds.update(arr => arr.filter(x => x !== movedId));
      this.status.set(this.storyTitle(movedId) + ' retirée de la composition.');
    } else {
      this.pendingStoryIds.update(arr => {
        const copy = [...arr];
        copy.splice(Math.min(event.currentIndex, copy.length), 0, movedId);
        return copy;
      });
      this.status.set(this.storyTitle(movedId) + ' ajoutée à la composition.');
    }
  }

  protected add(id: string): void {
    this.pendingStoryIds.update(arr => arr.includes(id) ? arr : [...arr, id]);
    this.status.set(this.storyTitle(id) + ' ajoutée à la composition.');
  }

  protected removeFromComposition(id: string): void {
    this.pendingStoryIds.update(arr => arr.filter(x => x !== id));
    this.status.set(this.storyTitle(id) + ' retirée de la composition.');
  }

  protected moveUp(id: string): void {
    const before = this.pendingStoryIds().indexOf(id);
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i <= 0) return arr;
      const copy = [...arr];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
    this.announceMove(id, before);
  }

  protected moveDown(id: string): void {
    const before = this.pendingStoryIds().indexOf(id);
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i < 0 || i >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
    this.announceMove(id, before);
  }

  /** Annonce aria-live d'un déplacement clavier (no-op si la position n'a pas changé). */
  private announceMove(id: string, before: number): void {
    const after = this.pendingStoryIds().indexOf(id);
    if (after !== before) {
      this.status.set(this.storyTitle(id) + ' déplacée en position ' + (after + 1) + '.');
    }
  }
}
