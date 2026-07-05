import { Component, Directive, ElementRef, TemplateRef, contentChild, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';

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
  host: {
    '[class.hide-preview-mobile]': 'hidePreviewOnMobile()',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
  template: `
    <div class="admin-split">
      @if (active()) {
        <div class="admin-mode-bar" role="tablist" [attr.aria-label]="modeBarAriaLabel()"
             (keydown)="onTablistKeydown($event)"
             [attr.inert]="previewFullscreen() ? '' : null">
          <button type="button" role="tab" id="tab-form" class="admin-mode-tab"
                  aria-controls="panel-form"
                  [attr.tabindex]="viewMode() === 'form' ? 0 : -1"
                  [class.active]="viewMode() === 'form'"
                  [attr.aria-selected]="viewMode() === 'form'"
                  (click)="viewMode.set('form')">
            {{ formTabLabel() }}
          </button>
          <button type="button" role="tab" id="tab-preview" class="admin-mode-tab"
                  [attr.aria-controls]="viewMode() === 'preview' ? 'panel-preview' : null"
                  [attr.tabindex]="viewMode() === 'preview' ? 0 : -1"
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
              @if (historyEnabled()) {
                <button type="button" class="btn-preview-toggle btn-preview-undo"
                        [disabled]="!canUndo()"
                        aria-label="Annuler la dernière action"
                        (click)="undoRequested.emit()">↶</button>
                <button type="button" class="btn-preview-toggle btn-preview-redo"
                        [disabled]="!canRedo()"
                        aria-label="Rétablir l'action annulée"
                        (click)="redoRequested.emit()">↷</button>
              }
              @if (showSave()) {
                <button type="button" class="btn-preview-save"
                        [disabled]="saveDisabled() || saving()"
                        (click)="save.emit()">
                  @if (saving()) { Enregistrement… } @else { 💾 Enregistrer }
                </button>
              }
              <button type="button" class="btn-preview-toggle btn-preview-fullscreen"
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
    .btn-preview-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
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
  /** Quand passe à true (ex. depuis un lien externe), ouvre directement l'aperçu en plein écran. */
  readonly startFullscreen = input(false);
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
  /** Active les boutons ↶/↷ et les raccourcis Ctrl+Z / Ctrl+Y (mobilier/expo ; l'accueil reste sans historique). */
  readonly historyEnabled = input(false);
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly viewMode = model<'form' | 'preview'>('form');
  readonly save = output<void>();
  /** Émis à chaque entrée/sortie du plein écran. Les pages s'en servent
   *  pour rendre `inert` leur liste latérale (neutralisation aria-modal). */
  readonly fullscreenChange = output<boolean>();
  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();

  private readonly announcer = inject(LiveAnnouncer);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly previewTpl = contentChild(ShellPreviewDirective);
  protected readonly previewFullscreen = signal(false);

  constructor() {
    // Annonce SR du changement de mode (l'état initial n'est pas annoncé).
    // Quitter le mode preview réinitialise aussi le plein écran : sinon la
    // mode-bar resterait inert (impasse) et fullscreenChange ne serait pas émis.
    let firstMode = true;
    effect(() => {
      const mode = this.viewMode();
      if (mode !== 'preview') untracked(() => this.setFullscreen(false));
      if (firstMode) { firstMode = false; return; }
      this.announcer.announce(mode === 'preview' ? 'Mode aperçu' : 'Mode édition');
    });

    // Ouverture directe en plein écran (déclenchée par un input externe).
    effect(() => {
      if (this.startFullscreen()) {
        this.viewMode.set('preview');
        untracked(() => this.setFullscreen(true));
      }
    });
  }

  protected togglePreviewFullscreen(): void {
    this.setFullscreen(!this.previewFullscreen());
  }

  private setFullscreen(value: boolean): void {
    if (this.previewFullscreen() === value) return;
    this.previewFullscreen.set(value);
    this.fullscreenChange.emit(value);
    this.announcer.announce(value ? 'Aperçu plein écran' : 'Aperçu réduit');
  }

  /** Pattern APG Tabs : flèches cycliques + Home/End, activation automatique. */
  protected onTablistKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next: 'form' | 'preview' =
      event.key === 'Home' ? 'form'
      : event.key === 'End' ? 'preview'
      : this.viewMode() === 'form' ? 'preview' : 'form';
    if (next !== this.viewMode()) this.viewMode.set(next);
    this.elementRef.nativeElement
      .querySelector<HTMLButtonElement>(next === 'form' ? '#tab-form' : '#tab-preview')
      ?.focus();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
      if (!this.showSave()) return;
      event.preventDefault();
      // Modale form-side ouverte : on bloque la boîte navigateur mais on ne
      // sauvegarde pas sous la modale (feedback masqué, état partiel).
      if (this.formModalOpen()) return;
      if (!this.saveDisabled() && !this.saving()) this.save.emit();
      return;
    }
    // Undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y). Hors champ de saisie :
    // l'undo natif du navigateur garde la main sur la frappe en cours.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && this.historyEnabled()
        && !this.formModalOpen() && !this.isEditableTarget()) {
      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey);
      if (isUndo || isRedo) {
        event.preventDefault();
        if (isUndo) this.undoRequested.emit();
        else this.redoRequested.emit();
        return;
      }
    }
    // Échap réduit le plein écran — sauf si une modale form-side est ouverte
    // (son propre handler Escape la ferme ; le plein écran reste).
    if (event.key === 'Escape' && this.previewFullscreen() && !this.formModalOpen()) {
      this.setFullscreen(false);
      this.elementRef.nativeElement.querySelector<HTMLButtonElement>('.btn-preview-fullscreen')?.focus();
    }
  }

  /** Vrai quand le focus est dans un champ de saisie (l'undo natif prime). */
  private isEditableTarget(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
  }

  protected previewFullscreenLabel(): string {
    // Apostrophe typographique U+2019 voulue (libellé FR, cf. commits 7bef3e6/5a13457).
    return this.previewFullscreen() ? 'Réduire l’aperçu' : 'Aperçu plein écran';
  }
}
