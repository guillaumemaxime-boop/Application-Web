# Stories multiples + sliders d'actualités — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorer le domaine "stories" pour permettre plusieurs stories par mobilier/exposition, et créer des sliders d'actualités composés manuellement et placés sur 3 zones de la home.

**Architecture:** 3 nouvelles entités relationnelles (`story`, `news_slider`, `slider_story`) + refactor `story_slide` pour pointer vers `story_id` au lieu de `(owner_kind, owner_id)`. Migration Liquibase en 4 changesets ordonnés avec backfill seed (1 story par owner existant). Clean break sur l'API legacy `/api/admin/slides/{kind}/{ownerId}`. Côté Angular : nouveau composant `<app-news-slider>` (carousel cards 4:5) injecté dans 3 zones de `HomeComponent`, refactor `slides-editor` pour prendre un `storyId`, nouvelle page admin `/admin/sliders`.

**Tech Stack:** Spring Boot 4 (Java 25), JPA + Liquibase + H2 (test) / Postgres (prod), Angular 21 (standalone components + signals + new control flow), Karma/Jasmine pour unit tests, Playwright pour visual regression.

**Référence :** spec validée → [docs/superpowers/specs/2026-06-04-stories-multiples-sliders-design.md](../specs/2026-06-04-stories-multiples-sliders-design.md)

---

## File Structure

### Backend — créés

| Fichier | Rôle |
|---|---|
| `backend/src/main/resources/db/changelog/changes/022-create-story.yaml` | Table `story` + index |
| `backend/src/main/resources/db/changelog/changes/023-seed-default-stories.yaml` | Backfill 1 story par owner depuis `story_slide` |
| `backend/src/main/resources/db/changelog/changes/024-refactor-story-slide.yaml` | `story_slide` : add `story_id`, backfill, drop `owner_kind/owner_id` |
| `backend/src/main/resources/db/changelog/changes/025-create-news-slider.yaml` | Tables `news_slider` + `slider_story` |
| `backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java` | Entité JPA `story` |
| `backend/src/main/java/com/atelier/portfolio/entity/NewsSliderEntity.java` | Entité JPA `news_slider` |
| `backend/src/main/java/com/atelier/portfolio/entity/NewsSliderStoryEntity.java` | Entité jointure (composite PK) |
| `backend/src/main/java/com/atelier/portfolio/entity/NewsSliderStoryId.java` | Composite PK |
| `backend/src/main/java/com/atelier/portfolio/enums/SliderZone.java` | Enum des zones |
| `backend/src/main/java/com/atelier/portfolio/repository/StoryRepository.java` | Repo Spring Data |
| `backend/src/main/java/com/atelier/portfolio/repository/NewsSliderRepository.java` | Repo Spring Data |
| `backend/src/main/java/com/atelier/portfolio/service/NewsSliderService.java` | Service CRUD slider + composition |
| `backend/src/main/java/com/atelier/portfolio/model/Story.java` | DTO record |
| `backend/src/main/java/com/atelier/portfolio/model/StoryInput.java` | DTO record (create/update) |
| `backend/src/main/java/com/atelier/portfolio/model/StoryWithSlides.java` | DTO public (story + slides) |
| `backend/src/main/java/com/atelier/portfolio/model/NewsSlider.java` | DTO admin |
| `backend/src/main/java/com/atelier/portfolio/model/NewsSliderInput.java` | DTO record (create/update) |
| `backend/src/main/java/com/atelier/portfolio/model/NewsSliderView.java` | DTO public (slider + stories enrichies) |
| `backend/src/main/java/com/atelier/portfolio/model/SliderStoryRef.java` | DTO story enrichie pour slider view |
| `backend/src/main/java/com/atelier/portfolio/controller/StoryController.java` | Public `/api/stories` |
| `backend/src/main/java/com/atelier/portfolio/controller/SliderController.java` | Public `/api/sliders` |
| `backend/src/main/java/com/atelier/portfolio/controller/AdminSlidersController.java` | Admin `/api/admin/sliders` |
| `backend/src/test/java/.../service/NewsSliderServiceTest.java` | Tests unit slider service |
| `backend/src/test/java/.../controller/StoryControllerTest.java` | Tests endpoint public |
| `backend/src/test/java/.../controller/SliderControllerTest.java` | Tests endpoint public |
| `backend/src/test/java/.../controller/AdminSlidersControllerTest.java` | Tests endpoint admin |
| `backend/src/test/java/.../service/MigrationDefaultStoriesTest.java` | Test d'intégration migration |

### Backend — modifiés

| Fichier | Modification |
|---|---|
| `backend/src/main/resources/db/changelog/db.changelog-master.yaml` | Inclut les 4 nouveaux changesets |
| `backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java` | Drop `ownerKind`/`ownerId`, add `@ManyToOne StoryEntity` |
| `backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java` | Nouveaux query methods par `storyId` |
| `backend/src/main/java/com/atelier/portfolio/service/StoryService.java` | Refactor complet : CRUD story + replaceSlidesByStoryId |
| `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java` | Refactor : endpoints par `storyId`, retire legacy `/{kind}/{ownerId}` |
| `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java` | Cascade delete stories au delete furniture |
| `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java` | Cascade delete stories au delete exhibition |
| `backend/src/test/java/.../service/StoryServiceTest.java` | Refactor pour nouveau modèle |
| `backend/src/test/java/.../controller/AdminStoriesControllerTest.java` | Refactor pour nouveaux endpoints |

### Frontend — créés

| Fichier | Rôle |
|---|---|
| `frontend/src/app/models/story.model.ts` | `Story`, `StoryInput`, `StoryWithSlides` |
| `frontend/src/app/models/news-slider.model.ts` | `NewsSlider`, `NewsSliderInput`, `NewsSliderView`, `NewsSliderAdminView`, `SliderZone` |
| `frontend/src/app/components/news-slider/news-slider.component.ts` | Carousel cards 4:5 |
| `frontend/src/app/components/news-slider/news-slider.component.spec.ts` | Tests |
| `frontend/src/app/pages/admin/sliders/sliders.component.ts` | Page admin sliders |
| `frontend/src/app/pages/admin/sliders/sliders.component.spec.ts` | Tests |

### Frontend — modifiés

| Fichier | Modification |
|---|---|
| `frontend/src/app/services/portfolio.service.ts` | Ajout des méthodes story/slider, suppression `getSlides`/`replaceSlides` |
| `frontend/src/app/services/portfolio.service.spec.ts` | Update specs |
| `frontend/src/app/pages/home/home.component.ts` | `forkJoin` étendu, 3 zones sliders |
| `frontend/src/app/pages/home/home.component.spec.ts` | Update tests |
| `frontend/src/app/components/story-viewer/story-viewer.component.ts` | Queue alimentée par stories |
| `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` | Bloc Stories par owner + CRUD + appel slides-editor par storyId |
| `frontend/src/app/pages/admin/expositions/expositions.component.ts` | Idem |
| `frontend/src/app/pages/admin/admin.routes.ts` | Ajoute route `sliders` |
| `frontend/src/app/pages/admin/admin-layout.component.ts` | Ajoute entrée nav SITE > Sliders |
| `frontend/src/app/components/slides-editor/*` (si existant) | Refactor pour prendre `storyId` au lieu de `(kind, ownerId)` |

### E2E Playwright

| Fichier | Action |
|---|---|
| `frontend/e2e/fixtures/sliders.json` | Nouvelle fixture (1-2 sliders peuplés) |
| `frontend/e2e/helpers/stub-api.ts` | Ajout entrée STUBS `**/api/sliders` |
| `frontend/e2e/__screenshots__/home.spec.ts/*` | Regen (la home a maintenant des sliders) |

---

## Conventions et patterns à suivre

- **Backend** : un service par agrégat, controller mince. Entities mutables avec setters. Records pour les DTOs. Validation Bean Validation (`@Valid`, `@NotBlank`, `@Size`).
- **Frontend** : standalone components, signals (pas RxJS pour le state local), `@if`/`@for`/`@else` (jamais `*ngIf`/`*ngFor`). Pas de NgModule.
- **Commits** : conventional-commits FR, scope = `feat`, `refactor`, `chore`, `test`, `fix`. Ex : `feat(stories): table story + entite JPA`.
- **TDD** où applicable (services backend, méthodes service frontend). Pas de TDD pour les schemas Liquibase ou la couche UI (testée via specs Karma à la suite).
- **Docker pour tests visuels** : utiliser `npm run test:visual:docker:update` puis `npm run test:visual:docker` — jamais l'hôte Windows direct.

---

## Task 1 : Schema `story` + entité JPA

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/022-create-story.yaml`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/repository/StoryRepository.java`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1 : Créer le changeset Liquibase**

Créer `backend/src/main/resources/db/changelog/changes/022-create-story.yaml` :

```yaml
databaseChangeLog:
  - changeSet:
      id: 022-create-story
      author: atelier-lumen
      changes:
        - createTable:
            tableName: story
            columns:
              - column:
                  name: id
                  type: varchar(50)
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: owner_kind
                  type: varchar(20)
                  constraints:
                    nullable: false
              - column:
                  name: owner_id
                  type: varchar(50)
                  constraints:
                    nullable: false
              - column:
                  name: title
                  type: varchar(200)
                  constraints:
                    nullable: false
              - column:
                  name: cover_image
                  type: varchar(500)
                  constraints:
                    nullable: false
              - column:
                  name: slug
                  type: varchar(200)
                  constraints:
                    nullable: false
                    unique: true
              - column:
                  name: position
                  type: int
                  constraints:
                    nullable: false
                    defaultValueNumeric: 0
              - column:
                  name: created_at
                  type: timestamp
                  defaultValueComputed: CURRENT_TIMESTAMP
                  constraints:
                    nullable: false
        - createIndex:
            indexName: idx_story_owner_pos
            tableName: story
            columns:
              - column:
                  name: owner_kind
              - column:
                  name: owner_id
              - column:
                  name: position
```

- [ ] **Step 2 : Inclure le changeset dans le master**

Modifier `backend/src/main/resources/db/changelog/db.changelog-master.yaml` — ajouter à la fin de la liste des `include` (après l'entrée 021) :

```yaml
  - include:
      file: changes/022-create-story.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 3 : Créer l'entité StoryEntity**

Créer `backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java` :

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "story")
public class StoryEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "owner_kind", nullable = false, length = 20)
    private String ownerKind;

    @Column(name = "owner_id", nullable = false, length = 50)
    private String ownerId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "cover_image", nullable = false, length = 500)
    private String coverImage;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOwnerKind() { return ownerKind; }
    public void setOwnerKind(String ownerKind) { this.ownerKind = ownerKind; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 4 : Créer StoryRepository**

Créer `backend/src/main/java/com/atelier/portfolio/repository/StoryRepository.java` :

```java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.StoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoryRepository extends JpaRepository<StoryEntity, String> {
    List<StoryEntity> findByOwnerKindAndOwnerIdOrderByPosition(String ownerKind, String ownerId);
    Optional<StoryEntity> findBySlug(String slug);
    void deleteByOwnerKindAndOwnerId(String ownerKind, String ownerId);
    boolean existsBySlug(String slug);
}
```

- [ ] **Step 5 : Vérifier que les tests existants passent encore**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -pl . test
```

Attendu : tous les tests passent (la table `story` est créée mais pas encore utilisée).

- [ ] **Step 6 : Commit**

```powershell
git add backend/src/main/resources/db/changelog/changes/022-create-story.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java backend/src/main/java/com/atelier/portfolio/repository/StoryRepository.java
git commit -m "feat(stories): table story + entite JPA + repository"
```

---

## Task 2 : Backfill seed default stories (migration data)

Crée 1 story par owner ayant des slides aujourd'hui. Le SQL doit fonctionner sur H2 (tests) ET Postgres (prod).

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/023-seed-default-stories.yaml`
- Create: `backend/src/test/java/com/atelier/portfolio/service/MigrationDefaultStoriesTest.java`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1 : Écrire le test d'intégration de la migration**

Créer `backend/src/test/java/com/atelier/portfolio/service/MigrationDefaultStoriesTest.java` :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.repository.StoryRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class MigrationDefaultStoriesTest {

    @Autowired StoryRepository storyRepo;
    @Autowired StorySlideRepository slideRepo;

    @Test
    void seedCreatesOneStoryPerOwnerWithExistingSlides() {
        // Précondition : le seed initial (010-seed-stories.yaml) a créé des slides
        // pour certains owners. Après 023, chaque (ownerKind, ownerId) ayant des
        // slides doit avoir exactement une story.
        List<StoryEntity> allStories = storyRepo.findAll();
        assertThat(allStories).isNotEmpty();

        Set<String> ownersWithSlides = slideRepo.findAll().stream()
                .map(s -> s.getOwnerKind() + ":" + s.getOwnerId())
                .collect(Collectors.toSet());
        Set<String> ownersWithStory = allStories.stream()
                .map(s -> s.getOwnerKind() + ":" + s.getOwnerId())
                .collect(Collectors.toSet());

        // À ce stade, story_slide n'a pas encore story_id (task 3 ne s'est pas exécutée).
        // Le test vérifie juste qu'il y a au moins 1 story par owner ayant des slides.
        assertThat(ownersWithStory).containsAll(ownersWithSlides);
    }

    @Test
    void seededStoriesHavePositionZeroAndOwnerTitleAsTitle() {
        List<StoryEntity> stories = storyRepo.findAll();
        for (StoryEntity s : stories) {
            assertThat(s.getPosition()).isEqualTo(0);
            assertThat(s.getTitle()).isNotBlank();
            assertThat(s.getCoverImage()).isNotBlank();
            assertThat(s.getSlug()).endsWith("-principale");
        }
    }
}
```

- [ ] **Step 2 : Run le test pour vérifier qu'il échoue**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=MigrationDefaultStoriesTest test
```

Attendu : ÉCHEC car le changeset 023 n'existe pas encore (la table `story` est vide).

- [ ] **Step 3 : Créer le changeset Liquibase**

Créer `backend/src/main/resources/db/changelog/changes/023-seed-default-stories.yaml` :

```yaml
databaseChangeLog:
  - changeSet:
      id: 023-seed-default-stories-furniture
      author: atelier-lumen
      changes:
        - sql:
            comment: Crée 1 story par mobilier ayant des slides
            sql: |
              INSERT INTO story (id, owner_kind, owner_id, title, cover_image, slug, position, created_at)
              SELECT
                  'st-' || SUBSTRING(MD5(ss.owner_kind || ':' || ss.owner_id) FROM 1 FOR 12),
                  ss.owner_kind,
                  ss.owner_id,
                  f.title,
                  f.cover_image,
                  ss.owner_id || '-principale',
                  0,
                  CURRENT_TIMESTAMP
              FROM (SELECT DISTINCT owner_kind, owner_id FROM story_slide WHERE owner_kind = 'furniture') ss
              JOIN furniture f ON f.slug = ss.owner_id

  - changeSet:
      id: 023-seed-default-stories-exhibition
      author: atelier-lumen
      changes:
        - sql:
            comment: Crée 1 story par exposition ayant des slides
            sql: |
              INSERT INTO story (id, owner_kind, owner_id, title, cover_image, slug, position, created_at)
              SELECT
                  'st-' || SUBSTRING(MD5(ss.owner_kind || ':' || ss.owner_id) FROM 1 FOR 12),
                  ss.owner_kind,
                  ss.owner_id,
                  e.title,
                  e.cover_image,
                  ss.owner_id || '-principale',
                  0,
                  CURRENT_TIMESTAMP
              FROM (SELECT DISTINCT owner_kind, owner_id FROM story_slide WHERE owner_kind = 'exhibition') ss
              JOIN exhibition e ON e.slug = ss.owner_id
```

**Note portabilité H2/Postgres** : `MD5()` et `SUBSTRING(... FROM x FOR y)` fonctionnent sur les deux. Vérifier avec le test qui tourne sur H2.

- [ ] **Step 4 : Inclure dans le master**

Modifier `backend/src/main/resources/db/changelog/db.changelog-master.yaml`, ajouter :

```yaml
  - include:
      file: changes/023-seed-default-stories.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 5 : Re-run le test**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=MigrationDefaultStoriesTest test
```

Attendu : PASSE. Si le SQL échoue côté H2 (différence dialecte), inspecter le message d'erreur et ajuster — typiquement utiliser `||` pour concat (H2 + Postgres compatible) ou `HASH('MD5', ...)` côté H2 si MD5 indispo.

- [ ] **Step 6 : Run tous les tests pour vérifier non-régression**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tous passent.

- [ ] **Step 7 : Commit**

```powershell
git add backend/src/main/resources/db/changelog/changes/023-seed-default-stories.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml backend/src/test/java/com/atelier/portfolio/service/MigrationDefaultStoriesTest.java
git commit -m "feat(stories): seed 1 story par owner depuis les slides existantes"
```

---

## Task 3 : Refactor `story_slide` (add story_id, drop owner_kind/owner_id)

Le plus gros risque DB de la feature. Atomique côté Liquibase.

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/024-refactor-story-slide.yaml`
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1 : Créer le changeset Liquibase**

Créer `backend/src/main/resources/db/changelog/changes/024-refactor-story-slide.yaml` :

```yaml
databaseChangeLog:
  - changeSet:
      id: 024-add-story-id-column
      author: atelier-lumen
      changes:
        - addColumn:
            tableName: story_slide
            columns:
              - column:
                  name: story_id
                  type: varchar(50)

  - changeSet:
      id: 024-backfill-story-id
      author: atelier-lumen
      changes:
        - sql:
            comment: Backfill story_id en joignant story sur (owner_kind, owner_id)
            sql: |
              UPDATE story_slide ss
              SET story_id = (
                  SELECT s.id FROM story s
                  WHERE s.owner_kind = ss.owner_kind AND s.owner_id = ss.owner_id
              )

  - changeSet:
      id: 024-add-story-id-not-null
      author: atelier-lumen
      changes:
        - addNotNullConstraint:
            tableName: story_slide
            columnName: story_id
            columnDataType: varchar(50)

  - changeSet:
      id: 024-add-story-id-fk
      author: atelier-lumen
      changes:
        - addForeignKeyConstraint:
            baseTableName: story_slide
            baseColumnNames: story_id
            referencedTableName: story
            referencedColumnNames: id
            constraintName: fk_story_slide_story
            onDelete: CASCADE

  - changeSet:
      id: 024-drop-old-owner-columns-and-index
      author: atelier-lumen
      changes:
        - dropIndex:
            indexName: idx_story_slide_owner_pos
            tableName: story_slide
        - dropColumn:
            tableName: story_slide
            columns:
              - column:
                  name: owner_kind
              - column:
                  name: owner_id
        - createIndex:
            indexName: idx_story_slide_story_pos
            tableName: story_slide
            columns:
              - column:
                  name: story_id
              - column:
                  name: position
```

- [ ] **Step 2 : Inclure dans le master**

```yaml
  - include:
      file: changes/024-refactor-story-slide.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 3 : Refactor StorySlideEntity**

Modifier `backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java` — remplacer les annotations `ownerKind`/`ownerId` par une relation `@ManyToOne` vers `StoryEntity`. Le fichier complet devient :

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "story_slide")
public class StorySlideEntity {

    @Id
    @Column(length = 50)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private StoryEntity story;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(length = 500)
    private String src;

    @Column(length = 500)
    private String caption;

    @Column(name = "quote_body", length = 2000)
    private String quoteBody;

    @Column(name = "quote_cite", length = 500)
    private String quoteCite;

    @Column(name = "link_label", length = 200)
    private String linkLabel;

    @Column(name = "link_desc", length = 500)
    private String linkDesc;

    @Column(name = "link_href", length = 500)
    private String linkHref;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "story_slide_spec", joinColumns = @JoinColumn(name = "story_slide_id"))
    @OrderColumn(name = "position")
    private List<StorySlideSpecEntry> specs = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public StoryEntity getStory() { return story; }
    public void setStory(StoryEntity story) { this.story = story; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getSrc() { return src; }
    public void setSrc(String src) { this.src = src; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public String getQuoteBody() { return quoteBody; }
    public void setQuoteBody(String quoteBody) { this.quoteBody = quoteBody; }

    public String getQuoteCite() { return quoteCite; }
    public void setQuoteCite(String quoteCite) { this.quoteCite = quoteCite; }

    public String getLinkLabel() { return linkLabel; }
    public void setLinkLabel(String linkLabel) { this.linkLabel = linkLabel; }

    public String getLinkDesc() { return linkDesc; }
    public void setLinkDesc(String linkDesc) { this.linkDesc = linkDesc; }

    public String getLinkHref() { return linkHref; }
    public void setLinkHref(String linkHref) { this.linkHref = linkHref; }

    public List<StorySlideSpecEntry> getSpecs() { return specs; }
    public void setSpecs(List<StorySlideSpecEntry> specs) { this.specs = specs; }
}
```

- [ ] **Step 4 : Refactor StorySlideRepository**

Modifier `backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java` :

```java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.StorySlideEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorySlideRepository extends JpaRepository<StorySlideEntity, String> {
    List<StorySlideEntity> findByStoryIdOrderByPosition(String storyId);
    void deleteByStoryId(String storyId);
}
```

- [ ] **Step 5 : Run les tests — `StoryService` ne compile plus**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn compile
```

Attendu : ERREUR de compilation dans `StoryService.java` (utilise `findByOwnerKindAndOwnerIdOrderByPosition` qui n'existe plus). C'est OK, c'est la Task 4 qui le corrige.

- [ ] **Step 6 : Commit (intentionnellement avec compilation cassée, sera réparé en Task 4)**

```powershell
git add backend/src/main/resources/db/changelog/changes/024-refactor-story-slide.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java
git commit -m "refactor(stories): story_slide pointe vers story_id (WIP, breakers compile)"
```

> Note : on commit volontairement avec compilation cassée car la Task 4 est immédiatement enchaînée. Si l'enchaînement est interrompu, la branche reste dans un état non-buildable — c'est acceptable car on est sur une branche feature isolée.

---

## Task 4 : Refactor `StoryService` + `AdminStoriesController` pour nouveau modèle

Refactor complet du service pour utiliser `story_id`. Endpoints admin passent de `/{kind}/{ownerId}` à `/{storyId}`.

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/controller/AdminStoriesControllerTest.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/Story.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/StoryInput.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/StoryWithSlides.java`

- [ ] **Step 1 : Créer les DTOs**

Créer `backend/src/main/java/com/atelier/portfolio/model/Story.java` :

```java
package com.atelier.portfolio.model;

import java.time.Instant;

public record Story(
        String id,
        String ownerKind,
        String ownerId,
        String title,
        String coverImage,
        String slug,
        int position,
        Instant createdAt
) {}
```

Créer `backend/src/main/java/com/atelier/portfolio/model/StoryInput.java` :

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoryInput(
        @NotBlank @Size(max = 20) String ownerKind,
        @NotBlank @Size(max = 50) String ownerId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 500) String coverImage
) {}
```

Créer `backend/src/main/java/com/atelier/portfolio/model/StoryWithSlides.java` :

```java
package com.atelier.portfolio.model;

import java.util.List;

public record StoryWithSlides(
        Story story,
        List<Slide> slides
) {}
```

- [ ] **Step 2 : Écrire les tests StoryService**

Modifier `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java` — remplacer le contenu existant (qui teste l'ancien API) par :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.model.StoryWithSlides;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class StoryServiceTest {

    @Autowired StoryService service;

    @Test
    void createStoryAssignsIncrementalPosition() {
        Story s1 = service.create(new StoryInput("furniture", "tabouret-aurore", "Story extra 1", "https://example.com/c.jpg"));
        Story s2 = service.create(new StoryInput("furniture", "tabouret-aurore", "Story extra 2", "https://example.com/c.jpg"));
        assertThat(s2.position()).isGreaterThan(s1.position());
    }

    @Test
    void createStoryGeneratesUniqueSlug() {
        Story s1 = service.create(new StoryInput("furniture", "tabouret-aurore", "Premiere", "https://example.com/c.jpg"));
        Story s2 = service.create(new StoryInput("furniture", "tabouret-aurore", "Deuxieme", "https://example.com/c.jpg"));
        assertThat(s1.slug()).isNotEqualTo(s2.slug());
    }

    @Test
    void findByOwnerReturnsStoriesInPositionOrder() {
        // Après seed, tabouret-aurore a au moins 1 story (« principale »)
        List<Story> stories = service.findByOwner("furniture", "tabouret-aurore");
        assertThat(stories).isNotEmpty();
        for (int i = 1; i < stories.size(); i++) {
            assertThat(stories.get(i).position()).isGreaterThanOrEqualTo(stories.get(i - 1).position());
        }
    }

    @Test
    void replaceSlidesAttachesSlidesToStory() {
        Story s = service.create(new StoryInput("furniture", "tabouret-aurore", "Test", "https://example.com/c.jpg"));
        service.replaceSlides(s.id(), List.of(
                new Slide.ImageSlide(null, 0, "https://example.com/1.jpg", "Caption 1"),
                new Slide.ImageSlide(null, 1, "https://example.com/2.jpg", "Caption 2")
        ));
        StoryWithSlides loaded = service.findBySlugWithSlides(s.slug()).orElseThrow();
        assertThat(loaded.slides()).hasSize(2);
    }

    @Test
    void deleteStoryRemovesItAndCascadesSlides() {
        Story s = service.create(new StoryInput("furniture", "tabouret-aurore", "Tmp", "https://example.com/c.jpg"));
        service.replaceSlides(s.id(), List.of(new Slide.ImageSlide(null, 0, "https://example.com/x.jpg", null)));
        service.delete(s.id());
        assertThatThrownBy(() -> service.update(s.id(), new StoryInput("furniture", "tabouret-aurore", "X", "https://example.com/c.jpg")))
                .isInstanceOf(RuntimeException.class);
    }
}
```

- [ ] **Step 3 : Run les tests pour vérifier qu'ils échouent**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=StoryServiceTest test
```

Attendu : ÉCHEC (méthodes inexistantes : `create`, `findByOwner` retournant `Story`, `findBySlugWithSlides`, etc.).

- [ ] **Step 4 : Refactor complet de StoryService**

Remplacer le contenu de `backend/src/main/java/com/atelier/portfolio/service/StoryService.java` :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.repository.StoryRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class StoryService {

    private final StoryRepository storyRepo;
    private final StorySlideRepository slideRepo;

    public StoryService(StoryRepository storyRepo, StorySlideRepository slideRepo) {
        this.storyRepo = storyRepo;
        this.slideRepo = slideRepo;
    }

    public List<Story> findByOwner(String ownerKind, String ownerId) {
        return storyRepo.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream().map(StoryService::toDto).toList();
    }

    public Optional<StoryWithSlides> findBySlugWithSlides(String slug) {
        return storyRepo.findBySlug(slug)
                .map(e -> new StoryWithSlides(toDto(e), loadSlides(e.getId())));
    }

    public List<Slide> findSlidesByStoryId(String storyId) {
        return loadSlides(storyId);
    }

    @Transactional
    public Story create(StoryInput input) {
        StoryEntity e = new StoryEntity();
        e.setId("st-" + UUID.randomUUID().toString().substring(0, 12));
        e.setOwnerKind(input.ownerKind());
        e.setOwnerId(input.ownerId());
        e.setTitle(input.title());
        e.setCoverImage(input.coverImage());
        e.setSlug(generateUniqueSlug(input.ownerId()));
        e.setPosition(nextPosition(input.ownerKind(), input.ownerId()));
        e.setCreatedAt(Instant.now());
        return toDto(storyRepo.save(e));
    }

    @Transactional
    public Story update(String id, StoryInput input) {
        StoryEntity e = storyRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + id));
        e.setTitle(input.title());
        e.setCoverImage(input.coverImage());
        return toDto(storyRepo.save(e));
    }

    @Transactional
    public void updatePosition(String id, int newPosition) {
        StoryEntity e = storyRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + id));
        e.setPosition(newPosition);
        storyRepo.save(e);
    }

    @Transactional
    public void delete(String id) {
        StoryEntity e = storyRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + id));
        storyRepo.delete(e);
    }

    @Transactional
    public void deleteAllForOwner(String ownerKind, String ownerId) {
        storyRepo.deleteByOwnerKindAndOwnerId(ownerKind, ownerId);
    }

    @Transactional
    public List<Slide> replaceSlides(String storyId, List<Slide> slides) {
        StoryEntity story = storyRepo.findById(storyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + storyId));
        slideRepo.deleteByStoryId(storyId);
        List<StorySlideEntity> entities = new ArrayList<>();
        for (int i = 0; i < slides.size(); i++) {
            entities.add(toSlideEntity(slides.get(i), story, i));
        }
        slideRepo.saveAll(entities);
        return loadSlides(storyId);
    }

    private int nextPosition(String ownerKind, String ownerId) {
        return storyRepo.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream().mapToInt(StoryEntity::getPosition).max().orElse(-1) + 1;
    }

    private String generateUniqueSlug(String ownerId) {
        String base = ownerId + "-" + Long.toString(System.currentTimeMillis(), 36);
        // collision quasi nulle, mais on garde une marge de sécurité
        String candidate = base;
        int suffix = 2;
        while (storyRepo.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private List<Slide> loadSlides(String storyId) {
        return slideRepo.findByStoryIdOrderByPosition(storyId)
                .stream().map(StoryService::toSlideDto).toList();
    }

    private static Story toDto(StoryEntity e) {
        return new Story(e.getId(), e.getOwnerKind(), e.getOwnerId(),
                e.getTitle(), e.getCoverImage(), e.getSlug(), e.getPosition(), e.getCreatedAt());
    }

    private static Slide toSlideDto(StorySlideEntity e) {
        return switch (e.getType()) {
            case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
            case "video" -> new Slide.VideoSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
            case "spec"  -> new Slide.SpecSlide(e.getId(), e.getPosition(),
                    e.getSpecs().stream().map(s -> new SpecEntry(s.getLabel(), s.getValue())).toList());
            case "quote" -> new Slide.QuoteSlide(e.getId(), e.getPosition(), e.getQuoteBody(), e.getQuoteCite());
            default -> throw new IllegalStateException("Unknown slide type: " + e.getType());
        };
    }

    private static StorySlideEntity toSlideEntity(Slide slide, StoryEntity story, int position) {
        StorySlideEntity e = new StorySlideEntity();
        e.setId(slide.id() != null && !slide.id().isBlank() ? slide.id() : "sl-" + UUID.randomUUID().toString().substring(0, 8));
        e.setStory(story);
        e.setPosition(position);
        switch (slide) {
            case Slide.ImageSlide i -> { e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption()); }
            case Slide.VideoSlide v -> { e.setType("video"); e.setSrc(v.src()); e.setCaption(v.caption()); }
            case Slide.SpecSlide s -> {
                e.setType("spec");
                List<StorySlideSpecEntry> specs = s.specs().stream().map(entry -> {
                    StorySlideSpecEntry se = new StorySlideSpecEntry();
                    se.setLabel(entry.label());
                    se.setValue(entry.value());
                    return se;
                }).toList();
                e.setSpecs(new ArrayList<>(specs));
            }
            case Slide.QuoteSlide q -> { e.setType("quote"); e.setQuoteBody(q.body()); e.setQuoteCite(q.cite()); }
        }
        return e;
    }
}
```

- [ ] **Step 5 : Refactor AdminStoriesController**

Remplacer `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.service.StoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/stories")
public class AdminStoriesController {

    private final StoryService stories;

    public AdminStoriesController(StoryService stories) {
        this.stories = stories;
    }

    @GetMapping
    public List<Story> list(@RequestParam String ownerKind, @RequestParam String ownerId) {
        validateKind(ownerKind);
        return stories.findByOwner(ownerKind, ownerId);
    }

    @PostMapping
    public ResponseEntity<Story> create(@Valid @RequestBody StoryInput input) {
        validateKind(input.ownerKind());
        return ResponseEntity.ok(stories.create(input));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Story> update(@PathVariable String id, @Valid @RequestBody StoryInput input) {
        validateKind(input.ownerKind());
        return ResponseEntity.ok(stories.update(id, input));
    }

    @PutMapping("/{id}/position")
    public ResponseEntity<Void> updatePosition(@PathVariable String id, @RequestParam int position) {
        stories.updatePosition(id, position);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        stories.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/slides")
    public List<Slide> getSlides(@PathVariable String id) {
        return stories.findSlidesByStoryId(id);
    }

    @PutMapping("/{id}/slides")
    public ResponseEntity<List<Slide>> replaceSlides(@PathVariable String id, @Valid @RequestBody List<Slide> slides) {
        return ResponseEntity.ok(stories.replaceSlides(id, slides));
    }

    private static void validateKind(String kind) {
        if (!"furniture".equals(kind) && !"exhibition".equals(kind)) {
            throw new IllegalArgumentException("Invalid kind: " + kind);
        }
    }
}
```

- [ ] **Step 6 : Refactor AdminStoriesControllerTest**

Remplacer `backend/src/test/java/com/atelier/portfolio/controller/AdminStoriesControllerTest.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.service.StoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AdminStoriesControllerTest {

    @Autowired MockMvc mvc;
    @Autowired StoryService stories;
    @Autowired ObjectMapper json;

    @Test
    @WithMockUser
    void listReturnsStoriesForOwner() throws Exception {
        mvc.perform(get("/api/admin/stories?ownerKind=furniture&ownerId=tabouret-aurore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void createReturnsNewStory() throws Exception {
        StoryInput input = new StoryInput("furniture", "tabouret-aurore", "Story de test", "https://example.com/c.jpg");
        mvc.perform(post("/api/admin/stories")
                        .contentType("application/json")
                        .content(json.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Story de test"));
    }

    @Test
    void listRejectedWithoutAuth() throws Exception {
        mvc.perform(get("/api/admin/stories?ownerKind=furniture&ownerId=tabouret-aurore"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 7 : Run tous les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tous passent (compile OK, StoryService et controller refactorés, anciens tests adaptés).

- [ ] **Step 8 : Commit**

```powershell
git add backend/
git commit -m "refactor(stories): StoryService + AdminStoriesController par storyId, retire legacy /{kind}/{ownerId}"
```

---

## Task 5 : Tables `news_slider` + `slider_story` + entités + service + controllers admin

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/025-create-news-slider.yaml`
- Create: `backend/src/main/java/com/atelier/portfolio/enums/SliderZone.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/NewsSliderEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/NewsSliderStoryEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/NewsSliderStoryId.java`
- Create: `backend/src/main/java/com/atelier/portfolio/repository/NewsSliderRepository.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/NewsSlider.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/NewsSliderInput.java`
- Create: `backend/src/main/java/com/atelier/portfolio/service/NewsSliderService.java`
- Create: `backend/src/main/java/com/atelier/portfolio/controller/AdminSlidersController.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/NewsSliderServiceTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/AdminSlidersControllerTest.java`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1 : Changeset Liquibase**

Créer `backend/src/main/resources/db/changelog/changes/025-create-news-slider.yaml` :

```yaml
databaseChangeLog:
  - changeSet:
      id: 025-create-news-slider
      author: atelier-lumen
      changes:
        - createTable:
            tableName: news_slider
            columns:
              - column:
                  name: id
                  type: varchar(50)
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: slug
                  type: varchar(100)
                  constraints:
                    nullable: false
                    unique: true
              - column:
                  name: title
                  type: varchar(200)
                  constraints:
                    nullable: false
              - column:
                  name: zone_key
                  type: varchar(50)
              - column:
                  name: created_at
                  type: timestamp
                  defaultValueComputed: CURRENT_TIMESTAMP
                  constraints:
                    nullable: false
        - createTable:
            tableName: slider_story
            columns:
              - column:
                  name: slider_id
                  type: varchar(50)
                  constraints:
                    nullable: false
              - column:
                  name: story_id
                  type: varchar(50)
                  constraints:
                    nullable: false
              - column:
                  name: position
                  type: int
                  constraints:
                    nullable: false
        - addPrimaryKey:
            tableName: slider_story
            columnNames: slider_id, story_id
            constraintName: pk_slider_story
        - addForeignKeyConstraint:
            baseTableName: slider_story
            baseColumnNames: slider_id
            referencedTableName: news_slider
            referencedColumnNames: id
            constraintName: fk_slider_story_slider
            onDelete: CASCADE
        - addForeignKeyConstraint:
            baseTableName: slider_story
            baseColumnNames: story_id
            referencedTableName: story
            referencedColumnNames: id
            constraintName: fk_slider_story_story
            onDelete: CASCADE
        - createIndex:
            indexName: idx_slider_story_position
            tableName: slider_story
            columns:
              - column:
                  name: slider_id
              - column:
                  name: position
```

Inclure dans le master :

```yaml
  - include:
      file: changes/025-create-news-slider.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 2 : Créer l'enum SliderZone**

Créer `backend/src/main/java/com/atelier/portfolio/enums/SliderZone.java` :

```java
package com.atelier.portfolio.enums;

import java.util.Arrays;

public enum SliderZone {
    HOME_TOP("home-top"),
    HOME_MIDDLE("home-middle"),
    HOME_BOTTOM("home-bottom");

    private final String key;

    SliderZone(String key) { this.key = key; }

    public String getKey() { return key; }

    public static SliderZone fromKey(String key) {
        return Arrays.stream(values())
                .filter(z -> z.key.equals(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown zone key: " + key));
    }
}
```

- [ ] **Step 3 : Créer les entités JPA**

`backend/src/main/java/com/atelier/portfolio/entity/NewsSliderEntity.java` :

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "news_slider")
public class NewsSliderEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "zone_key", length = 50)
    private String zoneKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "slider", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("position ASC")
    private List<NewsSliderStoryEntity> stories = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getZoneKey() { return zoneKey; }
    public void setZoneKey(String zoneKey) { this.zoneKey = zoneKey; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<NewsSliderStoryEntity> getStories() { return stories; }
    public void setStories(List<NewsSliderStoryEntity> stories) { this.stories = stories; }
}
```

`backend/src/main/java/com/atelier/portfolio/entity/NewsSliderStoryId.java` :

```java
package com.atelier.portfolio.entity;

import java.io.Serializable;
import java.util.Objects;

public class NewsSliderStoryId implements Serializable {
    private String slider;
    private String story;

    public NewsSliderStoryId() {}
    public NewsSliderStoryId(String slider, String story) { this.slider = slider; this.story = story; }

    public String getSlider() { return slider; }
    public void setSlider(String slider) { this.slider = slider; }
    public String getStory() { return story; }
    public void setStory(String story) { this.story = story; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NewsSliderStoryId that)) return false;
        return Objects.equals(slider, that.slider) && Objects.equals(story, that.story);
    }

    @Override
    public int hashCode() { return Objects.hash(slider, story); }
}
```

`backend/src/main/java/com/atelier/portfolio/entity/NewsSliderStoryEntity.java` :

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "slider_story")
@IdClass(NewsSliderStoryId.class)
public class NewsSliderStoryEntity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slider_id", nullable = false)
    private NewsSliderEntity slider;

    @Id
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private StoryEntity story;

    @Column(nullable = false)
    private int position;

    public NewsSliderEntity getSlider() { return slider; }
    public void setSlider(NewsSliderEntity slider) { this.slider = slider; }
    public StoryEntity getStory() { return story; }
    public void setStory(StoryEntity story) { this.story = story; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}
```

- [ ] **Step 4 : Créer NewsSliderRepository**

`backend/src/main/java/com/atelier/portfolio/repository/NewsSliderRepository.java` :

```java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.NewsSliderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NewsSliderRepository extends JpaRepository<NewsSliderEntity, String> {
    Optional<NewsSliderEntity> findByZoneKey(String zoneKey);
    List<NewsSliderEntity> findAllByZoneKeyIsNotNull();
    boolean existsBySlug(String slug);
}
```

- [ ] **Step 5 : Créer les DTOs admin**

`backend/src/main/java/com/atelier/portfolio/model/NewsSliderInput.java` :

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewsSliderInput(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 50) String zoneKey
) {}
```

`backend/src/main/java/com/atelier/portfolio/model/NewsSlider.java` :

```java
package com.atelier.portfolio.model;

import java.util.List;

public record NewsSlider(
        String id,
        String slug,
        String title,
        String zoneKey,
        List<String> storyIds
) {}
```

- [ ] **Step 6 : Écrire les tests NewsSliderService**

`backend/src/test/java/com/atelier/portfolio/service/NewsSliderServiceTest.java` :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class NewsSliderServiceTest {

    @Autowired NewsSliderService service;
    @Autowired StoryService stories;

    @Test
    void createSliderWithoutZoneIsAllowed() {
        NewsSlider s = service.create(new NewsSliderInput("Test slider", null));
        assertThat(s.zoneKey()).isNull();
    }

    @Test
    void createSliderWithZoneClaimsZone() {
        NewsSlider s = service.create(new NewsSliderInput("Top slider", "home-top"));
        assertThat(s.zoneKey()).isEqualTo("home-top");
    }

    @Test
    void assigningSecondSliderToSameZoneThrows409() {
        service.create(new NewsSliderInput("First", "home-top"));
        assertThatThrownBy(() -> service.create(new NewsSliderInput("Second", "home-top")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("409");
    }

    @Test
    void unknownZoneKeyRejected() {
        assertThatThrownBy(() -> service.create(new NewsSliderInput("Foo", "non-existant")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void replaceStoriesPreservesGivenOrder() {
        NewsSlider slider = service.create(new NewsSliderInput("Mix", null));
        Story s1 = stories.create(new StoryInput("furniture", "tabouret-aurore", "S1", "https://e.com/c.jpg"));
        Story s2 = stories.create(new StoryInput("furniture", "tabouret-aurore", "S2", "https://e.com/c.jpg"));
        NewsSlider updated = service.replaceStories(slider.id(), List.of(s2.id(), s1.id()));
        assertThat(updated.storyIds()).containsExactly(s2.id(), s1.id());
    }
}
```

- [ ] **Step 7 : Run le test pour vérifier l'échec**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=NewsSliderServiceTest test
```

Attendu : ÉCHEC (service inexistant).

- [ ] **Step 8 : Implémenter NewsSliderService**

`backend/src/main/java/com/atelier/portfolio/service/NewsSliderService.java` :

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.NewsSliderEntity;
import com.atelier.portfolio.entity.NewsSliderStoryEntity;
import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.enums.SliderZone;
import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.repository.NewsSliderRepository;
import com.atelier.portfolio.repository.StoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class NewsSliderService {

    private final NewsSliderRepository sliderRepo;
    private final StoryRepository storyRepo;

    public NewsSliderService(NewsSliderRepository sliderRepo, StoryRepository storyRepo) {
        this.sliderRepo = sliderRepo;
        this.storyRepo = storyRepo;
    }

    public List<NewsSlider> findAll() {
        return sliderRepo.findAll().stream().map(NewsSliderService::toDto).toList();
    }

    public List<NewsSliderEntity> findAllPublished() {
        return sliderRepo.findAllByZoneKeyIsNotNull();
    }

    @Transactional
    public NewsSlider create(NewsSliderInput input) {
        validateZone(input.zoneKey());
        checkZoneAvailable(input.zoneKey(), null);
        NewsSliderEntity e = new NewsSliderEntity();
        e.setId("sld-" + UUID.randomUUID().toString().substring(0, 12));
        e.setSlug(generateUniqueSlug(input.title()));
        e.setTitle(input.title());
        e.setZoneKey(input.zoneKey());
        e.setCreatedAt(Instant.now());
        return toDto(sliderRepo.save(e));
    }

    @Transactional
    public NewsSlider update(String id, NewsSliderInput input) {
        validateZone(input.zoneKey());
        checkZoneAvailable(input.zoneKey(), id);
        NewsSliderEntity e = sliderRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "slider not found: " + id));
        e.setTitle(input.title());
        e.setZoneKey(input.zoneKey());
        return toDto(sliderRepo.save(e));
    }

    @Transactional
    public void delete(String id) {
        sliderRepo.deleteById(id);
    }

    @Transactional
    public NewsSlider replaceStories(String sliderId, List<String> storyIds) {
        NewsSliderEntity slider = sliderRepo.findById(sliderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "slider not found: " + sliderId));
        slider.getStories().clear();
        for (int i = 0; i < storyIds.size(); i++) {
            StoryEntity story = storyRepo.findById(storyIds.get(i))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "story not found: " + storyIds.get(i)));
            NewsSliderStoryEntity link = new NewsSliderStoryEntity();
            link.setSlider(slider);
            link.setStory(story);
            link.setPosition(i);
            slider.getStories().add(link);
        }
        return toDto(sliderRepo.save(slider));
    }

    private void validateZone(String zoneKey) {
        if (zoneKey != null && !zoneKey.isBlank()) {
            SliderZone.fromKey(zoneKey); // throws si invalide
        }
    }

    private void checkZoneAvailable(String zoneKey, String excludeId) {
        if (zoneKey == null || zoneKey.isBlank()) return;
        sliderRepo.findByZoneKey(zoneKey).ifPresent(existing -> {
            if (!existing.getId().equals(excludeId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Zone " + zoneKey + " already occupied by slider " + existing.getId());
            }
        });
    }

    private String generateUniqueSlug(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (base.isBlank()) base = "slider";
        String candidate = base;
        int suffix = 2;
        while (sliderRepo.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    static NewsSlider toDto(NewsSliderEntity e) {
        List<String> ids = new ArrayList<>();
        for (NewsSliderStoryEntity link : e.getStories()) {
            ids.add(link.getStory().getId());
        }
        return new NewsSlider(e.getId(), e.getSlug(), e.getTitle(), e.getZoneKey(), ids);
    }
}
```

- [ ] **Step 9 : Créer AdminSlidersController**

`backend/src/main/java/com/atelier/portfolio/controller/AdminSlidersController.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.service.NewsSliderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/sliders")
public class AdminSlidersController {

    private final NewsSliderService service;

    public AdminSlidersController(NewsSliderService service) {
        this.service = service;
    }

    @GetMapping
    public List<NewsSlider> list() { return service.findAll(); }

    @PostMapping
    public ResponseEntity<NewsSlider> create(@Valid @RequestBody NewsSliderInput input) {
        return ResponseEntity.ok(service.create(input));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NewsSlider> update(@PathVariable String id, @Valid @RequestBody NewsSliderInput input) {
        return ResponseEntity.ok(service.update(id, input));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/stories")
    public ResponseEntity<NewsSlider> replaceStories(@PathVariable String id, @RequestBody Map<String, List<String>> body) {
        List<String> storyIds = body.getOrDefault("storyIds", List.of());
        return ResponseEntity.ok(service.replaceStories(id, storyIds));
    }
}
```

- [ ] **Step 10 : Run tous les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tous passent.

- [ ] **Step 11 : Commit**

```powershell
git add backend/
git commit -m "feat(sliders): entites + service + controller admin pour news_slider"
```

---

## Task 6 : Public endpoints `/api/stories` + `/api/sliders` + cascade delete owner

**Files:**
- Create: `backend/src/main/java/com/atelier/portfolio/controller/StoryController.java`
- Create: `backend/src/main/java/com/atelier/portfolio/controller/SliderController.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/NewsSliderView.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/SliderStoryRef.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/StoryControllerTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/SliderControllerTest.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java`

- [ ] **Step 1 : Créer DTOs publics**

`backend/src/main/java/com/atelier/portfolio/model/SliderStoryRef.java` :

```java
package com.atelier.portfolio.model;

public record SliderStoryRef(
        String id,
        String slug,
        String title,
        String coverImage,
        String ownerKind,
        String ownerId,
        String ownerLabel
) {}
```

`backend/src/main/java/com/atelier/portfolio/model/NewsSliderView.java` :

```java
package com.atelier.portfolio.model;

import java.util.List;

public record NewsSliderView(
        String id,
        String slug,
        String title,
        String zoneKey,
        List<SliderStoryRef> stories
) {}
```

- [ ] **Step 2 : Public StoryController**

`backend/src/main/java/com/atelier/portfolio/controller/StoryController.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.service.StoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private final StoryService stories;

    public StoryController(StoryService stories) {
        this.stories = stories;
    }

    @GetMapping
    public List<Story> list(@RequestParam String ownerKind, @RequestParam String ownerId) {
        return stories.findByOwner(ownerKind, ownerId);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<StoryWithSlides> bySlug(@PathVariable String slug) {
        return stories.findBySlugWithSlides(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
```

- [ ] **Step 3 : Public SliderController avec enrichissement**

Le slider view doit enrichir chaque story avec `ownerLabel` (depuis `furniture.title` ou `exhibition.title + " · " + venue`). Pour éviter le service spam, on délègue l'enrichissement à `NewsSliderService.findAllPublishedView()`.

D'abord ajouter la méthode dans le service. Modifier `backend/src/main/java/com/atelier/portfolio/service/NewsSliderService.java` :

Ajouter dans le constructeur les repos `FurnitureRepository` et `ExhibitionRepository` (auto-importer si nécessaire) :

```java
private final FurnitureRepository furnitureRepo;
private final ExhibitionRepository exhibitionRepo;
private final StorySlideRepository slideRepo;

public NewsSliderService(NewsSliderRepository sliderRepo, StoryRepository storyRepo,
                         FurnitureRepository furnitureRepo, ExhibitionRepository exhibitionRepo,
                         StorySlideRepository slideRepo) {
    this.sliderRepo = sliderRepo;
    this.storyRepo = storyRepo;
    this.furnitureRepo = furnitureRepo;
    this.exhibitionRepo = exhibitionRepo;
    this.slideRepo = slideRepo;
}

public List<NewsSliderView> findAllPublishedView() {
    return sliderRepo.findAllByZoneKeyIsNotNull().stream()
            .map(this::toView)
            .toList();
}

private NewsSliderView toView(NewsSliderEntity e) {
    List<SliderStoryRef> refs = new ArrayList<>();
    for (NewsSliderStoryEntity link : e.getStories()) {
        StoryEntity story = link.getStory();
        // Filtre : story doit avoir au moins une slide pour apparaître publiquement
        if (slideRepo.findByStoryIdOrderByPosition(story.getId()).isEmpty()) continue;
        refs.add(new SliderStoryRef(
                story.getId(), story.getSlug(), story.getTitle(), story.getCoverImage(),
                story.getOwnerKind(), story.getOwnerId(),
                ownerLabelFor(story.getOwnerKind(), story.getOwnerId())
        ));
    }
    return new NewsSliderView(e.getId(), e.getSlug(), e.getTitle(), e.getZoneKey(), refs);
}

private String ownerLabelFor(String ownerKind, String ownerId) {
    if ("furniture".equals(ownerKind)) {
        return furnitureRepo.findBySlug(ownerId)
                .map(f -> f.getTitle())
                .orElse(ownerId);
    } else if ("exhibition".equals(ownerKind)) {
        return exhibitionRepo.findBySlug(ownerId)
                .map(e -> e.getTitle() + " · " + e.getVenue())
                .orElse(ownerId);
    }
    return ownerId;
}
```

Ajouter les imports nécessaires dans `NewsSliderService` :

```java
import com.atelier.portfolio.model.NewsSliderView;
import com.atelier.portfolio.model.SliderStoryRef;
import com.atelier.portfolio.repository.FurnitureRepository;
import com.atelier.portfolio.repository.ExhibitionRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
```

(Vérifier les noms exacts des méthodes `findBySlug` dans `FurnitureRepository` et `ExhibitionRepository` — chercher avec `Grep findBySlug backend/src/main/java/.../repository/`. Si elles n'existent pas exactement, adapter ou les ajouter.)

- [ ] **Step 4 : Créer SliderController public**

`backend/src/main/java/com/atelier/portfolio/controller/SliderController.java` :

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.NewsSliderView;
import com.atelier.portfolio.service.NewsSliderService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sliders")
public class SliderController {

    private final NewsSliderService service;

    public SliderController(NewsSliderService service) {
        this.service = service;
    }

    @GetMapping
    public List<NewsSliderView> list() {
        return service.findAllPublishedView();
    }
}
```

- [ ] **Step 5 : Cascade delete dans FurnitureService et ExhibitionService**

Modifier `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java` :

- Injecter `StoryService` dans le constructeur
- Dans la méthode `delete(slug)`, AVANT la suppression du furniture, ajouter : `storyService.deleteAllForOwner("furniture", slug);`

Idem pour `ExhibitionService.java` avec `"exhibition"`.

(Inspecter ces fichiers d'abord pour voir leur structure exacte, le pattern de suppression peut varier.)

- [ ] **Step 6 : Autoriser les endpoints publics dans SecurityConfig**

Vérifier `backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java` — typiquement les `GET /api/**` sont déjà permitAll, donc rien à faire. Si ce n'est pas le cas (par défaut bloqué), ajouter une règle :

```java
.requestMatchers(HttpMethod.GET, "/api/stories/**").permitAll()
.requestMatchers(HttpMethod.GET, "/api/sliders/**").permitAll()
```

(Inspecter le fichier pour confirmer.)

- [ ] **Step 7 : Tests endpoint public**

`backend/src/test/java/com/atelier/portfolio/controller/StoryControllerTest.java` :

```java
package com.atelier.portfolio.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StoryControllerTest {

    @Autowired MockMvc mvc;

    @Test
    void listReturnsArrayWithoutAuth() throws Exception {
        mvc.perform(get("/api/stories?ownerKind=furniture&ownerId=tabouret-aurore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getBySlugReturnsStoryWithSlides() throws Exception {
        // Le seed initial doit avoir créé tabouret-aurore-principale
        mvc.perform(get("/api/stories/tabouret-aurore-principale"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.story.slug").value("tabouret-aurore-principale"))
                .andExpect(jsonPath("$.slides").isArray());
    }
}
```

`backend/src/test/java/com/atelier/portfolio/controller/SliderControllerTest.java` :

```java
package com.atelier.portfolio.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SliderControllerTest {

    @Autowired MockMvc mvc;

    @Test
    void listReturnsArrayWithoutAuth() throws Exception {
        mvc.perform(get("/api/sliders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
```

- [ ] **Step 8 : Run tous les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
```

Attendu : tous passent.

- [ ] **Step 9 : Commit**

```powershell
git add backend/
git commit -m "feat(api): endpoints publics /api/stories + /api/sliders + cascade delete owner->stories"
```

---

## Task 7 : Frontend models TS + PortfolioService refactor

**Files:**
- Create: `frontend/src/app/models/story.model.ts`
- Create: `frontend/src/app/models/news-slider.model.ts`
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/services/portfolio.service.spec.ts`

- [ ] **Step 1 : Créer les modèles TS**

`frontend/src/app/models/story.model.ts` :

```ts
import { Slide } from './slide.model';

export interface Story {
  id: string;
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  title: string;
  coverImage: string;
  slug: string;
  position: number;
  createdAt: string;
}

export interface StoryInput {
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  title: string;
  coverImage: string;
}

export interface StoryWithSlides {
  story: Story;
  slides: Slide[];
}
```

`frontend/src/app/models/news-slider.model.ts` :

```ts
export type SliderZone = 'home-top' | 'home-middle' | 'home-bottom';

export const SLIDER_ZONES: SliderZone[] = ['home-top', 'home-middle', 'home-bottom'];

export interface NewsSlider {
  id: string;
  slug: string;
  title: string;
  zoneKey: SliderZone | null;
  storyIds: string[];
}

export interface NewsSliderInput {
  title: string;
  zoneKey: SliderZone | null;
}

export interface SliderStoryRef {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  ownerKind: 'furniture' | 'exhibition';
  ownerId: string;
  ownerLabel: string;
}

export interface NewsSliderView {
  id: string;
  slug: string;
  title: string;
  zoneKey: SliderZone;
  stories: SliderStoryRef[];
}
```

- [ ] **Step 2 : Refactor PortfolioService**

Modifier `frontend/src/app/services/portfolio.service.ts` :

a) Supprimer les méthodes legacy `getSlides()` et `replaceSlides()` (lignes ~137-143 du fichier actuel).

b) Ajouter les imports :
```ts
import { Story, StoryInput, StoryWithSlides } from '../models/story.model';
import { NewsSlider, NewsSliderInput, NewsSliderView } from '../models/news-slider.model';
import { Slide } from '../models/slide.model';
```

c) Ajouter les méthodes (à la fin de la classe) :

```ts
// --- Stories ---

getStories(ownerKind: 'furniture' | 'exhibition', ownerId: string): Observable<Story[]> {
  return this.http.get<Story[]>(`${API}/stories`, { params: { ownerKind, ownerId } });
}

getStoryBySlug(slug: string): Observable<StoryWithSlides> {
  return this.http.get<StoryWithSlides>(`${API}/stories/${slug}`);
}

getAdminStories(ownerKind: 'furniture' | 'exhibition', ownerId: string): Observable<Story[]> {
  return this.http.get<Story[]>(`${API}/admin/stories`, { params: { ownerKind, ownerId } });
}

createStory(input: StoryInput): Observable<Story> {
  return this.http.post<Story>(`${API}/admin/stories`, input);
}

updateStory(id: string, input: StoryInput): Observable<Story> {
  return this.http.put<Story>(`${API}/admin/stories/${id}`, input);
}

updateStoryPosition(id: string, position: number): Observable<void> {
  return this.http.put<void>(`${API}/admin/stories/${id}/position`, null, { params: { position: String(position) } });
}

deleteStory(id: string): Observable<void> {
  return this.http.delete<void>(`${API}/admin/stories/${id}`);
}

getStorySlides(storyId: string): Observable<Slide[]> {
  return this.http.get<Slide[]>(`${API}/admin/stories/${storyId}/slides`);
}

replaceStorySlides(storyId: string, slides: Slide[]): Observable<Slide[]> {
  return this.http.put<Slide[]>(`${API}/admin/stories/${storyId}/slides`, slides);
}

// --- Sliders ---

getPublicSliders(): Observable<NewsSliderView[]> {
  return this.http.get<NewsSliderView[]>(`${API}/sliders`);
}

getAdminSliders(): Observable<NewsSlider[]> {
  return this.http.get<NewsSlider[]>(`${API}/admin/sliders`);
}

createSlider(input: NewsSliderInput): Observable<NewsSlider> {
  return this.http.post<NewsSlider>(`${API}/admin/sliders`, input);
}

updateSlider(id: string, input: NewsSliderInput): Observable<NewsSlider> {
  return this.http.put<NewsSlider>(`${API}/admin/sliders/${id}`, input);
}

deleteSlider(id: string): Observable<void> {
  return this.http.delete<void>(`${API}/admin/sliders/${id}`);
}

replaceSliderStories(id: string, storyIds: string[]): Observable<NewsSlider> {
  return this.http.put<NewsSlider>(`${API}/admin/sliders/${id}/stories`, { storyIds });
}
```

- [ ] **Step 3 : Update specs**

Modifier `frontend/src/app/services/portfolio.service.spec.ts` :

- Supprimer les tests de `getSlides`/`replaceSlides` (par grep, identifier les blocs `it('...getSlides...')` et `it('...replaceSlides...')`).
- Ajouter au moins 3 nouveaux tests sur les nouveaux endpoints (un pour stories list, un pour création slider, un pour replaceSliderStories) qui suivent le pattern HttpTestingController existant.

Exemple à adapter au style des tests existants :

```ts
it('getStories appelle GET /api/stories avec query params', () => {
  service.getStories('furniture', 'tabouret-aurore').subscribe();
  const req = httpMock.expectOne(r => r.url === '/api/stories' && r.params.get('ownerKind') === 'furniture');
  expect(req.request.method).toBe('GET');
  req.flush([]);
});

it('createSlider appelle POST /api/admin/sliders', () => {
  service.createSlider({ title: 'Test', zoneKey: 'home-top' }).subscribe();
  const req = httpMock.expectOne('/api/admin/sliders');
  expect(req.request.method).toBe('POST');
  req.flush({ id: 'sld-x', slug: 'test', title: 'Test', zoneKey: 'home-top', storyIds: [] });
});

it('replaceSliderStories appelle PUT /api/admin/sliders/:id/stories', () => {
  service.replaceSliderStories('sld-1', ['st-a', 'st-b']).subscribe();
  const req = httpMock.expectOne('/api/admin/sliders/sld-1/stories');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ storyIds: ['st-a', 'st-b'] });
  req.flush({ id: 'sld-1', slug: '', title: '', zoneKey: null, storyIds: ['st-a', 'st-b'] });
});
```

- [ ] **Step 4 : Run les tests unit front**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/portfolio.service.spec.ts'
```

Attendu : tous passent.

- [ ] **Step 5 : Vérifier qu'aucun autre composant n'utilise getSlides/replaceSlides**

```powershell
grep -rn "getSlides\|replaceSlides" frontend/src/app
```

Si présence dans story-viewer ou autre — anticiper la modif (sera traitée en Task 9).

- [ ] **Step 6 : Commit**

```powershell
git add frontend/src/app/models/story.model.ts frontend/src/app/models/news-slider.model.ts frontend/src/app/services/portfolio.service.ts frontend/src/app/services/portfolio.service.spec.ts
git commit -m "feat(frontend): modeles Story/NewsSlider + PortfolioService refactore"
```

---

## Task 8 : Composant `<app-news-slider>` + intégration `HomeComponent`

**Files:**
- Create: `frontend/src/app/components/news-slider/news-slider.component.ts`
- Create: `frontend/src/app/components/news-slider/news-slider.component.spec.ts`
- Modify: `frontend/src/app/pages/home/home.component.ts`
- Modify: `frontend/src/app/pages/home/home.component.spec.ts`

- [ ] **Step 1 : Écrire le test du composant**

`frontend/src/app/components/news-slider/news-slider.component.spec.ts` :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsSliderComponent } from './news-slider.component';
import { NewsSliderView } from '../../models/news-slider.model';

describe('NewsSliderComponent', () => {
  let fixture: ComponentFixture<NewsSliderComponent>;

  const slider: NewsSliderView = {
    id: 'sld-1',
    slug: 'actus',
    title: 'Actualités',
    zoneKey: 'home-top',
    stories: [
      { id: 'st-1', slug: 'a-principale', title: 'Story A', coverImage: 'https://e.com/a.jpg',
        ownerKind: 'furniture', ownerId: 'a', ownerLabel: 'Tabouret A' },
      { id: 'st-2', slug: 'b-principale', title: 'Story B', coverImage: 'https://e.com/b.jpg',
        ownerKind: 'exhibition', ownerId: 'b', ownerLabel: 'Expo B' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NewsSliderComponent] }).compileComponents();
    fixture = TestBed.createComponent(NewsSliderComponent);
    fixture.componentRef.setInput('slider', slider);
    fixture.detectChanges();
  });

  it('rend le titre du slider', () => {
    const title = fixture.nativeElement.querySelector('header .title');
    expect(title.textContent).toContain('Actualités');
  });

  it('rend une card par story', () => {
    const cards = fixture.nativeElement.querySelectorAll('button.card');
    expect(cards.length).toBe(2);
  });

  it('emet storyOpen au clic sur une card', () => {
    let emitted: any = null;
    fixture.componentInstance.storyOpen.subscribe(s => emitted = s);
    fixture.nativeElement.querySelectorAll('button.card')[1].click();
    expect(emitted?.id).toBe('st-2');
  });
});
```

- [ ] **Step 2 : Run le test (échec attendu — composant inexistant)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/news-slider.component.spec.ts'
```

Attendu : ÉCHEC (cannot find module).

- [ ] **Step 3 : Implémenter le composant**

`frontend/src/app/components/news-slider/news-slider.component.ts` :

```ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsSliderView, SliderStoryRef } from '../../models/news-slider.model';

@Component({
  selector: 'app-news-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="news-slider">
      <header>
        <span class="eyebrow">ACTUALITÉS</span>
        <h2 class="title">{{ slider.title }}</h2>
      </header>
      <div class="track">
        @for (story of slider.stories; track story.id) {
          <button class="card" type="button"
                  [attr.aria-label]="story.ownerLabel + ' — ' + story.title"
                  (click)="onCardClick(story)">
            <div class="thumb">
              <img [src]="story.coverImage" [alt]="story.title" loading="lazy" />
            </div>
            <div class="meta">
              <span class="cat">{{ story.ownerLabel }}</span>
              <h3 class="title">{{ story.title }}</h3>
            </div>
          </button>
        }
      </div>
    </section>
  `,
  styles: [`
    .news-slider { padding: 48px 0; }
    .news-slider > header { container-type: inline-size; padding: 0 24px 24px; max-width: 1200px; margin: 0 auto; }
    .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    h2.title { font-family: var(--serif); font-weight: 400; font-size: 1.6rem; margin-top: 8px; }

    .track {
      display: flex;
      gap: 24px;
      padding: 0 24px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      flex: 0 0 calc((100% - 48px) / 3);
      scroll-snap-align: start;
      display: flex;
      flex-direction: column;
      text-align: left;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .thumb { aspect-ratio: 4 / 5; overflow: hidden; background: var(--color-bg-alt); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 480ms ease; }
    .card:hover .thumb img { transform: scale(1.03); }
    .meta { padding: 16px 2px 0; display: flex; flex-direction: column; gap: 6px; }
    .cat { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-mute); }
    h3.title { font-family: var(--serif); font-weight: 400; font-size: 1.1rem; line-height: 1.2; color: var(--color-ink); margin: 0; }

    @media (max-width: 720px) {
      .card { flex: 0 0 75%; }
    }
  `]
})
export class NewsSliderComponent {
  @Input({ required: true }) slider!: NewsSliderView;
  @Output() storyOpen = new EventEmitter<SliderStoryRef>();

  onCardClick(story: SliderStoryRef): void {
    this.storyOpen.emit(story);
  }
}
```

- [ ] **Step 4 : Run le test (PASS attendu)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/news-slider.component.spec.ts'
```

Attendu : 3 passed.

- [ ] **Step 5 : Intégrer dans HomeComponent**

Modifier `frontend/src/app/pages/home/home.component.ts` :

a) Ajouter import :
```ts
import { NewsSliderComponent } from '../../components/news-slider/news-slider.component';
import { NewsSliderView, SliderZone, SLIDER_ZONES } from '../../models/news-slider.model';
import { SliderStoryRef } from '../../models/news-slider.model';
```

b) Ajouter `NewsSliderComponent` dans `imports` du décorateur.

c) Ajouter une signal et le mapping `sliderByZone` :
```ts
protected sliders = signal<NewsSliderView[]>([]);
protected sliderByZone = computed(() => {
  const map: Partial<Record<SliderZone, NewsSliderView>> = {};
  for (const s of this.sliders()) {
    if (SLIDER_ZONES.includes(s.zoneKey)) {
      map[s.zoneKey] = s;
    }
  }
  return map;
});
```

d) Étendre le `forkJoin` dans `ngOnInit` :
```ts
forkJoin({
  home: this.portfolio.getHome(),
  content: this.portfolio.getContent(),
  sliders: this.portfolio.getPublicSliders(),
}).subscribe({
  next: ({ home, content, sliders }) => {
    this.data.set(home);
    this.content.set(content);
    this.sliders.set(sliders);
    this.loadingSvc.stop('page');
    this.loadingSvc.stop('nav');
  },
  error: () => {
    this.loadingSvc.stop('page');
    this.loadingSvc.stop('nav');
  },
});
```

e) Ajouter les zones dans le template, AVANT/ENTRE/APRÈS les sections existantes :

Juste après `</section>` du hero (avant `@if (data(); as d) {`) :
```html
@if (sliderByZone()['home-top']; as s) {
  <app-news-slider [slider]="s" (storyOpen)="openStoryFromSlider($event)" />
}
```

Juste après la `</section>` du stories block (avant `<section class="feed">`) :
```html
@if (sliderByZone()['home-middle']; as s) {
  <app-news-slider [slider]="s" (storyOpen)="openStoryFromSlider($event)" />
}
```

Juste après la `</section>` du feed (avant `@if (viewerQueue().length > 0) {`) :
```html
@if (sliderByZone()['home-bottom']; as s) {
  <app-news-slider [slider]="s" (storyOpen)="openStoryFromSlider($event)" />
}
```

f) Ajouter la méthode handler :
```ts
openStoryFromSlider(story: SliderStoryRef): void {
  this.portfolio.getStoryBySlug(story.slug).subscribe(({ story: s, slides }) => {
    this.viewerQueue.set([{
      title: s.title,
      subtitle: story.ownerLabel,
      slides: enrichSlides({
        slug: s.slug,
        coverImage: s.coverImage,
        slides: slides ?? [],
        showStoryLink: false,
      }, s.ownerKind),
      kind: s.ownerKind,
      slug: s.slug,
    }]);
  });
}
```

- [ ] **Step 6 : Update HomeComponent spec**

Dans `frontend/src/app/pages/home/home.component.spec.ts`, le `forkJoin` étant étendu, les tests qui mockent PortfolioService doivent maintenant aussi stub `getPublicSliders`. Ajouter dans le setup :

```ts
spy.getPublicSliders.and.returnValue(of([]));
```

et ajouter `'getPublicSliders'` dans le `createSpyObj`.

- [ ] **Step 7 : Run les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/home.component.spec.ts'
```

Attendu : tous passent.

- [ ] **Step 8 : Commit**

```powershell
git add frontend/src/app/components/news-slider/ frontend/src/app/pages/home/
git commit -m "feat(frontend): composant news-slider + 3 zones sur la home"
```

---

## Task 9 : StoryViewer — adaptation de la queue + rangée catégories

Le viewer prend déjà `queue: StoryItem[]`. Adaptation des callers (openCategory/openExhibition) pour passer par la nouvelle API stories.

**Files:**
- Modify: `frontend/src/app/pages/home/home.component.ts`

- [ ] **Step 1 : Refactor openCategory et openExhibition**

Dans `frontend/src/app/pages/home/home.component.ts`, remplacer les méthodes existantes :

```ts
openCategory(cat: HomeCategoryView): void {
  if (cat.itemSlugs.length === 0) return;
  // Pour chaque slug d'item, charger ses stories et prendre la première
  const requests = cat.itemSlugs.map(slug => this.portfolio.getStories('furniture', slug));
  forkJoin(requests).subscribe(storyArrays => {
    const queue: StoryItem[] = [];
    for (const stories of storyArrays) {
      if (stories.length === 0) continue;
      const first = stories[0];
      // Charger les slides de la première story
      this.portfolio.getStoryBySlug(first.slug).subscribe(({ story, slides }) => {
        queue.push({
          title: story.title,
          subtitle: story.ownerId,
          slides: enrichSlides({
            slug: story.slug,
            coverImage: story.coverImage,
            slides: slides ?? [],
            showStoryLink: false,
          }, 'furniture'),
          kind: 'furniture',
          slug: story.slug,
        });
        this.viewerQueue.set([...queue]); // émission progressive
      });
    }
  });
}

openExhibition(exh: HomeExhibitionView): void {
  this.portfolio.getStories('exhibition', exh.slug).subscribe(stories => {
    if (stories.length === 0) return;
    const first = stories[0];
    this.portfolio.getStoryBySlug(first.slug).subscribe(({ story, slides }) => {
      this.viewerQueue.set([{
        title: story.title,
        subtitle: `${exh.venue} · ${exh.period}`,
        slides: enrichSlides({
          slug: story.slug,
          coverImage: story.coverImage,
          slides: slides ?? [],
          showStoryLink: false,
        }, 'exhibition'),
        kind: 'exhibition',
        slug: story.slug,
      }]);
    });
  });
}
```

Note : `enrichSlides` actuel prend un objet avec un champ `showStoryButton` qu'on supprime ici (la story n'a plus de lien direct au sens legacy). Vérifier la signature de la fonction et adapter.

- [ ] **Step 2 : Run tous les tests front pour vérifier non-régression**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false
```

Attendu : tous passent. Si home.component.spec a un test qui mock `getFurniture()` directement, l'adapter en mockant `getStories()` + `getStoryBySlug()`.

- [ ] **Step 3 : Commit**

```powershell
git add frontend/src/app/pages/home/home.component.ts frontend/src/app/pages/home/home.component.spec.ts
git commit -m "refactor(home): rangee categories+expos alimentee par stories (premiere story par owner)"
```

---

## Task 10 : Admin mobilier/expositions — bloc Stories par owner

L'UI admin actuelle a un éditeur de slides intégré dans la fiche. Refactor pour exposer une liste des N stories de l'owner avec CRUD + bouton "Éditer slides" (qui réutilise le slides-editor sur la story sélectionnée).

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/components/slides-editor/*` (si composant existe)

- [ ] **Step 1 : Identifier le composant slides-editor**

```powershell
grep -rn "slides-editor\|SlidesEditor" frontend/src/app --include="*.ts" | head -5
```

Localiser le composant qui édite les slides (probablement `frontend/src/app/components/slides-editor.component.ts` ou inline dans les pages admin). Si inline dans mobilier.component.ts, planifier de l'extraire.

- [ ] **Step 2 : Refactor slides-editor pour accepter un storyId**

Trouver le component qui reçoit aujourd'hui `(kind, ownerId)` (probablement via 2 Inputs). Le passer à `@Input() storyId: string` qui appellera `portfolio.getStorySlides(storyId)` / `portfolio.replaceStorySlides(storyId, slides)`.

Adapter sa signature et son service calls. Les tests existants de ce composant doivent passer après cette adaptation.

- [ ] **Step 3 : Ajouter bloc Stories dans MobilierComponent**

Dans `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`, pour chaque mobilier sélectionné, charger ses stories et afficher un bloc :

Ajouter signal et chargement :
```ts
protected currentStories = signal<Story[]>([]);

loadStoriesFor(slug: string): void {
  this.portfolio.getAdminStories('furniture', slug).subscribe(s => this.currentStories.set(s));
}
```

Ajouter dans le template (proche de l'éditeur de slides actuel) :
```html
<section class="stories-block">
  <header>
    <h3>Stories</h3>
    <button type="button" (click)="openNewStoryForm()">+ Nouvelle story</button>
  </header>
  @for (story of currentStories(); track story.id) {
    <article class="story-item">
      <img [src]="story.coverImage" alt="" class="story-cover" />
      <span class="story-title">{{ story.title }}</span>
      <div class="actions">
        <button type="button" (click)="moveStoryUp(story)" [disabled]="$index === 0">↑</button>
        <button type="button" (click)="moveStoryDown(story)" [disabled]="$index === currentStories().length - 1">↓</button>
        <button type="button" (click)="editStorySlides(story)">Éditer slides</button>
        <button type="button" (click)="renameStory(story)">Renommer</button>
        <button type="button" (click)="deleteStory(story)">Supprimer</button>
      </div>
    </article>
  }
</section>

@if (editingStory(); as story) {
  <div class="slides-editor-overlay">
    <header>
      <h4>Slides de "{{ story.title }}"</h4>
      <button type="button" (click)="closeSlidesEditor()">Fermer</button>
    </header>
    <app-slides-editor [storyId]="story.id" />
  </div>
}
```

Ajouter les handlers (openNewStoryForm, moveStoryUp/Down, editStorySlides, renameStory, deleteStory). Chaque action appelle le PortfolioService correspondant puis re-charge `loadStoriesFor`.

- [ ] **Step 4 : Reproduire le bloc dans ExpositionsComponent**

Identique avec `ownerKind = 'exhibition'`.

- [ ] **Step 5 : Run les tests front (suite complète)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false
```

Attendu : tous passent. Adapter les tests existants pour les pages admin mobilier/expositions (probablement quelques mocks à ajouter).

- [ ] **Step 6 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/ frontend/src/app/pages/admin/expositions/ frontend/src/app/components/slides-editor/
git commit -m "feat(admin): bloc Stories par owner + slides-editor par storyId"
```

---

## Task 11 : Nouvelle page admin `/admin/sliders`

**Files:**
- Create: `frontend/src/app/pages/admin/sliders/sliders.component.ts`
- Create: `frontend/src/app/pages/admin/sliders/sliders.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/admin.routes.ts`
- Modify: `frontend/src/app/pages/admin/admin-layout.component.ts`

- [ ] **Step 1 : Créer le test du composant**

`frontend/src/app/pages/admin/sliders/sliders.component.spec.ts` :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SlidersComponent } from './sliders.component';

describe('SlidersComponent', () => {
  let fixture: ComponentFixture<SlidersComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidersComponent, HttpClientTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(SlidersComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne('/api/admin/sliders').flush([]);
    httpMock.expectOne(r => r.url === '/api/admin/stories' || r.url.startsWith('/api/admin/stories'))
            .flush([]);
  });

  afterEach(() => httpMock.verify());

  it('rend la liste des zones disponibles', () => {
    const zones = fixture.nativeElement.querySelectorAll('.zone-row');
    expect(zones.length).toBe(3); // home-top, home-middle, home-bottom
  });

  it('affiche un bouton Nouveau slider', () => {
    const btn = fixture.nativeElement.querySelector('button.new-slider');
    expect(btn).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Implémenter le composant**

`frontend/src/app/pages/admin/sliders/sliders.component.ts` :

```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../../services/portfolio.service';
import { NewsSlider, NewsSliderInput, SliderZone, SLIDER_ZONES } from '../../../models/news-slider.model';
import { Story } from '../../../models/story.model';

@Component({
  selector: 'app-admin-sliders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Sliders d'actualités</h2>

    <section class="zones">
      <h3>Zones disponibles</h3>
      @for (zone of zones; track zone) {
        <div class="zone-row">
          <code>{{ zone }}</code>
          @if (sliderByZone()[zone]; as s) {
            <span>{{ s.title }} ({{ s.storyIds.length }} stories)</span>
            <button type="button" (click)="openComposition(s)">Composition</button>
          } @else {
            <span class="muted">aucun slider assigné</span>
          }
        </div>
      }
    </section>

    <section class="all-sliders">
      <header>
        <h3>Tous les sliders</h3>
        <button type="button" class="new-slider" (click)="openNewSliderForm()">+ Nouveau slider</button>
      </header>
      @for (s of sliders(); track s.id) {
        <article class="slider-row">
          <span class="title">{{ s.title }}</span>
          <span class="zone">→ {{ s.zoneKey ?? 'non assigné' }}</span>
          <span class="count">{{ s.storyIds.length }} stories</span>
          <button type="button" (click)="openComposition(s)">Composition</button>
          <button type="button" (click)="renameSlider(s)">Renommer</button>
          <button type="button" (click)="changeZone(s)">Changer zone</button>
          <button type="button" (click)="deleteSlider(s)">Supprimer</button>
        </article>
      }
    </section>

    @if (compositionOpen() && editingSlider(); as s) {
      <div class="composition-modal" role="dialog">
        <header>
          <h3>Composition du slider "{{ s.title }}"</h3>
          <button type="button" (click)="closeComposition()">Fermer</button>
        </header>
        <div class="composition-grid">
          <aside class="available">
            <h4>Stories disponibles</h4>
            <input type="text" [(ngModel)]="storyFilter" placeholder="Rechercher..." />
            @for (story of filteredAvailable(); track story.id) {
              <label>
                <input type="checkbox" [checked]="selectedToAdd().includes(story.id)" (change)="toggleSelect(story.id)" />
                {{ story.title }} <small>({{ story.ownerKind }} {{ story.ownerId }})</small>
              </label>
            }
            <button type="button" (click)="addSelected()" [disabled]="selectedToAdd().length === 0">→ Ajouter</button>
          </aside>
          <aside class="composition">
            <h4>Composition</h4>
            @for (storyId of pendingStoryIds(); track storyId) {
              <div class="comp-item">
                <span>{{ storyTitle(storyId) }}</span>
                <button type="button" (click)="moveUp(storyId)">↑</button>
                <button type="button" (click)="moveDown(storyId)">↓</button>
                <button type="button" (click)="remove(storyId)">← Retirer</button>
              </div>
            }
            <button type="button" (click)="saveComposition()">Enregistrer</button>
          </aside>
        </div>
      </div>
    }
  `,
})
export class SlidersComponent implements OnInit {
  private portfolio = inject(PortfolioService);

  protected sliders = signal<NewsSlider[]>([]);
  protected allStories = signal<Story[]>([]);
  protected compositionOpen = signal(false);
  protected editingSlider = signal<NewsSlider | null>(null);
  protected pendingStoryIds = signal<string[]>([]);
  protected selectedToAdd = signal<string[]>([]);
  protected storyFilter = '';
  protected zones: SliderZone[] = SLIDER_ZONES;

  protected sliderByZone = computed(() => {
    const map: Partial<Record<SliderZone, NewsSlider>> = {};
    for (const s of this.sliders()) {
      if (s.zoneKey && this.zones.includes(s.zoneKey)) map[s.zoneKey] = s;
    }
    return map;
  });

  protected filteredAvailable = computed(() => {
    const pending = new Set(this.pendingStoryIds());
    const q = this.storyFilter.toLowerCase();
    return this.allStories()
      .filter(s => !pending.has(s.id))
      .filter(s => !q || s.title.toLowerCase().includes(q) || s.ownerId.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.portfolio.getAdminSliders().subscribe(s => this.sliders.set(s));
    // Charger TOUTES les stories : il n'y a pas (encore) d'endpoint global, donc charger
    // par owner. À défaut, ajouter un endpoint GET /api/admin/stories (sans params) si besoin.
    // Pour la v1, on suppose un endpoint flat — si pas dispo, créer une issue.
    // Workaround temporaire : agréger par appels en parallèle sur toutes les furniture/exhibition.
    // [À détailler côté implémentation]
  }

  openNewSliderForm(): void {
    const title = prompt('Titre du slider ?');
    if (!title) return;
    this.portfolio.createSlider({ title, zoneKey: null }).subscribe(s => this.sliders.update(arr => [...arr, s]));
  }

  openComposition(s: NewsSlider): void {
    this.editingSlider.set(s);
    this.pendingStoryIds.set([...s.storyIds]);
    this.selectedToAdd.set([]);
    this.compositionOpen.set(true);
  }

  closeComposition(): void {
    this.compositionOpen.set(false);
    this.editingSlider.set(null);
  }

  toggleSelect(id: string): void {
    this.selectedToAdd.update(arr => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  }

  addSelected(): void {
    this.pendingStoryIds.update(arr => [...arr, ...this.selectedToAdd()]);
    this.selectedToAdd.set([]);
  }

  remove(id: string): void {
    this.pendingStoryIds.update(arr => arr.filter(x => x !== id));
  }

  moveUp(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i <= 0) return arr;
      const copy = [...arr];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
  }

  moveDown(id: string): void {
    this.pendingStoryIds.update(arr => {
      const i = arr.indexOf(id);
      if (i < 0 || i >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
      return copy;
    });
  }

  saveComposition(): void {
    const slider = this.editingSlider();
    if (!slider) return;
    this.portfolio.replaceSliderStories(slider.id, this.pendingStoryIds()).subscribe(updated => {
      this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x));
      this.closeComposition();
    });
  }

  storyTitle(id: string): string {
    return this.allStories().find(s => s.id === id)?.title ?? id;
  }

  renameSlider(s: NewsSlider): void {
    const newTitle = prompt('Nouveau titre ?', s.title);
    if (!newTitle) return;
    this.portfolio.updateSlider(s.id, { title: newTitle, zoneKey: s.zoneKey }).subscribe(updated => {
      this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x));
    });
  }

  changeZone(s: NewsSlider): void {
    const newZone = prompt('Zone (home-top, home-middle, home-bottom, ou vide pour désassigner) ?', s.zoneKey ?? '');
    if (newZone === null) return;
    const zoneKey = newZone.trim() === '' ? null : (newZone.trim() as SliderZone);
    this.portfolio.updateSlider(s.id, { title: s.title, zoneKey }).subscribe(
      updated => this.sliders.update(arr => arr.map(x => x.id === updated.id ? updated : x)),
      err => alert('Zone non disponible ou invalide')
    );
  }

  deleteSlider(s: NewsSlider): void {
    if (!confirm(`Supprimer le slider "${s.title}" ?`)) return;
    this.portfolio.deleteSlider(s.id).subscribe(() => {
      this.sliders.update(arr => arr.filter(x => x.id !== s.id));
    });
  }
}
```

> Note v1 : `allStories` est laissé minimal ici ; en pratique, ajouter un endpoint backend `GET /api/admin/stories/all` (sans filter owner) facilite. Sinon, agréger côté front en chargeant la liste depuis tous les furniture/exhibition connus (workaround acceptable v1). À itérer si nécessaire pendant le développement.

- [ ] **Step 3 : Ajouter route + entrée nav**

Modifier `frontend/src/app/pages/admin/admin.routes.ts`, ajouter dans le tableau des children :
```ts
{
  path: 'sliders',
  loadComponent: () => import('./sliders/sliders.component').then(m => m.SlidersComponent),
  title: 'Sliders — Administration',
},
```

Modifier `frontend/src/app/pages/admin/admin-layout.component.ts`, dans la nav (section SITE) ajouter après "Navigation" :
```html
<a class="nav-item" routerLink="/admin/sliders" routerLinkActive="active">Sliders</a>
```

- [ ] **Step 4 : Run les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false
```

Attendu : tous passent.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/pages/admin/sliders/ frontend/src/app/pages/admin/admin.routes.ts frontend/src/app/pages/admin/admin-layout.component.ts
git commit -m "feat(admin): page Sliders + composition drag&drop + entree nav"
```

---

## Task 12 : Endpoint admin pour lister TOUTES les stories (cross-owner)

L'admin page sliders a besoin de la liste de toutes les stories. Plutôt qu'un workaround front, ajout d'un endpoint backend.

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/pages/admin/sliders/sliders.component.ts`

- [ ] **Step 1 : Ajouter findAll dans StoryService**

Ajouter dans `StoryService` :
```java
public List<Story> findAll() {
    return storyRepo.findAll().stream().map(StoryService::toDto).toList();
}
```

- [ ] **Step 2 : Endpoint GET /api/admin/stories/all**

Dans `AdminStoriesController`, ajouter :
```java
@GetMapping("/all")
public List<Story> all() {
    return stories.findAll();
}
```

- [ ] **Step 3 : Méthode portfolio.service**

Ajouter dans `PortfolioService` :
```ts
getAllAdminStories(): Observable<Story[]> {
  return this.http.get<Story[]>(`${API}/admin/stories/all`);
}
```

- [ ] **Step 4 : Utiliser dans SlidersComponent**

Dans `sliders.component.ts`, remplacer le bloc `ngOnInit` :
```ts
ngOnInit(): void {
  this.portfolio.getAdminSliders().subscribe(s => this.sliders.set(s));
  this.portfolio.getAllAdminStories().subscribe(s => this.allStories.set(s));
}
```

- [ ] **Step 5 : Run tous les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false
```

Attendu : tous passent.

- [ ] **Step 6 : Commit**

```powershell
git add backend/ frontend/src/app/services/portfolio.service.ts frontend/src/app/pages/admin/sliders/sliders.component.ts
git commit -m "feat(admin): endpoint GET /api/admin/stories/all pour la page Sliders"
```

---

## Task 13 : Tests visuels Playwright — fixture sliders + regen baselines

**Files:**
- Create: `frontend/e2e/fixtures/sliders.json`
- Modify: `frontend/e2e/helpers/stub-api.ts`
- Modify: `frontend/e2e/__screenshots__/home.spec.ts/*` (regen)

- [ ] **Step 1 : Créer la fixture sliders**

`frontend/e2e/fixtures/sliders.json` :

```json
[
  {
    "id": "sld-actus",
    "slug": "actualites",
    "title": "Actualités",
    "zoneKey": "home-middle",
    "stories": [
      {
        "id": "st-aurore-mof",
        "slug": "tabouret-aurore-mof",
        "title": "Making-of du Tabouret Aurore",
        "coverImage": "__PLACEHOLDER__",
        "ownerKind": "furniture",
        "ownerId": "tabouret-aurore",
        "ownerLabel": "Tabouret Aurore"
      },
      {
        "id": "st-lumen-instal",
        "slug": "lumen-2025-installation",
        "title": "Installation à la Galerie Test",
        "coverImage": "__PLACEHOLDER__",
        "ownerKind": "exhibition",
        "ownerId": "lumen-2025",
        "ownerLabel": "Lumen · Galerie Test"
      },
      {
        "id": "st-onyx-mof",
        "slug": "tabouret-onyx-mof",
        "title": "Carbonisation du Onyx",
        "coverImage": "__PLACEHOLDER__",
        "ownerKind": "furniture",
        "ownerId": "tabouret-onyx",
        "ownerLabel": "Tabouret Onyx"
      }
    ]
  }
]
```

- [ ] **Step 2 : Ajouter le stub dans stub-api.ts**

Dans `frontend/e2e/helpers/stub-api.ts`, ajouter en haut :
```ts
import slidersFixture from '../fixtures/sliders.json';
```

Et dans le tableau `STUBS`, ajouter (après `'**/api/content'`) :
```ts
{ glob: '**/api/sliders', fixture: slidersFixture },
```

- [ ] **Step 3 : Régénérer la baseline home**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
npm run test:visual:docker:update
```

Attendu : `14 passed`. Les 2 baselines `home.spec.ts/*.png` ont été regen (la home a maintenant un slider "Actualités" entre les stories et le feed).

- [ ] **Step 4 : Inspecter visuellement la nouvelle home**

Lire `frontend/e2e/__screenshots__/home.spec.ts/home-chromium-desktop.png` et `home-chromium-mobile.png` avec l'outil Read. Vérifier :
- Le slider "ACTUALITÉS / Actualités" apparaît entre la rangée stories et le feed
- 3 cards visibles desktop, scroll horizontal mobile
- Aucune régression sur le reste de la home

- [ ] **Step 5 : Re-lancer pour confirmer stabilité**

```powershell
npm run test:visual:docker
```

Attendu : `14 passed`.

- [ ] **Step 6 : Commit**

```powershell
git add frontend/e2e/
git commit -m "test(visual): fixture sliders + regen baselines home avec slider d'actualites"
```

---

## Critères de complétion

- [ ] 4 changesets Liquibase (022-025) appliqués, schéma migré sans perte de données.
- [ ] Tous les tests backend passent (`mvn test`) incluant les nouveaux : `StoryServiceTest`, `NewsSliderServiceTest`, `StoryControllerTest`, `SliderControllerTest`, `AdminSlidersControllerTest`, `MigrationDefaultStoriesTest`, `AdminStoriesControllerTest` (refactor).
- [ ] Tous les tests frontend unit passent (`ng test`).
- [ ] Les 14 tests Playwright passent contre les baselines régénérées (`npm run test:visual:docker`).
- [ ] Endpoints legacy `/api/admin/slides/{kind}/{ownerId}` retirés (clean break vérifié par grep sur le code).
- [ ] Smoke manuel : démarrer la stack `docker compose up --build`, créer 2 stories pour un mobilier, créer un slider assigné à `home-middle` avec ces 2 stories, vérifier l'apparition publique.

## Risques rappel

- Migration changeset 023 : la jointure SQL doit fonctionner sur H2 ET Postgres (test sur les deux).
- Refactor `story_slide` (changeset 024) : destructif côté colonnes — snapshot Postgres staging avant déploiement.
- 1 slider max par zone : validation applicative (pas de contrainte DB) — race condition acceptée (admin single-user).
- `slides-editor` à refactorer pour prendre `storyId` — vérifier qu'aucun autre caller ne reste sur l'ancien API `(kind, ownerId)`.
- Tests visuels : la home change visuellement, baseline régénération mandatory à la première CI.
