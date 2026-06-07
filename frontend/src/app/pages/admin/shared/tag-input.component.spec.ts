import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TagInputComponent } from './tag-input.component';

@Component({
  standalone: true,
  imports: [TagInputComponent, ReactiveFormsModule],
  template: `<app-tag-input [formControl]="ctrl" [suggestions]="suggestions" />`,
})
class HostComponent {
  ctrl = new FormControl<string[]>([]);
  suggestions = ['bois', 'sculpture', 'frene', 'boheme'];
}

describe('TagInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="text"]');
  }
  function chips(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.chip'));
  }

  it('rend les chips depuis FormControl', () => {
    host.ctrl.setValue(['bois', 'sculpture']);
    fixture.detectChanges();
    expect(chips().length).toBe(2);
    expect(chips()[0].textContent).toContain('bois');
  });

  it('Enter sur input ajoute un tag', () => {
    input().value = 'nouveau';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['nouveau']);
  });

  it('virgule sur input ajoute un tag', () => {
    input().value = 'nouveau';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['nouveau']);
  });

  it('ne duplique pas un tag deja present', () => {
    host.ctrl.setValue(['bois']);
    fixture.detectChanges();
    input().value = 'bois';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['bois']);
  });

  it('ignore un input vide ou whitespace', () => {
    input().value = '   ';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual([]);
  });

  it('Backspace sur input vide supprime le dernier chip', () => {
    host.ctrl.setValue(['a', 'b', 'c']);
    fixture.detectChanges();
    input().value = '';
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['a', 'b']);
  });

  it('Backspace sur input non vide ne supprime aucun chip', () => {
    host.ctrl.setValue(['a', 'b']);
    fixture.detectChanges();
    input().value = 'x';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['a', 'b']);
  });

  it('bouton suppression sur chip retire le tag', () => {
    host.ctrl.setValue(['a', 'b', 'c']);
    fixture.detectChanges();
    (chips()[1].querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['a', 'c']);
  });

  it('autocomplete filtre par valeur tapee', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const items = Array.from(fixture.nativeElement.querySelectorAll('.suggestion'));
    const labels = items.map((i: any) => i.textContent.trim());
    expect(labels).toContain('bois');
    expect(labels).toContain('boheme');
    expect(labels).not.toContain('sculpture');
  });

  it('autocomplete exclut tags deja selectionnes', () => {
    host.ctrl.setValue(['bois']);
    fixture.detectChanges();
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const items = Array.from(fixture.nativeElement.querySelectorAll('.suggestion'));
    const labels = items.map((i: any) => i.textContent.trim());
    expect(labels).not.toContain('bois');
    expect(labels).toContain('boheme');
  });

  it('clic sur suggestion ajoute le tag', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const suggestion = fixture.nativeElement.querySelector('.suggestion') as HTMLButtonElement;
    suggestion.click();
    fixture.detectChanges();
    expect(host.ctrl.value).toEqual(['bois']);
  });

  it('input a role combobox + aria-controls + aria-expanded + aria-haspopup="listbox"', () => {
    const el = input();
    expect(el.getAttribute('role')).toBe('combobox');
    expect(el.getAttribute('aria-haspopup')).toBe('listbox');
    expect(el.hasAttribute('aria-controls')).toBeTrue();
    expect(el.hasAttribute('aria-expanded')).toBeTrue();
  });

  it('ArrowDown active la premiere suggestion', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    const items = Array.from(fixture.nativeElement.querySelectorAll('li[role="option"]')) as HTMLElement[];
    expect(items[0].getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowDown puis Enter ajoute la suggestion active', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(host.ctrl.value).toContain('bois');
  });

  it('Escape ferme le dropdown sans ajouter de tag', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dropdown')).not.toBeNull();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dropdown')).toBeNull();
    expect(host.ctrl.value).toEqual([]);
  });

  it('aria-activedescendant pointe sur l\'id de l\'option active', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    const activeDescendant = input().getAttribute('aria-activedescendant');
    expect(activeDescendant).not.toBeNull();
    const activeOption = fixture.nativeElement.querySelector(`#${activeDescendant}`);
    expect(activeOption).not.toBeNull();
  });

  it('ArrowUp sur la première option reste à l\'index 0', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // Descend à l'index 0
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    // Tente de remonter alors qu'on est déjà à 0
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    const items = Array.from(fixture.nativeElement.querySelectorAll('li[role="option"]')) as HTMLElement[];
    // Le premier item doit toujours être selected (index 0 clampé)
    expect(items[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowDown en bout de liste reste sur le dernier index', () => {
    input().value = 'bo';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // 'bo' filtre bois + boheme → 2 items (indices 0, 1)
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // Troisième ArrowDown : déjà au dernier, reste en place
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    const items = Array.from(fixture.nativeElement.querySelectorAll('li[role="option"]')) as HTMLElement[];
    expect(items[items.length - 1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('activeOptionId est null quand aucune suggestion n\'est visible (index hors bornes)', () => {
    // Aucune suggestion correspondante → filteredSuggestions().length === 0, activeIndex = -1 → null
    input().value = 'XXXXXXXXX';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    // aria-activedescendant doit être absent ou vide
    const val = input().getAttribute('aria-activedescendant');
    expect(val === null || val === '').toBeTrue();
  });

  it('writeValue(null) initialise les tags à un tableau vide', () => {
    const tagInput = fixture.debugElement.query(By.directive(TagInputComponent))?.componentInstance as TagInputComponent;
    (tagInput as any).writeValue(null);
    fixture.detectChanges();
    expect((tagInput as any).tags()).toEqual([]);
  });
});
