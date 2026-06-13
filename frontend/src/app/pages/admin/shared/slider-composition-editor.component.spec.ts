import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Story } from '../../../models/story.model';
import { SliderCompositionEditorComponent } from './slider-composition-editor.component';

@Component({
  standalone: true,
  imports: [SliderCompositionEditorComponent],
  template: `<app-slider-composition-editor
    [title]="title" [storyIds]="storyIds()" [allStories]="allStories"
    (save)="saved = $event" (cancel)="cancelled = true" />`,
})
class HostComponent {
  title = 'Slider A';
  readonly storyIds = signal<string[]>(['s1']);
  allStories: Story[] = [
    { id: 's1', title: 'Story 1', ownerKind: 'furniture', ownerId: 'f1' } as Story,
    { id: 's2', title: 'Story 2', ownerKind: 'exhibition', ownerId: 'e1' } as Story,
    { id: 's3', title: 'Story 3', ownerKind: 'furniture', ownerId: 'f2' } as Story,
  ];
  saved: string[] | null = null;
  cancelled = false;
}

describe('SliderCompositionEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function available(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.story-option')); }
  function pending(): HTMLElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.comp-item')); }
  function byText(els: HTMLElement[], txt: string): HTMLElement | undefined { return els.find(e => e.textContent?.includes(txt)); }

  it('liste les stories disponibles en excluant celles déjà dans la composition', () => {
    const labels = available().map(e => e.textContent ?? '');
    expect(labels.some(l => l.includes('Story 2'))).toBeTrue();
    expect(labels.some(l => l.includes('Story 3'))).toBeTrue();
    expect(labels.some(l => l.includes('Story 1'))).toBeFalse();
  });

  it('compose : la story courante est affichée', () => {
    expect(pending().length).toBe(1);
    expect(pending()[0].textContent).toContain('Story 1');
  });

  it('ajout : sélectionner puis Ajouter déplace la story vers la composition', () => {
    const opt2 = byText(available(), 'Story 2')!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    opt2.click();
    (fixture.nativeElement.querySelector('.add-selected') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(pending().map(e => e.textContent).join()).toContain('Story 2');
  });

  it('retrait : retire une story de la composition', () => {
    const removeBtn = pending()[0].querySelector('.comp-remove') as HTMLButtonElement;
    removeBtn.click();
    fixture.detectChanges();
    expect(pending().length).toBe(0);
  });

  it('save émet la liste ordonnée courante', () => {
    const opt2 = byText(available(), 'Story 2')!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    opt2.click();
    (fixture.nativeElement.querySelector('.add-selected') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s1', 's2']);
  });

  it('cancel émet cancel', () => {
    (fixture.nativeElement.querySelector('.comp-cancel') as HTMLButtonElement).click();
    expect(host.cancelled).toBeTrue();
  });

  it('moveUp réordonne la composition', () => {
    const opt2 = byText(available(), 'Story 2')!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    opt2.click();
    (fixture.nativeElement.querySelector('.add-selected') as HTMLButtonElement).click();
    fixture.detectChanges();
    const up = pending()[1].querySelector('.comp-up') as HTMLButtonElement;
    up.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s2', 's1']);
  });
});
