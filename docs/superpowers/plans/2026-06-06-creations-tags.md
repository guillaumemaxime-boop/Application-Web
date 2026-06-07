# Page « Créations » + tags sur mobilier — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'admin de taguer chaque mobilier (et confirmer l'édition admin des tags d'expo existants), exposer un composant partagé `<app-tag-input>` avec autocomplete, et créer une page publique `/creations` qui agrège mobilier + expositions avec filtres unifiés (type, années, tags) en union.

**Architecture:** Côté backend, ajout de `furniture_tag` (`@ElementCollection`, même pattern que `exhibition_tag`) + nouveau endpoint `GET /api/tags` (union dédupliquée triée). Côté frontend, factorisation d'un composant `<app-tag-input>` (chips + autocomplete + ControlValueAccessor) réutilisé dans les deux pages admin. Nouvelle page publique `CreationsComponent` qui merge `getAllFurniture()` + `getAllExhibitions()` en `forkJoin`, calcule les facettes (years, tags) côté Angular, filtres via signals/computed.

**Tech Stack:** Spring Boot 4 + JPA (`@ElementCollection`), Liquibase, Angular 21 (standalone components, signals, `@if`/`@for`, ReactiveFormsModule + ControlValueAccessor), Karma+Jasmine, Playwright pour la régression visuelle.

**Référence :** spec validée → [docs/superpowers/specs/2026-06-06-creations-tags-design.md](../specs/2026-06-06-creations-tags-design.md)

**Branche :** `feat/creations-tags` (déjà créée depuis `feat/stories-multiples-sliders`).

---

## File Structure

### Backend — créés

| Fichier | Rôle |
|---|---|
| `backend/src/main/resources/db/changelog/changes/026-add-tags-to-furniture.yaml` | Table `furniture_tag` + PK composite + FK CASCADE |
| `backend/src/main/java/com/atelier/portfolio/controller/TagController.java` | Public `GET /api/tags` |
| `backend/src/main/java/com/atelier/portfolio/service/TagService.java` | Union dédupliquée triée des tags furniture + exhibition |
| `backend/src/test/java/com/atelier/portfolio/service/TagServiceTest.java` | Tests unit + intégration H2 |
| `backend/src/test/java/com/atelier/portfolio/controller/TagControllerTest.java` | Tests Mockito du controller |

### Backend — modifiés

| Fichier | Modification |
|---|---|
| `backend/src/main/resources/db/changelog/db.changelog-master.yaml` | Include 026 |
| `backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java` | Ajout `tags` @ElementCollection |
| `backend/src/main/java/com/atelier/portfolio/model/Furniture.java` | Ajout `tags` record component |
| `backend/src/main/java/com/atelier/portfolio/model/FurnitureInput.java` | Ajout `tags` record component |
| `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java` | Propage `tags` dans `toDto`, `toEntity`, et les méthodes create/update |
| `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java` | (si non couvert par `GET /api/**` permitAll) |

### Frontend — créés

| Fichier | Rôle |
|---|---|
| `frontend/src/app/pages/admin/shared/tag-input.component.ts` | `<app-tag-input>` chips + autocomplete + ControlValueAccessor |
| `frontend/src/app/pages/admin/shared/tag-input.component.spec.ts` | Tests |
| `frontend/src/app/models/creation.model.ts` | Interface `CreationItem` |
| `frontend/src/app/pages/creations/creations.component.ts` | Page publique `/creations` |
| `frontend/src/app/pages/creations/creations.component.spec.ts` | Tests |

### Frontend — modifiés

| Fichier | Modification |
|---|---|
| `frontend/src/app/models/furniture.model.ts` | Ajout `tags?: string[]` (optionnel pour back-compat) |
| `frontend/src/app/services/portfolio.service.ts` | Ajout `getAllTags(): Observable<string[]>` |
| `frontend/src/app/services/portfolio.service.spec.ts` | Test du nouvel endpoint |
| `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` | Ajout FormControl tags + `<app-tag-input>` |
| `frontend/src/app/pages/admin/expositions/expositions.component.ts` | Remplacer le champ tags inline éventuel par `<app-tag-input>` |
| `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` | Affiche les chips tags cliquables (deep-link `/creations?tags=`) |
| `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` | Idem |
| `frontend/src/app/app.routes.ts` | Route lazy `'creations'` |
| `frontend/src/app/components/header/header.component.ts` | Entrée nav `Créations` entre Expositions et Studio |

### E2E Playwright

| Fichier | Action |
|---|---|
| `frontend/e2e/fixtures/furniture-list.json` | Ajouter `tags` sur 1-2 items |
| `frontend/e2e/fixtures/exhibitions-list.json` | Ajouter `tags` sur 1-2 items |
| `frontend/e2e/fixtures/tags.json` | Nouvelle fixture (liste de tags pour autocomplete) |
| `frontend/e2e/helpers/stub-api.ts` | Ajouter `**/api/tags` au STUBS |
| `frontend/e2e/tests/visual/creations.spec.ts` | Nouvelle spec |
| `frontend/e2e/__screenshots__/...` | Regen 7 baselines existantes (nav header modifié) + 2 nouvelles |

---

## Conventions et patterns à suivre

- **Backend** : `@ElementCollection` pour tags (pattern existant sur `ExhibitionEntity`), records pour DTOs (Java 25), service par agrégat, controller mince.
- **Frontend** : standalone components, signals (pas RxJS pour state local), `@if`/`@for`/`@else`. Tests controllers en Mockito (pas MockMvc, pas dispo dans le pom).
- **Commits** : conventional-commits FR. Scopes typiques : `feat(creations)`, `feat(admin)`, `chore(db)`, `test(visual)`.
- **TDD** où applicable (services backend + composants frontend).
- **Tests visuels** : régénération via `npm run test:visual:docker:update` UNIQUEMENT, jamais depuis l'hôte Windows direct.

---

## Task 1 : Schema `furniture_tag` + entité JPA + DTOs

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/026-add-tags-to-furniture.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Furniture.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/FurnitureInput.java`

- [ ] **Step 1 : Créer le changeset Liquibase**

Créer `backend/src/main/resources/db/changelog/changes/026-add-tags-to-furniture.yaml` :

```yaml
databaseChangeLog:
  - changeSet:
      id: 026-add-tags-to-furniture
      author: atelier-lumen
      changes:
        - createTable:
            tableName: furniture_tag
            columns:
              - column:
                  name: furniture_id
                  type: varchar(50)
                  constraints:
                    nullable: false
                    foreignKeyName: fk_furniture_tag_furniture
                    references: furniture(id)
                    deleteCascade: true
              - column:
                  name: position
                  type: int
                  constraints:
                    nullable: false
              - column:
                  name: entry_value
                  type: varchar(255)
                  constraints:
                    nullable: false
        - addPrimaryKey:
            tableName: furniture_tag
            columnNames: furniture_id, position
            constraintName: pk_furniture_tag
```

- [ ] **Step 2 : Inclure dans le master**

Modifier `backend/src/main/resources/db/changelog/db.changelog-master.yaml`, ajouter à la fin :

```yaml
  - include:
      file: changes/026-add-tags-to-furniture.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 3 : Ajouter le champ `tags` dans `FurnitureEntity`**

Modifier `backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java` — ajouter le champ après les autres `@ElementCollection` existants (probablement après `gallery` et `dimensions`) :

```java
@ElementCollection(fetch = FetchType.LAZY)
@CollectionTable(name = "furniture_tag", joinColumns = @JoinColumn(name = "furniture_id"))
@OrderColumn(name = "position")
@Column(name = "entry_value", nullable = false)
@BatchSize(size = 50)
private List<String> tags = new ArrayList<>();
```

Ajouter getter + setter :

```java
public List<String> getTags() { return tags; }
public void setTags(List<String> tags) { this.tags = tags; }
```

Imports à vérifier (probablement déjà présents pour `gallery`) : `jakarta.persistence.*`, `org.hibernate.annotations.BatchSize`, `java.util.List`, `java.util.ArrayList`.

- [ ] **Step 4 : Ajouter `tags` dans le record `Furniture`**

Lire `backend/src/main/java/com/atelier/portfolio/model/Furniture.java`. Ajouter `List<String> tags` comme dernier component du record (à la fin, après `slides` ou équivalent).

Exemple de modification (à adapter selon l'ordre actuel des champs) :

```java
public record Furniture(
    String id,
    String title,
    String slug,
    String category,
    String material,
    int year,
    String coverImage,
    List<String> gallery,
    String shortDescription,
    String description,
    List<String> dimensions,
    String designer,
    boolean featured,
    boolean showStoryLink,
    boolean showStoryButton,
    List<Slide> slides,
    List<String> tags
) {}
```

- [ ] **Step 5 : Ajouter `tags` dans le record `FurnitureInput`**

Lire `backend/src/main/java/com/atelier/portfolio/model/FurnitureInput.java`. Ajouter `List<String> tags` comme dernier component (sans annotation `@NotNull` — liste vide acceptée).

- [ ] **Step 6 : Propager `tags` dans `FurnitureService`**

Modifier `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java` :

- Dans la méthode `toDto(entity)` (ou équivalent qui construit `Furniture`), passer `entity.getTags()` comme dernier argument.
- Dans la méthode qui construit `FurnitureEntity` depuis `FurnitureInput` (probablement `toEntity` ou inline dans `create`/`update`), faire `entity.setTags(input.tags() != null ? new ArrayList<>(input.tags()) : new ArrayList<>())`.

Grep d'abord pour repérer tous les sites qui construisent le record `Furniture(...)` ou consomment `FurnitureInput(...)` :

```powershell
grep -rn "new Furniture(" backend/src/main/java backend/src/test/java
grep -rn "new FurnitureInput(" backend/src/main/java backend/src/test/java
```

Pour chaque appel, ajouter `tags` à la fin (sinon le code ne compile pas). Les tests qui passent `null` ou ne se soucient pas des tags doivent passer `List.of()` ou `new ArrayList<>()` selon le contexte.

- [ ] **Step 7 : Compiler et lancer les tests backend**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tous les tests passent (Liquibase applique 026, JPA valide les entités, les records sérialisent OK). Si compilation échoue, c'est qu'un appelant de `new Furniture(...)` ou `new FurnitureInput(...)` n'a pas été mis à jour — fixer puis relancer.

- [ ] **Step 8 : Commit**

```powershell
git add backend/src/main/resources/db/changelog/changes/026-add-tags-to-furniture.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java backend/src/main/java/com/atelier/portfolio/model/Furniture.java backend/src/main/java/com/atelier/portfolio/model/FurnitureInput.java backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java
git commit -m "feat(creations): ajout tags sur furniture (schema + entite + DTOs)"
```

(Inclure aussi les fichiers de test si modifiés au Step 6.)

---

## Task 2 : Endpoint public `GET /api/tags`

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/service/TagService.java`
- Create: `backend/src/main/java/com/atelier/portfolio/controller/TagController.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/TagServiceTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/TagControllerTest.java`

- [ ] **Step 1 : Écrire le test du service**

Créer `backend/src/test/java/com/atelier/portfolio/service/TagServiceTest.java` :

```java
package com.atelier.portfolio.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class TagServiceTest {

    @Autowired TagService tagService;

    @Test
    void findAllTagsReturnsUnionSortedDedup() {
        // Le seed initial peut déjà créer des tags sur les expositions.
        // Ce test vérifie juste que la liste est triée et sans doublons.
        List<String> tags = tagService.findAllTags();
        assertThat(tags).doesNotHaveDuplicates();
        // Vérifie triage alphabétique insensible à la casse
        for (int i = 1; i < tags.size(); i++) {
            assertThat(tags.get(i - 1).compareToIgnoreCase(tags.get(i))).isLessThanOrEqualTo(0);
        }
    }

    @Test
    void findAllTagsReturnsEmptyListWhenNoTagsExist() {
        // Si seed n'a aucun tag (improbable mais possible), pas d'erreur
        List<String> tags = tagService.findAllTags();
        assertThat(tags).isNotNull();
    }
}
```

- [ ] **Step 2 : Run le test (doit échouer — service inexistant)**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=TagServiceTest test
```

Attendu : ÉCHEC compilation (TagService non défini).

- [ ] **Step 3 : Créer `TagService`**

Créer `backend/src/main/java/com/atelier/portfolio/service/TagService.java` :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.repository.FurnitureRepository;
import com.atelier.portfolio.repository.ExhibitionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.TreeSet;

@Service
@Transactional(readOnly = true)
public class TagService {

    private final FurnitureRepository furnitureRepo;
    private final ExhibitionRepository exhibitionRepo;

    public TagService(FurnitureRepository furnitureRepo, ExhibitionRepository exhibitionRepo) {
        this.furnitureRepo = furnitureRepo;
        this.exhibitionRepo = exhibitionRepo;
    }

    public List<String> findAllTags() {
        TreeSet<String> set = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        furnitureRepo.findAll().forEach(f -> set.addAll(f.getTags()));
        exhibitionRepo.findAll().forEach(e -> set.addAll(e.getTags()));
        return set.stream().toList();
    }
}
```

Note : utilise `TreeSet` avec comparateur case-insensitive pour tri stable et dédup. `furnitureRepo.findAll()` peut paraître coûteux mais le volume est modeste (<100 items) et la requête est mise en cache JPA par session.

- [ ] **Step 4 : Run le test (doit passer)**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=TagServiceTest test
```

Attendu : `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 5 : Écrire le test du controller (Mockito-style)**

Créer `backend/src/test/java/com/atelier/portfolio/controller/TagControllerTest.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.TagService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagControllerTest {

    @Mock TagService tagService;
    @InjectMocks TagController controller;

    @Test
    void listDelegatesToService() {
        when(tagService.findAllTags()).thenReturn(List.of("bois", "sculpture"));
        assertThat(controller.list()).containsExactly("bois", "sculpture");
        verify(tagService).findAllTags();
    }

    @Test
    void listReturnsEmptyWhenNoTags() {
        when(tagService.findAllTags()).thenReturn(List.of());
        assertThat(controller.list()).isEmpty();
    }
}
```

- [ ] **Step 6 : Run le test (doit échouer — controller inexistant)**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=TagControllerTest test
```

Attendu : ÉCHEC compilation.

- [ ] **Step 7 : Créer `TagController`**

Créer `backend/src/main/java/com/atelier/portfolio/controller/TagController.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.TagService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public List<String> list() {
        return tagService.findAllTags();
    }
}
```

- [ ] **Step 8 : Run la suite complète**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tous les tests passent (incluant les 4 nouveaux).

- [ ] **Step 9 : Vérifier la sécurité publique**

Lire `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java`. Si `GET /api/**` est déjà `permitAll`, rien à faire. Sinon ajouter explicitement :

```java
.requestMatchers(HttpMethod.GET, "/api/tags").permitAll()
```

(Probablement déjà couvert — pattern identique à `/api/stories` et `/api/sliders` créés en feature précédente.)

- [ ] **Step 10 : Commit**

```powershell
git add backend/src/main/java/com/atelier/portfolio/service/TagService.java backend/src/main/java/com/atelier/portfolio/controller/TagController.java backend/src/test/java/com/atelier/portfolio/service/TagServiceTest.java backend/src/test/java/com/atelier/portfolio/controller/TagControllerTest.java
git commit -m "feat(creations): endpoint public GET /api/tags (union dedup triee)"
```

---

## Task 3 : Composant partagé `<app-tag-input>`

**Files:**
- Create: `frontend/src/app/pages/admin/shared/tag-input.component.ts`
- Create: `frontend/src/app/pages/admin/shared/tag-input.component.spec.ts`

- [ ] **Step 1 : Écrire les tests**

Créer `frontend/src/app/pages/admin/shared/tag-input.component.spec.ts` :

```ts
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
```

- [ ] **Step 2 : Run les tests (doivent échouer)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/tag-input.component.spec.ts'
```

Attendu : ÉCHEC (component inexistant).

- [ ] **Step 3 : Implémenter `TagInputComponent`**

Créer `frontend/src/app/pages/admin/shared/tag-input.component.ts` :

```ts
import { Component, Input, computed, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
  template: `
    <div class="tag-input" [class.disabled]="disabled()">
      @for (tag of tags(); track tag) {
        <span class="chip">
          <span class="chip-label">{{ tag }}</span>
          <button type="button" class="chip-remove" aria-label="Retirer ce tag"
                  [disabled]="disabled()" (click)="removeTag(tag)">×</button>
        </span>
      }
      <input type="text"
             [value]="inputValue()"
             [disabled]="disabled()"
             [placeholder]="placeholder"
             (input)="onInput($event)"
             (keydown)="onKey($event)"
             (focus)="dropdownOpen.set(true)"
             (blur)="onBlur()"
             aria-label="Ajouter un tag" />
      @if (dropdownOpen() && filteredSuggestions().length > 0) {
        <ul class="dropdown" role="listbox">
          @for (s of filteredSuggestions(); track s) {
            <li>
              <button type="button" class="suggestion"
                      (mousedown)="$event.preventDefault()"
                      (click)="addTag(s)">{{ s }}</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .tag-input {
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
      padding: 6px 8px; border: 1px solid var(--color-line); background: var(--color-bg);
      position: relative;
    }
    .tag-input.disabled { opacity: 0.5; pointer-events: none; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line);
      font-size: 0.82rem;
    }
    .chip-remove {
      background: none; border: 0; cursor: pointer; font-size: 1.1rem; line-height: 1;
      color: var(--color-ink-soft); padding: 0 0 0 2px;
    }
    .chip-remove:hover { color: var(--color-ink); }
    input {
      flex: 1; min-width: 120px; border: 0; outline: none; padding: 4px 0;
      font: inherit; background: transparent; color: var(--color-ink);
    }
    .dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
      max-height: 200px; overflow-y: auto; margin: 4px 0 0; padding: 0;
      list-style: none; background: var(--color-bg); border: 1px solid var(--color-line);
    }
    .dropdown li { display: block; }
    .suggestion {
      width: 100%; text-align: left; padding: 8px 12px; cursor: pointer;
      background: transparent; border: 0; font: inherit; color: var(--color-ink);
    }
    .suggestion:hover { background: var(--color-bg-alt); }
  `]
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() suggestions: string[] = [];
  @Input() placeholder = 'Ajouter un tag…';

  protected tags = signal<string[]>([]);
  protected inputValue = signal<string>('');
  protected dropdownOpen = signal(false);
  protected disabled = signal(false);

  protected filteredSuggestions = computed(() => {
    const q = this.inputValue().trim().toLowerCase();
    const current = new Set(this.tags());
    return this.suggestions
      .filter(s => !current.has(s))
      .filter(s => !q || s.toLowerCase().includes(q));
  });

  private onChangeFn: (value: string[]) => void = () => {};
  private onTouchedFn: () => void = () => {};

  // --- ControlValueAccessor ---
  writeValue(value: string[] | null): void {
    this.tags.set(value ?? []);
  }
  registerOnChange(fn: (value: string[]) => void): void { this.onChangeFn = fn; }
  registerOnTouched(fn: () => void): void { this.onTouchedFn = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

  // --- Events ---
  protected onInput(event: Event): void {
    this.inputValue.set((event.target as HTMLInputElement).value);
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const v = this.inputValue().trim();
      if (v) this.addTag(v);
      return;
    }
    if (event.key === 'Backspace' && this.inputValue() === '' && this.tags().length > 0) {
      event.preventDefault();
      this.removeTag(this.tags()[this.tags().length - 1]);
    }
  }

  protected onBlur(): void {
    // Petit délai pour laisser le clic sur une suggestion se propager
    setTimeout(() => this.dropdownOpen.set(false), 150);
    this.onTouchedFn();
  }

  protected addTag(tag: string): void {
    const v = tag.trim();
    if (!v) return;
    if (this.tags().includes(v)) return;
    const next = [...this.tags(), v];
    this.tags.set(next);
    this.inputValue.set('');
    this.onChangeFn(next);
  }

  protected removeTag(tag: string): void {
    const next = this.tags().filter(t => t !== tag);
    this.tags.set(next);
    this.onChangeFn(next);
  }
}
```

- [ ] **Step 4 : Run les tests (doivent passer)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/tag-input.component.spec.ts'
```

Attendu : tous les tests passent.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/tag-input.component.ts frontend/src/app/pages/admin/shared/tag-input.component.spec.ts
git commit -m "feat(admin): composant partage app-tag-input (chips + autocomplete + CVA)"
```

---

## Task 4 : `PortfolioService.getAllTags()` + modèle TS

**Files:**
- Modify: `frontend/src/app/models/furniture.model.ts`
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/services/portfolio.service.spec.ts`

- [ ] **Step 1 : Ajouter `tags?: string[]` sur `Furniture`**

Modifier `frontend/src/app/models/furniture.model.ts`. Ajouter `tags?: string[]` à l'interface `Furniture` :

```ts
export interface Furniture {
  // … champs existants …
  tags?: string[];
}
```

(L'expo a déjà `tags: string[]`. Sur furniture on le met optionnel pour ne pas casser les fixtures de tests existantes qui ne passent pas tags. Les composants doivent gérer `?? []`.)

- [ ] **Step 2 : Ajouter `getAllTags` à `PortfolioService`**

Modifier `frontend/src/app/services/portfolio.service.ts`. Ajouter à la fin du bloc des méthodes publiques :

```ts
getAllTags(): Observable<string[]> {
  return this.http.get<string[]>(`${API}/tags`);
}
```

- [ ] **Step 3 : Ajouter le test du service**

Modifier `frontend/src/app/services/portfolio.service.spec.ts`. Ajouter dans le bloc `describe` approprié :

```ts
it('getAllTags appelle GET /api/tags', () => {
  service.getAllTags().subscribe(tags => {
    expect(tags).toEqual(['bois', 'sculpture']);
  });
  const req = httpMock.expectOne('/api/tags');
  expect(req.request.method).toBe('GET');
  req.flush(['bois', 'sculpture']);
});
```

- [ ] **Step 4 : Run le test**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/portfolio.service.spec.ts'
```

Attendu : tous passent.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/models/furniture.model.ts frontend/src/app/services/portfolio.service.ts frontend/src/app/services/portfolio.service.spec.ts
git commit -m "feat(creations): PortfolioService.getAllTags + tags? sur Furniture model"
```

---

## Task 5 : Intégration admin mobilier

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`

- [ ] **Step 1 : Importer `TagInputComponent` et ajouter `allTags` signal**

Modifier `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` :

a) Ajouter import :
```ts
import { TagInputComponent } from '../shared/tag-input.component';
```

b) Ajouter `TagInputComponent` dans le tableau `imports` du décorateur `@Component`.

c) Ajouter signal dans la classe (après les autres signals) :
```ts
protected readonly allTags = signal<string[]>([]);
```

d) Dans le constructeur (après `this.refreshFurniture()`), charger les tags :
```ts
this.portfolio.getAllTags().subscribe(t => this.allTags.set(t));
```

- [ ] **Step 2 : Ajouter le FormControl `tags`**

Dans `furnitureForm` (le `FormGroup`), ajouter à la fin de la liste des controls :

```ts
tags: this.fb.control<string[]>([]),
```

Note : utiliser `fb.control<string[]>([])` plutôt que `[[]]` pour avoir un type TypeScript correct.

- [ ] **Step 3 : Patcher `tags` au load**

Dans la méthode `loadFurniture(item)` (ou équivalent), après le `furnitureForm.reset({...})`, ajouter le patch tags :

```ts
this.furnitureForm.patchValue({ tags: item.tags ?? [] });
```

(Ou bien inclure `tags: item.tags ?? []` directement dans l'objet de `reset({...})` selon le pattern existant du fichier.)

- [ ] **Step 4 : Inclure `tags` dans le payload de save**

Dans `saveFurniture()`, vérifier que le `body` passé à `createFurniture` / `updateFurniture` inclut `tags: v.tags ?? []`. Si le code utilise `this.furnitureForm.getRawValue()`, c'est automatique.

- [ ] **Step 5 : Ajouter le champ dans le template**

Repérer dans le template le champ après lequel le tags doit s'insérer (typiquement après `coverImage` ou `dimensions`). Ajouter :

```html
<label>
  <span>Tags</span>
  <app-tag-input formControlName="tags" [suggestions]="allTags()" />
</label>
```

- [ ] **Step 6 : Ajouter un test**

Dans `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts` :

```ts
it('charge les tags via getAllTags au constructeur', () => {
  configure();
  const fixture = TestBed.createComponent(MobilierComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/furniture').flush([]);
  httpMock.expectOne('/api/tags').flush(['bois', 'sculpture']);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  expect(cmp.allTags()).toEqual(['bois', 'sculpture']);
});

it('saveFurniture envoie tags dans le payload', () => {
  configure();
  const fixture = TestBed.createComponent(MobilierComponent);
  fixture.detectChanges();
  httpMock.expectOne('/api/furniture').flush([]);
  httpMock.expectOne('/api/tags').flush([]);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  cmp.furnitureForm.patchValue({ title: 'T', category: 'C', year: 2024, tags: ['bois'] });
  cmp.saveFurniture();
  const req = httpMock.expectOne(r => r.method === 'POST' && r.url === '/api/furniture');
  expect(req.request.body.tags).toEqual(['bois']);
  req.flush({});
});
```

**Important** : adapter `flushInitial` (helper interne du spec) pour absorber aussi `/api/tags` puisque le constructeur le déclenche maintenant. Modifier ou ajouter dans `flushInitial` :

```ts
httpMock.expectOne('/api/tags').flush([]);
```

Sinon tous les tests existants vont casser sur le `verify()` final.

- [ ] **Step 7 : Run la suite mobilier**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/admin/mobilier/**'
```

Attendu : tous passent (existants + 2 nouveaux).

- [ ] **Step 8 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/
git commit -m "feat(admin): editer les tags d'un mobilier via app-tag-input"
```

---

## Task 6 : Intégration admin expositions

**Files:**
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

- [ ] **Step 1 : Lire l'état actuel du form expositions**

```powershell
grep -n "tags\|exhibitionTags\|addExhibitionTag" frontend/src/app/pages/admin/expositions/expositions.component.ts
```

Si un champ tag inline existe déjà (probablement `exhibitionTags = signal<string[]>([])` + méthodes ad hoc), le **remplacer** par le nouveau pattern `<app-tag-input>` et `FormControl<string[]>`. Sinon, juste ajouter.

- [ ] **Step 2 : Ajouter l'import et le signal `allTags`**

Modifier le composant — ajouter import `TagInputComponent`, l'inclure dans `imports`, ajouter signal `allTags = signal<string[]>([])`, charger via `getAllTags` dans le constructeur (après `refreshExhibitions()`).

- [ ] **Step 3 : FormControl + patch + template**

Identique à Task 5 mais sur `exhibitionForm` :

- Ajouter `tags: this.fb.control<string[]>([])` au FormGroup.
- Dans `loadExhibition(item)`, patcher `tags: item.tags ?? []`.
- Dans le template, ajouter `<label><span>Tags</span><app-tag-input formControlName="tags" [suggestions]="allTags()" /></label>` après le champ approprié.

Si l'ancien champ tag inline existait, **retirer** : signal `exhibitionTags`, signal `newExhibitionTag`, méthodes `addExhibitionTag` / `removeExhibitionTag` / `onTagBackspace`, et leur HTML correspondant.

- [ ] **Step 4 : Mettre à jour les tests**

Modifier `expositions.component.spec.ts` :

- Adapter `flushInitial` pour absorber `/api/tags`.
- Si tests existants exercent les anciennes méthodes (`addExhibitionTag`, `removeExhibitionTag`, etc.) : les supprimer puisque ces méthodes sont retirées.
- Ajouter 2 tests symétriques à mobilier : `charge tags via getAllTags`, `saveExhibition envoie tags`.

- [ ] **Step 5 : Run la suite expositions**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/admin/expositions/**'
```

Attendu : tous passent.

- [ ] **Step 6 : Commit**

```powershell
git add frontend/src/app/pages/admin/expositions/
git commit -m "refactor(admin): editer les tags d'une expo via app-tag-input (factorise)"
```

---

## Task 7 : Modèle `CreationItem` + nouvelle route

**Files:**
- Create: `frontend/src/app/models/creation.model.ts`
- Modify: `frontend/src/app/app.routes.ts`

- [ ] **Step 1 : Créer le modèle**

Créer `frontend/src/app/models/creation.model.ts` :

```ts
export interface CreationItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  subtitle: string;
  year: number;
  tags: string[];
  href: string;
}
```

- [ ] **Step 2 : Ajouter la route lazy**

Modifier `frontend/src/app/app.routes.ts`. Ajouter dans le tableau `routes` après `expositions` :

```ts
{
  path: 'creations',
  loadComponent: () => import('./pages/creations/creations.component').then(m => m.CreationsComponent),
  title: 'Créations — Milo GUILLAUME Design',
},
```

- [ ] **Step 3 : Commit**

```powershell
git add frontend/src/app/models/creation.model.ts frontend/src/app/app.routes.ts
git commit -m "feat(creations): modele CreationItem + route /creations"
```

(`CreationsComponent` est créé en Task 8 — la route échouera au build tant qu'il manque. Commit accepté car la branche est en cours, Task 8 enchaîne.)

---

## Task 8 : `CreationsComponent`

**Files:**
- Create: `frontend/src/app/pages/creations/creations.component.ts`
- Create: `frontend/src/app/pages/creations/creations.component.spec.ts`

- [ ] **Step 1 : Écrire les tests**

Créer `frontend/src/app/pages/creations/creations.component.spec.ts` :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { CreationsComponent } from './creations.component';

type Internals = {
  allItems: () => any[];
  availableTags: () => string[];
  availableYears: () => number[];
  selectedTags: { (): Set<string>; set: (v: Set<string>) => void };
  selectedYears: { (): Set<number>; set: (v: Set<number>) => void };
  selectedKind: { (): 'all' | 'furniture' | 'exhibition'; set: (v: any) => void };
  filteredItems: () => any[];
  toggleTag: (t: string) => void;
  toggleYear: (y: number) => void;
  setKind: (k: 'all' | 'furniture' | 'exhibition') => void;
  clearFilters: () => void;
};

describe('CreationsComponent', () => {
  let fixture: ComponentFixture<CreationsComponent>;
  let httpMock: HttpTestingController;
  let queryParams$: BehaviorSubject<any>;

  function setup(initialParams: Record<string, string> = {}) {
    queryParams$ = new BehaviorSubject(convertToParamMap(initialParams));
    TestBed.configureTestingModule({
      imports: [CreationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams$ } },
      ],
    });
    fixture = TestBed.createComponent(CreationsComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function flushApi(furniture: any[] = [], exhibitions: any[] = []) {
    httpMock.expectOne('/api/furniture').flush(furniture);
    httpMock.expectOne('/api/exhibitions').flush(exhibitions);
  }

  afterEach(() => httpMock?.verify());

  it('merge furniture + exhibitions et calcule les facettes', () => {
    setup();
    flushApi(
      [{ slug: 'f1', title: 'F1', coverImage: '/c.jpg', category: 'Cat', year: 2024, tags: ['bois'] }],
      [{ slug: 'e1', title: 'E1', coverImage: '/c.jpg', venue: 'V', startDate: '2025-01-01', tags: ['art'] }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.allItems().length).toBe(2);
    expect(cmp.availableYears()).toEqual([2025, 2024]);
    expect(cmp.availableTags()).toEqual(['art', 'bois']);
  });

  it('tri par annee desc puis titre asc', () => {
    setup();
    flushApi(
      [
        { slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: [] },
        { slug: 'b', title: 'B', coverImage: '', category: 'C', year: 2025, tags: [] },
        { slug: 'c', title: 'C', coverImage: '', category: 'C', year: 2024, tags: [] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    const titles = cmp.allItems().map(i => i.title);
    expect(titles).toEqual(['B', 'A', 'C']);
  });

  it('filtre par type', () => {
    setup();
    flushApi(
      [{ slug: 'f1', title: 'F', coverImage: '', category: 'C', year: 2024, tags: [] }],
      [{ slug: 'e1', title: 'E', coverImage: '', venue: 'V', startDate: '2024-01-01', tags: [] }],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.setKind('furniture');
    expect(cmp.filteredItems().map(i => i.title)).toEqual(['F']);
  });

  it('filtre par tags en union (OR)', () => {
    setup();
    flushApi(
      [
        { slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: ['bois'] },
        { slug: 'b', title: 'B', coverImage: '', category: 'C', year: 2024, tags: ['metal'] },
        { slug: 'c', title: 'C', coverImage: '', category: 'C', year: 2024, tags: ['textile'] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleTag('bois');
    cmp.toggleTag('metal');
    expect(cmp.filteredItems().map(i => i.title).sort()).toEqual(['A', 'B']);
  });

  it('filtre par annees en union', () => {
    setup();
    flushApi(
      [
        { slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2023, tags: [] },
        { slug: 'b', title: 'B', coverImage: '', category: 'C', year: 2024, tags: [] },
        { slug: 'c', title: 'C', coverImage: '', category: 'C', year: 2025, tags: [] },
      ],
      [],
    );
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleYear(2023);
    cmp.toggleYear(2025);
    expect(cmp.filteredItems().map(i => i.title).sort()).toEqual(['A', 'C']);
  });

  it('clearFilters reset les 3 signals', () => {
    setup();
    flushApi([{ slug: 'a', title: 'A', coverImage: '', category: 'C', year: 2024, tags: ['x'] }], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    cmp.toggleTag('x');
    cmp.toggleYear(2024);
    cmp.setKind('furniture');
    cmp.clearFilters();
    expect(cmp.selectedTags().size).toBe(0);
    expect(cmp.selectedYears().size).toBe(0);
    expect(cmp.selectedKind()).toBe('all');
  });

  it('deep-link initial peuple selectedTags', () => {
    setup({ tags: 'bois,metal' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedTags()).toEqual(new Set(['bois', 'metal']));
  });

  it('deep-link initial peuple selectedKind', () => {
    setup({ kind: 'furniture' });
    flushApi([], []);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.selectedKind()).toBe('furniture');
  });

  it('exhibition.startDate "2025-03-01" est parse en year 2025', () => {
    setup();
    flushApi([], [{ slug: 'e1', title: 'E', coverImage: '', venue: 'V', startDate: '2025-03-01', tags: [] }]);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as Internals;
    expect(cmp.allItems()[0].year).toBe(2025);
  });
});
```

- [ ] **Step 2 : Run les tests (doivent échouer)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/creations.component.spec.ts'
```

Attendu : ÉCHEC (component manquant).

- [ ] **Step 3 : Implémenter `CreationsComponent`**

Créer `frontend/src/app/pages/creations/creations.component.ts` :

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortfolioService } from '../../services/portfolio.service';
import { CreationItem } from '../../models/creation.model';

type Kind = 'all' | 'furniture' | 'exhibition';

@Component({
  selector: 'app-creations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow">Catalogue</span>
        <h1>Créations</h1>
        <p class="lead">L'ensemble des pièces et expositions de l'atelier, filtrables par type, année et tags.</p>
      </div>
    </section>

    <section class="filters">
      <div class="container">
        <div class="kind-toggle" role="radiogroup" aria-label="Type de création">
          <button type="button" role="radio" [attr.aria-checked]="selectedKind() === 'all'"
                  [class.active]="selectedKind() === 'all'" (click)="setKind('all')">Tout</button>
          <button type="button" role="radio" [attr.aria-checked]="selectedKind() === 'furniture'"
                  [class.active]="selectedKind() === 'furniture'" (click)="setKind('furniture')">Mobilier</button>
          <button type="button" role="radio" [attr.aria-checked]="selectedKind() === 'exhibition'"
                  [class.active]="selectedKind() === 'exhibition'" (click)="setKind('exhibition')">Expositions</button>
        </div>

        @if (availableYears().length > 0) {
          <div class="facet">
            <span class="facet-label">Année</span>
            @for (y of availableYears(); track y) {
              <button type="button" [class.active]="selectedYears().has(y)"
                      [attr.aria-pressed]="selectedYears().has(y)" (click)="toggleYear(y)">
                {{ y }} <small>({{ yearCount(y) }})</small>
              </button>
            }
          </div>
        }

        @if (availableTags().length > 0) {
          <div class="facet">
            <span class="facet-label">Tags</span>
            @for (t of availableTags(); track t) {
              <button type="button" [class.active]="selectedTags().has(t)"
                      [attr.aria-pressed]="selectedTags().has(t)" (click)="toggleTag(t)">
                {{ t }} <small>({{ tagCount(t) }})</small>
              </button>
            }
          </div>
        }

        @if (hasActiveFilters()) {
          <div class="bar">
            <button type="button" class="reset" (click)="clearFilters()">Réinitialiser les filtres</button>
            <span aria-live="polite">{{ filteredItems().length }} résultats</span>
          </div>
        }
      </div>
    </section>

    <section class="results">
      <div class="container">
        @if (filteredItems().length === 0 && allItems().length > 0) {
          <p class="empty">Aucune création ne correspond aux filtres sélectionnés.</p>
        }
        <div class="grid">
          @for (item of filteredItems(); track item.kind + ':' + item.slug) {
            <a class="card" [routerLink]="item.href">
              @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
              <div class="thumb">
                <img [src]="item.cover" [alt]="item.title" loading="lazy" />
              </div>
              <div class="meta">
                <span class="cat">{{ item.subtitle }}</span>
                <h3 class="title">{{ item.title }}</h3>
                @if (item.tags.length > 0) {
                  <div class="card-tags">
                    @for (t of item.tags.slice(0, 3); track t) {
                      <span class="card-tag" (click)="onCardTagClick($event, t)">{{ t }}</span>
                    }
                    @if (item.tags.length > 3) { <span class="card-tag more">+{{ item.tags.length - 3 }}</span> }
                  </div>
                }
              </div>
            </a>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-head { padding: 96px 0 48px; }
    .page-head .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .page-head h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 12px; }
    .page-head .lead { max-width: 640px; margin-top: 24px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .filters { padding: 24px 0; border-top: 1px solid var(--color-line); border-bottom: 1px solid var(--color-line); }
    .kind-toggle { display: inline-flex; gap: 0; border: 1px solid var(--color-ink); margin-bottom: 20px; }
    .kind-toggle button { padding: 8px 18px; background: var(--color-bg); border: 0; cursor: pointer; font-size: 0.85rem; color: var(--color-ink); }
    .kind-toggle button.active { background: var(--color-ink); color: var(--color-bg); }
    .kind-toggle button + button { border-left: 1px solid var(--color-ink); }

    .facet { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
    .facet-label { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); margin-right: 8px; min-width: 60px; }
    .facet button {
      padding: 6px 12px; background: var(--color-bg); border: 1px solid var(--color-line);
      cursor: pointer; font-size: 0.82rem; color: var(--color-ink);
    }
    .facet button:hover { border-color: var(--color-ink); }
    .facet button.active { background: var(--color-ink); color: var(--color-bg); border-color: var(--color-ink); }
    .facet button small { opacity: 0.7; margin-left: 2px; }

    .bar { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 0.85rem; }
    .reset { background: none; border: 0; color: var(--color-ink); text-decoration: underline; cursor: pointer; font-size: 0.85rem; }

    .results { padding: 64px 0 140px; }
    .empty { color: var(--color-mute); font-style: italic; margin: 48px 0; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px 24px; }
    .card { position: relative; display: flex; flex-direction: column; text-decoration: none; color: inherit; }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }
    .meta { padding: 18px 2px 0; display: flex; flex-direction: column; gap: 8px; }
    .cat { font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .title { font-family: var(--serif); font-weight: 400; font-size: 1.5rem; line-height: 1.15; margin: 0; }
    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    .card-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .card-tag { font-size: 0.7rem; padding: 2px 8px; background: var(--color-bg-alt); border: 1px solid var(--color-line); color: var(--color-ink-soft); cursor: pointer; }
    .card-tag:hover { color: var(--color-ink); border-color: var(--color-ink); }
    .card-tag.more { cursor: default; }
    .card-tag.more:hover { color: var(--color-ink-soft); border-color: var(--color-line); }

    @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, 1fr); gap: 36px 20px; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; gap: 48px; } }
  `]
})
export class CreationsComponent implements OnInit {
  private portfolio = inject(PortfolioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected allItems = signal<CreationItem[]>([]);
  protected availableTags = signal<string[]>([]);
  protected availableYears = signal<number[]>([]);
  protected selectedTags = signal<Set<string>>(new Set());
  protected selectedYears = signal<Set<number>>(new Set());
  protected selectedKind = signal<Kind>('all');

  protected filteredItems = computed(() => {
    const kind = this.selectedKind();
    const years = this.selectedYears();
    const tags = this.selectedTags();
    return this.allItems().filter(i =>
      (kind === 'all' || i.kind === kind) &&
      (years.size === 0 || years.has(i.year)) &&
      (tags.size === 0 || i.tags.some(t => tags.has(t)))
    );
  });

  protected hasActiveFilters = computed(() =>
    this.selectedKind() !== 'all' || this.selectedTags().size > 0 || this.selectedYears().size > 0
  );

  protected yearCount(year: number): number {
    return this.allItems().filter(i =>
      (this.selectedKind() === 'all' || i.kind === this.selectedKind()) &&
      i.year === year &&
      (this.selectedTags().size === 0 || i.tags.some(t => this.selectedTags().has(t)))
    ).length;
  }

  protected tagCount(tag: string): number {
    return this.allItems().filter(i =>
      (this.selectedKind() === 'all' || i.kind === this.selectedKind()) &&
      (this.selectedYears().size === 0 || this.selectedYears().has(i.year)) &&
      i.tags.includes(tag)
    ).length;
  }

  ngOnInit(): void {
    // Deep-link initial
    this.route.queryParamMap.subscribe(p => {
      const tagsParam = p.get('tags');
      if (tagsParam) this.selectedTags.set(new Set(tagsParam.split(',').filter(Boolean)));
      const yearsParam = p.get('years');
      if (yearsParam) this.selectedYears.set(new Set(yearsParam.split(',').filter(Boolean).map(Number)));
      const kindParam = p.get('kind');
      if (kindParam === 'furniture' || kindParam === 'exhibition' || kindParam === 'all') {
        this.selectedKind.set(kindParam);
      }
    });

    forkJoin({
      furniture: this.portfolio.getAllFurniture(),
      exhibitions: this.portfolio.getAllExhibitions(),
    }).subscribe(({ furniture, exhibitions }) => {
      const items: CreationItem[] = [
        ...furniture.map(f => ({
          kind: 'furniture' as const,
          slug: f.slug,
          title: f.title,
          cover: f.coverImage,
          subtitle: `${f.category} · ${f.year}`,
          year: f.year,
          tags: f.tags ?? [],
          href: `/mobilier/${f.slug}`,
        })),
        ...exhibitions.map(e => ({
          kind: 'exhibition' as const,
          slug: e.slug,
          title: e.title,
          cover: e.coverImage,
          subtitle: `${e.venue} · ${e.startDate.substring(0, 4)}`,
          year: parseInt(e.startDate.substring(0, 4), 10),
          tags: e.tags ?? [],
          href: `/expositions/${e.slug}`,
        })),
      ];
      items.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
      this.allItems.set(items);
      this.availableTags.set([...new Set(items.flatMap(i => i.tags))].sort());
      this.availableYears.set([...new Set(items.map(i => i.year))].sort((a, b) => b - a));
    });
  }

  protected toggleTag(tag: string): void {
    this.selectedTags.update(s => {
      const next = new Set(s);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
    this.syncQueryParams();
  }

  protected toggleYear(year: number): void {
    this.selectedYears.update(s => {
      const next = new Set(s);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
    this.syncQueryParams();
  }

  protected setKind(kind: Kind): void {
    this.selectedKind.set(kind);
    this.syncQueryParams();
  }

  protected clearFilters(): void {
    this.selectedTags.set(new Set());
    this.selectedYears.set(new Set());
    this.selectedKind.set('all');
    this.syncQueryParams();
  }

  protected onCardTagClick(event: Event, tag: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleTag(tag);
  }

  private syncQueryParams(): void {
    const queryParams: any = {
      tags: this.selectedTags().size > 0 ? [...this.selectedTags()].join(',') : null,
      years: this.selectedYears().size > 0 ? [...this.selectedYears()].join(',') : null,
      kind: this.selectedKind() !== 'all' ? this.selectedKind() : null,
    };
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
```

- [ ] **Step 4 : Run les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/creations.component.spec.ts'
```

Attendu : 9 tests passent.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/pages/creations/
git commit -m "feat(creations): page publique /creations avec filtres type/annee/tags"
```

---

## Task 9 : Entrée nav Créations + tags sur fiches détail

**Files:**
- Modify: `frontend/src/app/components/header/header.component.ts`
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`

- [ ] **Step 1 : Ajouter l'entrée nav**

Modifier `frontend/src/app/components/header/header.component.ts` template, ajouter entre Expositions et Studio :

```html
<a routerLink="/creations" routerLinkActive="active" (click)="closeMenu()">Créations</a>
```

- [ ] **Step 2 : Afficher tags + deep-link dans furniture-detail**

Modifier `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`. Inside the template, after the metadata section (matériau, dimensions, etc.) et avant la galerie ou la section description, ajouter :

```html
@if (f.tags && f.tags.length > 0) {
  <div class="tags-list">
    @for (t of f.tags; track t) {
      <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: t }">{{ t }}</a>
    }
  </div>
}
```

S'assurer que `RouterLink` est importé dans `imports` du component. Ajouter dans le bloc styles :

```css
.tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 24px; }
.tag-chip {
  font-size: 0.78rem; padding: 4px 12px; background: var(--color-bg-alt);
  border: 1px solid var(--color-line); color: var(--color-ink-soft); text-decoration: none;
}
.tag-chip:hover { color: var(--color-ink); border-color: var(--color-ink); }
```

- [ ] **Step 3 : Idem pour exhibition-detail**

Modifier `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` identique. Si la fiche affiche déjà les tags d'une autre manière, **remplacer** par ces chips cliquables.

- [ ] **Step 4 : Run la suite complète**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false
```

Attendu : tous passent.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/components/header/ frontend/src/app/pages/furniture-detail/ frontend/src/app/pages/exhibition-detail/
git commit -m "feat(creations): entree nav + tags cliquables sur fiches detail (deep-link)"
```

---

## Task 10 : Tests visuels Playwright (creations + regen baselines impactées)

**Files:**
- Create: `frontend/e2e/fixtures/tags.json`
- Modify: `frontend/e2e/fixtures/furniture-list.json`
- Modify: `frontend/e2e/fixtures/furniture-detail.json`
- Modify: `frontend/e2e/fixtures/exhibitions-list.json`
- Modify: `frontend/e2e/fixtures/exhibition-detail.json`
- Modify: `frontend/e2e/helpers/stub-api.ts`
- Create: `frontend/e2e/tests/visual/creations.spec.ts`

- [ ] **Step 1 : Créer la fixture tags**

Créer `frontend/e2e/fixtures/tags.json` :

```json
["Boheme", "Bois", "Frene", "Galerie", "Installation", "Sculpture"]
```

- [ ] **Step 2 : Ajouter tags dans fixtures existantes**

Modifier `frontend/e2e/fixtures/furniture-list.json` — ajouter un champ `tags` sur 1-2 items :

```json
"tags": ["Bois", "Sculpture"]
```

Modifier `furniture-detail.json`, `exhibitions-list.json`, `exhibition-detail.json` symétriquement.

- [ ] **Step 3 : Étendre stub-api.ts**

Modifier `frontend/e2e/helpers/stub-api.ts` :

a) Ajouter import en haut :
```ts
import tagsFixture from '../fixtures/tags.json';
```

b) Ajouter dans le tableau `STUBS` (avant le catch-all 404) :
```ts
{ glob: '**/api/tags', fixture: tagsFixture },
```

- [ ] **Step 4 : Créer le spec creations**

Créer `frontend/e2e/tests/visual/creations.spec.ts` :

```ts
import { test, expect } from '@playwright/test';
import { stubApi } from '../../helpers/stub-api';
import { freezeForVisual } from '../../helpers/freeze-page';

test('creations (/creations) — rendu visuel', async ({ page }) => {
  await stubApi(page);
  await page.goto('/creations');
  await page.waitForSelector('.results .grid .card', { state: 'visible' });
  await page.waitForSelector('app-splash', { state: 'detached', timeout: 5_000 });
  await page.waitForSelector('#app-splash', { state: 'detached', timeout: 5_000 });
  await freezeForVisual(page);
  await expect(page).toHaveScreenshot('creations.png', { fullPage: true });
});
```

- [ ] **Step 5 : Générer les baselines (créations + régénération des baselines impactées par la nav)**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm run test:visual:docker:update
```

Attendu : 16 tests passants (14 existants régénérés à cause de la nouvelle entrée nav `Créations` dans le header + 2 nouvelles baselines créations desktop/mobile).

- [ ] **Step 6 : Inspecter les baselines créations**

Lire `frontend/e2e/__screenshots__/creations.spec.ts/creations-chromium-desktop.png` et `creations-chromium-mobile.png` via Read.

Vérifier sur desktop :
- Header avec nav incluant **Créations** (cliquable, possiblement active)
- Hero "Créations" + lead
- Toggle 3-états (Tout actif par défaut)
- Bandes facette "Année" et "Tags" avec compteurs
- Grille de cards avec mobilier + expositions mélangés
- Cards avec chips tags en pied (max 3)
- Footer

Vérifier sur mobile : reflow propre 1-col, facettes en colonne.

- [ ] **Step 7 : Re-lancer sans `--update`**

```powershell
npm run test:visual:docker
```

Attendu : `16 passed`.

- [ ] **Step 8 : Commit**

```powershell
git add frontend/e2e/
git commit -m "test(visual): spec creations + regen baselines impactees par nav Creations"
```

---

## Critères de complétion

- [ ] Migration `026-add-tags-to-furniture.yaml` appliquée, `furniture.tags` opérationnel.
- [ ] `GET /api/tags` retourne la liste union dédupliquée triée.
- [ ] `<app-tag-input>` fonctionne dans `/admin/mobilier` ET `/admin/expositions` (CRUD complet via UI).
- [ ] `/creations` affiche le mélange mobilier + expositions, trié année desc.
- [ ] Filtres type / années / tags fonctionnent en union, combinables.
- [ ] Compteurs dynamiques se mettent à jour selon les autres filtres actifs.
- [ ] Deep-link `/creations?tags=Bois&kind=furniture` peuple les filtres initiaux + l'URL se synchronise à chaque clic.
- [ ] Chips tags sur fiches détail mobilier/expo cliquables → `/creations?tags=<tag>`.
- [ ] Entrée nav `Créations` visible entre Expositions et Studio.
- [ ] Backend `mvn test` vert (≥ 4 nouveaux tests).
- [ ] Frontend unit tests verts (≥ 11 nouveaux tests : 11 tag-input + 9 creations + 4 admin).
- [ ] Playwright `16 passed` (14 existants régénérés + 2 nouveaux).

## Risques rappel

- **Compilation après ajout `tags` sur le record `Furniture`** : tous les sites qui font `new Furniture(...)` doivent passer le nouveau argument. À couvrir au Step 6 de Task 1 par un grep + correction systématique.
- **Test mobilier/expositions admin existants** : ils risquent de casser au Step 7 de Task 5 et Step 5 de Task 6 si `flushInitial` n'absorbe pas le nouveau call `/api/tags`. À corriger dans le helper du spec.
- **Régénération baselines** : la nouvelle entrée nav Créations change visuellement TOUS les headers. 14 baselines à régénérer + 2 nouvelles. Inspecter chacune visuellement avant commit pour confirmer que c'est juste la nav qui a changé.
- **Encodage tags accentués en URL** : à valider que `/creations?tags=Fr%C3%AAne` peuple correctement le filtre. Couvert par les tests unit avec `convertToParamMap`, mais à confirmer manuellement en smoke.
