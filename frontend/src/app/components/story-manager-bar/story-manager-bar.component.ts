import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Story } from '../../models/story.model';

/**
 * Barre de gestion des stories d'un owner (mobilier/expo), rendue dans le bloc
 * d'auteur admin du preview de la fiche (mode editable uniquement). Composant
 * pur : émet des events, aucune logique métier ni appel API. La page consommatrice
 * exécute les opérations (réutilise ses méthodes CRUD stories existantes).
 */
@Component({
  selector: 'app-story-manager-bar',
  standalone: true,
  imports: [],
  template: `
    @if (editable) {
      <div class="story-manager-bar">
        <div class="smb-chips" role="group" aria-label="Stories rattachées">
          @for (s of stories; track s.id) {
            <button type="button" class="smb-chip"
                    [class.active]="s.id === activeStoryId"
                    [attr.aria-pressed]="s.id === activeStoryId"
                    (click)="select.emit(s.id)">{{ s.title }}</button>
          }
          <button type="button" class="smb-new" (click)="create.emit()">+ Nouvelle</button>
        </div>

        @if (active(); as a) {
          <div class="smb-active">
            <span class="smb-title" contenteditable="true" role="textbox"
                  aria-label="Renommer la story active"
                  (blur)="onRenameBlur(a.id, $event)">{{ a.title }}</span>
            <button type="button" class="smb-act smb-up" (click)="move.emit({ id: a.id, dir: 'up' })"
                    [disabled]="isFirst()" aria-label="Monter la story dans l'ordre">↑</button>
            <button type="button" class="smb-act smb-down" (click)="move.emit({ id: a.id, dir: 'down' })"
                    [disabled]="isLast()" aria-label="Descendre la story dans l'ordre">↓</button>
            <button type="button" class="smb-act smb-cover" (click)="coverEdit.emit(a.id)">Cover</button>
            <button type="button" class="smb-act smb-slides" (click)="slidesEdit.emit(a.id)">⚙ Éditer slides</button>
            <button type="button" class="smb-act smb-viewer" (click)="viewerPreview.emit(a.id)">🔍 Aperçu</button>
            <button type="button" class="smb-act danger smb-delete" (click)="delete.emit(a.id)"
                    aria-label="Supprimer la story active">🗑</button>
          </div>
        } @else {
          <p class="smb-empty">Aucune story. Crée-en une avec « + Nouvelle ».</p>
        }
      </div>
    }
  `,
  styles: [`
    .story-manager-bar { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: var(--color-bg-alt); border: 1px solid var(--color-line); margin-bottom: 16px; }
    .smb-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .smb-chip { padding: 4px 12px; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; font-size: 0.85rem; border-radius: 999px; }
    .smb-chip.active { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent) inset; }
    .smb-new { padding: 4px 12px; background: var(--color-bg); border: 1px dashed var(--color-line); cursor: pointer; font-size: 0.85rem; }
    .smb-active { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .smb-title { flex: 1 1 160px; min-width: 120px; padding: 2px 6px; outline: 1px dashed transparent; font-size: 0.9rem; }
    .smb-title:hover, .smb-title:focus { outline-color: var(--color-accent); }
    .smb-act { padding: 4px 10px; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; font-size: 0.8rem; }
    .smb-act:hover:not(:disabled) { border-color: var(--color-ink); }
    .smb-act:disabled { opacity: 0.4; cursor: not-allowed; }
    .smb-act.danger:hover { color: #b1532a; border-color: #b1532a; }
    .smb-empty { margin: 0; color: var(--color-ink-soft); font-size: 0.85rem; font-style: italic; }
  `]
})
export class StoryManagerBarComponent {
  @Input() stories: Story[] = [];
  @Input() activeStoryId: string | null = null;
  @Input() editable = false;

  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() rename = new EventEmitter<{ id: string; title: string }>();
  @Output() delete = new EventEmitter<string>();
  @Output() move = new EventEmitter<{ id: string; dir: 'up' | 'down' }>();
  @Output() coverEdit = new EventEmitter<string>();
  @Output() slidesEdit = new EventEmitter<string>();
  @Output() viewerPreview = new EventEmitter<string>();

  protected active(): Story | null {
    return this.stories.find(s => s.id === this.activeStoryId) ?? this.stories[0] ?? null;
  }

  protected isFirst(): boolean {
    const a = this.active();
    return !a || this.stories.findIndex(s => s.id === a.id) <= 0;
  }

  protected isLast(): boolean {
    const a = this.active();
    if (!a) return true;
    return this.stories.findIndex(s => s.id === a.id) === this.stories.length - 1;
  }

  protected onRenameBlur(id: string, ev: Event): void {
    const title = (ev.target as HTMLElement).textContent?.trim() ?? '';
    if (title) this.rename.emit({ id, title });
  }
}
