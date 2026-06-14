# Stories in-preview + retrait des fiches publiques (6a) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer la story du rendu public des fiches mobilier/expo et gérer les stories (sélection active, créer/renommer/supprimer/réordonner, cover, édition slides via modale) depuis un bloc d'auteur admin dans le preview WYSIWYG.

**Architecture:** Composant pur extrait `<app-story-manager-bar>` (chips + actions, émet des events). Les vues détail (pures, ADR-0018) ne rendent plus la story en public, et rendent en mode editable un bloc d'auteur (badge + bar + `<app-story-inline>` lecture seule des vrais slides de la story active). Les pages (`mobilier`/`expositions`) relaient les events vers leurs méthodes CRUD stories **déjà existantes**, chargent les slides réels de la story active pour le preview, et ouvrent `<app-slides-editor>` en modale. Backend inchangé.

**Tech Stack:** Angular 21 standalone, signals, `@if`/`@for`, `@Input()`/`@Output()` décorateurs (style des vues détail existantes), CDK A11yModule (cdkTrapFocus). Tests Karma+Jasmine via Docker (`docker compose -f docker-compose.test.yml run --rm frontend-test`).

**Branche :** `feat/wysiwyg-stories-fiches-6a` (déjà créée, spec commitée).

**Spec :** `docs/superpowers/specs/2026-06-13-wysiwyg-stories-fiches-6a-design.md`

**Baseline tests :** 926 SUCCESS (état de `main` au début de 6a). Chaque tâche rapporte le compte exact.

**Garde-fous projet (RAPPEL à chaque tâche) :**
- AUCUNE normalisation d'apostrophe typographique `'` → ASCII sur des lignes existantes. Vérifier `git diff` au niveau caractère.
- Copie UI en français. Templates en `@if`/`@for` (jamais `*ngIf`/`*ngFor`).
- Conserver le style `@Input()`/`@Output() = new EventEmitter` dans les vues détail et previews (ne PAS introduire `input()`/`output()` ici).
- Edits ciblés, pas de réécriture de fichier.

---

## Structure des fichiers

| Fichier | Rôle | Tâche |
| --- | --- | --- |
| `frontend/src/app/components/story-manager-bar/story-manager-bar.component.ts` (+`.spec.ts`) | **Créé.** Barre pure : chips stories + actions sur l'active. Emplacement aligné sur `<app-tag-editor>` (`components/`), car embarqué dans les vues détail partagées (sens d'import `components/`→`components/`). | 1 |
| `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts` (+`.spec.ts`) | Retire la story publique ; ajoute le bloc d'auteur editable. | 2 |
| `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts` (+`.spec.ts`) | Idem (miroir, sans story-inline préexistant). | 3 |
| `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts` (+`.spec.ts`) | Relaie nouveaux inputs/outputs story. | 4 |
| `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts` (+`.spec.ts`) | Idem (miroir). | 5 |
| `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` (+`.spec.ts`) | `activeStoryId`, slides réels de l'active, câblage events → méthodes existantes, modale slides. | 6 |
| `frontend/src/app/pages/admin/expositions/expositions.component.ts` (+`.spec.ts`) | Idem (miroir). | 7 |
| Les deux pages | Masquer les contrôles `showStoryLink`/`showStoryButton`. | 8 |

---

## Task 1 : Composant `<app-story-manager-bar>`

**Files:**
- Create: `frontend/src/app/components/story-manager-bar/story-manager-bar.component.ts`
- Test: `frontend/src/app/components/story-manager-bar/story-manager-bar.component.spec.ts`

- [ ] **Step 1: Écrire le spec (rouge)**

```typescript
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Story } from '../../models/story.model';
import { StoryManagerBarComponent } from './story-manager-bar.component';

@Component({
  standalone: true,
  imports: [StoryManagerBarComponent],
  template: `<app-story-manager-bar
    [stories]="stories()" [activeStoryId]="activeId()" [editable]="editable()"
    (select)="lastSelect = $event" (create)="created = true"
    (rename)="lastRename = $event" (delete)="lastDelete = $event"
    (move)="lastMove = $event" (coverEdit)="lastCover = $event"
    (slidesEdit)="lastSlides = $event" (viewerPreview)="lastViewer = $event" />`,
})
class HostComponent {
  readonly stories = signal<Story[]>([
    { id: 'a', ownerKind: 'furniture', ownerId: 'f1', title: 'Story A', coverImage: '', coverCrop: null, slug: 'a', position: 0, createdAt: '' } as unknown as Story,
    { id: 'b', ownerKind: 'furniture', ownerId: 'f1', title: 'Story B', coverImage: '', coverCrop: null, slug: 'b', position: 1, createdAt: '' } as unknown as Story,
  ]);
  readonly activeId = signal<string | null>('a');
  readonly editable = signal(true);
  lastSelect: string | null = null;
  created = false;
  lastRename: { id: string; title: string } | null = null;
  lastDelete: string | null = null;
  lastMove: { id: string; dir: 'up' | 'down' } | null = null;
  lastCover: string | null = null;
  lastSlides: string | null = null;
  lastViewer: string | null = null;
}

describe('StoryManagerBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function chips(): HTMLButtonElement[] { return Array.from(fixture.nativeElement.querySelectorAll('.smb-chip')); }

  it('rend une chip par story, active surlignée', () => {
    expect(chips().length).toBe(2);
    expect(chips()[0].classList.contains('active')).toBeTrue();
    expect(chips()[1].classList.contains('active')).toBeFalse();
  });

  it('clic sur une chip émet select', () => {
    chips()[1].click();
    expect(host.lastSelect).toBe('b');
  });

  it('le bouton + Nouvelle émet create', () => {
    (fixture.nativeElement.querySelector('.smb-new') as HTMLButtonElement).click();
    expect(host.created).toBeTrue();
  });

  it('renommage inline au blur émet rename', () => {
    const title = fixture.nativeElement.querySelector('.smb-title') as HTMLElement;
    title.textContent = 'Renommée';
    title.dispatchEvent(new Event('blur'));
    expect(host.lastRename).toEqual({ id: 'a', title: 'Renommée' });
  });

  it('↑ désactivé sur la première story, ↓ actif', () => {
    const up = fixture.nativeElement.querySelector('.smb-up') as HTMLButtonElement;
    const down = fixture.nativeElement.querySelector('.smb-down') as HTMLButtonElement;
    expect(up.disabled).toBeTrue();
    expect(down.disabled).toBeFalse();
  });

  it('↓ émet move down sur l\'active', () => {
    (fixture.nativeElement.querySelector('.smb-down') as HTMLButtonElement).click();
    expect(host.lastMove).toEqual({ id: 'a', dir: 'down' });
  });

  it('cover / slides / aperçu / suppression émettent l\'id de l\'active', () => {
    (fixture.nativeElement.querySelector('.smb-cover') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.smb-slides') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.smb-viewer') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.smb-delete') as HTMLButtonElement).click();
    expect(host.lastCover).toBe('a');
    expect(host.lastSlides).toBe('a');
    expect(host.lastViewer).toBe('a');
    expect(host.lastDelete).toBe('a');
  });

  it('affiche un message quand aucune story', () => {
    host.stories.set([]);
    host.activeId.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.smb-empty')).toBeTruthy();
    expect(chips().length).toBe(0);
  });

  it('ne rend rien quand editable=false', () => {
    host.editable.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-manager-bar')).toBeNull();
  });

  it('les boutons icône ont un aria-label', () => {
    expect((fixture.nativeElement.querySelector('.smb-up') as HTMLElement).getAttribute('aria-label')).toContain('Monter');
    expect((fixture.nativeElement.querySelector('.smb-down') as HTMLElement).getAttribute('aria-label')).toContain('Descendre');
    expect((fixture.nativeElement.querySelector('.smb-delete') as HTMLElement).getAttribute('aria-label')).toContain('Supprimer');
  });
});
```

- [ ] **Step 2: Lancer la suite → échec** (`StoryManagerBarComponent` introuvable).

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`
Expected: FAIL (compilation : module introuvable).

- [ ] **Step 3: Implémenter le composant**

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Story } from '../../models/story.model';

/**
 * Barre de gestion des stories d'un owner (mobilier/expo), rendue dans le bloc
 * d'auteur admin du preview de la fiche (mode editable uniquement). Composant
 * pur : émet des events, aucune logique métier ni appel API. La page consommatrice
 * exécute les opérations (réutilise ses méthodes CRUD stories existantes).
 */
@Component({
  selector: 'app-story-manager-bar',
  standalone: true,
  imports: [],
  template: `
    @if (editable) {
      <div class="story-manager-bar">
        <div class="smb-chips" role="tablist" aria-label="Stories de cette pièce">
          @for (s of stories; track s.id) {
            <button type="button" class="smb-chip" role="tab"
                    [class.active]="s.id === activeStoryId"
                    [attr.aria-selected]="s.id === activeStoryId"
                    (click)="select.emit(s.id)">{{ s.title }}</button>
          }
          <button type="button" class="smb-new" (click)="create.emit()">+ Nouvelle</button>
        </div>

        @if (active(); as a) {
          <div class="smb-active">
            <span class="smb-title" contenteditable="true" role="textbox"
                  aria-label="Renommer la story active"
                  (blur)="onRenameBlur(a.id, $event)">{{ a.title }}</span>
            <button type="button" class="smb-act smb-up" (click)="move.emit({ id: a.id, dir: 'up' })"
                    [disabled]="isFirst()" aria-label="Monter la story dans l'ordre">↑</button>
            <button type="button" class="smb-act smb-down" (click)="move.emit({ id: a.id, dir: 'down' })"
                    [disabled]="isLast()" aria-label="Descendre la story dans l'ordre">↓</button>
            <button type="button" class="smb-act smb-cover" (click)="coverEdit.emit(a.id)">Cover</button>
            <button type="button" class="smb-act smb-slides" (click)="slidesEdit.emit(a.id)">⚙ Éditer slides</button>
            <button type="button" class="smb-act smb-viewer" (click)="viewerPreview.emit(a.id)">🔍 Aperçu</button>
            <button type="button" class="smb-act danger smb-delete" (click)="delete.emit(a.id)"
                    aria-label="Supprimer la story active">🗑</button>
          </div>
        } @else {
          <p class="smb-empty">Aucune story. Crée-en une avec « + Nouvelle ».</p>
        }
      </div>
    }
  `,
  styles: [`
    .story-manager-bar { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: var(--color-bg-alt); border: 1px solid var(--color-line); margin-bottom: 16px; }
    .smb-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .smb-chip { padding: 4px 12px; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; font-size: 0.85rem; border-radius: 999px; }
    .smb-chip.active { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent) inset; }
    .smb-new { padding: 4px 12px; background: var(--color-bg); border: 1px dashed var(--color-line); cursor: pointer; font-size: 0.85rem; }
    .smb-active { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .smb-title { flex: 1 1 160px; min-width: 120px; padding: 2px 6px; outline: 1px dashed transparent; font-size: 0.9rem; }
    .smb-title:hover, .smb-title:focus { outline-color: var(--color-accent); }
    .smb-act { padding: 4px 10px; background: var(--color-bg); border: 1px solid var(--color-line); cursor: pointer; font-size: 0.8rem; }
    .smb-act:hover:not(:disabled) { border-color: var(--color-ink); }
    .smb-act:disabled { opacity: 0.4; cursor: not-allowed; }
    .smb-act.danger:hover { color: #b1532a; border-color: #b1532a; }
    .smb-empty { margin: 0; color: var(--color-mute); font-size: 0.85rem; font-style: italic; }
  `]
})
export class StoryManagerBarComponent {
  @Input() stories: Story[] = [];
  @Input() activeStoryId: string | null = null;
  @Input() editable = false;

  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() rename = new EventEmitter<{ id: string; title: string }>();
  @Output() delete = new EventEmitter<string>();
  @Output() move = new EventEmitter<{ id: string; dir: 'up' | 'down' }>();
  @Output() coverEdit = new EventEmitter<string>();
  @Output() slidesEdit = new EventEmitter<string>();
  @Output() viewerPreview = new EventEmitter<string>();

  protected active(): Story | null {
    return this.stories.find(s => s.id === this.activeStoryId) ?? this.stories[0] ?? null;
  }

  protected isFirst(): boolean {
    const a = this.active();
    return !a || this.stories.findIndex(s => s.id === a.id) <= 0;
  }

  protected isLast(): boolean {
    const a = this.active();
    if (!a) return true;
    return this.stories.findIndex(s => s.id === a.id) === this.stories.length - 1;
  }

  protected onRenameBlur(id: string, ev: Event): void {
    const title = (ev.target as HTMLElement).textContent?.trim() ?? '';
    if (title) this.rename.emit({ id, title });
  }
}
```

- [ ] **Step 4: Lancer la suite → vert.** Rapporter le compte (attendu 926 + 11 = **937**).

Run: `docker compose -f docker-compose.test.yml run --rm frontend-test`

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/components/story-manager-bar/story-manager-bar.component.ts frontend/src/app/components/story-manager-bar/story-manager-bar.component.spec.ts
git commit -m "feat(admin): composant story-manager-bar extrait (chips stories + actions, pur)"
```

---

## Task 2 : `furniture-detail-view` — retrait public + bloc d'auteur

**Files:**
- Modify: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.ts`
- Test: `frontend/src/app/components/furniture-detail-view/furniture-detail-view.component.spec.ts`

Contexte actuel (template ~lignes 129-139) :
```html
@if (displaySlides.length > 0) {
  <app-story-inline [slides]="displaySlides"></app-story-inline>
  @if (item.showStoryButton) {
    <div class="container narrow viewer-link-wrap">
      <button type="button" class="viewer-link" aria-label="Voir en plein écran" (click)="onViewerOpen()">
        Voir en plein écran →
      </button>
    </div>
  }
}
```

- [ ] **Step 1: Adapter le spec (rouge)**

Dans `furniture-detail-view.component.spec.ts` : (a) supprimer/inverser toute assertion vérifiant le rendu de `app-story-inline` ou du bouton « Voir en plein écran » en mode **public** ; (b) ajouter ces tests. Réutiliser les helpers de setup existants du spec (host avec `[item]`, `[displaySlides]`, `[editable]`).

```typescript
  it('mode public ne rend plus la story (story-inline ni bouton plein écran)', () => {
    // host.editable = false ; item avec showStoryButton true ; displaySlides non vides
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
    expect(fixture.nativeElement.querySelector('.viewer-link')).toBeNull();
  });

  it('mode editable rend le bloc d\'auteur (badge + story-manager-bar)', () => {
    // host.editable = true
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-admin-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-story-manager-bar')).toBeTruthy();
  });
```

(Adapter les noms/host du spec existant ; si le spec utilise un HostComponent avec signaux, basculer `editable` et re-`detectChanges`.)

- [ ] **Step 2: Lancer la suite → échec** (assertions nouvelles + suppression du bloc public pas encore faite).

- [ ] **Step 3: Modifier le template**

Remplacer le bloc lignes 129-139 par :

```html
        @if (editable) {
          <section class="section story-admin">
            <div class="container narrow">
              <p class="story-admin-badge">Story — non affichée sur la fiche publique (visible via les sliders).</p>
              <app-story-manager-bar
                [stories]="stories"
                [activeStoryId]="activeStoryId"
                [editable]="true"
                (select)="storySelect.emit($event)"
                (create)="storyCreate.emit()"
                (rename)="storyRename.emit($event)"
                (delete)="storyDelete.emit($event)"
                (move)="storyMove.emit($event)"
                (coverEdit)="storyCoverEdit.emit($event)"
                (slidesEdit)="storySlidesEdit.emit($event)"
                (viewerPreview)="onViewerOpen()" />
            </div>
            @if (displaySlides.length > 0) {
              <app-story-inline [slides]="displaySlides"></app-story-inline>
            }
          </section>
        }
```

(Le `(viewerPreview)` réutilise `onViewerOpen()` existant — `displaySlides` correspond déjà à la story active. La méthode `onViewerOpen()` et l'output `viewerOpen` restent inchangés et ne sont plus déclenchés en public.)

- [ ] **Step 4: Ajouter inputs/outputs + import**

Dans la classe, après `@Input() displaySlides` (ligne ~367) :
```typescript
  @Input() stories: Story[] = [];
  @Input() activeStoryId: string | null = null;
```
Après les `@Output()` existants (ligne ~383) :
```typescript
  @Output() storySelect = new EventEmitter<string>();
  @Output() storyCreate = new EventEmitter<void>();
  @Output() storyRename = new EventEmitter<{ id: string; title: string }>();
  @Output() storyDelete = new EventEmitter<string>();
  @Output() storyMove = new EventEmitter<{ id: string; dir: 'up' | 'down' }>();
  @Output() storyCoverEdit = new EventEmitter<string>();
  @Output() storySlidesEdit = new EventEmitter<string>();
```
Import (haut du fichier) et ajout dans `imports: [...]` du décorateur (même direction que `'../tag-editor/tag-editor.component'` déjà présent) :
```typescript
import { StoryManagerBarComponent } from '../story-manager-bar/story-manager-bar.component';
```
Ajouter `StoryManagerBarComponent` au tableau `imports`. (`Story` est déjà importé ; `StoryInlineComponent` reste importé.)

Ajouter un style minimal dans le tableau `styles` :
```css
    .story-admin { padding: 48px 0; border-top: 1px dashed var(--color-line); }
    .story-admin-badge { margin: 0 0 12px; font-size: 0.78rem; color: var(--color-mute); font-style: italic; }
```

- [ ] **Step 5: Lancer la suite → vert.** Rapporter le compte exact.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/components/furniture-detail-view/
git commit -m "feat(admin): fiche mobilier - retrait story publique + bloc d'auteur story-manager-bar in-preview"
```

---

## Task 3 : `exhibition-detail-view` — retrait public + bloc d'auteur (miroir)

**Files:**
- Modify: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.ts`
- Test: `frontend/src/app/components/exhibition-detail-view/exhibition-detail-view.component.spec.ts`

Contexte actuel (template ~lignes 221-226) — pas de `story-inline`, seulement un bouton :
```html
@if (displaySlides.length > 0 && item.showStoryButton) {
  <div class="container narrow viewer-link-wrap">
    <button type="button" class="viewer-link" aria-label="Voir la story en plein écran" (click)="onViewerOpen()">
      Voir la story →
    </button>
  </div>
}
```

- [ ] **Step 1: Adapter le spec (rouge)**

Dans `exhibition-detail-view.component.spec.ts` : supprimer/inverser l'assertion du bouton public ; ajouter :
```typescript
  it('mode public ne rend pas de story (pas de bouton viewer)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.viewer-link')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-story-inline')).toBeNull();
  });

  it('mode editable rend le bloc d\'auteur (badge + story-manager-bar)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-admin-badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-story-manager-bar')).toBeTruthy();
  });
```

- [ ] **Step 2: Lancer la suite → échec.**

- [ ] **Step 3: Modifier le template**

Remplacer le bloc lignes 221-226 par :
```html
        @if (editable) {
          <section class="section story-admin">
            <div class="container narrow">
              <p class="story-admin-badge">Story — non affichée sur la fiche publique (visible via les sliders).</p>
              <app-story-manager-bar
                [stories]="stories"
                [activeStoryId]="activeStoryId"
                [editable]="true"
                (select)="storySelect.emit($event)"
                (create)="storyCreate.emit()"
                (rename)="storyRename.emit($event)"
                (delete)="storyDelete.emit($event)"
                (move)="storyMove.emit($event)"
                (coverEdit)="storyCoverEdit.emit($event)"
                (slidesEdit)="storySlidesEdit.emit($event)"
                (viewerPreview)="onViewerOpen()" />
            </div>
            @if (displaySlides.length > 0) {
              <app-story-inline [slides]="displaySlides"></app-story-inline>
            }
          </section>
        }
```

- [ ] **Step 4: Inputs/outputs + imports**

Mêmes ajouts que Task 2 Step 4 (inputs `stories`/`activeStoryId`, les 7 outputs `story*`). Imports à ajouter en haut + dans `imports: [...]` :
```typescript
import { StoryManagerBarComponent } from '../story-manager-bar/story-manager-bar.component';
import { StoryInlineComponent } from '../story-inline/story-inline.component';
```
Ajouter `StoryManagerBarComponent, StoryInlineComponent` au tableau `imports`. (`Story` déjà importé.) Même CSS `.story-admin`/`.story-admin-badge` que Task 2.

- [ ] **Step 5: Lancer la suite → vert.** Compte exact.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/components/exhibition-detail-view/
git commit -m "feat(admin): fiche expo - retrait story publique + bloc d'auteur story-manager-bar in-preview"
```

---

## Task 4 : `furniture-preview` — relais des inputs/outputs story

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.ts`
- Test: `frontend/src/app/pages/admin/mobilier/preview/furniture-preview.component.spec.ts`

- [ ] **Step 1: Spec (rouge)** — ajouter un test vérifiant que les nouveaux inputs sont transmis et les outputs relayés. Calquer le style des tests de relais existants du spec.

```typescript
  it('transmet stories/activeStoryId à la vue détail', () => {
    component.stories = [{ id: 'a', title: 'A' } as any];
    component.activeStoryId = 'a';
    fixture.detectChanges();
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    expect(view.stories.length).toBe(1);
    expect(view.activeStoryId).toBe('a');
  });

  it('relaie storySelect', () => {
    let received: string | null = null;
    component.storySelect.subscribe((v: string) => received = v);
    const view = fixture.debugElement.query(By.directive(FurnitureDetailViewComponent)).componentInstance as FurnitureDetailViewComponent;
    view.storySelect.emit('x');
    expect(received).toBe('x');
  });
```

(Importer `By`, `FurnitureDetailViewComponent` si absents du spec.)

- [ ] **Step 2: Lancer la suite → échec.**

- [ ] **Step 3: Template + classe**

Dans le template `<app-furniture-detail-view ...>`, ajouter les inputs et les relais :
```html
      [stories]="stories"
      [activeStoryId]="activeStoryId"
      ...
      (storySelect)="storySelect.emit($event)"
      (storyCreate)="storyCreate.emit()"
      (storyRename)="storyRename.emit($event)"
      (storyDelete)="storyDelete.emit($event)"
      (storyMove)="storyMove.emit($event)"
      (storyCoverEdit)="storyCoverEdit.emit($event)"
      (storySlidesEdit)="storySlidesEdit.emit($event)"
```
Dans la classe, après `@Input() story` (ligne ~37) :
```typescript
  @Input() stories: Story[] = [];
  @Input() activeStoryId: string | null = null;
```
Après les `@Output()` existants :
```typescript
  @Output() storySelect = new EventEmitter<string>();
  @Output() storyCreate = new EventEmitter<void>();
  @Output() storyRename = new EventEmitter<{ id: string; title: string }>();
  @Output() storyDelete = new EventEmitter<string>();
  @Output() storyMove = new EventEmitter<{ id: string; dir: 'up' | 'down' }>();
  @Output() storyCoverEdit = new EventEmitter<string>();
  @Output() storySlidesEdit = new EventEmitter<string>();
```
(`Story` est déjà importé dans ce fichier.)

- [ ] **Step 4: Lancer la suite → vert.** Compte exact.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/preview/
git commit -m "feat(admin): furniture-preview - relais inputs/outputs gestion stories"
```

---

## Task 5 : `exhibition-preview` — relais (miroir)

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.ts`
- Test: `frontend/src/app/pages/admin/expositions/preview/exhibition-preview.component.spec.ts`

Mêmes étapes que Task 4, en remplaçant `FurnitureDetailViewComponent`/`furniture` par `ExhibitionDetailViewComponent`/`exhibition`. Vérifier d'abord le nom exact de la vue détail importée dans ce preview.

- [ ] **Step 1: Spec (rouge)** — tests `transmet stories/activeStoryId` + `relaie storySelect` (adaptés à la vue expo).
- [ ] **Step 2: Suite → échec.**
- [ ] **Step 3: Template + classe** — mêmes inputs `stories`/`activeStoryId` + 7 outputs `story*` + relais dans le template `<app-exhibition-detail-view ...>`. Importer `Story` si absent.
- [ ] **Step 4: Suite → vert.** Compte exact.
- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/preview/
git commit -m "feat(admin): exhibition-preview - relais inputs/outputs gestion stories"
```

---

## Task 6 : `mobilier.component` — câblage, slides actifs, modale

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Test: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`

Objectif : (a) `activeStoryId` pilote la story rendue dans le bloc d'auteur ; (b) charger les vrais slides de la story active pour `previewDisplaySlides()` ; (c) brancher les events de la barre sur les méthodes CRUD existantes ; (d) ouvrir `<app-slides-editor>` en modale via `slidesEdit`.

Méthodes existantes réutilisées : `newStory()`, `renameStory(story)`, `deleteStory(story)`, `moveStoryUp(story)`, `moveStoryDown(story)`, `openCoverEditor(story)`, `editStory(story)`. Service : `getStorySlides(id)`, et `enrichSlides(...)` déjà importé.

- [ ] **Step 1: Spec (rouge)** — ajouter au spec mobilier :

```typescript
  it('onPreviewStorySelect change activeStoryId et recharge les slides actifs', () => {
    // setup standard du spec (créer le composant, flush des requêtes init)
    const cmp = fixture.componentInstance as any;
    cmp.currentStories.set([{ id: 'a', ownerKind: 'furniture', ownerId: 'f1', title: 'A', coverImage: '', slug: 'a', position: 0 }]);
    cmp.onPreviewStorySelect('a');
    httpMock.expectOne(r => r.method === 'GET' && r.url === '/api/admin/stories/a/slides').flush([]);
    expect(cmp.activeStoryId()).toBe('a');
  });

  it('onPreviewStorySlidesEdit ouvre la modale slides (previewSlidesStoryId)', () => {
    const cmp = fixture.componentInstance as any;
    cmp.onPreviewStorySlidesEdit('a');
    expect(cmp.previewSlidesStoryId()).toBe('a');
  });

  it('onPreviewStoryRename appelle updateStory', () => {
    const cmp = fixture.componentInstance as any;
    cmp.currentStories.set([{ id: 'a', ownerKind: 'furniture', ownerId: 'f1', title: 'A', coverImage: 'c.jpg', coverCrop: null, slug: 'a', position: 0 }]);
    cmp.onPreviewStoryRename({ id: 'a', title: 'Nouveau' });
    httpMock.expectOne(r => r.method === 'PUT' && r.url === '/api/admin/stories/a').flush({ id: 'a', title: 'Nouveau' });
    // toast succès attendu (selon le pattern renameStory existant)
  });
```

(Adapter au harnais HTTP du spec existant — il utilise `HttpTestingController` ; flusher les requêtes d'init avant.)

- [ ] **Step 2: Suite → échec.**

- [ ] **Step 3: Implémenter — état + handlers**

Ajouter les signaux (près de `currentStories`, ligne ~337) :
```typescript
  protected readonly activeStoryId = signal<string | null>(null);
  protected readonly activeStorySlides = signal<Slide[]>([]);
  protected readonly previewSlidesStoryId = signal<string | null>(null);
```
(Importer `Slide` depuis `../../../models/slide.model` si absent.)

Adapter `previewDisplaySlides()` pour utiliser la story active et ses vrais slides :
```typescript
  protected readonly previewDisplaySlides = computed(() => {
    this._formTick();
    const stories = this.currentStories();
    const active = stories.find(s => s.id === this.activeStoryId()) ?? stories[0];
    if (!active) return [];
    const v = this.furnitureForm.getRawValue();
    return enrichSlides({
      slug: v.slug ?? '',
      coverImage: v.coverImage ?? null,
      coverCrop: v.coverCrop ?? null,
      slides: this.activeStorySlides(),
      showStoryLink: v.showStoryLink ?? true,
    }, 'furniture');
  });
```

Ajouter les handlers preview (près des autres `onPreview*`) :
```typescript
  private loadActiveStorySlides(id: string | null): void {
    if (!id) { this.activeStorySlides.set([]); return; }
    this.portfolio.getStorySlides(id).subscribe(slides => this.activeStorySlides.set(slides));
  }

  protected onPreviewStorySelect(id: string): void {
    this.activeStoryId.set(id);
    this.loadActiveStorySlides(id);
  }
  protected onPreviewStoryCreate(): void { this.newStory(); }
  protected onPreviewStoryRename(e: { id: string; title: string }): void {
    const story = this.currentStories().find(s => s.id === e.id);
    if (!story) return;
    this.portfolio.updateStory(story.id, {
      ownerKind: story.ownerKind, ownerId: story.ownerId,
      title: e.title, coverImage: story.coverImage, coverCrop: story.coverCrop ?? null,
    }).subscribe({
      next: updated => { this.currentStories.update(arr => arr.map(s => s.id === updated.id ? updated : s)); this.toast.success('Story renommée.'); },
      error: () => this.toast.error('Erreur lors du renommage de la story.'),
    });
  }
  protected onPreviewStoryDelete(id: string): void {
    const story = this.currentStories().find(s => s.id === id);
    if (story) this.deleteStory(story);
  }
  protected onPreviewStoryMove(e: { id: string; dir: 'up' | 'down' }): void {
    const story = this.currentStories().find(s => s.id === e.id);
    if (!story) return;
    if (e.dir === 'up') this.moveStoryUp(story); else this.moveStoryDown(story);
  }
  protected onPreviewStoryCoverEdit(id: string): void {
    const story = this.currentStories().find(s => s.id === id);
    if (story) this.openCoverEditor(story);
  }
  protected onPreviewStorySlidesEdit(id: string): void {
    this.activeStoryId.set(id);
    this.previewSlidesStoryId.set(id);
  }
  protected onPreviewSlidesModalClose(): void {
    const id = this.previewSlidesStoryId();
    this.previewSlidesStoryId.set(null);
    if (id) this.loadActiveStorySlides(id); // rafraîchit l'aperçu après édition
  }
```

Initialiser `activeStoryId` quand les stories sont chargées : dans la méthode qui set `currentStories` (chargement par owner), après le set, ajouter :
```typescript
    const first = this.currentStories()[0];
    this.activeStoryId.set(first ? first.id : null);
    this.loadActiveStorySlides(first ? first.id : null);
```
(À insérer là où `currentStories.set(stories)` est appelé au chargement d'un mobilier.)

- [ ] **Step 4: Implémenter — template (preview + modale)**

Brancher les outputs sur le `<app-furniture-preview ...>` (ligne ~218) :
```html
            [stories]="currentStories()"
            [activeStoryId]="activeStoryId()"
            ...
            (storySelect)="onPreviewStorySelect($event)"
            (storyCreate)="onPreviewStoryCreate()"
            (storyRename)="onPreviewStoryRename($event)"
            (storyDelete)="onPreviewStoryDelete($event)"
            (storyMove)="onPreviewStoryMove($event)"
            (storyCoverEdit)="onPreviewStoryCoverEdit($event)"
            (storySlidesEdit)="onPreviewStorySlidesEdit($event)"
```

Ajouter la modale slides après le `</app-admin-preview-shell>` (au même niveau que les autres overlays, dans le template racine) :
```html
    @if (previewSlidesStoryId(); as sid) {
      <div class="slides-modal-overlay" role="dialog" aria-modal="true" aria-label="Éditer les slides de la story"
           cdkTrapFocus cdkTrapFocusAutoCapture (keydown.escape)="onPreviewSlidesModalClose()">
        <div class="slides-modal-panel">
          <header class="slides-modal-head">
            <h3>Éditer les slides</h3>
            <button type="button" (click)="onPreviewSlidesModalClose()" aria-label="Fermer">Fermer</button>
          </header>
          <app-slides-editor [storyId]="sid" [ownerSlug]="editingFurnitureSlug()" />
        </div>
      </div>
    }
```
Importer `A11yModule` (`@angular/cdk/a11y`) dans le décorateur `imports` si absent (`SlidesEditorComponent` est déjà importé). CSS :
```css
    .slides-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1300; display: flex; align-items: center; justify-content: center; }
    .slides-modal-panel { width: 92%; max-width: 920px; max-height: 86vh; overflow: auto; background: var(--color-bg); padding: 20px; border: 1px solid var(--color-ink); }
    .slides-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
```

- [ ] **Step 5: Lancer la suite → vert.** Compte exact. Vérifier la couverture (seuils 80%/75%).

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/mobilier.component.ts frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts
git commit -m "feat(admin): mobilier - câblage gestion stories in-preview (active, slides reels, modale slides)"
```

---

## Task 7 : `expositions.component` — câblage (miroir)

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Test: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

Mêmes étapes que Task 6, adaptées à l'expo : méthodes existantes `newStory`/`renameStory`/`deleteStory`/`moveStoryUp`/`moveStoryDown`/`openCoverEditor`/`editStory` (déjà présentes), `editingExhibitionSlug()` au lieu de `editingFurnitureSlug()`, `'exhibition'` dans `enrichSlides(..., 'exhibition')`. Le `<app-exhibition-preview ...>` est à la ligne ~178.

- [ ] **Step 1: Spec (rouge)** — `onPreviewStorySelect` (GET `/api/admin/stories/{id}/slides`), `onPreviewStorySlidesEdit` (set `previewSlidesStoryId`), `onPreviewStoryRename` (PUT `/api/admin/stories/{id}`).
- [ ] **Step 2: Suite → échec.**
- [ ] **Step 3: État + handlers** — `activeStoryId`, `activeStorySlides`, `previewSlidesStoryId` ; adapter `previewDisplaySlides()` (story active + `activeStorySlides()`, `'exhibition'`) ; les 8 handlers `onPreviewStory*` + `loadActiveStorySlides` + `onPreviewSlidesModalClose` (copie exacte, `editingExhibitionSlug()`). Initialiser `activeStoryId`/slides au chargement des stories.
- [ ] **Step 4: Template** — inputs `[stories]="currentStories()"` `[activeStoryId]="activeStoryId()"` + 7 relais `(story*)` sur `<app-exhibition-preview>` ; modale slides identique (avec `editingExhibitionSlug()`), import `A11yModule` si absent.
- [ ] **Step 5: Suite → vert.** Compte exact + couverture.
- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/expositions.component.ts frontend/src/app/pages/admin/expositions/expositions.component.spec.ts
git commit -m "feat(admin): expositions - câblage gestion stories in-preview (active, slides reels, modale slides)"
```

---

## Task 8 : Masquer les contrôles `showStoryLink` / `showStoryButton`

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`

Ces deux cases à cocher (form-side) pilotaient l'affichage de la story sur la fiche publique, désormais retiré → elles n'ont plus d'effet visible. On **masque les contrôles** (sans toucher au FormGroup ni à l'entité : pas de migration, les valeurs continuent d'être envoyées telles quelles).

Contexte mobilier (~lignes 156-162) :
```html
<input type="checkbox" formControlName="showStoryLink" />
<span>Afficher le lien en fin de story</span>
...
<input type="checkbox" formControlName="showStoryButton" />
```

- [ ] **Step 1: Spec (rouge)** — dans chaque spec page :
```typescript
  it('ne rend plus les cases showStoryLink/showStoryButton (obsolètes)', () => {
    // créer + flush init + passer en mode édition d'un item
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="showStoryLink"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="showStoryButton"]')).toBeNull();
  });
```

- [ ] **Step 2: Suite → échec.**

- [ ] **Step 3: Retirer les deux `<label class="checkbox">` du template** (mobilier ET expo) contenant `formControlName="showStoryLink"` et `formControlName="showStoryButton"`. **Conserver** les contrôles dans le `FormGroup` (`showStoryLink: [true]`, `showStoryButton: [true]`) et toute lecture `v.showStoryLink` (pas de régression de payload).

- [ ] **Step 4: Suite → vert.** Compte exact.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/mobilier.component.ts frontend/src/app/pages/admin/expositions/expositions.component.ts frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts frontend/src/app/pages/admin/expositions/expositions.component.spec.ts
git commit -m "chore(admin): masque les cases showStoryLink/showStoryButton (story retiree de la fiche publique)"
```

---

## Après toutes les tâches

1. **Validation visuelle locale** (`docker compose up --build -d frontend`) : fiche publique mobilier/expo SANS story ; preview admin avec bloc d'auteur (chips, renommage inline, ↑↓, cover, modale slides, aperçu plein écran) ; sélection de story active change l'aperçu.
2. **Baselines Playwright des fiches** : régénérer SEULEMENT après validation visuelle humaine (règle projet).
3. **Audits RGAA + sécurité** sur la branche, puis merge sur main (après confirmation).
4. **Doc** : mettre à jour `SPECIFICATION_FONCTIONNELLE.md` (story plus affichée sur la fiche) + `SPECIFICATION_TECHNIQUE.md` (nouveau composant, flux) avant merge.
5. **6b** (cycle suivant) : édition des slides en place, remplaçant la modale.
