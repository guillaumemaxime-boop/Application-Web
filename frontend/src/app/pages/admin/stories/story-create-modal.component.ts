import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { Crop } from '../../../models/crop.model';
import { NewsSlider } from '../../../models/news-slider.model';
import { ImageFieldComponent } from '../shared/image-field.component';

/**
 * Modale de création d'une story : sélection de l'owner (meuble/expo), titre,
 * cover (avec cadrage) et ajout optionnel à un slider. À la création, émet l'id
 * de la nouvelle story via `created` (le parent navigue vers l'éditeur de slides).
 *
 * ⚠ L'owner d'une story est l'**id technique** du meuble/expo (`f-xxxx`/`e-xxxx`),
 * pas le slug. La clé d'option est `ownerKind::ownerId`.
 */
@Component({
  selector: 'app-story-create-modal',
  standalone: true,
  imports: [A11yModule, ReactiveFormsModule, ImageFieldComponent],
  template: `
    <div class="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-story-title"
         cdkTrapFocus cdkTrapFocusAutoCapture>
      <div class="create-panel">
        <header>
          <h3 id="create-story-title">Nouvelle story</h3>
          <button type="button" class="cancel" (click)="cancel.emit()" aria-label="Fermer">Fermer</button>
        </header>

        <div class="field">
          <label for="story-owner">Propriétaire</label>
          <select id="story-owner" [value]="ownerKey()" (change)="ownerKey.set($any($event.target).value)">
            <option value="">— Choisir un meuble ou une exposition —</option>
            @if (furniture().length > 0) {
              <optgroup label="Mobilier">
                @for (f of furniture(); track f.id) {
                  <option [value]="'furniture::' + f.id">{{ f.title }}</option>
                }
              </optgroup>
            }
            @if (exhibitions().length > 0) {
              <optgroup label="Expositions">
                @for (e of exhibitions(); track e.id) {
                  <option [value]="'exhibition::' + e.id">{{ e.title }}</option>
                }
              </optgroup>
            }
          </select>
        </div>

        <div class="field">
          <label for="story-title">Titre</label>
          <input id="story-title" type="text" [value]="title()" (input)="title.set($any($event.target).value)"
                 placeholder="Titre de la story" />
        </div>

        <div class="field">
          <app-image-field label="Couverture (URL)" [cropEnabled]="true" [formControl]="coverCtrl"
            [cropValue]="coverCrop()" (cropChange)="coverCrop.set($event)" />
        </div>

        <div class="field">
          <label for="story-slider">Ajouter à un slider <span class="opt">(optionnel)</span></label>
          <select id="story-slider" [value]="sliderId()" (change)="sliderId.set($any($event.target).value)">
            <option value="">— Aucun —</option>
            @for (s of sliders(); track s.id) {
              <option [value]="s.id">{{ s.title }}</option>
            }
          </select>
        </div>

        <footer>
          <button type="button" class="cancel" (click)="cancel.emit()">Annuler</button>
          <button type="button" class="primary" (click)="submit()"
                  [disabled]="!ownerKey() || !title().trim()">Créer</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .create-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1300;
      display: flex; align-items: center; justify-content: center;
    }
    .create-panel {
      width: 90%; max-width: 560px; max-height: 85vh; overflow: auto;
      background: var(--color-bg); padding: 24px; border: 1px solid var(--color-ink);
      display: flex; flex-direction: column; gap: 16px;
    }
    .create-panel header { display: flex; align-items: center; justify-content: space-between; }
    .create-panel header h3 { margin: 0; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field > label { font-size: 0.78rem; color: var(--color-ink-soft); }
    .field .opt { color: var(--color-mute); font-style: italic; }
    select, input[type="text"] {
      padding: 8px 10px; background: var(--color-bg); border: 1px solid var(--color-line);
      color: var(--color-ink); font: inherit;
    }
    select:focus-visible, input[type="text"]:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
    footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    button { padding: 8px 16px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font: inherit; font-size: 0.9rem; }
    button.primary { background: var(--color-ink); color: var(--color-bg); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class StoryCreateModalComponent implements OnInit, OnDestroy {
  private readonly portfolio = inject(PortfolioService);
  private readonly toast = inject(ToastService);

  /** Owner pré-sélectionné (ex. depuis une fiche) ; sinon choix libre. */
  @Input() presetOwner: { kind: 'furniture' | 'exhibition'; id: string } | null = null;

  @Output() created = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly furniture = signal<{ id: string; title: string }[]>([]);
  readonly exhibitions = signal<{ id: string; title: string }[]>([]);
  readonly sliders = signal<NewsSlider[]>([]);

  readonly ownerKey = signal('');
  readonly title = signal('');
  readonly coverCrop = signal<Crop | null>(null);
  readonly sliderId = signal('');

  readonly coverCtrl = new FormControl('');

  /** Élément déclencheur, mémorisé pour restituer le focus à la fermeture. */
  private trigger: HTMLElement | null = null;

  ngOnInit(): void {
    this.trigger = document.activeElement as HTMLElement | null;
    if (this.presetOwner) {
      this.ownerKey.set(`${this.presetOwner.kind}::${this.presetOwner.id}`);
    }
    this.portfolio.getAllFurniture().subscribe(list =>
      this.furniture.set(list.map(f => ({ id: f.id, title: f.title }))));
    this.portfolio.getAllExhibitions().subscribe(list =>
      this.exhibitions.set(list.map(e => ({ id: e.id, title: e.title }))));
    this.portfolio.getAdminSliders().subscribe(list => this.sliders.set(list));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }

  /** Restitue le focus au déclencheur quand la modale est détruite. */
  ngOnDestroy(): void {
    this.trigger?.focus?.();
  }

  submit(): void {
    const [kind, id] = this.ownerKey().split('::');
    if (!kind || !id || !this.title().trim()) return;
    this.portfolio.createStory({
      ownerKind: kind as 'furniture' | 'exhibition', ownerId: id,
      title: this.title().trim(), coverImage: this.coverCtrl.value ?? '', coverCrop: this.coverCrop(),
    }).subscribe({
      next: story => {
        const sid = this.sliderId();
        if (sid) {
          const slider = this.sliders().find(s => s.id === sid);
          const ids = [...(slider?.storyIds ?? []), story.id];
          this.portfolio.replaceSliderStories(sid, ids).subscribe();
        }
        this.created.emit(story.id);
      },
      error: () => this.toast.error('Erreur lors de la création de la story.'),
    });
  }
}
