# UX composition slider — drag & drop 2 colonnes (CDK) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `<app-slider-composition-editor>` pour composer un slider par drag & drop entre deux colonnes (CDK connected drop lists), avec équivalents clavier (Ajouter / Retirer / ↑ / ↓) et annonces `aria-live`.

**Architecture:** Un seul composant modifié. Deux `cdkDropList` reliés par `cdkDropListGroup` ; chaque ligne `cdkDrag` avec `[cdkDragData]="id"`. Le handler `onDrop` lit `event.item.data` (id) + l'`id` du conteneur cible pour ajouter (available→composition à l'index de drop), retirer (composition→available) ou réordonner (intra-composition). `pendingStoryIds = signal<string[]>` reste la source de vérité ; boutons clavier conservés. API inputs/outputs **inchangée**.

**Tech Stack:** Angular 21 standalone + signals, `@angular/cdk/drag-drop` (déjà installé via `@angular/cdk ~21.0.0`), Karma + Jasmine.

**Branche :** `feat/ux-composition-slider` (créée, spec committée).

**Spec :** `docs/superpowers/specs/2026-06-19-ux-composition-slider-design.md`

**Conventions :** tests frontend via `docker compose -f docker-compose.test.yml run --rm frontend-test`. `@if`/`@for`. Copie FR, apostrophes typographiques `’`. Pas de `HttpClient` (composant pur).

---

## Task 1 : Refonte drag & drop + clavier + aria-live

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/slider-composition-editor.component.spec.ts`

Le mécanisme actuel (cases à cocher + bouton groupé `.add-selected` ; ↑/↓ ; `.comp-remove`) devient : drag CDK + bouton **`.story-add`** par ligne disponible + `.comp-remove`/`.comp-up`/`.comp-down` conservés. `selectedToAdd`/`toggleSelect`/`addSelected` supprimés.

- [ ] **Step 1 : Réécrire le spec (rouge)**

Remplacer intégralement `slider-composition-editor.component.spec.ts` par :

```ts
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
  // Construit un event CDK minimal pour onDrop.
  function dropEvent(opts: { from: string; to: string; movedId: string; previousIndex: number; currentIndex: number }): CdkDragDrop<string[]> {
    return {
      previousContainer: { id: opts.from },
      container: { id: opts.to },
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
```

- [ ] **Step 2 : Lancer les tests → rouge**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: échecs sur `.story-add`, `editor().onDrop`, `[aria-live]` (n'existent pas encore).

- [ ] **Step 3 : Réécrire le composant**

Remplacer intégralement `slider-composition-editor.component.ts` par :

```ts
import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import {
  CdkDropList, CdkDrag, CdkDropListGroup, CdkDragDrop, moveItemInArray,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Story } from '../../../models/story.model';

/**
 * Modale de composition d'un slider : deux colonnes (Disponibles / Composition)
 * reliées en drag & drop (CDK connected drop lists), avec équivalents clavier
 * (Ajouter / Retirer / ↑ / ↓) et annonces aria-live. Extraite pour être
 * réutilisée form-side ET depuis le preview accueil. Piloté par inputs, émet
 * `save` (liste d'ids ordonnée) ou `cancel`. La persistance est faite par le
 * consommateur. API inputs/outputs inchangée.
 */
@Component({
  selector: 'app-slider-composition-editor',
  standalone: true,
  imports: [A11yModule, FormsModule, CdkDropListGroup, CdkDropList, CdkDrag],
  template: `
    <div class="composition-modal" role="dialog" aria-modal="true" aria-labelledby="composition-title"
         cdkTrapFocus cdkTrapFocusAutoCapture>
      <div class="composition-panel">
        <header>
          <h3 id="composition-title">Composition de "{{ title() }}"</h3>
          <button type="button" class="comp-cancel" (click)="cancel.emit()" aria-label="Fermer">Fermer</button>
        </header>
        <p class="comp-hint">Une story sans slide n'apparaît pas sur le site tant qu'elle n'a pas de contenu.</p>
        <p class="sr-only" aria-live="polite">{{ status() }}</p>
        <div class="composition-grid" cdkDropListGroup>
          <aside class="available">
            <h4>Stories disponibles</h4>
            <input type="text" [(ngModel)]="storyFilter" placeholder="Rechercher..." aria-label="Filtrer les stories" />
            <ul class="drop-list" id="available" cdkDropList [cdkDropListData]="availableIds()"
                (cdkDropListDropped)="onDrop($event)">
              @for (story of filteredAvailable(); track story.id) {
                <li class="story-option" cdkDrag [cdkDragData]="story.id">
                  <span>{{ story.title }} <small>({{ story.ownerKind }} {{ story.ownerId }})</small></span>
                  <button type="button" class="story-add" (click)="add(story.id)"
                          [attr.aria-label]="'Ajouter ' + story.title + ' à la composition'">Ajouter →</button>
                </li>
              }
              @if (filteredAvailable().length === 0) {
                <li class="empty">Aucune story disponible.</li>
              }
            </ul>
          </aside>
          <aside class="composition">
            <h4>Composition courante</h4>
            <ul class="drop-list comp-list" id="composition" [cdkDropListData]="pendingStoryIds()"
                cdkDropList (cdkDropListDropped)="onDrop($event)">
              @if (pendingStoryIds().length === 0) {
                <li class="empty">Aucune story sélectionnée. Glissez-en une ici ou utilisez « Ajouter ».</li>
              }
              @for (storyId of pendingStoryIds(); track storyId; let i = $index) {
                <li class="comp-item" cdkDrag [cdkDragData]="storyId">
                  <span>{{ storyTitle(storyId) }}</span>
                  <button type="button" class="comp-up" (click)="moveUp(storyId)" [disabled]="i === 0"
                          aria-label="Monter la story dans l'ordre">↑</button>
                  <button type="button" class="comp-down" (click)="moveDown(storyId)"
                          [disabled]="i === pendingStoryIds().length - 1" aria-label="Descendre la story dans l'ordre">↓</button>
                  <button type="button" class="comp-remove" (click)="removeFromComposition(storyId)"
                          [attr.aria-label]="'Retirer ' + storyTitle(storyId)">× Retirer</button>
                </li>
              }
            </ul>
            <button type="button" class="primary comp-save" (click)="save.emit(pendingStoryIds())">Enregistrer</button>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .composition-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1300;
      display: flex; align-items: center; justify-content: center;
    }
    .composition-panel { width: 90%; max-width: 900px; max-height: 80vh; overflow: auto; background: var(--color-bg); padding: 24px; border: 1px solid var(--color-ink); }
    .composition-panel header { display: flex; align-items: center; justify-content: space-between; }
    .composition-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .available, .composition { display: flex; flex-direction: column; gap: 8px; }
    .drop-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; min-height: 80px; }
    .comp-list.cdk-drop-list-receiving, .available .drop-list.cdk-drop-list-receiving { outline: 2px dashed var(--color-ink); outline-offset: 2px; }
    .story-option, .comp-item { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--color-line); background: var(--color-bg); cursor: grab; }
    .story-option > span:first-child, .comp-item > span:first-child { flex: 1; }
    .story-option small { color: var(--color-mute); }
    .empty { color: var(--color-mute); font-style: italic; padding: 12px 0; cursor: default; border: none; }
    button { padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-ink); cursor: pointer; font-size: 0.85rem; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    button.primary { background: var(--color-ink); color: var(--color-bg); }
    .comp-hint { margin: 12px 0 0; font-size: 0.82rem; color: var(--color-mute); font-style: italic; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    /* Feedback CDK */
    .cdk-drag-preview { box-shadow: 0 4px 12px rgba(0,0,0,0.3); background: var(--color-bg); border: 1px solid var(--color-ink); padding: 6px 8px; }
    .cdk-drag-placeholder { opacity: 0.4; }
    .cdk-drag-animating { transition: transform 180ms cubic-bezier(0,0,0.2,1); }
    .drop-list.cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) { transition: transform 180ms cubic-bezier(0,0,0.2,1); }
  `]
})
export class SliderCompositionEditorComponent {
  readonly title = input<string>('');
  readonly storyIds = input<string[]>([]);
  readonly allStories = input<Story[]>([]);
  /** Identité du slider en cours d'édition. L'éditeur ne réinitialise sa
   *  composition pendante que lorsque cet id change (pas à chaque nouvelle
   *  référence de `storyIds`), pour ne pas écraser les modifications en cours. */
  readonly sliderId = input<string | null>(null);
  readonly save = output<string[]>();
  readonly cancel = output<void>();

  protected readonly pendingStoryIds = signal<string[]>([]);
  protected readonly status = signal('');
  protected storyFilter = '';

  private lastSliderId: string | null | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.sliderId();
      if (id === this.lastSliderId) return;
      this.lastSliderId = id;
      this.pendingStoryIds.set([...untracked(() => this.storyIds())]);
    });
  }

  protected readonly filteredAvailable = computed(() => {
    const pending = new Set(this.pendingStoryIds());
    const q = this.storyFilter.toLowerCase();
    return this.allStories()
      .filter(s => !pending.has(s.id))
      .filter(s => !q || s.title.toLowerCase().includes(q) || s.ownerId.toLowerCase().includes(q));
  });

  protected readonly availableIds = computed(() => this.filteredAvailable().map(s => s.id));

  protected storyTitle(id: string): string {
    return this.allStories().find(s => s.id === id)?.title ?? id;
  }

  /** Drag & drop : ajoute (available→composition), retire (composition→available)
   *  ou réordonne (intra-composition). L'id déplacé est lu dans event.item.data,
   *  robuste face au filtre de la liste disponible. */
  onDrop(event: CdkDragDrop<string[]>): void {
    const movedId = event.item.data as string;
    const fromId = event.previousContainer.id;
    const toId = event.container.id;

    if (fromId === toId) {
      if (toId === 'composition') {
        this.pendingStoryIds.update(arr => {
          const copy = [...arr];
          moveItemInArray(copy, event.previousIndex, event.currentIndex);
          return copy;
        });
        this.status.set(this.storyTitle(movedId) + ' déplacée en position ' + (event.currentIndex + 1) + '.');
      }
      return;
    }
    if (toId === 'composition') {
      this.pendingStoryIds.update(arr => {
        if (arr.includes(movedId)) return arr;
        const copy = [...arr];
        copy.splice(Math.min(event.currentIndex, copy.length), 0, movedId);
        return copy;
      });
      this.status.set(this.storyTitle(movedId) + ' ajoutée à la composition.');
    } else {
      this.pendingStoryIds.update(arr => arr.filter(x => x !== movedId));
      this.status.set(this.storyTitle(movedId) + ' retirée de la composition.');
    }
  }

  protected add(id: string): void {
    this.pendingStoryIds.update(arr => arr.includes(id) ? arr : [...arr, id]);
    this.status.set(this.storyTitle(id) + ' ajoutée à la composition.');
  }

  protected removeFromComposition(id: string): void {
    this.pendingStoryIds.update(arr => arr.filter(x => x !== id));
    this.status.set(this.storyTitle(id) + ' retirée de la composition.');
  }

  protected moveUp(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i <= 0) return arr;
      const copy = [...arr];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
  }

  protected moveDown(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i < 0 || i >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
  }
}
```

- [ ] **Step 4 : Lancer les tests → vert**

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: tous les tests `SliderCompositionEditorComponent` passent + suite frontend complète verte.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/app/pages/admin/shared/slider-composition-editor.component.ts frontend/src/app/pages/admin/shared/slider-composition-editor.component.spec.ts
git commit -m "feat(sliders): composition par drag&drop 2 colonnes (CDK) + repli clavier + aria-live" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Après la tâche

1. **Revue spec-compliance** (réutilise un pattern admin existant → revue code-quality allégée).
2. **Redéploiement** frontend (`docker compose up --build -d frontend`) + Playwright sans `--update` (la modale n'est pas dans les baselines publiques → doivent rester vertes).
3. **Validation visuelle/comportement par l'utilisateur** : ouvrir la composition d'un slider (admin Accueil ou form-side), tester le drag (ajout depuis Disponibles, retrait, réordonnancement), les boutons clavier (Tab + Entrée sur « Ajouter », ↑/↓, × Retirer), le filtre, l'enregistrement. Vérifier sur mobile/tactile le drag de base.
4. **Audits** : RGAA ciblé (drag clavier compensé par boutons, aria-live, focus, intitulés) ; sécurité non requise (aucun changement backend/réseau — scope front pur, proportionné).
5. **Doc** : note dans `docs/SPECIFICATION_TECHNIQUE.md` (composant `<app-slider-composition-editor>` passe en CDK drag-drop) ; envisager une mention courte (1ʳᵉ utilisation de `@angular/cdk/drag-drop`, le reste du projet reste sur `appReorderable`). Pas d'ADR dédié (choix localisé, non structurant).
6. **Merge** sur `main` après confirmation explicite utilisateur.

---

## Self-review (effectuée)

- **Couverture spec** : drag&drop 2 colonnes (onDrop ajout/retrait/réordre via cdkDropListGroup) ; boutons clavier Ajouter/Retirer/↑/↓ ; aria-live ; filtre conservé ; API inchangée ; suppression `selectedToAdd`. ✓
- **Cohérence types** : `onDrop(event: CdkDragDrop<string[]>)` public (testable) ; `availableIds()`/`filteredAvailable()`/`pendingStoryIds()` cohérents template↔classe ; ids des conteneurs `'available'`/`'composition'` alignés template↔handler↔tests. ✓
- **Placeholders** : aucun — code complet fourni pour le composant et le spec. ✓
- **Risque** : `onDrop` est `public` (sans `protected`) pour permettre le test unitaire du handler (le drag CDK réel n'est pas simulable simplement en Karma) — choix assumé.
