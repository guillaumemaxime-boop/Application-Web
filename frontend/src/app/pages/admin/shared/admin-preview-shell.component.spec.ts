import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { AdminPreviewShellComponent, ShellPreviewDirective } from './admin-preview-shell.component';

@Component({
  standalone: true,
  imports: [AdminPreviewShellComponent, ShellPreviewDirective],
  template: `
    <app-admin-preview-shell
      [active]="active()"
      [(viewMode)]="viewMode"
      modeBarAriaLabel="Mode d'édition de test"
      formTabLabel="✏ Modifier le test"
      previewDialogLabel="Aperçu du test"
      [showSave]="showSave()"
      [saveDisabled]="saveDisabled()"
      [saving]="saving()"
      [hidePreviewOnMobile]="hidePreviewMobile()"
      [formModalOpen]="formModalOpen()"
      [historyEnabled]="historyEnabled()"
      [canUndo]="canUndo()"
      [canRedo]="canRedo()"
      (save)="saveCount = saveCount + 1"
      (fullscreenChange)="lastFullscreen = $event"
      (undoRequested)="undoCount = undoCount + 1"
      (redoRequested)="redoCount = redoCount + 1">
      <p class="form-marker">FORM</p>
      <input class="form-input" />
      <textarea class="form-textarea"></textarea>
      <div class="form-ce" contenteditable="true"><span class="ce-child" tabindex="0">x</span></div>
      <ng-template shellPreview><p class="preview-marker">PREVIEW</p></ng-template>
    </app-admin-preview-shell>
  `,
})
class HostComponent {
  readonly active = signal(true);
  readonly viewMode = signal<'form' | 'preview'>('form');
  readonly showSave = signal(true);
  readonly saveDisabled = signal(false);
  readonly saving = signal(false);
  readonly hidePreviewMobile = signal(false);
  readonly formModalOpen = signal(false);
  readonly historyEnabled = signal(true);
  readonly canUndo = signal(true);
  readonly canRedo = signal(true);
  saveCount = 0;
  lastFullscreen: boolean | null = null;
  undoCount = 0;
  redoCount = 0;
}

describe('AdminPreviewShellComponent', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('rend la tablist avec 2 onglets et les attributs ARIA', () => {
    const fixture = create();
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]'));
    expect(tablist).toBeTruthy();
    expect(tablist.attributes['aria-label']).toBe("Mode d'édition de test");
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(tabs.length).toBe(2);
    expect(tabs[0].attributes['id']).toBe('tab-form');
    expect(tabs[0].attributes['aria-controls']).toBe('panel-form');
    expect(tabs[0].attributes['aria-selected']).toBe('true');
    expect(tabs[0].nativeElement.textContent).toContain('Modifier le test');
    expect(tabs[1].attributes['id']).toBe('tab-preview');
    // aria-controls sur tab-preview est conditionnel : absent en mode form (voir test dédié)
    expect(tabs[1].nativeElement.hasAttribute('aria-controls')).toBeFalse();
    expect(tabs[1].attributes['aria-selected']).toBe('false');
  });

  it('masque la mode-bar quand active=false (et retire role/aria-labelledby du panel orphelin)', () => {
    const fixture = create();
    fixture.componentInstance.active.set(false);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.admin-mode-bar'))).toBeNull();
    // Sans tablist rendue, le panel ne doit pas rester un tabpanel orphelin
    // référençant un id absent (finding audit RGAA).
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.nativeElement.hasAttribute('role')).toBeFalse();
    expect(panel.nativeElement.hasAttribute('aria-labelledby')).toBeFalse();
  });

  it('projette le contenu form dans le panel tabpanel, visible en mode form', () => {
    const fixture = create();
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.attributes['role']).toBe('tabpanel');
    expect(panel.nativeElement.querySelector('.form-marker')).toBeTruthy();
    expect(panel.nativeElement.classList.contains('is-hidden')).toBeFalse();
    expect(panel.nativeElement.hasAttribute('inert')).toBeFalse();
    expect(fixture.debugElement.query(By.css('.preview-marker'))).toBeNull();
  });

  it('mode preview : panel form is-hidden + inert, template preview instancié', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.nativeElement.classList.contains('is-hidden')).toBeTrue();
    expect(panel.nativeElement.hasAttribute('inert')).toBeTrue();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside).toBeTruthy();
    expect(aside.attributes['role']).toBe('tabpanel');
    expect(aside.nativeElement.querySelector('.preview-marker')).toBeTruthy();
  });

  it('pas de panel preview quand active=false meme en mode preview', () => {
    const fixture = create();
    fixture.componentInstance.active.set(false);
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('#panel-preview'))).toBeNull();
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.nativeElement.classList.contains('is-hidden')).toBeFalse();
    expect(panel.nativeElement.hasAttribute('inert')).toBeFalse();
  });

  it('clic sur l\'onglet Aperçu bascule viewMode (two-way vers le host)', () => {
    const fixture = create();
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    tabs[1].nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('preview');
    tabs[0].nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('form');
  });

  it('plein écran : role=dialog + aria-modal + aria-label + classe fullscreen, puis retour', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const toggle = fixture.debugElement.query(By.css('.btn-preview-fullscreen'));
    toggle.nativeElement.click();
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeTrue();
    expect(aside.attributes['role']).toBe('dialog');
    expect(aside.attributes['aria-modal']).toBe('true');
    expect(aside.attributes['aria-label']).toBe('Aperçu du test');
    expect(aside.attributes['aria-labelledby']).toBeFalsy();
    toggle.nativeElement.click();
    fixture.detectChanges();
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeFalse();
    expect(aside.attributes['role']).toBe('tabpanel');
    expect(aside.attributes['aria-labelledby']).toBe('tab-preview');
  });

  it('bouton save : émet save, disabled si saveDisabled, label Enregistrement… si saving', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const save = fixture.debugElement.query(By.css('.btn-preview-save'));
    expect(save).toBeTruthy();
    save.nativeElement.click();
    expect(fixture.componentInstance.saveCount).toBe(1);
    fixture.componentInstance.saveDisabled.set(true);
    fixture.detectChanges();
    expect(save.nativeElement.disabled).toBeTrue();
    fixture.componentInstance.saveDisabled.set(false);
    fixture.componentInstance.saving.set(true);
    fixture.detectChanges();
    expect(save.nativeElement.disabled).toBeTrue();
    expect(save.nativeElement.textContent).toContain('Enregistrement');
  });

  it('pas de bouton save quand showSave=false', () => {
    const fixture = create();
    fixture.componentInstance.showSave.set(false);
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.btn-preview-save'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-preview-toggle'))).toBeTruthy();
  });

  it('pose la classe hide-preview-mobile sur l\'hôte quand hidePreviewOnMobile=true', () => {
    const fixture = create();
    const shellHost = fixture.debugElement.query(By.css('app-admin-preview-shell'));
    expect(shellHost.nativeElement.classList.contains('hide-preview-mobile')).toBeFalse();
    fixture.componentInstance.hidePreviewMobile.set(true);
    fixture.detectChanges();
    expect(shellHost.nativeElement.classList.contains('hide-preview-mobile')).toBeTrue();
  });

  it('formModalOpen=true suspend inert sur le panel form (is-hidden conservé)', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.css('#panel-form'));
    expect(panel.nativeElement.hasAttribute('inert')).toBeTrue();

    fixture.componentInstance.formModalOpen.set(true);
    fixture.detectChanges();
    expect(panel.nativeElement.hasAttribute('inert')).toBeFalse();
    expect(panel.nativeElement.classList.contains('is-hidden')).toBeTrue();

    fixture.componentInstance.formModalOpen.set(false);
    fixture.detectChanges();
    expect(panel.nativeElement.hasAttribute('inert')).toBeTrue();
  });

  it('roving tabindex : l\'onglet actif est tabbable, l\'autre non', () => {
    const fixture = create();
    const tabs = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(tabs[0].attributes['tabindex']).toBe('0');
    expect(tabs[1].attributes['tabindex']).toBe('-1');
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(tabs[0].attributes['tabindex']).toBe('-1');
    expect(tabs[1].attributes['tabindex']).toBe('0');
  });

  it('flèches sur la tablist : activation automatique + focus suit', () => {
    const fixture = create();
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]'));
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('preview');
    expect(document.activeElement?.id).toBe('tab-preview');
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('form');
    expect(document.activeElement?.id).toBe('tab-form');
  });

  it('Home/End sur la tablist sélectionnent form/preview', () => {
    const fixture = create();
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]'));
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('preview');
    tablist.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.viewMode()).toBe('form');
  });

  it('Ctrl+S émet save et bloque le navigateur quand showSave', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(1);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+S avec saveDisabled : preventDefault mais pas d\'émission', () => {
    const fixture = create();
    fixture.componentInstance.saveDisabled.set(true);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(0);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+S sans showSave : non capturé', () => {
    const fixture = create();
    fixture.componentInstance.showSave.set(false);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+S est neutralisé (preventDefault sans émission) quand une modale form-side est ouverte', () => {
    const fixture = create();
    fixture.componentInstance.formModalOpen.set(true);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.saveCount).toBe(0);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Échap réduit le plein écran, émet fullscreenChange et rend le focus au bouton ⤢', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const toggle = fixture.debugElement.query(By.css('.btn-preview-fullscreen'));
    toggle.nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.lastFullscreen).toBeTrue();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeFalse();
    expect(fixture.componentInstance.lastFullscreen).toBeFalse();
    // NB : cdkTrapFocus ne restitue le focus qu'au destroy, pas à la désactivation —
    // c'est bien notre querySelector().focus() qui est testé ici.
    expect(document.activeElement).toBe(toggle.nativeElement);
  });

  it('Échap est inactif quand une modale form-side est ouverte', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.btn-preview-fullscreen')).nativeElement.click();
    fixture.componentInstance.formModalOpen.set(true);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeTrue();
  });

  it('aria-controls du tab Aperçu n\'existe que quand le panel preview est rendu', () => {
    const fixture = create();
    const tabPreview = fixture.debugElement.queryAll(By.css('[role="tab"]'))[1];
    expect(tabPreview.nativeElement.hasAttribute('aria-controls')).toBeFalse();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(tabPreview.attributes['aria-controls']).toBe('panel-preview');
  });

  it('la mode-bar devient inert en plein écran', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const modeBar = fixture.debugElement.query(By.css('.admin-mode-bar'));
    expect(modeBar.nativeElement.hasAttribute('inert')).toBeFalse();
    fixture.debugElement.query(By.css('.btn-preview-fullscreen')).nativeElement.click();
    fixture.detectChanges();
    expect(modeBar.nativeElement.hasAttribute('inert')).toBeTrue();
  });

  it('quitter le mode preview pendant le plein écran réinitialise fullscreen (mode-bar réactivée)', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    fixture.debugElement.query(By.css('.btn-preview-fullscreen')).nativeElement.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.lastFullscreen).toBeTrue();
    // La page rebascule en mode form (ex. cartouche [i] des sliders accueil)
    fixture.componentInstance.viewMode.set('form');
    fixture.detectChanges();
    expect(fixture.componentInstance.lastFullscreen).toBeFalse();
    const modeBar = fixture.debugElement.query(By.css('.admin-mode-bar'));
    expect(modeBar.nativeElement.hasAttribute('inert')).toBeFalse();
    // Retour en preview : pas de fullscreen fantôme
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('#panel-preview'));
    expect(aside.nativeElement.classList.contains('fullscreen')).toBeFalse();
  });

  it('annonce SR le changement de mode et le plein écran', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const announcer = TestBed.inject(LiveAnnouncer);
    const announceSpy = spyOn(announcer, 'announce');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled(); // pas d'annonce à l'init
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(announceSpy).toHaveBeenCalledWith('Mode aperçu');
    fixture.debugElement.query(By.css('.btn-preview-fullscreen')).nativeElement.click();
    fixture.detectChanges();
    expect(announceSpy).toHaveBeenCalledWith('Aperçu plein écran');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(announceSpy).toHaveBeenCalledWith('Aperçu réduit');
  });

  it('boutons undo/redo absents quand historyEnabled=false', () => {
    const fixture = create();
    fixture.componentInstance.historyEnabled.set(false);
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.btn-preview-undo'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.btn-preview-redo'))).toBeNull();
  });

  it('boutons undo/redo : disabled selon canUndo/canRedo, clic émet', () => {
    const fixture = create();
    fixture.componentInstance.viewMode.set('preview');
    fixture.detectChanges();
    const undoBtn = fixture.debugElement.query(By.css('.btn-preview-undo'));
    const redoBtn = fixture.debugElement.query(By.css('.btn-preview-redo'));
    expect(undoBtn.nativeElement.disabled).toBeFalse();
    undoBtn.nativeElement.click();
    redoBtn.nativeElement.click();
    expect(fixture.componentInstance.undoCount).toBe(1);
    expect(fixture.componentInstance.redoCount).toBe(1);
    fixture.componentInstance.canUndo.set(false);
    fixture.componentInstance.canRedo.set(false);
    fixture.detectChanges();
    expect(undoBtn.nativeElement.disabled).toBeTrue();
    expect(redoBtn.nativeElement.disabled).toBeTrue();
  });

  it('Ctrl+Z hors champ de saisie émet undoRequested et preventDefault', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(1);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+Z avec focus dans un input : non intercepté (undo natif)', () => {
    const fixture = create();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.form-input');
    input.focus();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+Z avec focus dans un textarea : non intercepté (undo natif)', () => {
    const fixture = create();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('.form-textarea');
    textarea.focus();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+Z dans un enfant de [contenteditable] : non intercepté (héritage isContentEditable)', () => {
    const fixture = create();
    (fixture.nativeElement.querySelector('.ce-child') as HTMLElement).focus();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+Shift+Z émet redoRequested', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.redoCount).toBe(1);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+Y émet redoRequested', () => {
    const fixture = create();
    const ev = new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.redoCount).toBe(1);
    expect(ev.defaultPrevented).toBeTrue();
  });

  it('Ctrl+Z non intercepté quand une modale form-side est ouverte', () => {
    const fixture = create();
    fixture.componentInstance.formModalOpen.set(true);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });

  it('Ctrl+Z non intercepté quand historyEnabled=false', () => {
    const fixture = create();
    fixture.componentInstance.historyEnabled.set(false);
    fixture.detectChanges();
    const ev = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true });
    document.dispatchEvent(ev);
    expect(fixture.componentInstance.undoCount).toBe(0);
    expect(ev.defaultPrevented).toBeFalse();
  });
});
