import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { Story } from '../../../models/story.model';

/**
 * Modale de composition d'un slider (liste « disponibles » filtrable +
 * sélection, liste « composition courante » réordonnable + retrait).
 * Extraite de SlidersComponent pour être réutilisée form-side ET depuis le
 * preview accueil. Piloté par inputs, émet `save` (liste d'ids ordonnée) ou
 * `cancel`. La persistance (replaceSliderStories) est faite par le consommateur.
 */
@Component({
  selector: 'app-slider-composition-editor',
  standalone: true,
  imports: [A11yModule, FormsModule],
  template: `
    <div class="composition-modal" role="dialog" aria-modal="true" aria-labelledby="composition-title"
         cdkTrapFocus cdkTrapFocusAutoCapture>
      <div class="composition-panel">
        <header>
          <h3 id="composition-title">Composition de "{{ title() }}"</h3>
          <button type="button" class="comp-cancel" (click)="cancel.emit()" aria-label="Fermer">Fermer</button>
        </header>
        <p class="comp-hint">Une story sans slide n'apparaît pas sur le site tant qu'elle n'a pas de contenu.</p>
        <div class="composition-grid">
          <aside class="available">
            <h4>Stories disponibles</h4>
            <input type="text" [(ngModel)]="storyFilter" placeholder="Rechercher..." aria-label="Filtrer les stories" />
            @for (story of filteredAvailable(); track story.id) {
              <label class="story-option">
                <input type="checkbox" [checked]="selectedToAdd().includes(story.id)" (change)="toggleSelect(story.id)" />
                <span>{{ story.title }} <small>({{ story.ownerKind }} {{ story.ownerId }})</small></span>
              </label>
            }
            <button type="button" class="add-selected" (click)="addSelected()" [disabled]="selectedToAdd().length === 0">→ Ajouter</button>
          </aside>
          <aside class="composition">
            <h4>Composition courante</h4>
            @if (pendingStoryIds().length === 0) {
              <p class="empty">Aucune story sélectionnée.</p>
            }
            @for (storyId of pendingStoryIds(); track storyId; let i = $index) {
              <div class="comp-item">
                <span>{{ storyTitle(storyId) }}</span>
                <button type="button" class="comp-up" (click)="moveUp(storyId)" [disabled]="i === 0" aria-label="Monter la story dans l'ordre">↑</button>
                <button type="button" class="comp-down" (click)="moveDown(storyId)" [disabled]="i === pendingStoryIds().length - 1" aria-label="Descendre la story dans l'ordre">↓</button>
                <button type="button" class="comp-remove" (click)="removeFromComposition(storyId)">← Retirer</button>
              </div>
            }
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
    .story-option { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
    .story-option small { color: var(--color-mute); }
    .comp-item { display: flex; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-line); }
    .comp-item > span:first-child { flex: 1; }
    .empty { color: var(--color-mute); font-style: italic; padding: 12px 0; }
    button { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.85rem; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    button.primary { background: var(--color-ink); color: var(--color-bg); }
    .comp-hint { margin: 12px 0 0; font-size: 0.82rem; color: var(--color-mute); font-style: italic; }
  `]
})
export class SliderCompositionEditorComponent {
  readonly title = input<string>('');
  readonly storyIds = input<string[]>([]);
  readonly allStories = input<Story[]>([]);
  /** Identité du slider en cours d'édition. L'éditeur ne réinitialise sa
   *  composition pendante que lorsque cet id change (pas à chaque nouvelle
   *  référence de `storyIds`), pour ne pas écraser les modifications en cours
   *  si le parent rafraîchit ses données pendant l'édition. */
  readonly sliderId = input<string | null>(null);
  readonly save = output<string[]>();
  readonly cancel = output<void>();

  protected readonly pendingStoryIds = signal<string[]>([]);
  protected readonly selectedToAdd = signal<string[]>([]);
  protected storyFilter = '';

  private lastSliderId: string | null | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.sliderId();
      if (id === this.lastSliderId) return;
      this.lastSliderId = id;
      // Lecture untracked : seul un changement d'id réinitialise la composition.
      this.pendingStoryIds.set([...untracked(() => this.storyIds())]);
      this.selectedToAdd.set([]);
    });
  }

  protected readonly filteredAvailable = computed(() => {
    const pending = new Set(this.pendingStoryIds());
    const q = this.storyFilter.toLowerCase();
    return this.allStories()
      .filter(s => !pending.has(s.id))
      .filter(s => !q || s.title.toLowerCase().includes(q) || s.ownerId.toLowerCase().includes(q));
  });

  protected storyTitle(id: string): string {
    return this.allStories().find(s => s.id === id)?.title ?? id;
  }

  protected toggleSelect(id: string): void {
    this.selectedToAdd.update(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  }

  protected addSelected(): void {
    this.pendingStoryIds.update(arr => [...arr, ...this.selectedToAdd()]);
    this.selectedToAdd.set([]);
  }

  protected removeFromComposition(id: string): void {
    this.pendingStoryIds.update(arr => arr.filter(x => x !== id));
  }

  protected moveUp(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i <= 0) return arr;
      const copy = [...arr];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
  }

  protected moveDown(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i < 0 || i >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
  }
}
