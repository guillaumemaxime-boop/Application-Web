import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagEditorComponent } from './tag-editor.component';

@Component({
  standalone: true,
  imports: [TagEditorComponent],
  template: `<app-tag-editor [tags]="tags()" [suggestions]="suggestions"
                             [disabled]="disabled()" (tagsChange)="onChange($event)" />`,
})
class HostComponent {
  readonly tags = signal<string[]>([]);
  readonly disabled = signal(false);
  suggestions = ['bois', 'sculpture', 'frene', 'boheme'];
  last: string[] | null = null;
  onChange(next: string[]) { this.last = next; this.tags.set(next); }
}

describe('TagEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function inputEl(): HTMLInputElement { return fixture.nativeElement.querySelector('input[type="text"]'); }
  function chips(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.chip')); }
  function suggestions(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.suggestion')); }
  function type(v: string) { const el = inputEl(); el.value = v; el.dispatchEvent(new Event('input')); fixture.detectChanges(); }
  function key(k: string) { inputEl().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); fixture.detectChanges(); }

  it('rend les chips depuis l\'input tags', () => {
    host.tags.set(['bois', 'sculpture']);
    fixture.detectChanges();
    expect(chips().length).toBe(2);
    expect(chips()[0].textContent).toContain('bois');
  });

  it('combobox : aria-expanded suit l\'ouverture du dropdown', () => {
    const el = inputEl();
    expect(el.getAttribute('role')).toBe('combobox');
    inputEl().dispatchEvent(new Event('focus'));
    type('bo');
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('Entrée sur saisie libre ajoute le tag (création libre)', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('inedit');
    key('Enter');
    expect(host.last).toEqual(['inedit']);
  });

  it('virgule ajoute le tag', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('vegetal');
    key(',');
    expect(host.last).toEqual(['vegetal']);
  });

  it('flèches + Entrée ajoutent la suggestion active', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');                 // bois, boheme (frene exclu, sculpture exclu)
    key('ArrowDown');          // active index 0
    key('Enter');
    expect(host.last && host.last.length).toBe(1);
    expect(['bois', 'boheme']).toContain(host.last![0]);
  });

  it('aria-activedescendant pointe l\'option active', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');
    key('ArrowDown');
    const ad = inputEl().getAttribute('aria-activedescendant');
    expect(ad).toBeTruthy();
    expect(suggestions().length).toBeGreaterThan(0);
  });

  it('Backspace sur champ vide retire le dernier tag', () => {
    host.tags.set(['bois', 'sculpture']);
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    key('Backspace');
    expect(host.last).toEqual(['bois']);
  });

  it('clic sur × retire le tag', () => {
    host.tags.set(['bois', 'sculpture']);
    fixture.detectChanges();
    const removeBtn = chips()[0].querySelector('.chip-remove') as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();
    expect(host.last).toEqual(['sculpture']);
  });

  it('filtre les suggestions sur la saisie et exclut les tags présents', () => {
    host.tags.set(['bois']);
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    type('b');
    const labels = suggestions().map(s => s.textContent?.trim());
    expect(labels).toContain('boheme');
    expect(labels).not.toContain('bois');     // déjà présent
    expect(labels).not.toContain('frene');    // ne matche pas "b"
  });

  it('n\'ajoute pas de doublon', () => {
    host.tags.set(['bois']);
    fixture.detectChanges();
    inputEl().dispatchEvent(new Event('focus'));
    type('bois');
    key('Enter');
    expect(host.last).toBeNull();   // aucun changement émis
  });

  it('tagsChange émet un tableau neuf (immutable)', () => {
    const before = host.tags();
    inputEl().dispatchEvent(new Event('focus'));
    type('neuf');
    key('Enter');
    expect(host.last).not.toBe(before);
  });

  it('disabled désactive le champ et les × ', () => {
    host.tags.set(['bois']);
    host.disabled.set(true);
    fixture.detectChanges();
    expect(inputEl().disabled).toBeTrue();
    expect((chips()[0].querySelector('.chip-remove') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('Échap ferme le dropdown', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');
    expect(inputEl().getAttribute('aria-expanded')).toBe('true');
    key('Escape');
    expect(inputEl().getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowUp ne descend pas sous l\'index 0', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');                 // bois, boheme
    key('ArrowDown');          // index 0
    key('ArrowUp');            // reste à 0 (pas -1)
    key('Enter');
    expect(host.last && host.last.length).toBe(1);
    expect(['bois', 'boheme']).toContain(host.last![0]);
  });

  it('ArrowDown est borné à la dernière suggestion', () => {
    inputEl().dispatchEvent(new Event('focus'));
    type('b');                 // 2 suggestions
    key('ArrowDown');
    key('ArrowDown');
    key('ArrowDown');          // dépasse → clampé sur la dernière
    key('Enter');
    expect(host.last).toEqual(['boheme']);
  });
});
