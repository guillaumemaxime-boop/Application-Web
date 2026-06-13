import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TagEditorComponent } from '../../../components/tag-editor/tag-editor.component';

/**
 * Champ de tags form-side : wrapper ControlValueAccessor autour du composant
 * présentation pur <app-tag-editor> (toute la logique combobox/a11y y vit).
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [TagEditorComponent],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
  template: `
    <app-tag-editor
      [tags]="tags()"
      [suggestions]="suggestions"
      [disabled]="disabled()"
      [placeholder]="placeholder"
      (tagsChange)="onEditorChange($event)" />
  `,
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() suggestions: string[] = [];
  @Input() placeholder = 'Ajouter un tag…';

  protected readonly tags = signal<string[]>([]);
  protected readonly disabled = signal(false);

  private onChangeFn: (value: string[]) => void = () => {};
  private onTouchedFn: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.tags.set(value ?? []);
  }
  registerOnChange(fn: (value: string[]) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  protected onEditorChange(next: string[]): void {
    this.tags.set(next);
    this.onChangeFn(next);
    this.onTouchedFn();
  }
}
