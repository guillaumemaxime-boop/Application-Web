import { Component, Directive, TemplateRef, contentChild, inject, input, model, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';

/** Marqueur du template preview projeté dans le shell. */
@Directive({ selector: 'ng-template[shellPreview]', standalone: true })
export class ShellPreviewDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Squelette partagé des pages admin à preview WYSIWYG (mobilier,
 * expositions, accueil) : mode-bar tablist Modifier/Aperçu, panneau form
 * maintenu hors-écran en mode preview (préserve ViewChild et modales),
 * panneau preview détruit/recréé au toggle, toolbar 💾/⤢, plein écran
 * avec trap focus. Voir spec 2026-06-10-wysiwyg-socle-factorise-design.md.
 */
@Component({
  selector: 'app-admin-preview-shell',
  standalone: true,
  imports: [A11yModule, NgTemplateOutlet],
  host: { '[class.hide-preview-mobile]': 'hidePreviewOnMobile()' },
  template: `
    <div class="admin-split">
      @if (active()) {
        <div class="admin-mode-bar" role="tablist" [attr.aria-label]="modeBarAriaLabel()">
          <button type="button" role="tab" id="tab-form" class="admin-mode-tab"
                  aria-controls="panel-form"
                  [class.active]="viewMode() === 'form'"
                  [attr.aria-selected]="viewMode() === 'form'"
                  (click)="viewMode.set('form')">
            {{ formTabLabel() }}
          </button>
          <button type="button" role="tab" id="tab-preview" class="admin-mode-tab"
                  aria-controls="panel-preview"
                  [class.active]="viewMode() === 'preview'"
                  [attr.aria-selected]="viewMode() === 'preview'"
                  (click)="viewMode.set('preview')">
            👁 Aperçu
          </button>
        </div>
      }

      <section class="admin-form" id="panel-form"
               [attr.role]="active() ? 'tabpanel' : null"
               [attr.aria-labelledby]="active() ? 'tab-form' : null"
               [class.is-hidden]="active() && viewMode() !== 'form'"
               [attr.inert]="active() && viewMode() !== 'form' && !formModalOpen() ? '' : null">
        <ng-content />
      </section>

      @if (viewMode() === 'preview' && active()) {
        <aside class="admin-preview" id="panel-preview"
               [class.fullscreen]="previewFullscreen()"
               [attr.role]="previewFullscreen() ? 'dialog' : 'tabpanel'"
               [attr.aria-labelledby]="previewFullscreen() ? null : 'tab-preview'"
               [attr.aria-label]="previewFullscreen() ? previewDialogLabel() : null"
               [attr.aria-modal]="previewFullscreen() ? 'true' : null"
               [cdkTrapFocus]="previewFullscreen()"
               [cdkTrapFocusAutoCapture]="previewFullscreen()">
          <div class="admin-preview-toolbar">
            <span class="admin-preview-label">Aperçu</span>
            <div class="admin-preview-actions">
              @if (showSave()) {
                <button type="button" class="btn-preview-save"
                        [disabled]="saveDisabled() || saving()"
                        (click)="save.emit()">
                  @if (saving()) { Enregistrement… } @else { 💾 Enregistrer }
                </button>
              }
              <button type="button" class="btn-preview-toggle"
                      (click)="togglePreviewFullscreen()"
                      [attr.aria-label]="previewFullscreenLabel()">
                @if (previewFullscreen()) { ⤡ Réduire } @else { ⤢ Plein écran }
              </button>
            </div>
          </div>
          @if (previewTpl(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl.templateRef" />
          }
        </aside>
      }
    </div>
  `,
  styles: [`
    .admin-split { display: flex; flex-direction: column; gap: 16px; max-width: 100%; }
    .admin-mode-bar { display: inline-flex; gap: 4px; padding: 4px; background: var(--color-bg-alt); border: 1px solid var(--color-line); align-self: flex-start; }
    .admin-mode-tab { padding: 8px 16px; background: transparent; border: 0; color: var(--color-ink-soft); font-family: inherit; font-size: 0.85rem; cursor: pointer; transition: background 180ms ease, color 180ms ease; }
    .admin-mode-tab:hover { color: var(--color-ink); }
    .admin-mode-tab.active { background: var(--color-ink); color: var(--color-bg); font-weight: 600; }
    .admin-form { max-width: 100%; }
    /* En mode preview : form rendue mais positionnee hors viewport. Pas de display:none
       (qui retirerait les modales descendantes) ni de visibility:hidden (qui se propage
       en heritage CSS aux modales position:fixed et bloque par view encapsulation
       Angular sur les composants enfants). Les pickers position:fixed s'affichent
       toujours au viewport grace a leur z-index. */
    .admin-form.is-hidden { position: absolute; left: -100vw; top: 0; width: 0; height: 0; overflow: hidden; pointer-events: none; }
    .admin-preview { max-height: calc(100vh - 100px); overflow-y: auto; background: var(--color-bg-alt); border: 1px solid var(--color-line); padding: 24px; }
    .admin-preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -8px -8px 16px; padding: 0 4px; }
    .admin-preview-label { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-mute); }
    .admin-preview-actions { display: inline-flex; gap: 8px; align-items: center; }
    .btn-preview-save { padding: 6px 14px; background: var(--color-ink); color: var(--color-bg); border: 1px solid var(--color-ink); font-size: 0.78rem; cursor: pointer; font-family: inherit; font-weight: 600; }
    .btn-preview-save:hover:not(:disabled) { background: var(--color-bg); color: var(--color-ink); }
    .btn-preview-save:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-preview-toggle { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line); color: var(--color-ink-soft); font-size: 0.78rem; cursor: pointer; font-family: inherit; }
    .btn-preview-toggle:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .admin-preview.fullscreen { position: fixed; inset: 0; max-height: none; z-index: 1200; border: 0; padding: 24px 32px; }
    .admin-preview.fullscreen .admin-preview-toolbar { margin-top: 0; }
    @media (max-width: 1280px) {
      .admin-preview { position: static; max-height: 60vh; }
    }
    @media (max-width: 768px) {
      .admin-mode-tab { font-size: 0.78rem; }
      .admin-preview { max-height: 60vh; }
      :host(.hide-preview-mobile) .admin-preview { display: none; }
    }
  `]
})
export class AdminPreviewShellComponent {
  /** Item en cours d'édition : affiche la mode-bar et autorise le panel preview. */
  readonly active = input(true);
  /** aria-label de la tablist, ex. « Mode d'édition de la pièce ». */
  readonly modeBarAriaLabel = input.required<string>();
  /** Texte de l'onglet form, ex. « ✏ Modifier la pièce ». */
  readonly formTabLabel = input.required<string>();
  /** aria-label du dialog plein écran, ex. « Aperçu de la fiche ». */
  readonly previewDialogLabel = input.required<string>();
  /** Bouton 💾 dans la toolbar (false pour l'accueil : auto-save). */
  readonly showSave = input(false);
  readonly saveDisabled = input(false);
  readonly saving = input(false);
  /** Préserve le comportement mobilier : preview masqué ≤768px. */
  readonly hidePreviewOnMobile = input(false);
  /**
   * Vrai quand une modale form-side (photo picker, crop picker) est ouverte.
   * Suspend l'`inert` du panel form pendant ce temps : ces modales sont des
   * descendantes DOM du panel, et `inert` les rendrait infocusables et
   * incliquables (l'override `pointer-events` de styles.css ne vainc pas
   * `inert`). Leçon du commit 7075927, réintroduite par 887ef14. `is-hidden`
   * reste appliqué : le form demeure hors-écran, seule la modale
   * `position: fixed` est interactive.
   */
  readonly formModalOpen = input(false);
  readonly viewMode = model<'form' | 'preview'>('form');
  readonly save = output<void>();

  protected readonly previewTpl = contentChild(ShellPreviewDirective);
  protected readonly previewFullscreen = signal(false);

  protected togglePreviewFullscreen(): void {
    this.previewFullscreen.update(v => !v);
  }

  protected previewFullscreenLabel(): string {
    return this.previewFullscreen() ? 'Réduire l’aperçu' : 'Aperçu plein écran';
  }
}
