import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Story } from '../../../models/story.model';
import { SliderCompositionEditorComponent } from './slider-composition-editor.component';

@Component({
  standalone: true,
  imports: [SliderCompositionEditorComponent],
  template: `<app-slider-composition-editor
    [title]="title" [sliderId]="sliderId()" [storyIds]="storyIds()" [allStories]="allStories"
    [ownerTitles]="ownerTitles"
    (save)="saved = $event" (cancel)="cancelled = true" />`,
})
class HostComponent {
  title = 'Slider A';
  readonly sliderId = signal<string | null>('sl-1');
  readonly storyIds = signal<string[]>(['s1']);
  allStories: Story[] = [
    { id: 's1', title: 'Story 1', ownerKind: 'furniture', ownerId: 'f1' } as Story,
    { id: 's2', title: 'Story 2', ownerKind: 'exhibition', ownerId: 'e1' } as Story,
    { id: 's3', title: 'Story 3', ownerKind: 'furniture', ownerId: 'f2' } as Story,
  ];
  ownerTitles: Record<string, string> = {};
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
  function editor(): SliderCompositionEditorComponent {
    return fixture.debugElement.query(By.directive(SliderCompositionEditorComponent)).componentInstance;
  }
  // Construit un event CDK minimal pour onDrop. Quand from === to, les deux
  // conteneurs sont la MÊME référence (onDrop discrimine via `===`, pas via l'id).
  function dropEvent(opts: { from: string; to: string; movedId: string; previousIndex: number; currentIndex: number }): CdkDragDrop<string[]> {
    const prev = { id: opts.from };
    const cont = opts.from === opts.to ? prev : { id: opts.to };
    return {
      previousContainer: prev,
      container: cont,
      previousIndex: opts.previousIndex,
      currentIndex: opts.currentIndex,
      item: { data: opts.movedId },
    } as unknown as CdkDragDrop<string[]>;
  }

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

  it('filtre : taper dans la recherche restreint les stories disponibles', () => {
    const input = fixture.nativeElement.querySelector('input[aria-label="Filtrer les stories"]') as HTMLInputElement;
    input.value = 'Story 3';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(available().length).toBe(1);
    expect(available()[0].textContent).toContain('Story 3');
  });

  it('ajout clavier : le bouton « Ajouter » d’une story disponible la déplace dans la composition', () => {
    const addBtn = byText(available(), 'Story 2')!.querySelector('.story-add') as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();
    expect(pending().map(e => e.textContent).join()).toContain('Story 2');
    // disparaît des disponibles
    expect(byText(available(), 'Story 2')).toBeUndefined();
  });

  it('retrait : retire une story de la composition', () => {
    (pending()[0].querySelector('.comp-remove') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(pending().length).toBe(0);
  });

  it('drop available→composition : insère la story à l’index de drop', () => {
    editor().onDrop(dropEvent({ from: 'available', to: 'composition', movedId: 's2', previousIndex: 0, currentIndex: 0 }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s2', 's1']);
  });

  it('drop composition→available : retire la story', () => {
    editor().onDrop(dropEvent({ from: 'composition', to: 'available', movedId: 's1', previousIndex: 0, currentIndex: 0 }));
    fixture.detectChanges();
    expect(pending().length).toBe(0);
  });

  it('drop intra-composition : réordonne', () => {
    // compo = [s1, s2]
    (byText(available(), 'Story 2')!.querySelector('.story-add') as HTMLButtonElement).click();
    fixture.detectChanges();
    editor().onDrop(dropEvent({ from: 'composition', to: 'composition', movedId: 's2', previousIndex: 1, currentIndex: 0 }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s2', 's1']);
  });

  it('save émet la liste ordonnée courante', () => {
    (byText(available(), 'Story 2')!.querySelector('.story-add') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s1', 's2']);
  });

  it('cancel émet cancel', () => {
    (fixture.nativeElement.querySelector('.comp-cancel') as HTMLButtonElement).click();
    expect(host.cancelled).toBeTrue();
  });

  it('moveUp réordonne la composition (repli clavier)', () => {
    (byText(available(), 'Story 2')!.querySelector('.story-add') as HTMLButtonElement).click();
    fixture.detectChanges();
    (pending()[1].querySelector('.comp-up') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s2', 's1']);
  });

  it('moveDown réordonne la composition (repli clavier)', () => {
    (byText(available(), 'Story 2')!.querySelector('.story-add') as HTMLButtonElement).click();
    fixture.detectChanges();
    (pending()[0].querySelector('.comp-down') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.comp-save') as HTMLButtonElement).click();
    expect(host.saved).toEqual(['s2', 's1']);
  });

  it('storyTitle affiche l\'id quand la story est inconnue du catalogue', () => {
    host.sliderId.set('sl-2');
    host.storyIds.set(['fantome']);
    host.allStories = [];
    fixture.detectChanges();
    expect(pending()[0].textContent).toContain('fantome');
  });

  it('affiche une note informative sur les stories sans slide', () => {
    const hint = fixture.nativeElement.querySelector('.comp-hint');
    expect(hint).toBeTruthy();
    expect(hint.textContent).toContain('slide');
  });

  it('les boutons de réordonnancement ont un nom accessible (aria-label)', () => {
    const up = pending()[0].querySelector('.comp-up') as HTMLButtonElement;
    const down = pending()[0].querySelector('.comp-down') as HTMLButtonElement;
    expect(up.getAttribute('aria-label')).toContain('Monter');
    expect(down.getAttribute('aria-label')).toContain('Descendre');
  });

  it('expose une région aria-live pour annoncer les changements', () => {
    const live = fixture.nativeElement.querySelector('[aria-live]');
    expect(live).toBeTruthy();
  });

  it('ownerTitles : le libellé d\'une story disponible affiche le titre de l\'owner et non l\'id', () => {
    // s2 a ownerId:'e1' — on fournit un titre pour cet id
    host.ownerTitles = { 'e1': 'Exposition Lumière' };
    fixture.detectChanges();
    const s2El = available().find(e => e.textContent?.includes('Story 2'));
    expect(s2El).toBeTruthy();
    const small = s2El!.querySelector('small');
    expect(small?.textContent).toContain('Exposition Lumière');
    expect(small?.textContent).not.toContain('e1');
  });

  it('ownerTitles : fallback sur ownerId si aucun titre fourni pour cet id', () => {
    // s3 a ownerId:'f2' — pas de titre fourni
    host.ownerTitles = {};
    fixture.detectChanges();
    const s3El = available().find(e => e.textContent?.includes('Story 3'));
    expect(s3El).toBeTruthy();
    const small = s3El!.querySelector('small');
    expect(small?.textContent).toContain('f2');
  });

  it('ownerTitles : la composition courante affiche aussi le titre de l\'owner', () => {
    // s1 (dans la composition) a ownerId:'f1'
    host.ownerTitles = { 'f1': 'Tabouret Aurore' };
    fixture.detectChanges();
    const compItem = pending()[0];
    expect(compItem).toBeTruthy();
    const small = compItem.querySelector('small');
    expect(small?.textContent).toContain('Tabouret Aurore');
  });

  it('ne réinitialise PAS la composition quand storyIds change sans changement d\'id', () => {
    (byText(available(), 'Story 2')!.querySelector('.story-add') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(pending().length).toBe(2);
    host.storyIds.set(['s1']);
    fixture.detectChanges();
    expect(pending().length).toBe(2);
    expect(pending().map(e => e.textContent).join()).toContain('Story 2');
  });
});
