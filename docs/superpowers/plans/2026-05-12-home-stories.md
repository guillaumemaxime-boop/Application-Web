# Refonte home en stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la home en bandeau de stories sticky (catégories + expos) + masonry éditorial mixte, avec un Story Viewer plein écran qui joue cover/image/spec/quote/link, et un admin pour éditer slides + ordre du masonry + catégories.

**Architecture:**

- Backend : 4 nouvelles tables Liquibase (`story_slide`, `story_slide_spec`, `home_feed`, `furniture_category_meta`). `Slide` est une **sealed interface** Java polymorphique (Jackson `@JsonTypeInfo`). Une entité JPA fourre-tout `StorySlideEntity` mappée vers 5 records via `switch`. Endpoint agrégé `GET /api/home` + endpoints admin protégés.
- Frontend : page `/` refondue (hero + bandeau sticky + masonry), composant `StoryViewer` standalone qui consomme `Slide[]` typés, directive `appReorderable` HTML5 native pour le drag&drop admin.
- Suppression des pages liste `/mobilier` et `/expositions` ; conservation des fiches détail ; redirections 301.

**Tech Stack:**

- Backend : Java 25, Spring Boot 4.0, Spring Data JPA, Liquibase, Jackson, JUnit 5 + Mockito.
- Frontend : Angular 21 (standalone, signaux, `@if`/`@for`), TypeScript strict, Karma + Jasmine.
- DB : H2 / PostgreSQL via Liquibase.

**Spec source :** `docs/superpowers/specs/2026-05-12-home-stories-design.md`
**Visual reference :** `docs/prototypes/home/index.html`

---

## Phase A — Base de données

### Task 1 : Liquibase — Tables `story_slide` + `story_slide_spec`

**Files:**

- Create: `backend/src/main/resources/db/changelog/changes/007-create-story-slides.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1: Créer le changelog**

Crée `backend/src/main/resources/db/changelog/changes/007-create-story-slides.yaml` :

```yaml
databaseChangeLog:
  - changeSet:
      id: 007-create-story-slides
      author: atelier-lumen
      changes:
        - createTable:
            tableName: story_slide
            columns:
              - column: { name: id,         type: varchar(50),  constraints: { primaryKey: true, nullable: false } }
              - column: { name: owner_kind, type: varchar(20),  constraints: { nullable: false } }
              - column: { name: owner_id,   type: varchar(50),  constraints: { nullable: false } }
              - column: { name: position,   type: int,          constraints: { nullable: false } }
              - column: { name: type,       type: varchar(20),  constraints: { nullable: false } }
              - column: { name: src,        type: varchar(500) }
              - column: { name: caption,    type: varchar(500) }
              - column: { name: quote_body, type: varchar(2000) }
              - column: { name: quote_cite, type: varchar(500) }
              - column: { name: link_label, type: varchar(200) }
              - column: { name: link_desc,  type: varchar(500) }
              - column: { name: link_href,  type: varchar(500) }
        - createIndex:
            indexName: idx_story_slide_owner_pos
            tableName: story_slide
            columns:
              - column: { name: owner_kind }
              - column: { name: owner_id }
              - column: { name: position }
        - createTable:
            tableName: story_slide_spec
            columns:
              - column: { name: story_slide_id, type: varchar(50), constraints: { nullable: false } }
              - column: { name: position,       type: int,          constraints: { nullable: false } }
              - column: { name: label,          type: varchar(100), constraints: { nullable: false } }
              - column: { name: entry_value,    type: varchar(200), constraints: { nullable: false } }
        - addPrimaryKey:
            tableName: story_slide_spec
            columnNames: story_slide_id, position
            constraintName: pk_story_slide_spec
        - addForeignKeyConstraint:
            baseTableName: story_slide_spec
            baseColumnNames: story_slide_id
            referencedTableName: story_slide
            referencedColumnNames: id
            constraintName: fk_story_slide_spec_slide
            onDelete: CASCADE
```

- [ ] **Step 2: Déclarer dans le master**

Modifie `backend/src/main/resources/db/changelog/db.changelog-master.yaml`, ajoute à la fin :

```yaml
  - include:
      file: changes/007-create-story-slides.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 3: Vérifier que Liquibase démarre sans erreur**

```bash
cd backend && ./mvnw spring-boot:run
```

Attendu : logs Liquibase `Successfully acquired change log lock` puis `ChangeSet ... 007-create-story-slides::atelier-lumen ran successfully`. Stoppe le serveur (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/changelog/changes/007-create-story-slides.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml
git commit -m "feat(db): add story_slide and story_slide_spec tables"
```

---

### Task 2 : Liquibase — Tables `home_feed` + `furniture_category_meta`

**Files:**

- Create: `backend/src/main/resources/db/changelog/changes/008-create-home-feed.yaml`
- Create: `backend/src/main/resources/db/changelog/changes/009-create-category-meta.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1: Créer `008-create-home-feed.yaml`**

```yaml
databaseChangeLog:
  - changeSet:
      id: 008-create-home-feed
      author: atelier-lumen
      changes:
        - createTable:
            tableName: home_feed
            columns:
              - column: { name: position, type: int,           constraints: { primaryKey: true, nullable: false } }
              - column: { name: kind,     type: varchar(20),   constraints: { nullable: false } }
              - column: { name: ref_slug, type: varchar(200),  constraints: { nullable: false } }
```

- [ ] **Step 2: Créer `009-create-category-meta.yaml`**

```yaml
databaseChangeLog:
  - changeSet:
      id: 009-create-category-meta
      author: atelier-lumen
      changes:
        - createTable:
            tableName: furniture_category_meta
            columns:
              - column: { name: category,    type: varchar(100), constraints: { primaryKey: true, nullable: false } }
              - column: { name: cover_image, type: varchar(500), constraints: { nullable: false } }
              - column: { name: position,    type: int,           constraints: { nullable: false } }
              - column: { name: visible,     type: boolean,       defaultValueBoolean: true, constraints: { nullable: false } }
```

- [ ] **Step 3: Déclarer les deux dans le master**

Append au master :

```yaml
  - include:
      file: changes/008-create-home-feed.yaml
      relativeToChangelogFile: true
  - include:
      file: changes/009-create-category-meta.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 4: Vérifier démarrage**

```bash
cd backend && ./mvnw spring-boot:run
```

Attendu : les deux changesets `008-create-home-feed` et `009-create-category-meta` s'exécutent. Stoppe.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/changelog/changes/008-create-home-feed.yaml backend/src/main/resources/db/changelog/changes/009-create-category-meta.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml
git commit -m "feat(db): add home_feed and furniture_category_meta tables"
```

---

## Phase B — Backend models & entités

### Task 3 : Entité `StorySlideEntity` + repository

**Files:**

- Create: `backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/StorySlideSpecEntry.java` (embeddable)
- Create: `backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java`

- [ ] **Step 1: Créer l'embeddable `StorySlideSpecEntry`**

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class StorySlideSpecEntry {
    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "entry_value", nullable = false, length = 200)
    private String value;

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
```

- [ ] **Step 2: Créer `StorySlideEntity`**

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
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

    @Column(name = "owner_kind", nullable = false, length = 20)
    private String ownerKind;

    @Column(name = "owner_id", nullable = false, length = 50)
    private String ownerId;

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

    // getters / setters pour tous les champs (pattern identique à FurnitureEntity)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getOwnerKind() { return ownerKind; }
    public void setOwnerKind(String ownerKind) { this.ownerKind = ownerKind; }
    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
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

- [ ] **Step 3: Créer le repository**

```java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.StorySlideEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StorySlideRepository extends JpaRepository<StorySlideEntity, String> {
    List<StorySlideEntity> findByOwnerKindAndOwnerIdOrderByPosition(String ownerKind, String ownerId);
    void deleteByOwnerKindAndOwnerId(String ownerKind, String ownerId);
}
```

- [ ] **Step 4: Vérifier compilation**

```bash
cd backend && ./mvnw compile
```

Attendu : `BUILD SUCCESS`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java backend/src/main/java/com/atelier/portfolio/entity/StorySlideSpecEntry.java backend/src/main/java/com/atelier/portfolio/repository/StorySlideRepository.java
git commit -m "feat(backend): add StorySlideEntity and repository"
```

---

### Task 4 : Entités `HomeFeedEntryEntity` + `FurnitureCategoryMetaEntity` + repositories

**Files:**

- Create: `backend/src/main/java/com/atelier/portfolio/entity/HomeFeedEntryEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/FurnitureCategoryMetaEntity.java`
- Create: `backend/src/main/java/com/atelier/portfolio/repository/HomeFeedRepository.java`
- Create: `backend/src/main/java/com/atelier/portfolio/repository/FurnitureCategoryMetaRepository.java`

- [ ] **Step 1: `HomeFeedEntryEntity`**

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "home_feed")
public class HomeFeedEntryEntity {

    @Id
    private int position;

    @Column(nullable = false, length = 20)
    private String kind;

    @Column(name = "ref_slug", nullable = false, length = 200)
    private String refSlug;

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getRefSlug() { return refSlug; }
    public void setRefSlug(String refSlug) { this.refSlug = refSlug; }
}
```

- [ ] **Step 2: `FurnitureCategoryMetaEntity`**

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "furniture_category_meta")
public class FurnitureCategoryMetaEntity {

    @Id
    @Column(length = 100)
    private String category;

    @Column(name = "cover_image", nullable = false, length = 500)
    private String coverImage;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean visible = true;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
}
```

- [ ] **Step 3: Repositories**

```java
// HomeFeedRepository.java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HomeFeedRepository extends JpaRepository<HomeFeedEntryEntity, Integer> {
    List<HomeFeedEntryEntity> findAllByOrderByPositionAsc();
}
```

```java
// FurnitureCategoryMetaRepository.java
package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FurnitureCategoryMetaRepository extends JpaRepository<FurnitureCategoryMetaEntity, String> {
    List<FurnitureCategoryMetaEntity> findAllByOrderByPositionAsc();
    List<FurnitureCategoryMetaEntity> findByVisibleTrueOrderByPositionAsc();
}
```

- [ ] **Step 4: Compile + commit**

```bash
cd backend && ./mvnw compile
git add backend/src/main/java/com/atelier/portfolio/entity/HomeFeedEntryEntity.java backend/src/main/java/com/atelier/portfolio/entity/FurnitureCategoryMetaEntity.java backend/src/main/java/com/atelier/portfolio/repository/HomeFeedRepository.java backend/src/main/java/com/atelier/portfolio/repository/FurnitureCategoryMetaRepository.java
git commit -m "feat(backend): add HomeFeed and FurnitureCategoryMeta entities"
```

---

### Task 5 : Modèles `Slide` (sealed) + records

**Files:**

- Create: `backend/src/main/java/com/atelier/portfolio/model/Slide.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/SpecEntry.java`

- [ ] **Step 1: Créer `SpecEntry`**

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpecEntry(
        @NotBlank @Size(max = 100) String label,
        @NotBlank @Size(max = 200) String value
) {}
```

- [ ] **Step 2: Créer `Slide.java`** (sealed interface + 5 records dans le même fichier pour rester compact)

```java
package com.atelier.portfolio.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = Slide.CoverSlide.class, name = "cover"),
        @JsonSubTypes.Type(value = Slide.ImageSlide.class, name = "image"),
        @JsonSubTypes.Type(value = Slide.SpecSlide.class, name = "spec"),
        @JsonSubTypes.Type(value = Slide.QuoteSlide.class, name = "quote"),
        @JsonSubTypes.Type(value = Slide.LinkSlide.class, name = "link")
})
public sealed interface Slide
        permits Slide.CoverSlide, Slide.ImageSlide, Slide.SpecSlide, Slide.QuoteSlide, Slide.LinkSlide {

    String id();
    int position();

    record CoverSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 500) String src
    ) implements Slide {}

    record ImageSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 500) String src,
            @Size(max = 500) String caption
    ) implements Slide {}

    record SpecSlide(
            @Size(max = 50) String id,
            int position,
            List<SpecEntry> specs
    ) implements Slide {}

    record QuoteSlide(
            @Size(max = 50) String id,
            int position,
            @NotBlank @Size(max = 2000) String body,
            @Size(max = 500) String cite
    ) implements Slide {}

    record LinkSlide(
            @Size(max = 50) String id,
            int position,
            @Size(max = 200) String label,
            @Size(max = 500) String description,
            @Size(max = 500) String href
    ) implements Slide {}
}
```

- [ ] **Step 3: Compile**

```bash
cd backend && ./mvnw compile
```

Attendu : compile OK. Java 25 supporte les sealed interfaces, Jackson supporte le polymorphisme.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/model/Slide.java backend/src/main/java/com/atelier/portfolio/model/SpecEntry.java
git commit -m "feat(backend): add Slide sealed interface with 5 subtypes"
```

---

## Phase C — Backend services

### Task 6 : `StoryService` (conversion entité ↔ records, replaceSlides, findByOwner)

**Files:**

- Create: `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java`

- [ ] **Step 1: Écrire le test (TDD)**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoryServiceTest {

    @Mock private StorySlideRepository repository;

    @InjectMocks private StoryService service;

    @Test
    void findByOwner_returnsMixedSlideTypes() {
        StorySlideEntity cover = entity("s1", "furniture", "f-001", 0, "cover");
        cover.setSrc("cover.jpg");

        StorySlideEntity image = entity("s2", "furniture", "f-001", 1, "image");
        image.setSrc("img.jpg"); image.setCaption("Détail");

        StorySlideEntity quote = entity("s3", "furniture", "f-001", 2, "quote");
        quote.setQuoteBody("Le bois parle"); quote.setQuoteCite("— Maître Asaba");

        when(repository.findByOwnerKindAndOwnerIdOrderByPosition("furniture", "f-001"))
                .thenReturn(List.of(cover, image, quote));

        List<Slide> result = service.findByOwner("furniture", "f-001");

        assertEquals(3, result.size());
        assertInstanceOf(Slide.CoverSlide.class, result.get(0));
        assertInstanceOf(Slide.ImageSlide.class, result.get(1));
        assertInstanceOf(Slide.QuoteSlide.class, result.get(2));
        assertEquals("cover.jpg", ((Slide.CoverSlide) result.get(0)).src());
        assertEquals("Détail", ((Slide.ImageSlide) result.get(1)).caption());
        assertEquals("Le bois parle", ((Slide.QuoteSlide) result.get(2)).body());
    }

    @Test
    void replaceSlides_deletesOldThenInsertsNewWithRecalculatedPositions() {
        List<Slide> input = List.of(
                new Slide.CoverSlide(null, 99, "new-cover.jpg"),
                new Slide.LinkSlide(null, 7, "Voir", "desc", "/x")
        );

        service.replaceSlides("furniture", "f-001", input);

        verify(repository).deleteByOwnerKindAndOwnerId("furniture", "f-001");
        ArgumentCaptor<List<StorySlideEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());

        List<StorySlideEntity> saved = captor.getValue();
        assertEquals(2, saved.size());
        assertEquals(0, saved.get(0).getPosition());
        assertEquals(1, saved.get(1).getPosition());
        assertEquals("cover", saved.get(0).getType());
        assertEquals("link", saved.get(1).getType());
        assertNotNull(saved.get(0).getId()); // id généré
    }

    @Test
    void replaceSlides_specSlideSavesSpecEntries() {
        List<Slide> input = List.of(
                new Slide.SpecSlide(null, 0, List.of(
                        new SpecEntry("Dimensions", "180 cm"),
                        new SpecEntry("Matériau", "Frêne")
                ))
        );

        service.replaceSlides("furniture", "f-001", input);

        ArgumentCaptor<List<StorySlideEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());

        StorySlideEntity saved = captor.getValue().get(0);
        assertEquals("spec", saved.getType());
        assertEquals(2, saved.getSpecs().size());
        assertEquals("Dimensions", saved.getSpecs().get(0).getLabel());
        assertEquals("180 cm", saved.getSpecs().get(0).getValue());
    }

    private static StorySlideEntity entity(String id, String kind, String ownerId, int pos, String type) {
        StorySlideEntity e = new StorySlideEntity();
        e.setId(id); e.setOwnerKind(kind); e.setOwnerId(ownerId);
        e.setPosition(pos); e.setType(type);
        return e;
    }
}
```

- [ ] **Step 2: Lancer le test (doit échouer)**

```bash
cd backend && ./mvnw test -Dtest=StoryServiceTest
```

Attendu : FAIL — `StoryService` n'existe pas.

- [ ] **Step 3: Implémenter `StoryService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class StoryService {

    private final StorySlideRepository repository;

    public StoryService(StorySlideRepository repository) {
        this.repository = repository;
    }

    public List<Slide> findByOwner(String ownerKind, String ownerId) {
        return repository.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream()
                .map(StoryService::toDto)
                .toList();
    }

    @Transactional
    public void replaceSlides(String ownerKind, String ownerId, List<Slide> slides) {
        repository.deleteByOwnerKindAndOwnerId(ownerKind, ownerId);
        List<StorySlideEntity> entities = new ArrayList<>();
        for (int i = 0; i < slides.size(); i++) {
            entities.add(toEntity(slides.get(i), ownerKind, ownerId, i));
        }
        repository.saveAll(entities);
    }

    @Transactional
    public void deleteAllForOwner(String ownerKind, String ownerId) {
        repository.deleteByOwnerKindAndOwnerId(ownerKind, ownerId);
    }

    private static Slide toDto(StorySlideEntity e) {
        return switch (e.getType()) {
            case "cover" -> new Slide.CoverSlide(e.getId(), e.getPosition(), e.getSrc());
            case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
            case "spec"  -> new Slide.SpecSlide(e.getId(), e.getPosition(),
                    e.getSpecs().stream().map(s -> new SpecEntry(s.getLabel(), s.getValue())).toList());
            case "quote" -> new Slide.QuoteSlide(e.getId(), e.getPosition(), e.getQuoteBody(), e.getQuoteCite());
            case "link"  -> new Slide.LinkSlide(e.getId(), e.getPosition(), e.getLinkLabel(), e.getLinkDesc(), e.getLinkHref());
            default -> throw new IllegalStateException("Unknown slide type: " + e.getType());
        };
    }

    private static StorySlideEntity toEntity(Slide slide, String ownerKind, String ownerId, int position) {
        StorySlideEntity e = new StorySlideEntity();
        e.setId(slide.id() != null && !slide.id().isBlank() ? slide.id() : "sl-" + UUID.randomUUID().toString().substring(0, 8));
        e.setOwnerKind(ownerKind);
        e.setOwnerId(ownerId);
        e.setPosition(position);
        switch (slide) {
            case Slide.CoverSlide c -> { e.setType("cover"); e.setSrc(c.src()); }
            case Slide.ImageSlide i -> { e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption()); }
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
            case Slide.LinkSlide l -> { e.setType("link"); e.setLinkLabel(l.label()); e.setLinkDesc(l.description()); e.setLinkHref(l.href()); }
        }
        return e;
    }
}
```

- [ ] **Step 4: Re-lancer les tests (doit passer)**

```bash
cd backend && ./mvnw test -Dtest=StoryServiceTest
```

Attendu : 3 tests passent.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/atelier/portfolio/service/StoryService.java backend/src/test/java/com/atelier/portfolio/service/StoryServiceTest.java
git commit -m "feat(backend): add StoryService with sealed-pattern conversion"
```

---

### Task 7 : Enrichir `Furniture` et `Exhibition` du champ `slides`

**Files:**

- Modify: `backend/src/main/java/com/atelier/portfolio/model/Furniture.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Exhibition.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/controller/FurnitureControllerTest.java` (mettre à jour le constructeur)
- Modify: `backend/src/test/java/com/atelier/portfolio/controller/ExhibitionControllerTest.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/FurnitureServiceTest.java`
- Modify: `backend/src/test/java/com/atelier/portfolio/service/ExhibitionServiceTest.java`

- [ ] **Step 1: Ajouter `slides` à `Furniture` record**

Ajoute en dernier paramètre du record `Furniture` :

```java
public record Furniture(
        @Size(max = 50) String id,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 200) String slug,
        @NotBlank @Size(max = 100) String category,
        @Size(max = 100) String material,
        @Min(1900) @Max(2100) Integer year,
        @Size(max = 500) String coverImage,
        @Size(max = 50) List<String> gallery,
        @Size(max = 1000) String shortDescription,
        @Size(max = 10000) String description,
        @Size(max = 20) List<String> dimensions,
        @Size(max = 200) String designer,
        boolean featured,
        List<Slide> slides
) {
}
```

- [ ] **Step 2: Idem pour `Exhibition`**

```java
public record Exhibition(
        @Size(max = 50) String id,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 200) String slug,
        @Size(max = 200) String venue,
        @Size(max = 100) String city,
        @Size(max = 100) String country,
        LocalDate startDate,
        LocalDate endDate,
        @Size(max = 500) String coverImage,
        @Size(max = 50) List<String> gallery,
        @Size(max = 200) String curator,
        @Size(max = 1000) String shortDescription,
        @Size(max = 10000) String description,
        @Size(max = 30) List<String> tags,
        boolean featured,
        List<Slide> slides
) {
}
```

- [ ] **Step 3: Injecter `StoryService` dans `FurnitureService` et peupler `slides` dans `findBySlug`**

Dans `FurnitureService.java`, ajoute le champ et le constructeur :

```java
private final FurnitureRepository repository;
private final StoryService storyService;

public FurnitureService(FurnitureRepository repository, StoryService storyService) {
    this.repository = repository;
    this.storyService = storyService;
}
```

Et modifie `findBySlug` pour peupler les slides :

```java
public Optional<Furniture> findBySlug(String slug) {
    return repository.findBySlug(slug).map(entity -> {
        Furniture base = toDto(entity);
        List<Slide> slides = storyService.findByOwner("furniture", entity.getId());
        return new Furniture(
                base.id(), base.title(), base.slug(), base.category(), base.material(),
                base.year(), base.coverImage(), base.gallery(), base.shortDescription(),
                base.description(), base.dimensions(), base.designer(), base.featured(),
                slides
        );
    });
}
```

Modifie aussi `toDto` pour retourner `slides=List.of()` par défaut (les autres findX renvoient sans slides) :

```java
private static Furniture toDto(FurnitureEntity entity) {
    return new Furniture(
            entity.getId(), entity.getTitle(), entity.getSlug(),
            entity.getCategory(), entity.getMaterial(), entity.getYear(),
            entity.getCoverImage(), List.copyOf(entity.getGallery()),
            entity.getShortDescription(), entity.getDescription(),
            List.copyOf(entity.getDimensions()), entity.getDesigner(),
            entity.isFeatured(),
            List.of()
    );
}
```

Et dans `deleteBySlug`, ajoute le cleanup des slides :

```java
@Transactional
public boolean deleteBySlug(String slug) {
    return repository.findBySlug(slug).map(entity -> {
        storyService.deleteAllForOwner("furniture", entity.getId());
        repository.delete(entity);
        return true;
    }).orElse(false);
}
```

- [ ] **Step 4: Idem pour `ExhibitionService`**

Pattern identique : injecter `StoryService`, peupler `slides` dans `findBySlug`, cleanup dans `deleteBySlug`. Pour `toDto`, ajouter `List.of()` en dernier paramètre.

- [ ] **Step 5: Mettre à jour les constructeurs `Furniture` et `Exhibition` dans tous les tests existants**

Recherche les usages :

```bash
grep -rn "new Furniture(" backend/src/test
grep -rn "new Exhibition(" backend/src/test
```

Dans chaque fichier de test, ajoute `, List.of()` en dernier argument après `true`/`false` du featured. Les services `FurnitureServiceTest` et `ExhibitionServiceTest` doivent aussi mocker `StoryService` :

```java
@Mock private StoryService storyService;
@InjectMocks private FurnitureService service;
```

Et pour les tests de `findBySlug` :

```java
when(storyService.findByOwner("furniture", "f-001")).thenReturn(List.of());
```

- [ ] **Step 6: Lancer la suite complète**

```bash
cd backend && ./mvnw test
```

Attendu : tous les tests passent.

- [ ] **Step 7: Commit**

```bash
git add -u backend/src
git commit -m "feat(backend): enrich Furniture and Exhibition with slides field"
```

---

### Task 8 : `HomeService` + endpoint `GET /api/home`

**Files:**

- Create: `backend/src/main/java/com/atelier/portfolio/model/HomePageData.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/HomeCategoryView.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/HomeExhibitionView.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/HomeFeedItem.java`
- Create: `backend/src/main/java/com/atelier/portfolio/service/HomeService.java`
- Create: `backend/src/main/java/com/atelier/portfolio/controller/HomeController.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/HomeServiceTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/HomeControllerTest.java`

- [ ] **Step 1: Créer les DTO modèles**

```java
// HomePageData.java
package com.atelier.portfolio.model;

import java.util.List;

public record HomePageData(
        List<HomeCategoryView> categories,
        List<HomeExhibitionView> exhibitions,
        List<HomeFeedItem> feed
) {}
```

```java
// HomeCategoryView.java
package com.atelier.portfolio.model;

import java.util.List;

public record HomeCategoryView(
        String category,
        String slug,
        String cover,
        List<String> itemSlugs
) {}
```

```java
// HomeExhibitionView.java
package com.atelier.portfolio.model;

public record HomeExhibitionView(
        String title,
        String slug,
        String cover,
        String venue,
        String period
) {}
```

```java
// HomeFeedItem.java
package com.atelier.portfolio.model;

public record HomeFeedItem(
        String kind,
        String slug,
        String title,
        String cover,
        String subtitle
) {}
```

- [ ] **Step 2: Écrire le test du `HomeService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.*;
import com.atelier.portfolio.model.*;
import com.atelier.portfolio.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeServiceTest {

    @Mock private FurnitureRepository furnitureRepo;
    @Mock private ExhibitionRepository exhibitionRepo;
    @Mock private HomeFeedRepository feedRepo;
    @Mock private FurnitureCategoryMetaRepository categoryRepo;

    @InjectMocks private HomeService service;

    @Test
    void getHomeData_assemblesCategoriesExhibitionsAndFeed() {
        FurnitureEntity table = furniture("f-001", "table-seve", "Table Sève", "Tables", 2025);
        FurnitureEntity console = furniture("f-002", "console-lumiere", "Console Lumière", "Consoles", 2026);

        ExhibitionEntity lumen = exhibition("e-001", "lumen", "Lumen", "Pavillon des Arts",
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 6, 30));

        FurnitureCategoryMetaEntity tablesCat = categoryMeta("Tables", "tables-cover.jpg", 0);
        FurnitureCategoryMetaEntity consolesCat = categoryMeta("Consoles", "consoles-cover.jpg", 1);

        HomeFeedEntryEntity feed1 = feedEntry(0, "furniture", "console-lumiere");
        HomeFeedEntryEntity feed2 = feedEntry(1, "exhibition", "lumen");

        when(categoryRepo.findByVisibleTrueOrderByPositionAsc()).thenReturn(List.of(tablesCat, consolesCat));
        when(furnitureRepo.findAll()).thenReturn(List.of(table, console));
        when(exhibitionRepo.findAll()).thenReturn(List.of(lumen));
        when(feedRepo.findAllByOrderByPositionAsc()).thenReturn(List.of(feed1, feed2));

        HomePageData result = service.getHomeData();

        assertEquals(2, result.categories().size());
        assertEquals("Tables", result.categories().get(0).category());
        assertEquals(List.of("table-seve"), result.categories().get(0).itemSlugs());

        assertEquals(1, result.exhibitions().size());
        assertEquals("Lumen", result.exhibitions().get(0).title());

        assertEquals(2, result.feed().size());
        assertEquals("furniture", result.feed().get(0).kind());
        assertEquals("console-lumiere", result.feed().get(0).slug());
        assertEquals("Consoles · 2026", result.feed().get(0).subtitle());
        assertEquals("exhibition", result.feed().get(1).kind());
    }

    private static FurnitureEntity furniture(String id, String slug, String title, String category, int year) {
        FurnitureEntity f = new FurnitureEntity();
        f.setId(id); f.setSlug(slug); f.setTitle(title); f.setCategory(category); f.setYear(year);
        f.setCoverImage("cover-" + slug + ".jpg");
        return f;
    }

    private static ExhibitionEntity exhibition(String id, String slug, String title, String venue, LocalDate start, LocalDate end) {
        ExhibitionEntity e = new ExhibitionEntity();
        e.setId(id); e.setSlug(slug); e.setTitle(title); e.setVenue(venue);
        e.setStartDate(start); e.setEndDate(end);
        e.setCoverImage("cover-" + slug + ".jpg");
        return e;
    }

    private static FurnitureCategoryMetaEntity categoryMeta(String cat, String cover, int pos) {
        FurnitureCategoryMetaEntity m = new FurnitureCategoryMetaEntity();
        m.setCategory(cat); m.setCoverImage(cover); m.setPosition(pos); m.setVisible(true);
        return m;
    }

    private static HomeFeedEntryEntity feedEntry(int pos, String kind, String slug) {
        HomeFeedEntryEntity e = new HomeFeedEntryEntity();
        e.setPosition(pos); e.setKind(kind); e.setRefSlug(slug);
        return e;
    }
}
```

- [ ] **Step 3: Run test (FAIL — HomeService n'existe pas)**

```bash
cd backend && ./mvnw test -Dtest=HomeServiceTest
```

- [ ] **Step 4: Implémenter `HomeService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ExhibitionEntity;
import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import com.atelier.portfolio.entity.FurnitureEntity;
import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.model.*;
import com.atelier.portfolio.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class HomeService {

    private static final DateTimeFormatter MONTH_YEAR = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.FRENCH);

    private final FurnitureRepository furnitureRepo;
    private final ExhibitionRepository exhibitionRepo;
    private final HomeFeedRepository feedRepo;
    private final FurnitureCategoryMetaRepository categoryRepo;

    public HomeService(FurnitureRepository furnitureRepo,
                       ExhibitionRepository exhibitionRepo,
                       HomeFeedRepository feedRepo,
                       FurnitureCategoryMetaRepository categoryRepo) {
        this.furnitureRepo = furnitureRepo;
        this.exhibitionRepo = exhibitionRepo;
        this.feedRepo = feedRepo;
        this.categoryRepo = categoryRepo;
    }

    public HomePageData getHomeData() {
        List<FurnitureEntity> allFurniture = furnitureRepo.findAll();
        List<ExhibitionEntity> allExhibitions = exhibitionRepo.findAll();

        Map<String, FurnitureEntity> furnitureBySlug = new HashMap<>();
        for (FurnitureEntity f : allFurniture) furnitureBySlug.put(f.getSlug(), f);

        Map<String, ExhibitionEntity> exhibitionBySlug = new HashMap<>();
        for (ExhibitionEntity e : allExhibitions) exhibitionBySlug.put(e.getSlug(), e);

        List<HomeCategoryView> categories = categoryRepo.findByVisibleTrueOrderByPositionAsc().stream()
                .map(meta -> new HomeCategoryView(
                        meta.getCategory(),
                        slugify(meta.getCategory()),
                        meta.getCoverImage(),
                        allFurniture.stream()
                                .filter(f -> meta.getCategory().equals(f.getCategory()))
                                .sorted((a, b) -> a.getTitle().compareToIgnoreCase(b.getTitle()))
                                .map(FurnitureEntity::getSlug)
                                .toList()
                ))
                .toList();

        List<HomeExhibitionView> exhibitions = allExhibitions.stream()
                .map(e -> new HomeExhibitionView(
                        e.getTitle(), e.getSlug(), e.getCoverImage(), e.getVenue(),
                        formatPeriod(e)
                ))
                .toList();

        List<HomeFeedItem> feed = feedRepo.findAllByOrderByPositionAsc().stream()
                .map(entry -> {
                    if ("furniture".equals(entry.getKind())) {
                        FurnitureEntity f = furnitureBySlug.get(entry.getRefSlug());
                        if (f == null) return null;
                        return new HomeFeedItem("furniture", f.getSlug(), f.getTitle(),
                                f.getCoverImage(),
                                f.getCategory() + " · " + f.getYear());
                    } else if ("exhibition".equals(entry.getKind())) {
                        ExhibitionEntity e = exhibitionBySlug.get(entry.getRefSlug());
                        if (e == null) return null;
                        return new HomeFeedItem("exhibition", e.getSlug(), e.getTitle(),
                                e.getCoverImage(),
                                e.getVenue() + " · " + formatPeriod(e));
                    }
                    return null;
                })
                .filter(item -> item != null)
                .toList();

        return new HomePageData(categories, exhibitions, feed);
    }

    private static String formatPeriod(ExhibitionEntity e) {
        if (e.getStartDate() == null) return "";
        if (e.getEndDate() == null) return MONTH_YEAR.format(e.getStartDate());
        return MONTH_YEAR.format(e.getStartDate()) + " → " + MONTH_YEAR.format(e.getEndDate());
    }

    private static String slugify(String input) {
        String n = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.FRENCH);
        return n.replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }
}
```

- [ ] **Step 5: Créer `HomeController`**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.HomePageData;
import com.atelier.portfolio.service.HomeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    private final HomeService service;

    public HomeController(HomeService service) {
        this.service = service;
    }

    @GetMapping
    public HomePageData get() {
        return service.getHomeData();
    }
}
```

- [ ] **Step 6: Test du contrôleur**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.HomePageData;
import com.atelier.portfolio.service.HomeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeControllerTest {

    @Mock private HomeService service;
    @InjectMocks private HomeController controller;

    @Test
    void get_returnsHomePageDataFromService() {
        HomePageData data = new HomePageData(List.of(), List.of(), List.of());
        when(service.getHomeData()).thenReturn(data);

        assertSame(data, controller.get());
    }
}
```

- [ ] **Step 7: Run tests + commit**

```bash
cd backend && ./mvnw test
git add -u backend/src && git add backend/src/main/java/com/atelier/portfolio/{model,service,controller}/ backend/src/test/java/com/atelier/portfolio/{service,controller}/
git commit -m "feat(backend): add HomeService and GET /api/home endpoint"
```

---

### Task 9 : Endpoints admin — slides, home feed, catégories

**Files:**

- Create: `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java`
- Create: `backend/src/main/java/com/atelier/portfolio/controller/AdminHomeController.java`
- Create: `backend/src/main/java/com/atelier/portfolio/controller/AdminCategoriesController.java`
- Create: `backend/src/main/java/com/atelier/portfolio/service/HomeFeedService.java`
- Create: `backend/src/main/java/com/atelier/portfolio/service/CategoryMetaService.java`
- Create: `backend/src/test/java/com/atelier/portfolio/controller/AdminStoriesControllerTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/HomeFeedServiceTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/service/CategoryMetaServiceTest.java`

- [ ] **Step 1: `AdminStoriesController`**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.service.StoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/slides")
public class AdminStoriesController {

    private final StoryService stories;

    public AdminStoriesController(StoryService stories) {
        this.stories = stories;
    }

    @GetMapping("/{kind}/{ownerId}")
    public List<Slide> get(@PathVariable String kind, @PathVariable String ownerId) {
        validateKind(kind);
        return stories.findByOwner(kind, ownerId);
    }

    @PutMapping("/{kind}/{ownerId}")
    public ResponseEntity<List<Slide>> replace(@PathVariable String kind,
                                                @PathVariable String ownerId,
                                                @Valid @RequestBody List<Slide> slides) {
        validateKind(kind);
        stories.replaceSlides(kind, ownerId, slides);
        return ResponseEntity.ok(stories.findByOwner(kind, ownerId));
    }

    private static void validateKind(String kind) {
        if (!"furniture".equals(kind) && !"exhibition".equals(kind)) {
            throw new IllegalArgumentException("Invalid kind: " + kind);
        }
    }
}
```

Note : ce contrôleur prend un `ownerId` (l'`id` interne, pas le `slug`) pour rester aligné sur `StorySlideEntity.owner_id`. Le front admin résout `slug → id` via les endpoints existants `GET /api/furniture/{slug}` (où `furniture.id` est dans le DTO).

- [ ] **Step 2: Test `AdminStoriesController`**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.service.StoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminStoriesControllerTest {

    @Mock private StoryService service;
    @InjectMocks private AdminStoriesController controller;

    @Test
    void get_returnsSlidesForOwner() {
        Slide.CoverSlide cover = new Slide.CoverSlide("s1", 0, "cover.jpg");
        when(service.findByOwner("furniture", "f-001")).thenReturn(List.of(cover));

        List<Slide> result = controller.get("furniture", "f-001");

        assertEquals(1, result.size());
        assertSame(cover, result.get(0));
    }

    @Test
    void replace_callsServiceAndReturnsUpdatedSlides() {
        List<Slide> input = List.of(new Slide.CoverSlide(null, 0, "new.jpg"));
        Slide.CoverSlide saved = new Slide.CoverSlide("s2", 0, "new.jpg");
        when(service.findByOwner("furniture", "f-001")).thenReturn(List.of(saved));

        var response = controller.replace("furniture", "f-001", input);

        verify(service).replaceSlides("furniture", "f-001", input);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void invalidKind_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.get("invalid", "x"));
    }
}
```

- [ ] **Step 3: `HomeFeedService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.repository.HomeFeedRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class HomeFeedService {

    public record FeedEntry(String kind, String slug) {}

    private final HomeFeedRepository repository;

    public HomeFeedService(HomeFeedRepository repository) {
        this.repository = repository;
    }

    public List<FeedEntry> getAll() {
        return repository.findAllByOrderByPositionAsc().stream()
                .map(e -> new FeedEntry(e.getKind(), e.getRefSlug()))
                .toList();
    }

    @Transactional
    public List<FeedEntry> replace(List<FeedEntry> entries) {
        repository.deleteAllInBatch();
        List<HomeFeedEntryEntity> toSave = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            HomeFeedEntryEntity e = new HomeFeedEntryEntity();
            e.setPosition(i);
            e.setKind(entries.get(i).kind());
            e.setRefSlug(entries.get(i).slug());
            toSave.add(e);
        }
        repository.saveAll(toSave);
        return getAll();
    }
}
```

- [ ] **Step 4: Test `HomeFeedService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.HomeFeedEntryEntity;
import com.atelier.portfolio.repository.HomeFeedRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomeFeedServiceTest {

    @Mock private HomeFeedRepository repository;
    @InjectMocks private HomeFeedService service;

    @Test
    void replace_deletesAllThenSavesInOrder() {
        List<HomeFeedService.FeedEntry> input = List.of(
                new HomeFeedService.FeedEntry("furniture", "console"),
                new HomeFeedService.FeedEntry("exhibition", "lumen")
        );
        when(repository.findAllByOrderByPositionAsc()).thenReturn(List.of());

        service.replace(input);

        verify(repository).deleteAllInBatch();
        ArgumentCaptor<List<HomeFeedEntryEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());
        List<HomeFeedEntryEntity> saved = captor.getValue();
        assertEquals(0, saved.get(0).getPosition());
        assertEquals("console", saved.get(0).getRefSlug());
        assertEquals(1, saved.get(1).getPosition());
        assertEquals("lumen", saved.get(1).getRefSlug());
    }
}
```

- [ ] **Step 5: `AdminHomeController`**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.HomeFeedService;
import com.atelier.portfolio.service.HomeFeedService.FeedEntry;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/home")
public class AdminHomeController {

    private final HomeFeedService feed;

    public AdminHomeController(HomeFeedService feed) {
        this.feed = feed;
    }

    @GetMapping("/feed")
    public List<FeedEntry> get() {
        return feed.getAll();
    }

    @PutMapping("/feed")
    public List<FeedEntry> replace(@RequestBody List<FeedEntry> entries) {
        return feed.replace(entries);
    }
}
```

- [ ] **Step 6: `CategoryMetaService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import com.atelier.portfolio.repository.FurnitureCategoryMetaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CategoryMetaService {

    public record CategoryView(String category, String coverImage, int position, boolean visible) {}

    private final FurnitureCategoryMetaRepository repository;

    public CategoryMetaService(FurnitureCategoryMetaRepository repository) {
        this.repository = repository;
    }

    public List<CategoryView> findAll() {
        return repository.findAllByOrderByPositionAsc().stream()
                .map(m -> new CategoryView(m.getCategory(), m.getCoverImage(), m.getPosition(), m.isVisible()))
                .toList();
    }

    @Transactional
    public Optional<CategoryView> update(String category, CategoryView input) {
        return repository.findById(category).map(existing -> {
            existing.setCoverImage(input.coverImage());
            existing.setPosition(input.position());
            existing.setVisible(input.visible());
            FurnitureCategoryMetaEntity saved = repository.save(existing);
            return new CategoryView(saved.getCategory(), saved.getCoverImage(), saved.getPosition(), saved.isVisible());
        });
    }

    @Transactional
    public CategoryView create(CategoryView input) {
        FurnitureCategoryMetaEntity e = new FurnitureCategoryMetaEntity();
        e.setCategory(input.category());
        e.setCoverImage(input.coverImage());
        e.setPosition(input.position());
        e.setVisible(input.visible());
        FurnitureCategoryMetaEntity saved = repository.save(e);
        return new CategoryView(saved.getCategory(), saved.getCoverImage(), saved.getPosition(), saved.isVisible());
    }
}
```

- [ ] **Step 7: `AdminCategoriesController`**

```java
package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.CategoryMetaService;
import com.atelier.portfolio.service.CategoryMetaService.CategoryView;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/categories")
public class AdminCategoriesController {

    private final CategoryMetaService service;

    public AdminCategoriesController(CategoryMetaService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryView> all() {
        return service.findAll();
    }

    @PutMapping("/{category}")
    public ResponseEntity<CategoryView> update(@PathVariable String category, @RequestBody CategoryView input) {
        return service.update(category, input)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(service.create(input)));
    }
}
```

- [ ] **Step 8: Test `CategoryMetaService`**

```java
package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.FurnitureCategoryMetaEntity;
import com.atelier.portfolio.repository.FurnitureCategoryMetaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryMetaServiceTest {

    @Mock private FurnitureCategoryMetaRepository repository;
    @InjectMocks private CategoryMetaService service;

    @Test
    void findAll_returnsAllOrderedByPosition() {
        FurnitureCategoryMetaEntity m = entity("Tables", "tables.jpg", 0, true);
        when(repository.findAllByOrderByPositionAsc()).thenReturn(List.of(m));

        List<CategoryMetaService.CategoryView> result = service.findAll();

        assertEquals(1, result.size());
        assertEquals("Tables", result.get(0).category());
    }

    @Test
    void update_existingCategory_savesAndReturns() {
        FurnitureCategoryMetaEntity existing = entity("Tables", "old.jpg", 0, true);
        when(repository.findById("Tables")).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var result = service.update("Tables",
                new CategoryMetaService.CategoryView("Tables", "new.jpg", 1, false));

        assertTrue(result.isPresent());
        assertEquals("new.jpg", result.get().coverImage());
        assertEquals(1, result.get().position());
        assertFalse(result.get().visible());
    }

    private static FurnitureCategoryMetaEntity entity(String cat, String cover, int pos, boolean visible) {
        FurnitureCategoryMetaEntity e = new FurnitureCategoryMetaEntity();
        e.setCategory(cat); e.setCoverImage(cover); e.setPosition(pos); e.setVisible(visible);
        return e;
    }
}
```

- [ ] **Step 9: Run all tests + commit**

```bash
cd backend && ./mvnw test
git add backend/src
git commit -m "feat(backend): add admin endpoints for slides, home feed, categories"
```

---

## Phase D — Seed des données initiales

### Task 10 : Liquibase seed — stories, home_feed, category_meta

**Files:**

- Create: `backend/src/main/resources/db/changelog/changes/010-seed-stories.yaml`
- Create: `backend/src/main/resources/db/changelog/changes/011-seed-home-feed.yaml`
- Create: `backend/src/main/resources/db/changelog/changes/012-seed-category-meta.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`

- [ ] **Step 1: Identifier les IDs existants des furniture / exhibitions**

```bash
grep -E "id:" backend/src/main/resources/db/changelog/changes/002-seed-furniture.yaml | head -20
grep -E "id:" backend/src/main/resources/db/changelog/changes/003-seed-exhibitions.yaml | head -20
```

Note les `id` (ex: `f-001`, `f-002`, ...) et `slug` (ex: `onde-fauteuil-sculpte`) effectifs.

- [ ] **Step 2: Créer `010-seed-stories.yaml`**

Pour chaque pièce et chaque expo, génère ~4 slides (cover, image, spec, link) ou (cover, image, quote, link). Utiliser les IDs réels relevés au step précédent. Exemple pour la première pièce :

```yaml
databaseChangeLog:
  - changeSet:
      id: 010-seed-stories
      author: atelier-lumen
      changes:
        - insert:
            tableName: story_slide
            columns:
              - column: { name: id,          value: sl-001-cover }
              - column: { name: owner_kind,  value: furniture }
              - column: { name: owner_id,    value: f-001 }
              - column: { name: position,    valueNumeric: 0 }
              - column: { name: type,        value: cover }
              - column: { name: src,         value: "https://picsum.photos/seed/lumen-onde-cover/600/1067" }
        - insert:
            tableName: story_slide
            columns:
              - column: { name: id,          value: sl-001-img1 }
              - column: { name: owner_kind,  value: furniture }
              - column: { name: owner_id,    value: f-001 }
              - column: { name: position,    valueNumeric: 1 }
              - column: { name: type,        value: image }
              - column: { name: src,         value: "https://picsum.photos/seed/lumen-onde-detail/600/1067" }
              - column: { name: caption,     value: "Le chêne après huit mois de séchage." }
        - insert:
            tableName: story_slide
            columns:
              - column: { name: id,          value: sl-001-spec }
              - column: { name: owner_kind,  value: furniture }
              - column: { name: owner_id,    value: f-001 }
              - column: { name: position,    valueNumeric: 2 }
              - column: { name: type,        value: spec }
        - insert:
            tableName: story_slide_spec
            columns:
              - column: { name: story_slide_id, value: sl-001-spec }
              - column: { name: position,       valueNumeric: 0 }
              - column: { name: label,          value: "Dimensions" }
              - column: { name: entry_value,    value: "92 × 78 × 78 cm" }
        - insert:
            tableName: story_slide_spec
            columns:
              - column: { name: story_slide_id, value: sl-001-spec }
              - column: { name: position,       valueNumeric: 1 }
              - column: { name: label,          value: "Matériau" }
              - column: { name: entry_value,    value: "Chêne massif" }
        - insert:
            tableName: story_slide
            columns:
              - column: { name: id,          value: sl-001-link }
              - column: { name: owner_kind,  value: furniture }
              - column: { name: owner_id,    value: f-001 }
              - column: { name: position,    valueNumeric: 3 }
              - column: { name: type,        value: link }
              - column: { name: link_label,  value: "Voir la fiche complète" }
              - column: { name: link_desc,   value: "Croquis, dossier matière, photos d'atelier." }
```

Répète le pattern pour les autres pièces (f-002 à f-006) et expos (e-001 à e-005, à vérifier selon le seed existant). Quatre slides par item.

- [ ] **Step 3: Créer `011-seed-home-feed.yaml`**

```yaml
databaseChangeLog:
  - changeSet:
      id: 011-seed-home-feed
      author: atelier-lumen
      changes:
        - insert:
            tableName: home_feed
            columns:
              - column: { name: position, valueNumeric: 0 }
              - column: { name: kind,     value: furniture }
              - column: { name: ref_slug, value: onde-fauteuil-sculpte }
        - insert:
            tableName: home_feed
            columns:
              - column: { name: position, valueNumeric: 1 }
              - column: { name: kind,     value: exhibition }
              - column: { name: ref_slug, value: "<slug-expo-1>" }
        # ... continue pour tous les items, en alternant furniture / exhibition
```

Remplace `<slug-expo-1>` etc. par les slugs réels du seed 003.

- [ ] **Step 4: Créer `012-seed-category-meta.yaml`**

```yaml
databaseChangeLog:
  - changeSet:
      id: 012-seed-category-meta
      author: atelier-lumen
      changes:
        - insert:
            tableName: furniture_category_meta
            columns:
              - column: { name: category,    value: "Sièges" }
              - column: { name: cover_image, value: "https://picsum.photos/seed/cat-sieges/200/200" }
              - column: { name: position,    valueNumeric: 0 }
              - column: { name: visible,     valueBoolean: true }
        - insert:
            tableName: furniture_category_meta
            columns:
              - column: { name: category,    value: "Tables" }
              - column: { name: cover_image, value: "https://picsum.photos/seed/cat-tables/200/200" }
              - column: { name: position,    valueNumeric: 1 }
              - column: { name: visible,     valueBoolean: true }
        - insert:
            tableName: furniture_category_meta
            columns:
              - column: { name: category,    value: "Rangements" }
              - column: { name: cover_image, value: "https://picsum.photos/seed/cat-rangements/200/200" }
              - column: { name: position,    valueNumeric: 2 }
              - column: { name: visible,     valueBoolean: true }
```

Adapte les noms de catégories selon ceux réels dans le seed `furniture`.

- [ ] **Step 5: Déclarer dans le master**

Append les 3 includes.

- [ ] **Step 6: Démarrer le backend, tester `GET /api/home` au browser ou avec curl**

```bash
cd backend && ./mvnw spring-boot:run
# Dans un autre terminal :
curl -s http://localhost:8080/api/home | head -100
```

Attendu : JSON avec `categories[]`, `exhibitions[]`, `feed[]` non vides.

Aussi vérifier les slides :

```bash
curl -s http://localhost:8080/api/furniture/onde-fauteuil-sculpte | head -100
```

Attendu : champ `slides` peuplé avec 4 entrées.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/changelog/changes/010-seed-stories.yaml backend/src/main/resources/db/changelog/changes/011-seed-home-feed.yaml backend/src/main/resources/db/changelog/changes/012-seed-category-meta.yaml backend/src/main/resources/db/changelog/db.changelog-master.yaml
git commit -m "feat(db): seed stories, home_feed and category_meta"
```

---

## Phase E — Frontend models & service

### Task 11 : Modèles TypeScript + extensions du `PortfolioService`

**Files:**

- Create: `frontend/src/app/models/slide.model.ts`
- Create: `frontend/src/app/models/home.model.ts`
- Modify: `frontend/src/app/models/furniture.model.ts`
- Modify: `frontend/src/app/models/exhibition.model.ts`
- Modify: `frontend/src/app/services/portfolio.service.ts`
- Modify: `frontend/src/app/services/portfolio.service.spec.ts`

- [ ] **Step 1: `slide.model.ts`**

```typescript
export type Slide = CoverSlide | ImageSlide | SpecSlide | QuoteSlide | LinkSlide;

export interface BaseSlide {
  id: string;
  position: number;
}

export interface CoverSlide extends BaseSlide { type: 'cover'; src: string; }
export interface ImageSlide extends BaseSlide { type: 'image'; src: string; caption: string | null; }
export interface SpecSlide  extends BaseSlide { type: 'spec';  specs: SpecEntry[]; }
export interface QuoteSlide extends BaseSlide { type: 'quote'; body: string; cite: string | null; }
export interface LinkSlide  extends BaseSlide { type: 'link';  label: string | null; description: string | null; href: string | null; }

export interface SpecEntry { label: string; value: string; }
```

- [ ] **Step 2: `home.model.ts`**

```typescript
export interface HomePageData {
  categories: HomeCategoryView[];
  exhibitions: HomeExhibitionView[];
  feed: HomeFeedItem[];
}

export interface HomeCategoryView {
  category: string;
  slug: string;
  cover: string;
  itemSlugs: string[];
}

export interface HomeExhibitionView {
  title: string;
  slug: string;
  cover: string;
  venue: string;
  period: string;
}

export interface HomeFeedItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  subtitle: string;
}

export interface AdminFeedEntry {
  kind: 'furniture' | 'exhibition';
  slug: string;
}

export interface AdminCategoryView {
  category: string;
  coverImage: string;
  position: number;
  visible: boolean;
}
```

- [ ] **Step 3: Étendre `furniture.model.ts` et `exhibition.model.ts`**

Ajoute `slides: Slide[]` à chacune des interfaces (import nécessaire) :

```typescript
import { Slide } from './slide.model';

export interface Furniture {
  // ... champs existants
  slides: Slide[];
}
```

Idem pour `Exhibition`.

- [ ] **Step 4: Ajouter les méthodes au `PortfolioService`**

Append à `portfolio.service.ts` :

```typescript
import { HomePageData, AdminFeedEntry, AdminCategoryView } from '../models/home.model';
import { Slide } from '../models/slide.model';

// ... dans la classe PortfolioService

getHome(): Observable<HomePageData> {
  return this.http.get<HomePageData>(`${API}/home`);
}

getSlides(kind: 'furniture' | 'exhibition', ownerId: string): Observable<Slide[]> {
  return this.http.get<Slide[]>(`${API}/admin/slides/${kind}/${ownerId}`);
}

replaceSlides(kind: 'furniture' | 'exhibition', ownerId: string, slides: Slide[]): Observable<Slide[]> {
  return this.http.put<Slide[]>(`${API}/admin/slides/${kind}/${ownerId}`, slides);
}

getAdminFeed(): Observable<AdminFeedEntry[]> {
  return this.http.get<AdminFeedEntry[]>(`${API}/admin/home/feed`);
}

replaceAdminFeed(entries: AdminFeedEntry[]): Observable<AdminFeedEntry[]> {
  return this.http.put<AdminFeedEntry[]>(`${API}/admin/home/feed`, entries);
}

getAdminCategories(): Observable<AdminCategoryView[]> {
  return this.http.get<AdminCategoryView[]>(`${API}/admin/categories`);
}

updateAdminCategory(category: string, input: AdminCategoryView): Observable<AdminCategoryView> {
  return this.http.put<AdminCategoryView>(`${API}/admin/categories/${encodeURIComponent(category)}`, input);
}
```

- [ ] **Step 5: Ajouter un test au spec**

Append à `portfolio.service.spec.ts` :

```typescript
import { HomePageData } from '../models/home.model';

it('should fetch home data', () => {
  const mock: HomePageData = { categories: [], exhibitions: [], feed: [] };

  service.getHome().subscribe(data => expect(data).toEqual(mock));

  const req = httpMock.expectOne('/api/home');
  expect(req.request.method).toBe('GET');
  req.flush(mock);
});

it('should replace slides via PUT', () => {
  service.replaceSlides('furniture', 'f-001', []).subscribe();

  const req = httpMock.expectOne('/api/admin/slides/furniture/f-001');
  expect(req.request.method).toBe('PUT');
  req.flush([]);
});
```

- [ ] **Step 6: Run tests + commit**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
git add frontend/src/app/models/slide.model.ts frontend/src/app/models/home.model.ts frontend/src/app/models/furniture.model.ts frontend/src/app/models/exhibition.model.ts frontend/src/app/services/portfolio.service.ts frontend/src/app/services/portfolio.service.spec.ts
git commit -m "feat(frontend): add Slide/Home models and service methods"
```

---

## Phase F — Story Viewer

### Task 12 : Composant `StoryViewerComponent` standalone

**Files:**

- Create: `frontend/src/app/components/story-viewer/story-viewer.component.ts`
- Create: `frontend/src/app/components/story-viewer/story-viewer.component.spec.ts`

Le composant prend en `@Input()` une **queue** (un tableau d'objets `{ title, subtitle, slides }`) et un `@Output() closed` pour signaler la fermeture.

- [ ] **Step 1: Spec d'API du composant**

Le composant doit :
- Prendre `queue: StoryItem[]` où `StoryItem = { title: string; subtitle: string; slides: Slide[] }`.
- Émettre `closed` quand on ferme.
- Auto-advance 5000ms par slide.
- Supporter hold-to-pause (mousedown > 180ms).
- Esc / clic dehors / flèches clavier.
- Bascule de classe `.dark-text` quand la slide a un fond crème (spec/quote/link) pour adapter la couleur du header.

- [ ] **Step 2: Test minimal**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryViewerComponent } from './story-viewer.component';
import { Slide } from '../../models/slide.model';

describe('StoryViewerComponent', () => {
  let fixture: ComponentFixture<StoryViewerComponent>;
  let component: StoryViewerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StoryViewerComponent] }).compileComponents();
    fixture = TestBed.createComponent(StoryViewerComponent);
    component = fixture.componentInstance;
  });

  it('emits closed when close button clicked', () => {
    const slides: Slide[] = [{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' }];
    fixture.componentRef.setInput('queue', [{ title: 'Test', subtitle: 'sub', slides }]);
    fixture.detectChanges();

    spyOn(component.closed, 'emit');
    component.close();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('advances slide index on next()', () => {
    const slides: Slide[] = [
      { type: 'cover', id: 's1', position: 0, src: 'a.jpg' },
      { type: 'image', id: 's2', position: 1, src: 'b.jpg', caption: 'b' }
    ];
    fixture.componentRef.setInput('queue', [{ title: 'T', subtitle: 's', slides }]);
    fixture.detectChanges();

    expect(component.slideIndex()).toBe(0);
    component.next();
    expect(component.slideIndex()).toBe(1);
  });

  it('closes when next() called past the last slide of last item', () => {
    const slides: Slide[] = [{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' }];
    fixture.componentRef.setInput('queue', [{ title: 'T', subtitle: 's', slides }]);
    fixture.detectChanges();
    spyOn(component.closed, 'emit');

    component.next();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('moves to next queue item when current item finished', () => {
    const itemA = { title: 'A', subtitle: 'a', slides: [{ type: 'cover', id: 's1', position: 0, src: 'a.jpg' } as Slide] };
    const itemB = { title: 'B', subtitle: 'b', slides: [{ type: 'cover', id: 's2', position: 0, src: 'b.jpg' } as Slide] };
    fixture.componentRef.setInput('queue', [itemA, itemB]);
    fixture.detectChanges();

    component.next();

    expect(component.itemIndex()).toBe(1);
    expect(component.slideIndex()).toBe(0);
  });
});
```

- [ ] **Step 3: Run test (FAIL)**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include='**/story-viewer.component.spec.ts'
```

- [ ] **Step 4: Implémenter le composant**

```typescript
import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Slide, SpecEntry } from '../../models/slide.model';

export interface StoryItem {
  title: string;
  subtitle: string;
  slides: Slide[];
}

const SLIDE_DURATION_MS = 5000;

@Component({
  selector: 'app-story-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="onBackdropClick($event)">
      <div class="frame">
        <div class="progress">
          @for (s of currentItem()?.slides ?? []; track $index) {
            <div class="bar" [class.seen]="$index < slideIndex()">
              <div class="fill"
                   [style.transition]="$index === slideIndex() ? 'width ' + remaining() + 'ms linear' : 'none'"
                   [style.width]="$index < slideIndex() ? '100%' : ($index === slideIndex() ? (running() ? '100%' : startWidth()) : '0%')">
              </div>
            </div>
          }
        </div>

        <div class="header" [class.dark-text]="!isMediaSlide()">
          <div class="avatar">L</div>
          <div class="title-block">
            <div class="title">{{ currentItem()?.title }}</div>
            <div class="sub">{{ currentItem()?.subtitle }}</div>
          </div>
          <button class="close" (click)="close()" aria-label="Fermer">✕</button>
        </div>

        <div class="body" [ngClass]="bodyClass()">
          @switch (currentSlide()?.type) {
            @case ('cover')  { <img [src]="$any(currentSlide()).src" alt="" /> }
            @case ('image')  {
              <img [src]="$any(currentSlide()).src" alt="" />
              @if ($any(currentSlide()).caption) {
                <div class="caption">{{ $any(currentSlide()).caption }}</div>
              }
            }
            @case ('spec') {
              <div class="slide-spec">
                <span class="eyebrow">Caractéristiques</span>
                <h3>{{ currentItem()?.title }}</h3>
                <dl>
                  @for (e of $any(currentSlide()).specs; track e.label) {
                    <dt>{{ e.label }}</dt><dd>{{ e.value }}</dd>
                  }
                </dl>
              </div>
            }
            @case ('quote') {
              <div class="slide-quote">
                <blockquote>{{ $any(currentSlide()).body }}</blockquote>
                @if ($any(currentSlide()).cite) {
                  <cite>{{ $any(currentSlide()).cite }}</cite>
                }
              </div>
            }
            @case ('link') {
              <div class="slide-link">
                <span class="eyebrow">Pour aller plus loin</span>
                <h3>{{ currentItem()?.title }}</h3>
                <p>{{ $any(currentSlide()).description }}</p>
                <a class="cta" [href]="$any(currentSlide()).href" (click)="close()">
                  {{ $any(currentSlide()).label || 'Voir la fiche complète' }} →
                </a>
              </div>
            }
          }
        </div>

        <div class="tap-zones">
          <div class="zone left" (click)="prev()" (mousedown)="onHoldStart()" (mouseup)="onHoldEnd()" (mouseleave)="onHoldEnd()"></div>
          <div class="zone right" (click)="next()" (mousedown)="onHoldStart()" (mouseup)="onHoldEnd()" (mouseleave)="onHoldEnd()"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* tokens partagés avec le site */
    :host { --ink: #1a1815; --bg: #f5f1ea; --mute: #8a8378; --line: #d8d0c2; --serif: 'Cormorant Garamond', serif; }
    .backdrop { position: fixed; inset: 0; background: rgba(10,10,10,0.96); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .frame { width: 100%; max-width: 440px; height: 94vh; background: #0a0a0a; position: relative; overflow: hidden; display: flex; flex-direction: column; color: #fff; }
    .progress { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; gap: 4px; z-index: 3; }
    .bar { flex: 1; height: 2px; background: rgba(255,255,255,0.28); border-radius: 1px; overflow: hidden; }
    .bar.seen .fill { width: 100% !important; }
    .fill { height: 100%; background: #fff; width: 0; }
    .header { position: absolute; top: 28px; left: 16px; right: 16px; display: flex; align-items: center; gap: 12px; z-index: 3; pointer-events: none; }
    .header.dark-text { color: var(--ink); }
    .header .avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--bg); color: var(--ink); font-family: var(--serif); font-size: 1rem; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.35); }
    .title { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; }
    .sub { font-size: 0.72rem; opacity: 0.7; }
    .close { margin-left: auto; pointer-events: auto; background: none; border: none; color: inherit; font-size: 1rem; opacity: 0.8; cursor: pointer; }
    .body { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; background: #000; overflow: hidden; }
    .body img { width: 100%; height: 100%; object-fit: cover; }
    .body .caption { position: absolute; bottom: 24px; left: 24px; right: 24px; font-family: var(--serif); font-size: 1.05rem; line-height: 1.4; text-shadow: 0 1px 8px rgba(0,0,0,0.5); pointer-events: none; }
    .body.cream { background: var(--bg); color: var(--ink); }
    .slide-spec, .slide-quote, .slide-link { width: 100%; height: 100%; padding: 80px 36px 56px; display: flex; flex-direction: column; justify-content: center; }
    .slide-quote, .slide-link { text-align: center; align-items: center; }
    .eyebrow { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); }
    .slide-spec h3, .slide-link h3 { font-family: var(--serif); font-weight: 400; font-size: 1.8rem; margin: 14px 0 24px; }
    .slide-spec dl { display: grid; grid-template-columns: 110px 1fr; gap: 14px 20px; }
    .slide-spec dt { font-size: 0.68rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mute); align-self: center; }
    .slide-spec dd { font-family: var(--serif); font-size: 1.15rem; }
    .slide-quote blockquote { font-family: var(--serif); font-size: 1.6rem; line-height: 1.35; max-width: 360px; }
    .slide-quote cite { display: block; font-style: normal; margin-top: 28px; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mute); }
    .slide-link .cta { display: inline-flex; align-items: center; gap: 12px; padding: 14px 28px; border: 1px solid var(--ink); font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink); margin-top: 24px; text-decoration: none; }
    .slide-link p { font-size: 0.92rem; max-width: 320px; color: rgba(26,24,21,0.7); }
    .tap-zones { position: absolute; inset: 0; display: flex; z-index: 2; }
    .zone { flex: 1; cursor: pointer; }
    .zone.left { flex: 0 0 33%; }
  `]
})
export class StoryViewerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) queue: StoryItem[] = [];
  @Output() closed = new EventEmitter<void>();

  protected itemIndex = signal(0);
  protected slideIndex = signal(0);
  protected running = signal(false);
  protected startWidth = signal('0%');
  protected remaining = signal(SLIDE_DURATION_MS);

  private timer: number | null = null;
  private startedAt = 0;
  private pausedAt = 0;
  private holdTimer: number | null = null;

  protected currentItem = computed(() => this.queue[this.itemIndex()] ?? null);
  protected currentSlide = computed(() => this.currentItem()?.slides[this.slideIndex()] ?? null);

  protected isMediaSlide = computed(() => {
    const t = this.currentSlide()?.type;
    return t === 'cover' || t === 'image';
  });

  protected bodyClass = computed(() => this.isMediaSlide() ? '' : 'cream');

  ngOnInit() { this.startTimer(); }
  ngOnDestroy() { this.stopTimer(); }

  next() {
    this.stopTimer();
    const item = this.currentItem();
    if (!item) { this.close(); return; }
    if (this.slideIndex() < item.slides.length - 1) {
      this.slideIndex.update(i => i + 1);
    } else if (this.itemIndex() < this.queue.length - 1) {
      this.itemIndex.update(i => i + 1);
      this.slideIndex.set(0);
    } else {
      this.close();
      return;
    }
    this.startTimer();
  }

  prev() {
    this.stopTimer();
    if (this.slideIndex() > 0) {
      this.slideIndex.update(i => i - 1);
    } else if (this.itemIndex() > 0) {
      const prevItem = this.queue[this.itemIndex() - 1];
      this.itemIndex.update(i => i - 1);
      this.slideIndex.set(prevItem.slides.length - 1);
    }
    this.startTimer();
  }

  close() {
    this.stopTimer();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop')) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') this.close();
    if (e.key === 'ArrowRight') this.next();
    if (e.key === 'ArrowLeft') this.prev();
  }

  onHoldStart() {
    this.holdTimer = window.setTimeout(() => this.pause(), 180);
  }

  onHoldEnd() {
    if (this.holdTimer !== null) { clearTimeout(this.holdTimer); this.holdTimer = null; }
    if (!this.running()) this.resume();
  }

  private startTimer() {
    this.running.set(true);
    this.startedAt = Date.now();
    this.pausedAt = 0;
    this.remaining.set(SLIDE_DURATION_MS);
    this.startWidth.set('0%');
    this.timer = window.setTimeout(() => this.next(), SLIDE_DURATION_MS);
  }

  private pause() {
    if (!this.running()) return;
    this.running.set(false);
    this.pausedAt = Date.now() - this.startedAt;
    const pct = Math.min(100, (this.pausedAt / SLIDE_DURATION_MS) * 100);
    this.startWidth.set(pct + '%');
    this.stopTimer();
  }

  private resume() {
    const remaining = SLIDE_DURATION_MS - this.pausedAt;
    this.remaining.set(remaining);
    this.running.set(true);
    this.startedAt = Date.now() - this.pausedAt;
    this.timer = window.setTimeout(() => this.next(), remaining);
  }

  private stopTimer() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
  }
}
```

- [ ] **Step 5: Run tests (PASS)**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include='**/story-viewer.component.spec.ts'
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/components/story-viewer/
git commit -m "feat(frontend): add standalone StoryViewerComponent"
```

---

## Phase G — Page home refondue

### Task 13 : Refondre `HomeComponent` (hero épuré + bandeau sticky + masonry)

**Files:**

- Modify: `frontend/src/app/pages/home/home.component.ts` (refonte complète)
- Modify: `frontend/src/app/pages/home/home.component.spec.ts`
- Modify: `frontend/src/app/components/header/header.component.ts` (nav simplifiée)

- [ ] **Step 1: Mettre à jour le header**

Dans `header.component.ts`, supprime les liens `/mobilier` et `/expositions`. Garde uniquement `Accueil` et `Studio` :

```html
<a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Accueil</a>
<a routerLink="/studio" routerLinkActive="active" (click)="closeMenu()">Studio</a>
```

Ajuste les tests dans `header.component.spec.ts` si nécessaire (vérifier qu'on n'attend plus 4 liens).

- [ ] **Step 2: Refondre `HomeComponent`**

Réécris entièrement `home.component.ts` :

```typescript
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { HomePageData, HomeFeedItem, HomeCategoryView, HomeExhibitionView } from '../../models/home.model';
import { Furniture } from '../../models/furniture.model';
import { Exhibition } from '../../models/exhibition.model';
import { Slide } from '../../models/slide.model';
import { StoryViewerComponent, StoryItem } from '../../components/story-viewer/story-viewer.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, StoryViewerComponent],
  template: `
    <section class="hero">
      <div class="container">
        <span class="eyebrow">Atelier Lumen — Portfolio</span>
        <h1>Mobilier sculpté,<br/>scénographies vivantes.</h1>
        <p class="lead">À feuilleter en stories, à explorer en profondeur.</p>
      </div>
    </section>

    <section class="stories">
      <div class="container">
        @if (data(); as d) {
          <div class="stories-row">
            @for (cat of d.categories; track cat.slug) {
              <button class="story" (click)="openCategory(cat)">
                <div class="ring"><img [src]="cat.cover" [alt]="cat.category" /></div>
                <span class="label">{{ cat.category }}</span>
              </button>
            }
            <div class="sep" aria-hidden="true">·</div>
            @for (exh of d.exhibitions; track exh.slug) {
              <button class="story expo" (click)="openExhibition(exh)">
                <div class="ring expo-ring"><img [src]="exh.cover" [alt]="exh.title" /></div>
                <span class="label">{{ exh.title }}</span>
              </button>
            }
          </div>
        }
      </div>
    </section>

    <section class="feed">
      <div class="container">
        @if (data(); as d) {
          <div class="masonry">
            @for (item of d.feed; track item.slug) {
              <button class="card" (click)="openFeedItem(item)">
                @if (item.kind === 'exhibition') { <span class="badge">Exposition</span> }
                <img [src]="item.cover" [alt]="item.title" loading="lazy" />
                <div class="meta">
                  <span class="cat">{{ item.subtitle }}</span>
                  <span class="title">{{ item.title }}</span>
                </div>
              </button>
            }
          </div>
        }
      </div>
    </section>

    @if (viewerQueue().length > 0) {
      <app-story-viewer [queue]="viewerQueue()" (closed)="closeViewer()"></app-story-viewer>
    }
  `,
  styles: [`
    .hero { min-height: 50vh; padding: 96px 0 64px; display: flex; flex-direction: column; justify-content: center; }
    .hero .eyebrow { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-mute); }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; margin-top: 20px; max-width: 820px; }
    .hero .lead { max-width: 540px; margin-top: 28px; font-size: 1.05rem; color: var(--color-ink-soft); }

    .stories { position: sticky; top: 72px; z-index: 30; background: var(--color-bg); border-top: 1px solid var(--color-line); border-bottom: 1px solid var(--color-line); padding: 24px 0; }
    .stories-row { display: flex; gap: 32px; overflow-x: auto; align-items: flex-start; }
    .story { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 88px; background: none; border: none; cursor: pointer; padding: 0; }
    .ring { width: 84px; height: 84px; border-radius: 50%; padding: 3px; background: var(--color-bg); border: 1px solid var(--color-ink); }
    .ring img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .expo-ring { padding: 4px; border: none; box-shadow: inset 0 0 0 1px var(--color-bg), inset 0 0 0 2px var(--color-ink); }
    .label { font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-ink-soft); }
    .sep { align-self: stretch; display: flex; align-items: center; padding: 0 4px; color: var(--color-line); font-size: 1.4rem; }

    .feed { padding: 64px 0 140px; }
    .masonry { column-count: 3; column-gap: 20px; }
    .card { break-inside: avoid; margin-bottom: 20px; position: relative; overflow: hidden; cursor: pointer; background: var(--color-bg-alt); display: block; width: 100%; border: none; padding: 0; }
    .card img { width: 100%; height: auto; display: block; }
    .meta { position: absolute; inset: auto 0 0 0; padding: 20px; background: linear-gradient(transparent, rgba(26,24,21,0.7)); color: #fff; opacity: 0; transition: opacity 200ms ease; pointer-events: none; text-align: left; }
    .card:hover .meta { opacity: 1; }
    .cat { display: block; font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px; }
    .title { font-family: var(--serif); font-size: 1.4rem; line-height: 1.15; }
    .badge { position: absolute; top: 14px; left: 14px; background: var(--color-bg); color: var(--color-ink); font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 10px; border: 1px solid var(--color-ink); z-index: 2; }

    @media (max-width: 960px) { .masonry { column-count: 2; } }
    @media (max-width: 600px) { .masonry { column-count: 1; } .stories-row { gap: 20px; } .ring { width: 72px; height: 72px; } }
  `]
})
export class HomeComponent implements OnInit {
  private portfolio = inject(PortfolioService);

  protected data = signal<HomePageData | null>(null);
  protected viewerQueue = signal<StoryItem[]>([]);

  ngOnInit() {
    this.portfolio.getHome().subscribe(d => this.data.set(d));
  }

  openCategory(cat: HomeCategoryView) {
    const requests = cat.itemSlugs.map(slug => this.portfolio.getFurniture(slug));
    forkJoin(requests).subscribe(furnitureList => {
      const queue: StoryItem[] = furnitureList.map(f => ({
        title: f.title,
        subtitle: `${f.category} · ${f.year}`,
        slides: f.slides
      }));
      this.viewerQueue.set(queue);
    });
  }

  openExhibition(exh: HomeExhibitionView) {
    this.portfolio.getExhibition(exh.slug).subscribe(e => {
      this.viewerQueue.set([{
        title: e.title,
        subtitle: `${e.venue} · ${exh.period}`,
        slides: e.slides
      }]);
    });
  }

  openFeedItem(item: HomeFeedItem) {
    if (item.kind === 'furniture') {
      this.portfolio.getFurniture(item.slug).subscribe(f => {
        this.viewerQueue.set([{
          title: f.title,
          subtitle: item.subtitle,
          slides: f.slides
        }]);
      });
    } else {
      this.portfolio.getExhibition(item.slug).subscribe(e => {
        this.viewerQueue.set([{
          title: e.title,
          subtitle: item.subtitle,
          slides: e.slides
        }]);
      });
    }
  }

  closeViewer() { this.viewerQueue.set([]); }
}
```

- [ ] **Step 3: Mettre à jour le test `home.component.spec.ts`**

Remplace le test existant par :

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('fetches home data on init', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/home');
    expect(req.request.method).toBe('GET');
    req.flush({ categories: [], exhibitions: [], feed: [] });
  });
});
```

- [ ] **Step 4: Run + commit**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include='**/home.component.spec.ts'
git add frontend/src/app/pages/home/ frontend/src/app/components/header/
git commit -m "feat(frontend): refactor home with sticky stories bar and masonry"
```

---

## Phase H — Admin

### Task 14 : Directive `appReorderable` (drag&drop HTML5 natif)

**Files:**

- Create: `frontend/src/app/directives/reorderable.directive.ts`
- Create: `frontend/src/app/directives/reorderable.directive.spec.ts`

- [ ] **Step 1: Test minimal**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ReorderableDirective } from './reorderable.directive';

@Component({
  standalone: true,
  imports: [ReorderableDirective],
  template: `
    <ul appReorderable (reordered)="onReorder($event)">
      <li *ngFor="let item of items">{{ item }}</li>
    </ul>
  `
})
class HostComponent {
  items = ['a', 'b', 'c'];
  reordered: number[] | null = null;
  onReorder(order: number[]) { this.reordered = order; }
}

describe('ReorderableDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('attaches draggable=true to children', () => {
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items[0].draggable).toBe(true);
  });
});
```

- [ ] **Step 2: Implémenter la directive**

```typescript
import { AfterViewInit, Directive, ElementRef, EventEmitter, Output } from '@angular/core';

@Directive({
  selector: '[appReorderable]',
  standalone: true
})
export class ReorderableDirective implements AfterViewInit {
  @Output() reordered = new EventEmitter<number[]>();

  private dragSrcIndex: number | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.attach();
    // Re-attache si la liste change dynamiquement
    const observer = new MutationObserver(() => this.attach());
    observer.observe(this.host.nativeElement, { childList: true });
  }

  private attach() {
    const children = Array.from(this.host.nativeElement.children) as HTMLElement[];
    children.forEach((el, idx) => {
      el.draggable = true;
      el.dataset['idx'] = String(idx);
      el.addEventListener('dragstart', e => this.onDragStart(e, idx));
      el.addEventListener('dragover', e => e.preventDefault());
      el.addEventListener('drop', e => this.onDrop(e, idx));
    });
  }

  private onDragStart(e: DragEvent, index: number) {
    this.dragSrcIndex = index;
    e.dataTransfer?.setData('text/plain', String(index));
  }

  private onDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    if (this.dragSrcIndex === null || this.dragSrcIndex === targetIndex) return;
    const order = Array.from(this.host.nativeElement.children).map((_, i) => i);
    const [moved] = order.splice(this.dragSrcIndex, 1);
    order.splice(targetIndex, 0, moved);
    this.reordered.emit(order);
    this.dragSrcIndex = null;
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include='**/reorderable.directive.spec.ts'
git add frontend/src/app/directives/
git commit -m "feat(frontend): add appReorderable HTML5 drag-drop directive"
```

---

### Task 15 : Composant `SlidesEditorComponent`

**Files:**

- Create: `frontend/src/app/pages/admin/slides-editor.component.ts`
- Create: `frontend/src/app/pages/admin/slides-editor.component.spec.ts`

Composant accordion qui prend `kind` et `ownerId` en input, charge les slides, permet d'ajouter / supprimer / réordonner / éditer inline.

- [ ] **Step 1: Implémenter le composant**

```typescript
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../services/portfolio.service';
import { Slide, CoverSlide, ImageSlide, SpecSlide, QuoteSlide, LinkSlide, SpecEntry } from '../../models/slide.model';
import { ReorderableDirective } from '../../directives/reorderable.directive';

@Component({
  selector: 'app-slides-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReorderableDirective],
  template: `
    <section class="slides-editor">
      <header class="head">
        <h3>Slides ({{ slides().length }})</h3>
        <button type="button" (click)="open.set(!open())">{{ open() ? 'Replier' : 'Déplier' }}</button>
      </header>

      @if (open()) {
        <div class="actions">
          <button type="button" (click)="add('cover')">+ Cover</button>
          <button type="button" (click)="add('image')">+ Image</button>
          <button type="button" (click)="add('spec')">+ Caractéristiques</button>
          <button type="button" (click)="add('quote')">+ Citation</button>
          <button type="button" (click)="add('link')">+ Lien</button>
        </div>

        @if (warnings().length > 0) {
          <ul class="warnings">
            @for (w of warnings(); track w) { <li>⚠ {{ w }}</li> }
          </ul>
        }

        <ul class="list" appReorderable (reordered)="onReorder($event)">
          @for (s of slides(); track s.id || $index; let i = $index) {
            <li class="slide-card" [attr.data-type]="s.type">
              <div class="row">
                <span class="handle">⠿</span>
                <span class="type-badge">{{ s.type | uppercase }}</span>
                <button type="button" class="del" (click)="remove(i)">✕</button>
              </div>

              @switch (s.type) {
                @case ('cover') {
                  <label>Image source <input type="text" [ngModel]="$any(s).src" (ngModelChange)="patch(i, { src: $event })" /></label>
                }
                @case ('image') {
                  <label>Image source <input type="text" [ngModel]="$any(s).src" (ngModelChange)="patch(i, { src: $event })" /></label>
                  <label>Légende <input type="text" [ngModel]="$any(s).caption" (ngModelChange)="patch(i, { caption: $event })" /></label>
                }
                @case ('spec') {
                  <div class="specs">
                    @for (entry of $any(s).specs; track $index; let j = $index) {
                      <div class="spec-row">
                        <input type="text" placeholder="Label" [ngModel]="entry.label" (ngModelChange)="patchSpec(i, j, 'label', $event)" />
                        <input type="text" placeholder="Valeur" [ngModel]="entry.value" (ngModelChange)="patchSpec(i, j, 'value', $event)" />
                        <button type="button" (click)="removeSpec(i, j)">✕</button>
                      </div>
                    }
                    <button type="button" (click)="addSpec(i)">+ Entrée</button>
                  </div>
                }
                @case ('quote') {
                  <label>Citation <textarea [ngModel]="$any(s).body" (ngModelChange)="patch(i, { body: $event })"></textarea></label>
                  <label>Source <input type="text" [ngModel]="$any(s).cite" (ngModelChange)="patch(i, { cite: $event })" /></label>
                }
                @case ('link') {
                  <label>Label <input type="text" [ngModel]="$any(s).label" (ngModelChange)="patch(i, { label: $event })" placeholder="Voir la fiche complète" /></label>
                  <label>Description <input type="text" [ngModel]="$any(s).description" (ngModelChange)="patch(i, { description: $event })" /></label>
                  <label>URL <input type="text" [ngModel]="$any(s).href" (ngModelChange)="patch(i, { href: $event })" placeholder="(auto)" /></label>
                }
              }
            </li>
          }
        </ul>

        <footer class="foot">
          <button type="button" (click)="reload()">Annuler</button>
          <button type="button" class="primary" (click)="save()" [disabled]="!canSave()">Enregistrer les slides</button>
        </footer>
      }
    </section>
  `,
  styles: [`
    .slides-editor { border: 1px solid var(--color-line); padding: 16px; margin-top: 24px; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0; }
    .warnings { margin: 12px 0; padding-left: 0; list-style: none; color: #b58400; font-size: 0.85rem; }
    .list { list-style: none; padding: 0; }
    .slide-card { border: 1px solid var(--color-line); padding: 12px; margin-bottom: 8px; background: var(--color-bg); }
    .row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .handle { cursor: grab; color: var(--color-mute); }
    .type-badge { font-size: 0.65rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mute); }
    .del { margin-left: auto; background: none; border: none; cursor: pointer; }
    label { display: block; font-size: 0.78rem; color: var(--color-ink-soft); margin: 6px 0; }
    input, textarea { width: 100%; padding: 6px 8px; border: 1px solid var(--color-line); background: #fff; font: inherit; }
    .specs .spec-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 6px; margin-bottom: 6px; }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-line); }
    .primary { background: var(--color-ink); color: var(--color-bg); border: none; padding: 8px 16px; cursor: pointer; }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class SlidesEditorComponent implements OnChanges {
  @Input({ required: true }) kind!: 'furniture' | 'exhibition';
  @Input({ required: true }) ownerId!: string;

  private portfolio = inject(PortfolioService);

  protected open = signal(false);
  protected slides = signal<Slide[]>([]);

  protected warnings = signal<string[]>([]);

  ngOnChanges(c: SimpleChanges) {
    if (c['ownerId'] || c['kind']) this.reload();
  }

  reload() {
    if (!this.ownerId) return;
    this.portfolio.getSlides(this.kind, this.ownerId).subscribe(slides => {
      this.slides.set(slides);
      this.recomputeWarnings();
    });
  }

  add(type: Slide['type']) {
    const id = 'tmp-' + Math.random().toString(36).slice(2, 8);
    const newSlide: Slide = (() => {
      switch (type) {
        case 'cover': return { type, id, position: 0, src: '' } as CoverSlide;
        case 'image': return { type, id, position: 0, src: '', caption: null } as ImageSlide;
        case 'spec':  return { type, id, position: 0, specs: [{ label: '', value: '' }] } as SpecSlide;
        case 'quote': return { type, id, position: 0, body: '', cite: null } as QuoteSlide;
        case 'link':  return { type, id, position: 0, label: null, description: null, href: null } as LinkSlide;
      }
    })();
    this.slides.update(s => [...s, newSlide]);
    this.recomputeWarnings();
  }

  remove(index: number) {
    this.slides.update(s => s.filter((_, i) => i !== index));
    this.recomputeWarnings();
  }

  patch(index: number, partial: Partial<Slide>) {
    this.slides.update(s => s.map((slide, i) => i === index ? { ...slide, ...partial } as Slide : slide));
  }

  patchSpec(slideIdx: number, entryIdx: number, field: 'label' | 'value', value: string) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      const specs = slide.specs.map((e, j) => j === entryIdx ? { ...e, [field]: value } : e);
      return { ...slide, specs };
    }));
  }

  addSpec(slideIdx: number) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      return { ...slide, specs: [...slide.specs, { label: '', value: '' }] };
    }));
  }

  removeSpec(slideIdx: number, entryIdx: number) {
    this.slides.update(s => s.map((slide, i) => {
      if (i !== slideIdx || slide.type !== 'spec') return slide;
      return { ...slide, specs: slide.specs.filter((_, j) => j !== entryIdx) };
    }));
  }

  onReorder(order: number[]) {
    const current = this.slides();
    this.slides.set(order.map(i => current[i]));
    this.recomputeWarnings();
  }

  canSave(): boolean {
    return this.slides().every(s => {
      if (s.type === 'image' && !s.src) return false;
      if (s.type === 'cover' && !s.src) return false;
      if (s.type === 'quote' && !s.body) return false;
      if (s.type === 'spec' && s.specs.length === 0) return false;
      return true;
    });
  }

  save() {
    this.portfolio.replaceSlides(this.kind, this.ownerId, this.slides()).subscribe(updated => {
      this.slides.set(updated);
      this.recomputeWarnings();
    });
  }

  private recomputeWarnings() {
    const ws: string[] = [];
    const s = this.slides();
    if (s.length === 0 || s[0]?.type !== 'cover') ws.push('Pas de slide cover en première position.');
    if (s.length === 0 || s[s.length - 1]?.type !== 'link') ws.push('Pas de slide lien en dernière position.');
    this.warnings.set(ws);
  }
}
```

- [ ] **Step 2: Test minimal**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SlidesEditorComponent } from './slides-editor.component';

describe('SlidesEditorComponent', () => {
  let fixture: ComponentFixture<SlidesEditorComponent>;
  let component: SlidesEditorComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlidesEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    fixture = TestBed.createComponent(SlidesEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('kind', 'furniture');
    fixture.componentRef.setInput('ownerId', 'f-001');
    fixture.detectChanges();
  });

  it('loads slides on init', () => {
    const req = httpMock.expectOne('/api/admin/slides/furniture/f-001');
    expect(req.request.method).toBe('GET');
    req.flush([{ type: 'cover', id: 's1', position: 0, src: 'x.jpg' }]);
    expect(component['slides']().length).toBe(1);
  });
});
```

- [ ] **Step 3: Run + commit**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include='**/slides-editor.component.spec.ts'
git add frontend/src/app/pages/admin/slides-editor.component.*
git commit -m "feat(admin): add SlidesEditorComponent (accordion with drag-drop)"
```

---

### Task 16 : Onglet "Accueil" dans la console admin

**Files:**

- Modify: `frontend/src/app/pages/admin/admin.component.ts` (ajouter le tab "home" et intégrer `SlidesEditorComponent`)

- [ ] **Step 1: Ajouter le bouton de tab "Accueil"**

Dans la `<div class="tabs">` de `admin.component.ts`, ajoute :

```html
<button type="button" role="tab"
  [attr.aria-selected]="tab() === 'home'"
  [class.active]="tab() === 'home'"
  (click)="switchTab('home')">Accueil</button>
```

Et ajuste le type de `tab` pour accepter `'home'`.

- [ ] **Step 2: Intégrer `<app-slides-editor>` dans l'éditeur Mobilier et Exposition**

Dans les blocs `@if (editingFurnitureSlug())` et `@if (editingExhibitionSlug())`, ajoute après le formulaire :

```html
<app-slides-editor kind="furniture" [ownerId]="editingFurnitureId()" />
```

(et pareil pour exhibition). Tu devras ajouter un signal `editingFurnitureId` qui dérive l'id depuis la pièce en cours d'édition.

Import : ajoute `SlidesEditorComponent` aux `imports` du composant.

- [ ] **Step 3: Ajouter le contenu de l'onglet "Accueil"**

Après les autres `@if (tab() === '...')` blocks, ajoute :

```html
@if (tab() === 'home') {
  <section class="home-editor">
    <h2>Ordre du masonry</h2>
    <p class="hint">Glisse pour réordonner. Décoche pour exclure du feed.</p>

    @if (homeItems(); as items) {
      <ul class="ordering-list" appReorderable (reordered)="onFeedReorder($event)">
        @for (entry of items; track entry.slug) {
          <li>
            <span class="handle">⠿</span>
            <span class="kind-badge">{{ entry.kind === 'furniture' ? 'MOBILIER' : 'EXPO' }}</span>
            <img [src]="entry.cover" [alt]="entry.title" class="thumb" />
            <span class="title">{{ entry.title }}</span>
            <label><input type="checkbox" [checked]="entry.included" (change)="toggleIncluded(entry, $event)" /> Inclure</label>
          </li>
        }
      </ul>
      <button type="button" (click)="saveFeed()">Enregistrer l'ordre</button>
    }

    <h2 style="margin-top: 48px">Catégories</h2>
    @if (categoryMeta(); as cats) {
      <ul class="cat-list" appReorderable (reordered)="onCategoryReorder($event)">
        @for (c of cats; track c.category) {
          <li>
            <span class="handle">⠿</span>
            <img [src]="c.coverImage" [alt]="c.category" class="thumb-round" />
            <span class="title">{{ c.category }}</span>
            <button type="button" (click)="changeCategoryCover(c)">Changer l'image</button>
            <label><input type="checkbox" [checked]="c.visible" (change)="toggleCategoryVisibility(c, $event)" /> Visible</label>
          </li>
        }
      </ul>
      <button type="button" (click)="saveCategories()">Enregistrer les catégories</button>
    }
  </section>
}
```

- [ ] **Step 4: Implémenter les signaux + handlers dans la classe**

Ajoute dans `AdminComponent` :

```typescript
import { AdminFeedEntry, AdminCategoryView } from '../../models/home.model';
import { ReorderableDirective } from '../../directives/reorderable.directive';
import { SlidesEditorComponent } from './slides-editor.component';

// dans imports: ReorderableDirective, SlidesEditorComponent

interface HomeAdminItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  included: boolean;
}

protected homeItems = signal<HomeAdminItem[] | null>(null);
protected categoryMeta = signal<AdminCategoryView[] | null>(null);

loadHomeTab() {
  // Charge toutes les pièces et expos, puis le feed actuel pour savoir lesquelles sont incluses
  forkJoin([
    this.portfolio.getAllFurniture(),
    this.portfolio.getAllExhibitions(),
    this.portfolio.getAdminFeed()
  ]).subscribe(([furniture, expos, feed]) => {
    const included = new Set(feed.map(f => `${f.kind}:${f.slug}`));
    const items: HomeAdminItem[] = [];
    // d'abord les inclus dans l'ordre du feed
    for (const f of feed) {
      const fur = furniture.find(x => x.slug === f.slug);
      const exh = expos.find(x => x.slug === f.slug);
      if (fur) items.push({ kind: 'furniture', slug: fur.slug, title: fur.title, cover: fur.coverImage, included: true });
      if (exh) items.push({ kind: 'exhibition', slug: exh.slug, title: exh.title, cover: exh.coverImage, included: true });
    }
    // puis les non inclus à la fin
    for (const fur of furniture) if (!included.has(`furniture:${fur.slug}`))
      items.push({ kind: 'furniture', slug: fur.slug, title: fur.title, cover: fur.coverImage, included: false });
    for (const exh of expos) if (!included.has(`exhibition:${exh.slug}`))
      items.push({ kind: 'exhibition', slug: exh.slug, title: exh.title, cover: exh.coverImage, included: false });
    this.homeItems.set(items);
  });

  this.portfolio.getAdminCategories().subscribe(c => this.categoryMeta.set(c));
}

onFeedReorder(order: number[]) {
  const current = this.homeItems();
  if (!current) return;
  this.homeItems.set(order.map(i => current[i]));
}

toggleIncluded(item: HomeAdminItem, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  this.homeItems.update(items => items?.map(x => x === item ? { ...x, included: checked } : x) ?? null);
}

saveFeed() {
  const items = this.homeItems() ?? [];
  const entries: AdminFeedEntry[] = items.filter(i => i.included).map(i => ({ kind: i.kind, slug: i.slug }));
  this.portfolio.replaceAdminFeed(entries).subscribe();
}

onCategoryReorder(order: number[]) {
  const current = this.categoryMeta();
  if (!current) return;
  this.categoryMeta.set(order.map((i, newPos) => ({ ...current[i], position: newPos })));
}

toggleCategoryVisibility(c: AdminCategoryView, event: Event) {
  const visible = (event.target as HTMLInputElement).checked;
  this.categoryMeta.update(cats => cats?.map(x => x.category === c.category ? { ...x, visible } : x) ?? null);
}

changeCategoryCover(c: AdminCategoryView) {
  // Réutilise le photoPicker existant. Quand une image est sélectionnée, mettre à jour c.coverImage.
  // (l'implémentation exacte dépend de l'API du photoPicker existant)
  this.openPhotoPicker(url => {
    this.categoryMeta.update(cats => cats?.map(x => x.category === c.category ? { ...x, coverImage: url } : x) ?? null);
  });
}

saveCategories() {
  const cats = this.categoryMeta() ?? [];
  cats.forEach(c => this.portfolio.updateAdminCategory(c.category, c).subscribe());
}
```

Et dans `switchTab` : si on switch sur `home`, appelle `loadHomeTab()`.

- [ ] **Step 5: Run + commit**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
git add frontend/src/app/pages/admin/admin.component.ts
git commit -m "feat(admin): add home tab and integrate slides editor"
```

---

## Phase I — Cleanup

### Task 17 : Supprimer les pages liste + ajuster les routes + redirections

**Files:**

- Delete: `frontend/src/app/pages/furniture-list/`
- Delete: `frontend/src/app/pages/exhibitions-list/`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `backend/src/main/java/com/atelier/portfolio/config/WebConfig.java` (redirections 301)

- [ ] **Step 1: Lire les routes actuelles**

```bash
cat frontend/src/app/app.routes.ts
```

Identifie les routes `/mobilier` et `/expositions` (sans slug).

- [ ] **Step 2: Mettre à jour `app.routes.ts`**

Remplace les deux routes liste par des redirects vers `/` :

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'mobilier', redirectTo: '/', pathMatch: 'full' },
  { path: 'expositions', redirectTo: '/', pathMatch: 'full' },
  { path: 'mobilier/:slug', loadComponent: () => import('./pages/furniture-detail/furniture-detail.component').then(m => m.FurnitureDetailComponent) },
  { path: 'expositions/:slug', loadComponent: () => import('./pages/exhibition-detail/exhibition-detail.component').then(m => m.ExhibitionDetailComponent) },
  { path: 'studio', loadComponent: () => import('./pages/studio/studio.component').then(m => m.StudioComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) }
];
```

(Adapte aux routes existantes — vérifie qu'aucune autre route ne dépend des supprimées.)

- [ ] **Step 3: Supprimer les composants liste**

```bash
rm -r frontend/src/app/pages/furniture-list
rm -r frontend/src/app/pages/exhibitions-list
```

- [ ] **Step 4: Vérifier que rien ne reste référencé**

```bash
grep -rn "furniture-list\|FurnitureListComponent\|exhibitions-list\|ExhibitionsListComponent" frontend/src
```

Aucune occurrence attendue. Si présent, mettre à jour.

- [ ] **Step 5: Ajouter une redirection backend (optionnel — peut être faite côté nginx en prod)**

Si `WebConfig` existe et configure des routes MVC : ignorer, les redirects Angular suffisent. Si on veut une vraie 301 HTTP côté serveur, ajouter dans `WebConfig` :

```java
@Override
public void addViewControllers(ViewControllerRegistry registry) {
    registry.addRedirectViewController("/mobilier", "/");
    registry.addRedirectViewController("/expositions", "/");
}
```

(à n'ajouter que si pertinent dans la config Spring du projet ; sinon, les redirects Angular Router suffisent pour la SPA).

- [ ] **Step 6: Run tests (front + back)**

```bash
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
cd ../backend && ./mvnw test
```

- [ ] **Step 7: Vérification visuelle finale**

```bash
# Terminal 1
cd backend && ./mvnw spring-boot:run
# Terminal 2
cd frontend && npm start
```

Ouvre `http://localhost:4200`, vérifie :
- Hero épuré + bandeau stories visibles + masonry rempli
- Clic sur un rond catégorie → viewer enchaîne les pièces
- Clic sur un rond expo → viewer joue l'expo
- Clic sur une carte → viewer joue cet item, slide finale "Lien" → ferme et navigue
- `/mobilier` redirige vers `/`
- `/mobilier/{slug}` affiche toujours la fiche détail
- L'admin (`/admin`) charge, l'onglet "Accueil" permet de réordonner

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(frontend): remove list pages, redirect to home"
```

---

## Self-Review

Couverture de la spec :

| Section spec | Tâche(s) |
|---|---|
| §2.1 Routes (suppression listes, conservation détails) | Task 17 |
| §2.2 Nav simplifiée | Task 13 step 1 |
| §2.3 Layout home (hero / sticky / masonry) | Task 13 |
| §2.4 Modèle stories (catégories / expos / cartes) | Task 13 |
| §2.5 Types de slides | Task 5 (modèle), Task 12 (rendu) |
| §2.6 Story Viewer | Task 12 |
| §3.1 Schéma DB 4 tables | Tasks 1, 2 |
| §3.2 Sealed interface Java | Task 5 |
| §3.3 Modèle TypeScript | Task 11 |
| §4.1 Endpoints publics (furniture/exhibition enrichis + /api/home) | Tasks 7, 8 |
| §4.2 Endpoints admin (slides, feed, categories) | Task 9 |
| §5.1–5.3 Stratégie admin (intégration onglet) | Tasks 15, 16 |
| §5.4 Drag&drop natif | Task 14 |
| §6 Liquibase changelogs 007–012 | Tasks 1, 2, 10 |
| §7 Frontend fichiers à créer/modifier | Tasks 11–17 |
| §8 Backend fichiers à créer/modifier | Tasks 1–10 |
| §11 Risque cleanup orphelin | Task 7 step 3 (deleteBySlug appelle storyService.deleteAllForOwner) |
| §11 Risque cohérence home_feed ↔ items | Task 8 step 4 (HomeService filtre les null) |
| §11 Risque SEO (redirections) | Task 17 step 5 |
| §12 Critères d'acceptation | Vérifiés à Task 17 step 7 |
