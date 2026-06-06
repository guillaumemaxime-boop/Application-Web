import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Component } from '@angular/core';
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
    expect(host.ctrl.value?.length).toBe(1);
  });
});
