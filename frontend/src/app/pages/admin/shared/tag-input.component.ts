import { Component, Input, computed, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
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
             [value]="inputValue()"
             [disabled]="disabled()"
             [placeholder]="placeholder"
             (input)="onInput($event)"
             (keydown)="onKey($event)"
             (focus)="dropdownOpen.set(true)"
             (blur)="onBlur()"
             aria-label="Ajouter un tag" />
      @if (dropdownOpen() && filteredSuggestions().length > 0) {
        <ul class="dropdown" role="listbox">
          @for (s of filteredSuggestions(); track s) {
            <li>
              <button type="button" class="suggestion"
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
    .suggestion:hover { background: var(--color-bg-alt); }
  `]
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() suggestions: string[] = [];
  @Input() placeholder = 'Ajouter un tag…';

  protected tags = signal<string[]>([]);
  protected inputValue = signal<string>('');
  protected dropdownOpen = signal(false);
  protected disabled = signal(false);

  protected filteredSuggestions = computed(() => {
    const q = this.inputValue().trim().toLowerCase();
    const current = new Set(this.tags());
    return this.suggestions
      .filter(s => !current.has(s))
      .filter(s => !q || s.toLowerCase().includes(q));
  });

  private onChangeFn: (value: string[]) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.tags.set(value ?? []);
  }
  registerOnChange(fn: (value: string[]) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  protected onInput(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
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
    this.onTouchedFn();
  }

  protected addTag(tag: string): void {
    const v = tag.trim();
    if (!v) return;
    if (this.tags().includes(v)) return;
    const next = [...this.tags(), v];
    this.tags.set(next);
    this.inputValue.set('');
    this.onChangeFn(next);
  }

  protected removeTag(tag: string): void {
    const next = this.tags().filter(t => t !== tag);
    this.tags.set(next);
    this.onChangeFn(next);
  }
}
