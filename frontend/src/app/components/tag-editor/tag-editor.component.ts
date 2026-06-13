import { Component, computed, input, output, signal } from '@angular/core';

let _counter = 0;

/**
 * Éditeur de tags présentation pur (combobox a11y : listbox, flèches,
 * Enter/virgule, Backspace, chips supprimables, autocomplétion). Aucune
 * dépendance Router/HttpClient/forms — partagé public+admin (ADR-0018).
 * Piloté par `tags`/`suggestions` en entrée, émet `tagsChange` (tableau neuf)
 * à chaque ajout/retrait. Consommé par <app-tag-input> (wrapper CVA form-side)
 * et par les vues détail en mode editable (preview WYSIWYG).
 */
@Component({
  selector: 'app-tag-editor',
  standalone: true,
  imports: [],
  template: `
    <div class="tag-input" [class.disabled]="disabled()">
      @for (tag of tags(); track tag) {
        <span class="chip">
          <span class="chip-label">{{ tag }}</span>
          <button type="button" class="chip-remove" aria-label="Retirer ce tag"
                  [disabled]="disabled()" (click)="removeTag(tag)">×</button>
        </span>
      }
      <input type="text"
             #comboInput
             role="combobox"
             [attr.aria-controls]="listboxId"
             [attr.aria-expanded]="dropdownOpen() && filteredSuggestions().length > 0"
             aria-haspopup="listbox"
             [attr.aria-activedescendant]="activeOptionId()"
             [value]="inputValue()"
             [disabled]="disabled()"
             [placeholder]="placeholder()"
             (input)="onInput($event)"
             (keydown)="onKey($event)"
             (focus)="dropdownOpen.set(true)"
             (blur)="onBlur()"
             [attr.aria-label]="ariaLabel()" />
      @if (dropdownOpen() && filteredSuggestions().length > 0) {
        <ul class="dropdown" [id]="listboxId" role="listbox">
          @for (s of filteredSuggestions(); track s; let i = $index) {
            <li role="option"
                [id]="listboxId + '-opt-' + i"
                [attr.aria-selected]="activeIndex() === i">
              <button type="button" class="suggestion"
                      [class.active]="activeIndex() === i"
                      tabindex="-1"
                      (mousedown)="$event.preventDefault()"
                      (click)="addTag(s)">{{ s }}</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .tag-input {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 6px 8px; border: 1px solid var(--color-line); background: var(--color-bg);
      position: relative;
    }
    .tag-input.disabled { opacity: 0.5; pointer-events: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line);
      font-size: 0.82rem;
    }
    .chip-remove {
      background: none; border: 0; cursor: pointer; font-size: 1.1rem; line-height: 1;
      color: var(--color-ink-soft); padding: 0 0 0 2px;
    }
    .chip-remove:hover { color: var(--color-ink); }
    input {
      flex: 1; min-width: 120px; border: 0; outline: none; padding: 4px 0;
      font: inherit; background: transparent; color: var(--color-ink);
    }
    .dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
      max-height: 200px; overflow-y: auto; margin: 4px 0 0; padding: 0;
      list-style: none; background: var(--color-bg); border: 1px solid var(--color-line);
    }
    .dropdown li { display: block; }
    .suggestion {
      width: 100%; text-align: left; padding: 8px 12px; cursor: pointer;
      background: transparent; border: 0; font: inherit; color: var(--color-ink);
    }
    .suggestion:hover, .suggestion.active { background: var(--color-bg-alt); }
  `]
})
export class TagEditorComponent {
  readonly tags = input<string[]>([]);
  readonly suggestions = input<string[]>([]);
  readonly disabled = input(false);
  readonly placeholder = input('Ajouter un tag…');
  readonly ariaLabel = input('Ajouter un tag');
  readonly tagsChange = output<string[]>();

  readonly listboxId = 'tag-editor-listbox-' + (++_counter);

  protected readonly inputValue = signal<string>('');
  protected readonly dropdownOpen = signal(false);
  protected readonly activeIndex = signal<number>(-1);

  protected readonly filteredSuggestions = computed(() => {
    const q = this.inputValue().trim().toLowerCase();
    const current = new Set(this.tags());
    return this.suggestions()
      .filter(s => !current.has(s))
      .filter(s => !q || s.toLowerCase().includes(q));
  });

  protected readonly activeOptionId = computed(() => {
    const i = this.activeIndex();
    if (i < 0 || i >= this.filteredSuggestions().length) return null;
    return `${this.listboxId}-opt-${i}`;
  });

  protected onInput(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
    this.activeIndex.set(-1);
  }

  protected onKey(event: KeyboardEvent): void {
    const suggestions = this.filteredSuggestions();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.dropdownOpen.set(true);
      const next = this.activeIndex() + 1;
      this.activeIndex.set(next >= suggestions.length ? suggestions.length - 1 : next);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = this.activeIndex() - 1;
      this.activeIndex.set(prev < 0 ? 0 : prev);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.dropdownOpen.set(false);
      this.activeIndex.set(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeIndex();
      if (idx >= 0 && idx < suggestions.length) {
        this.addTag(suggestions[idx]);
      } else {
        const v = this.inputValue().trim();
        if (v) this.addTag(v);
      }
      return;
    }

    if (event.key === ',') {
      event.preventDefault();
      const v = this.inputValue().trim();
      if (v) this.addTag(v);
      return;
    }

    if (event.key === 'Backspace' && this.inputValue() === '' && this.tags().length > 0) {
      event.preventDefault();
      this.removeTag(this.tags()[this.tags().length - 1]);
    }
  }

  protected onBlur(): void {
    setTimeout(() => this.dropdownOpen.set(false), 150);
  }

  protected addTag(tag: string): void {
    const v = tag.trim();
    if (!v) return;
    if (this.tags().includes(v)) return;
    this.inputValue.set('');
    this.activeIndex.set(-1);
    this.tagsChange.emit([...this.tags(), v]);
  }

  protected removeTag(tag: string): void {
    this.tagsChange.emit(this.tags().filter(t => t !== tag));
  }
}
