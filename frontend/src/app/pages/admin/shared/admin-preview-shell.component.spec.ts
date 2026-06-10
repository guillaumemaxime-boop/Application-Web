import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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
      (save)="saveCount = saveCount + 1">
      <p class="form-marker">FORM</p>
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
  saveCount = 0;
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
    expect(tabs[1].attributes['aria-controls']).toBe('panel-preview');
    expect(tabs[1].attributes['aria-selected']).toBe('false');
  });

  it('masque la mode-bar quand active=false', () => {
    const fixture = create();
    fixture.componentInstance.active.set(false);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.admin-mode-bar'))).toBeNull();
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
    const toggle = fixture.debugElement.query(By.css('.btn-preview-toggle'));
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
});
