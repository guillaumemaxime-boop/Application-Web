# Outil de cadrage d'image (crop) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le focal point actuel par un crop rectangulaire piloté par Cropper.js, applicable aux covers (mobilier, exposition, story) et aux items de galerie (mobilier, exposition). Rendu public via CSS transform.

**Architecture:** 4 nouvelles colonnes `crop_x/y/w/h` (DOUBLE 0-100) par usage en DB ; record `ImageCrop` côté Java, interface `Crop` côté TS ; composant `<app-image-crop-picker>` wrap autour de Cropper.js ; utilitaire `cropTransform()` qui produit `transform` + `transform-origin` à appliquer sur l'`<img>` cible.

**Tech Stack:** Spring Boot 4 + Liquibase + JPA `@Embeddable` ; Angular 21 + signals + standalone ; Cropper.js 1.6.x via npm.

**Référence :** spec validé → [docs/superpowers/specs/2026-06-07-image-crop-tool-design.md](../specs/2026-06-07-image-crop-tool-design.md).

**Branche :** créer `feat/image-crop-tool` depuis main.

---

## File Structure

### Backend — créés

| Fichier | Rôle |
|---|---|
| `backend/src/main/resources/db/changelog/changes/028-replace-focal-point-with-crop.yaml` | Drop focal + add crop colonnes sur 5 tables |
| `backend/src/main/java/com/atelier/portfolio/model/ImageCrop.java` | Record `{x, y, w, h}` avec validations 0-100 |
| `backend/src/main/java/com/atelier/portfolio/model/GalleryImage.java` | Record `{url, crop}` pour items de galerie |
| `backend/src/main/java/com/atelier/portfolio/entity/GalleryEntry.java` | `@Embeddable` pour `furniture_gallery` + `exhibition_gallery` |
| `backend/src/test/java/com/atelier/portfolio/model/ImageCropTest.java` | Tests record + validation |
| `backend/src/test/java/com/atelier/portfolio/model/GalleryImageTest.java` | Tests record |

### Backend — modifiés

| Fichier | Modification |
|---|---|
| `backend/src/main/resources/db/changelog/db.changelog-master.yaml` | Include 028 |
| `backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java` | Drop focal fields, add crop fields, change gallery to `List<GalleryEntry>` |
| `backend/src/main/java/com/atelier/portfolio/entity/ExhibitionEntity.java` | Idem |
| `backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java` | Add 4 crop fields |
| `backend/src/main/java/com/atelier/portfolio/model/Furniture.java` | Drop focalX/Y, add `ImageCrop coverCrop`, change `gallery: List<GalleryImage>` |
| `backend/src/main/java/com/atelier/portfolio/model/Exhibition.java` | Idem |
| `backend/src/main/java/com/atelier/portfolio/model/Story.java` | Add `ImageCrop coverCrop` |
| `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java` | Propage crop + gallery items dans `toDto` + `applyChanges` |
| `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java` | Idem |
| `backend/src/main/java/com/atelier/portfolio/service/StoryService.java` | Propage `coverCrop` |
| Tous les tests qui construisent `new Furniture(...)`, `new Exhibition(...)`, `new Story(...)` | Adapter le nombre d'arguments |

### Frontend — créés

| Fichier | Rôle |
|---|---|
| `frontend/src/app/models/crop.model.ts` | Interface `Crop` partagée |
| `frontend/src/app/models/gallery-item.model.ts` | Interface `GalleryItem` |
| `frontend/src/app/pages/admin/shared/image-crop-picker.component.ts` | Composant modale crop |
| `frontend/src/app/pages/admin/shared/image-crop-picker.component.spec.ts` | Tests |
| `frontend/src/app/utils/crop-transform.ts` | `cropTransform(crop)` qui renvoie `{transform, transformOrigin}` |
| `frontend/src/app/utils/crop-transform.spec.ts` | Tests |

### Frontend — modifiés

| Fichier | Modification |
|---|---|
| `frontend/package.json` + `package-lock.json` | Install `cropperjs` 1.6.x |
| `frontend/src/app/models/furniture.model.ts` | Drop `coverFocalX/Y`, add `coverCrop`, change `gallery: GalleryItem[]` |
| `frontend/src/app/models/exhibition.model.ts` | Idem |
| `frontend/src/app/models/story.model.ts` | Add `coverCrop` |
| `frontend/src/app/pages/admin/shared/image-field.component.ts` | Ajout bouton "Cadrer" |
| `frontend/src/app/pages/admin/shared/image-field.component.spec.ts` | Tests bouton "Cadrer" |
| `frontend/src/app/pages/admin/shared/gallery-editor.component.ts` | Gérer `GalleryItem[]` + crop par item |
| `frontend/src/app/pages/admin/shared/gallery-editor.component.spec.ts` | Tests adaptés |
| `frontend/src/app/pages/admin/mobilier/mobilier.component.ts` | Remplace focal point par crop, ajout crop story |
| `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts` | Tests adaptés |
| `frontend/src/app/pages/admin/expositions/expositions.component.ts` | Idem |
| `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts` | Tests adaptés |
| `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` | Branche `cropTransform` sur hero + galerie |
| `frontend/src/app/pages/furniture-detail/furniture-detail.component.spec.ts` | Tests rendu crop |
| `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts` | Idem |
| `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.spec.ts` | Idem |
| `frontend/src/app/components/story-viewer/story-viewer.component.ts` | Crop sur slide cover |
| `frontend/src/app/components/story-inline/story-inline.component.ts` | Crop sur cover |
| `frontend/src/app/components/news-slider/news-slider.component.ts` | Crop sur thumb story |

### Frontend — supprimés

| Fichier | Action |
|---|---|
| `frontend/src/app/pages/admin/shared/focal-point-picker.component.ts` | Delete |
| `frontend/src/app/pages/admin/shared/focal-point-picker.component.spec.ts` | Delete |

### Doc — créés/modifiés

| Fichier | Modification |
|---|---|
| `docs/adr/0017-cropperjs-image-crop-tool.md` | Nouvel ADR (première lib UI tierce) |
| `CLAUDE.md` | Mention Cropper.js dans Conventions frontend |

### E2E Playwright

| Fichier | Action |
|---|---|
| `frontend/e2e/__screenshots__/furniture-detail.spec.ts/*.png` | Regen après validation visuelle |
| `frontend/e2e/__screenshots__/exhibition-detail.spec.ts/*.png` | Regen |
| `frontend/e2e/__screenshots__/home.spec.ts/*.png` | Regen (news-sliders impactés) |

---

## Conventions à suivre

- **TDD** pour chaque composant ou utilitaire nouveau.
- **Commits** conventional-commits FR : `feat(crop)`, `chore(db)`, `refactor(focal)`, etc.
- **Pas de Playwright** avant validation visuelle manuelle de l'utilisateur (règle projet).
- **Audits + doc** : `superpowers:finishing-a-development-branch` à la fin pour proposer les conventions avant merge.

---

## Task 1 : Liquibase 028 + records ImageCrop + GalleryImage + Embeddable GalleryEntry

**Files:**
- Create: `backend/src/main/resources/db/changelog/changes/028-replace-focal-point-with-crop.yaml`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`
- Create: `backend/src/main/java/com/atelier/portfolio/model/ImageCrop.java`
- Create: `backend/src/main/java/com/atelier/portfolio/model/GalleryImage.java`
- Create: `backend/src/main/java/com/atelier/portfolio/entity/GalleryEntry.java`
- Create: `backend/src/test/java/com/atelier/portfolio/model/ImageCropTest.java`
- Create: `backend/src/test/java/com/atelier/portfolio/model/GalleryImageTest.java`

- [ ] **Step 1 : Créer le changeset Liquibase 028**

```yaml
databaseChangeLog:
  - changeSet:
      id: 028-replace-focal-point-with-crop
      author: atelier-lumen
      changes:
        - dropColumn:
            tableName: furniture
            columns:
              - column: { name: cover_focal_x }
              - column: { name: cover_focal_y }
        - addColumn:
            tableName: furniture
            columns:
              - column: { name: cover_crop_x, type: double }
              - column: { name: cover_crop_y, type: double }
              - column: { name: cover_crop_w, type: double }
              - column: { name: cover_crop_h, type: double }

        - dropColumn:
            tableName: exhibition
            columns:
              - column: { name: cover_focal_x }
              - column: { name: cover_focal_y }
        - addColumn:
            tableName: exhibition
            columns:
              - column: { name: cover_crop_x, type: double }
              - column: { name: cover_crop_y, type: double }
              - column: { name: cover_crop_w, type: double }
              - column: { name: cover_crop_h, type: double }

        - addColumn:
            tableName: story
            columns:
              - column: { name: cover_crop_x, type: double }
              - column: { name: cover_crop_y, type: double }
              - column: { name: cover_crop_w, type: double }
              - column: { name: cover_crop_h, type: double }

        - addColumn:
            tableName: furniture_gallery
            columns:
              - column: { name: crop_x, type: double }
              - column: { name: crop_y, type: double }
              - column: { name: crop_w, type: double }
              - column: { name: crop_h, type: double }

        - addColumn:
            tableName: exhibition_gallery
            columns:
              - column: { name: crop_x, type: double }
              - column: { name: crop_y, type: double }
              - column: { name: crop_w, type: double }
              - column: { name: crop_h, type: double }
```

- [ ] **Step 2 : Inclure 028 dans le master changelog**

Modifier `backend/src/main/resources/db/changelog/db.changelog-master.yaml`, ajouter à la fin :

```yaml
  - include:
      file: changes/028-replace-focal-point-with-crop.yaml
      relativeToChangelogFile: true
```

- [ ] **Step 3 : Créer le record `ImageCrop`**

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record ImageCrop(
    @DecimalMin("0.0") @DecimalMax("100.0") Double x,
    @DecimalMin("0.0") @DecimalMax("100.0") Double y,
    @DecimalMin("0.0") @DecimalMax("100.0") Double w,
    @DecimalMin("0.0") @DecimalMax("100.0") Double h
) {}
```

- [ ] **Step 4 : Tests ImageCrop**

Créer `backend/src/test/java/com/atelier/portfolio/model/ImageCropTest.java` :

```java
package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageCropTest {

    @Test
    void crop_construit_avec_valeurs_valides() {
        ImageCrop crop = new ImageCrop(10.0, 20.0, 60.0, 40.0);
        assertThat(crop.x()).isEqualTo(10.0);
        assertThat(crop.y()).isEqualTo(20.0);
        assertThat(crop.w()).isEqualTo(60.0);
        assertThat(crop.h()).isEqualTo(40.0);
    }

    @Test
    void crop_accepte_null_partout() {
        ImageCrop crop = new ImageCrop(null, null, null, null);
        assertThat(crop.x()).isNull();
        assertThat(crop.y()).isNull();
        assertThat(crop.w()).isNull();
        assertThat(crop.h()).isNull();
    }

    @Test
    void crop_equals_et_hashcode_coherents() {
        ImageCrop a = new ImageCrop(10.0, 20.0, 60.0, 40.0);
        ImageCrop b = new ImageCrop(10.0, 20.0, 60.0, 40.0);
        ImageCrop c = new ImageCrop(11.0, 20.0, 60.0, 40.0);
        assertThat(a).isEqualTo(b);
        assertThat(a.hashCode()).isEqualTo(b.hashCode());
        assertThat(a).isNotEqualTo(c);
    }
}
```

- [ ] **Step 5 : Créer le record `GalleryImage`**

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.Size;

public record GalleryImage(
    @Size(max = 500) String url,
    ImageCrop crop
) {}
```

- [ ] **Step 6 : Tests GalleryImage**

```java
package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GalleryImageTest {

    @Test
    void item_construit_avec_url_et_crop() {
        GalleryImage item = new GalleryImage("/uploads/a.jpg", new ImageCrop(0.0, 0.0, 100.0, 100.0));
        assertThat(item.url()).isEqualTo("/uploads/a.jpg");
        assertThat(item.crop().w()).isEqualTo(100.0);
    }

    @Test
    void item_accepte_crop_null() {
        GalleryImage item = new GalleryImage("/uploads/a.jpg", null);
        assertThat(item.crop()).isNull();
    }

    @Test
    void item_equals_compare_url_et_crop() {
        GalleryImage a = new GalleryImage("/x.jpg", null);
        GalleryImage b = new GalleryImage("/x.jpg", null);
        GalleryImage c = new GalleryImage("/x.jpg", new ImageCrop(0.0, 0.0, 50.0, 50.0));
        assertThat(a).isEqualTo(b);
        assertThat(a).isNotEqualTo(c);
    }
}
```

- [ ] **Step 7 : Créer l'`@Embeddable` `GalleryEntry`**

```java
package com.atelier.portfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class GalleryEntry {

    @Column(name = "url", length = 500, nullable = false)
    private String url;

    @Column(name = "crop_x") private Double cropX;
    @Column(name = "crop_y") private Double cropY;
    @Column(name = "crop_w") private Double cropW;
    @Column(name = "crop_h") private Double cropH;

    public GalleryEntry() {}

    public GalleryEntry(String url) { this.url = url; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Double getCropX() { return cropX; }
    public void setCropX(Double cropX) { this.cropX = cropX; }

    public Double getCropY() { return cropY; }
    public void setCropY(Double cropY) { this.cropY = cropY; }

    public Double getCropW() { return cropW; }
    public void setCropW(Double cropW) { this.cropW = cropW; }

    public Double getCropH() { return cropH; }
    public void setCropH(Double cropH) { this.cropH = cropH; }
}
```

- [ ] **Step 8 : Run tests pour vérifier que ImageCrop + GalleryImage compilent et passent**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest='ImageCropTest,GalleryImageTest' test
```

Attendu : `Tests run: 6, Failures: 0, Errors: 0`.

- [ ] **Step 9 : Commit**

```powershell
git add backend/src/main/resources/db/changelog/ backend/src/main/java/com/atelier/portfolio/model/ImageCrop.java backend/src/main/java/com/atelier/portfolio/model/GalleryImage.java backend/src/main/java/com/atelier/portfolio/entity/GalleryEntry.java backend/src/test/java/com/atelier/portfolio/model/ImageCropTest.java backend/src/test/java/com/atelier/portfolio/model/GalleryImageTest.java
git commit -m "feat(crop): records ImageCrop+GalleryImage, embeddable GalleryEntry, changeset 028"
```

---

## Task 2 : Refactor FurnitureEntity + record Furniture + service + tests

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Furniture.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java`
- Modify: tous les sites qui construisent `new Furniture(...)` ou consomment `furniture.gallery()` comme `List<String>`

- [ ] **Step 1 : Modifier `FurnitureEntity` — drop focal, add crop, change gallery type**

Dans `FurnitureEntity.java`, supprimer les champs `coverFocalX`, `coverFocalY` et leurs accesseurs.

Ajouter à la place :

```java
@Column(name = "cover_crop_x") private Double coverCropX;
@Column(name = "cover_crop_y") private Double coverCropY;
@Column(name = "cover_crop_w") private Double coverCropW;
@Column(name = "cover_crop_h") private Double coverCropH;
```

Avec leurs getters/setters.

Changer la déclaration `private List<String> gallery = new ArrayList<>();` en :

```java
@ElementCollection(fetch = FetchType.LAZY)
@CollectionTable(name = "furniture_gallery", joinColumns = @JoinColumn(name = "furniture_id"))
@OrderColumn(name = "position")
@BatchSize(size = 50)
private List<GalleryEntry> gallery = new ArrayList<>();
```

(Supprimer l'annotation `@Column` sur le champ qui mappait `url`, car maintenant c'est `GalleryEntry` qui porte les colonnes.)

Adapter le getter/setter : `public List<GalleryEntry> getGallery()` / `setGallery(List<GalleryEntry>)`.

- [ ] **Step 2 : Modifier le record `Furniture`**

```java
package com.atelier.portfolio.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record Furniture(
    @Size(max = 50) String id,
    @NotBlank @Size(max = 500) String title,
    @Size(max = 200) String slug,
    @NotBlank @Size(max = 100) String category,
    @Size(max = 100) String material,
    @Min(1900) @Max(2100) Integer year,
    @Size(max = 500) String coverImage,
    ImageCrop coverCrop,
    @Size(max = 50) List<GalleryImage> gallery,
    @Size(max = 1000) String shortDescription,
    @Size(max = 10000) String description,
    @Size(max = 20) List<String> dimensions,
    @Size(max = 200) String designer,
    boolean featured,
    boolean showStoryLink,
    boolean showStoryButton,
    List<Slide> slides,
    @Size(max = 30) List<@Size(max = 255) String> tags
) {
}
```

Note : les anciens champs `coverFocalX`, `coverFocalY` sont supprimés. `gallery` passe de `List<String>` à `List<GalleryImage>`.

- [ ] **Step 3 : Modifier `FurnitureService` — propager crop + gallery items**

Dans `toDto(entity)` :

```java
private static Furniture toDto(FurnitureEntity entity) {
    ImageCrop coverCrop = buildCrop(entity.getCoverCropX(), entity.getCoverCropY(),
                                    entity.getCoverCropW(), entity.getCoverCropH());
    List<GalleryImage> gallery = entity.getGallery().stream()
            .map(e -> new GalleryImage(e.getUrl(), buildCrop(e.getCropX(), e.getCropY(), e.getCropW(), e.getCropH())))
            .toList();
    return new Furniture(
            entity.getId(),
            entity.getTitle(),
            entity.getSlug(),
            entity.getCategory(),
            entity.getMaterial(),
            entity.getYear(),
            entity.getCoverImage(),
            coverCrop,
            gallery,
            entity.getShortDescription(),
            entity.getDescription(),
            List.copyOf(entity.getDimensions()),
            entity.getDesigner(),
            entity.isFeatured(),
            entity.isShowStoryLink(),
            entity.isShowStoryButton(),
            List.of(),
            List.copyOf(entity.getTags())
    );
}

private static ImageCrop buildCrop(Double x, Double y, Double w, Double h) {
    if (x == null && y == null && w == null && h == null) return null;
    return new ImageCrop(x, y, w, h);
}
```

Dans `applyChanges(entity, input)` :

- Remplacer les anciennes lignes `entity.setCoverFocalX(...)` / `entity.setCoverFocalY(...)` par 4 setters crop :

```java
ImageCrop c = input.coverCrop();
entity.setCoverCropX(c != null ? c.x() : null);
entity.setCoverCropY(c != null ? c.y() : null);
entity.setCoverCropW(c != null ? c.w() : null);
entity.setCoverCropH(c != null ? c.h() : null);
```

- Adapter la propagation de `gallery` (était `addAll(new ArrayList<>(input.gallery()))` sur `List<String>`) :

```java
if (input.gallery() != null) {
    entity.getGallery().clear();
    for (GalleryImage gi : input.gallery()) {
        GalleryEntry ge = new GalleryEntry(gi.url());
        if (gi.crop() != null) {
            ge.setCropX(gi.crop().x());
            ge.setCropY(gi.crop().y());
            ge.setCropW(gi.crop().w());
            ge.setCropH(gi.crop().h());
        }
        entity.getGallery().add(ge);
    }
}
```

Dans `findBySlug` (qui reconstruit un nouveau record avec les slides), adapter aussi (ajouter `base.coverCrop()` et `base.gallery()`).

- [ ] **Step 4 : Compile + fix tous les sites de construction `new Furniture(...)`**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test-compile 2>&1 | grep -E "ERROR|cannot find" | head
```

Pour chaque site cassé : ajouter `null` pour `coverCrop` (à la position correspondante) ET remplacer les éventuels `List.of()` ou listes de String pour `gallery` par des `List<GalleryImage>`. Si la gallery est passée vide (`List.of()`), pas de changement.

Exemple typique pour un test :
```java
new Furniture("f1", "Titre", "slug", "Cat", "mat", 2024, "/c.jpg",
              null,                                  // coverCrop
              List.of(new GalleryImage("/g.jpg", null)),  // gallery
              "short", "desc", List.of(), "designer", false, true, true, List.of(), List.of())
```

- [ ] **Step 5 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | tail -3
```

Attendu : `BUILD SUCCESS`. Si des assertions tombent (ex. ancien test qui vérifiait `coverFocalX`), supprimer/adapter ces assertions.

- [ ] **Step 6 : Ajouter 2 tests dans `FurnitureServiceTest`**

```java
@Test
void create_avec_crop_persiste_et_relit_les_4_coords() {
    Furniture input = new Furniture(null, "T", null, "Cat", "mat", 2024, "/c.jpg",
        new ImageCrop(10.0, 20.0, 60.0, 40.0),
        List.of(), "s", "d", List.of(), "des", false, true, true, List.of(), List.of());
    Furniture created = furnitureService.create(input);
    Furniture reloaded = furnitureService.findBySlug(created.slug()).orElseThrow();
    assertThat(reloaded.coverCrop()).isNotNull();
    assertThat(reloaded.coverCrop().x()).isEqualTo(10.0);
    assertThat(reloaded.coverCrop().w()).isEqualTo(60.0);
}

@Test
void create_avec_gallery_items_persiste_crop_par_item() {
    Furniture input = new Furniture(null, "T2", null, "Cat", "mat", 2024, "/c.jpg",
        null,
        List.of(new GalleryImage("/g1.jpg", new ImageCrop(0.0, 0.0, 50.0, 50.0)),
                new GalleryImage("/g2.jpg", null)),
        "s", "d", List.of(), "des", false, true, true, List.of(), List.of());
    Furniture created = furnitureService.create(input);
    Furniture reloaded = furnitureService.findBySlug(created.slug()).orElseThrow();
    assertThat(reloaded.gallery()).hasSize(2);
    assertThat(reloaded.gallery().get(0).crop().w()).isEqualTo(50.0);
    assertThat(reloaded.gallery().get(1).crop()).isNull();
}
```

Run :
```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | tail -3
```

- [ ] **Step 7 : Commit**

```powershell
git add backend/src/main/java/com/atelier/portfolio/entity/FurnitureEntity.java backend/src/main/java/com/atelier/portfolio/model/Furniture.java backend/src/main/java/com/atelier/portfolio/service/FurnitureService.java backend/src/test/java/com/atelier/portfolio/
git commit -m "feat(crop): Furniture entity+record+service avec coverCrop et gallery items typed"
```

---

## Task 3 : Refactor ExhibitionEntity + record Exhibition + service + tests

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/ExhibitionEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Exhibition.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java`
- Modify: sites consommateurs

- [ ] **Step 1 : Modifier `ExhibitionEntity`**

Mêmes opérations que Task 2 Step 1 mais sur `ExhibitionEntity` : drop focal, add 4 crop fields, change `gallery` à `List<GalleryEntry>`. Adapter `@CollectionTable(name = "exhibition_gallery", joinColumns = @JoinColumn(name = "exhibition_id"))`.

- [ ] **Step 2 : Modifier record `Exhibition`**

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
    ImageCrop coverCrop,
    @Size(max = 50) List<GalleryImage> gallery,
    @Size(max = 200) String curator,
    @Size(max = 1000) String shortDescription,
    @Size(max = 10000) String description,
    @Size(max = 30) List<String> tags,
    boolean featured,
    boolean showStoryLink,
    boolean showStoryButton,
    List<Slide> slides
) {}
```

Note : les anciens `coverFocalX/Y` sont droppés. `coverCrop` est inséré juste après `coverImage`. `gallery` passe à `List<GalleryImage>`.

- [ ] **Step 3 : Modifier `ExhibitionService`**

Calquer Task 2 Step 3 : `buildCrop` helper, propagation dans `toDto` + `applyChanges` + `findBySlug`.

- [ ] **Step 4 : Compile + fix tous les sites `new Exhibition(...)`**

Pareil que Task 2 Step 4 mais sur Exhibition. Ajouter `null` pour `coverCrop`, adapter `gallery` à `List<GalleryImage>`.

- [ ] **Step 5 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | tail -3
```

Attendu : `BUILD SUCCESS`.

- [ ] **Step 6 : Ajouter 2 tests dans `ExhibitionServiceTest` (symétriques à Furniture)**

Mêmes tests : `create_avec_crop_persiste`, `create_avec_gallery_items_persiste_crop_par_item`. Run :
```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn -Dtest=ExhibitionServiceTest test 2>&1 | tail -3
```

- [ ] **Step 7 : Commit**

```powershell
git add backend/src/main/java/com/atelier/portfolio/entity/ExhibitionEntity.java backend/src/main/java/com/atelier/portfolio/model/Exhibition.java backend/src/main/java/com/atelier/portfolio/service/ExhibitionService.java backend/src/test/java/
git commit -m "feat(crop): Exhibition entity+record+service avec coverCrop et gallery items typed"
```

---

## Task 4 : StoryEntity + record Story + StoryService + AdminStoryController + tests

**Files:**
- Modify: `backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/model/Story.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/service/StoryService.java`
- Modify: `backend/src/main/java/com/atelier/portfolio/controller/AdminStoriesController.java` (si nécessaire — vérifier où Story est sérialisé entrée/sortie)
- Modify: sites consommateurs (tests notamment)

- [ ] **Step 1 : Ajouter 4 champs crop dans `StoryEntity`**

Sous le champ `coverImage`, ajouter :

```java
@Column(name = "cover_crop_x") private Double coverCropX;
@Column(name = "cover_crop_y") private Double coverCropY;
@Column(name = "cover_crop_w") private Double coverCropW;
@Column(name = "cover_crop_h") private Double coverCropH;
```

Avec getters/setters.

- [ ] **Step 2 : Ajouter `coverCrop` au record `Story`**

Lire `backend/src/main/java/com/atelier/portfolio/model/Story.java` puis ajouter `ImageCrop coverCrop` juste après `String coverImage` :

```java
public record Story(
    String id,
    String ownerKind,
    String ownerId,
    String title,
    String coverImage,
    ImageCrop coverCrop,
    String slug,
    int position,
    String createdAt
) {}
```

(Adapter l'ordre exact si différent — l'important est que `coverCrop` suive `coverImage`.)

- [ ] **Step 3 : Propager dans `StoryService.toDto` et `applyChanges`/save**

Trouver les méthodes équivalentes dans StoryService :
```powershell
grep -n "new Story(" backend/src/main/java/com/atelier/portfolio/service/StoryService.java
```

Pour chaque construction, ajouter le crop via `buildCrop(entity.getCoverCropX(), ...)` (helper local ou static dans le service). Pour les save/update : si la méthode prend une `Story` en entrée, propager les 4 setters.

- [ ] **Step 4 : Compile + fix sites `new Story(...)`**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test-compile 2>&1 | grep ERROR | head
```

Ajouter `null` pour `coverCrop` partout (tests notamment).

- [ ] **Step 5 : Test propagation crop story**

Dans `StoryServiceTest` (ou créer si manquant) :

```java
@Test
void create_avec_crop_persiste_et_relit_les_4_coords() {
    Story input = new Story(null, "furniture", "f-001", "T", "/c.jpg",
        new ImageCrop(5.0, 10.0, 80.0, 60.0),
        null, 0, null);
    Story created = storyService.create(input);
    Story reloaded = storyService.findById(created.id()).orElseThrow();
    assertThat(reloaded.coverCrop()).isNotNull();
    assertThat(reloaded.coverCrop().w()).isEqualTo(80.0);
}
```

Adapter l'API exacte au StoryService réel.

- [ ] **Step 6 : Run la suite complète**

```powershell
docker compose -f docker-compose.test.yml run --rm backend-test mvn test 2>&1 | tail -3
```

Attendu : `BUILD SUCCESS`.

- [ ] **Step 7 : Commit**

```powershell
git add backend/src/main/java/com/atelier/portfolio/entity/StoryEntity.java backend/src/main/java/com/atelier/portfolio/model/Story.java backend/src/main/java/com/atelier/portfolio/service/StoryService.java backend/src/main/java/com/atelier/portfolio/controller/ backend/src/test/java/
git commit -m "feat(crop): Story coverCrop sur entity/record/service + tests"
```

---

## Task 5 : Modèles TypeScript Crop + GalleryItem + MAJ Furniture/Exhibition/Story

**Files:**
- Create: `frontend/src/app/models/crop.model.ts`
- Create: `frontend/src/app/models/gallery-item.model.ts`
- Modify: `frontend/src/app/models/furniture.model.ts`
- Modify: `frontend/src/app/models/exhibition.model.ts`
- Modify: `frontend/src/app/models/story.model.ts`

- [ ] **Step 1 : Créer `crop.model.ts`**

```ts
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

- [ ] **Step 2 : Créer `gallery-item.model.ts`**

```ts
import { Crop } from './crop.model';

export interface GalleryItem {
  url: string;
  crop?: Crop | null;
}
```

- [ ] **Step 3 : MAJ `furniture.model.ts`**

- Supprimer `coverFocalX?: number | null` et `coverFocalY?: number | null`.
- Ajouter `coverCrop?: Crop | null` juste après `coverImage`.
- Changer `gallery: string[]` en `gallery: GalleryItem[]`.

```ts
import { GalleryItem } from './gallery-item.model';
import { Crop } from './crop.model';

export interface Furniture {
  // … champs identiques jusqu'à coverImage
  coverImage: string;
  coverCrop?: Crop | null;
  gallery: GalleryItem[];
  // …
}
```

- [ ] **Step 4 : MAJ `exhibition.model.ts`**

Mêmes opérations, sur Exhibition :
- drop `coverFocalX/Y`
- add `coverCrop?: Crop | null`
- change `gallery: GalleryItem[]`

- [ ] **Step 5 : MAJ `story.model.ts`**

Ajouter `coverCrop?: Crop | null` après `coverImage`. Pas de focal point existant sur story, pas de drop.

- [ ] **Step 6 : Compile TS pour repérer toutes les casses**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -20
```

Identifier tous les fichiers qui consomment `.gallery` (était `string[]`, devient `GalleryItem[]`). À traiter dans la task 6 suivante.

- [ ] **Step 7 : Commit**

```powershell
git add frontend/src/app/models/
git commit -m "feat(crop): interfaces TS Crop + GalleryItem + MAJ Furniture/Exhibition/Story"
```

---

## Task 6 : Adapter consommateurs `gallery: string[]` → `GalleryItem[]`

**Files:**
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts` (template `f.gallery` itère sur strings)
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/gallery-editor.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: tous les .spec et fixtures e2e

- [ ] **Step 1 : Lister tous les sites cassés**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error TS" | head -40
```

Pour chaque erreur : si une expression `f.gallery` ou `e.gallery` est traitée comme `string[]`, refactor minimal pour gérer `GalleryItem[]`. Exemples typiques :
- Template `@for (img of f.gallery; track img)` avec `<img [src]="img" ...>` → devient `<img [src]="img.url" ...>` et track sur `img.url`.
- Form admin : `this.fb.array<string>(...)` → `this.fb.array<GalleryItem>(...)`. Adapter helper add/remove.

- [ ] **Step 2 : Refactor furniture-detail template**

Dans le bloc `@for (img of f.gallery; track img; let i = $index)` :

```html
@for (img of f.gallery; track img.url; let i = $index) {
  <figure [class.tall]="i % 3 === 0">
    <img [src]="img.url" [alt]="f.title + ' — vue ' + (i + 1)" loading="lazy" />
  </figure>
}
```

(Sans crop pour l'instant — l'affichage du crop arrive en Task 12.)

- [ ] **Step 3 : Refactor exhibition-detail template**

Idem :

```html
@for (img of e.gallery; track img.url; let i = $index) {
  <figure [class.wide]="i === 0">
    <img [src]="img.url" [alt]="e.title + ' — vue ' + (i + 1)" loading="lazy" />
  </figure>
}
```

- [ ] **Step 4 : Refactor gallery-editor + admin forms**

Dans `gallery-editor.component.ts`, partout où on traite la liste d'URL : adapter pour `GalleryItem`. Les méthodes `addImage(url: string)` doivent devenir `addImage(url: string)` → push `{ url, crop: null }`. Les méthodes `removeAt(index)` ne changent pas. Les emit / output emit `GalleryItem[]`.

Dans `mobilier.component.ts` et `expositions.component.ts`, là où le formulaire patche `gallery`, accepter `GalleryItem[]`.

- [ ] **Step 5 : Adapter mocks et fixtures**

Dans `portfolio.service.spec.ts` et autres specs : remplacer `gallery: ['/a.jpg', '/b.jpg']` par `gallery: [{ url: '/a.jpg' }, { url: '/b.jpg' }]`.

Dans `frontend/e2e/fixtures/furniture-detail.json` et `exhibition-detail.json` : si la fixture a `"gallery": ["...", "..."]`, remplacer par `"gallery": [{"url": "..."}, {"url": "..."}]`.

- [ ] **Step 6 : Run tests frontend**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -8
```

Attendu : tous passent. Fix au cas par cas si certaines assertions sur `gallery` doivent être mises à jour.

- [ ] **Step 7 : Commit**

```powershell
git add frontend/src/ frontend/e2e/fixtures/
git commit -m "refactor(crop): adapter consommateurs gallery string[] -> GalleryItem[]"
```

---

## Task 7 : Install Cropper.js + ADR + CLAUDE.md

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`
- Create: `docs/adr/0017-cropperjs-image-crop-tool.md`
- Modify: `CLAUDE.md` (section Conventions)

- [ ] **Step 1 : Install cropperjs**

```powershell
cd "c:/Users/Utilisateur/Project/Application Web/Application-Web/frontend"
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/work" -w /work node:20-alpine npm install cropperjs@1.6.2 --save --no-audit
cd ..
```

Vérifier `package.json` :
```ts
"dependencies": {
  // …
  "cropperjs": "^1.6.2"
}
```

- [ ] **Step 2 : Créer l'ADR 0017**

```markdown
# 17. Cropper.js pour l'outil de cadrage d'image admin

Date : 2026-06-07
Statut : Accepté

## Contexte

L'admin a besoin d'un outil de cropping pixel-perfect pour les covers (mobilier, exposition, story) et items de galerie. Le focal point précédent (X/Y simples) ne suffisait pas pour décrire un rendu précis.

## Décision

Utiliser **Cropper.js 1.6.x** (lib JS standalone, ~50KB gzipped) wrappée dans un composant Angular standalone `<app-image-crop-picker>`. Première lib UI tierce du projet.

## Conséquences

- (+) Mature, supportée, fonctionnalités natives (touch, clavier, présets aspect ratio, zoom).
- (+) Évite de réinventer une UI de crop avec edge cases (touch, snap, accessibilité).
- (-) Première lib UI dans le projet. Tous les composants UI existants sont signals + standalone Angular natif.
- (-) +50KB sur le bundle admin (lazy chunk). Acceptable, admin pas critique pour SEO.
- (-) Cropper.js n'a pas de wrapper Angular maintenu : on l'instancie manuellement dans `ngAfterViewInit` + cleanup dans `ngOnDestroy`.

## Alternatives écartées

- Custom : 200-300 LOC pour reproduire Cropper.js correctement. Surface bugs touch + a11y trop importante.
- ngx-image-cropper : wrapper Angular existant mais 2 dépendances au lieu d'une.
```

- [ ] **Step 3 : Ajouter mention dans CLAUDE.md**

Sous la section `## Conventions`, ajouter une ligne :

```md
- **Outil de crop d'image** : `<app-image-crop-picker>` (admin) wrap Cropper.js 1.6 ; voir ADR-0017. Première lib UI tierce du projet.
```

- [ ] **Step 4 : Commit**

```powershell
git add frontend/package.json frontend/package-lock.json docs/adr/0017-cropperjs-image-crop-tool.md CLAUDE.md
git commit -m "feat(crop): install cropperjs + ADR-0017"
```

---

## Task 8 : Utilitaire `cropTransform()` + tests

**Files:**
- Create: `frontend/src/app/utils/crop-transform.ts`
- Create: `frontend/src/app/utils/crop-transform.spec.ts`

- [ ] **Step 1 : Écrire les tests**

```ts
import { cropTransform } from './crop-transform';

describe('cropTransform', () => {
  it('retourne transform "none" pour crop null/undefined', () => {
    expect(cropTransform(null).transform).toBe('none');
    expect(cropTransform(undefined).transform).toBe('none');
  });

  it('retourne transform "none" si w ou h est 0', () => {
    expect(cropTransform({ x: 0, y: 0, w: 0, h: 50 }).transform).toBe('none');
    expect(cropTransform({ x: 0, y: 0, w: 50, h: 0 }).transform).toBe('none');
  });

  it('crop 50x50 au milieu : scale 2, translate -50% -50%', () => {
    const r = cropTransform({ x: 25, y: 25, w: 50, h: 50 });
    expect(r.transform).toBe('translate(-50%, -50%) scale(2)');
    expect(r.transformOrigin).toBe('0% 0%');
  });

  it('crop 100x100 (image entiere) : scale 1, translate 0 0', () => {
    const r = cropTransform({ x: 0, y: 0, w: 100, h: 100 });
    expect(r.transform).toBe('translate(0%, 0%) scale(1)');
  });

  it('crop large 80x40 (16:9 dans portrait) : scale = max(125, 250) = 2.5, translate selon scale', () => {
    const r = cropTransform({ x: 10, y: 30, w: 80, h: 40 });
    expect(r.transform).toBe('translate(-25%, -75%) scale(2.5)');
  });

  it('crop tall 40x80 (4:5 dans landscape) : scale = max(250, 125) = 2.5', () => {
    const r = cropTransform({ x: 30, y: 10, w: 40, h: 80 });
    expect(r.transform).toBe('translate(-75%, -25%) scale(2.5)');
  });

  it('renvoie transform-origin 0% 0% systematiquement', () => {
    expect(cropTransform({ x: 5, y: 5, w: 10, h: 10 }).transformOrigin).toBe('0% 0%');
  });
});
```

- [ ] **Step 2 : Run les tests (doivent échouer)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/crop-transform.spec.ts'
```

- [ ] **Step 3 : Implémenter `crop-transform.ts`**

```ts
import { Crop } from '../models/crop.model';

export interface CropStyle {
  transform: string;
  transformOrigin: string;
}

const NEUTRAL: CropStyle = { transform: 'none', transformOrigin: '0% 0%' };

export function cropTransform(crop: Crop | null | undefined): CropStyle {
  if (!crop || !crop.w || !crop.h) return NEUTRAL;
  const { x, y, w, h } = crop;
  // Cover : on prend le plus grand des deux scales pour remplir le conteneur.
  const scale = Math.max(100 / w, 100 / h);
  // Translation en % de l'element (image, rendue a 100% du conteneur).
  const tx = -x * scale;
  const ty = -y * scale;
  return {
    transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
    transformOrigin: '0% 0%',
  };
}
```

- [ ] **Step 4 : Run les tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/crop-transform.spec.ts'
```

Attendu : 7 tests passants.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/utils/crop-transform.ts frontend/src/app/utils/crop-transform.spec.ts
git commit -m "feat(crop): utilitaire cropTransform calcul transform CSS"
```

---

## Task 9 : Composant `<app-image-crop-picker>` + tests

**Files:**
- Create: `frontend/src/app/pages/admin/shared/image-crop-picker.component.ts`
- Create: `frontend/src/app/pages/admin/shared/image-crop-picker.component.spec.ts`

- [ ] **Step 1 : Écrire les tests (subset, le reste viendra après)**

Créer `image-crop-picker.component.spec.ts` avec les tests basiques de l'API :

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageCropPickerComponent } from './image-crop-picker.component';

describe('ImageCropPickerComponent', () => {
  let fixture: ComponentFixture<ImageCropPickerComponent>;
  let cmp: ImageCropPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImageCropPickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(ImageCropPickerComponent);
    cmp = fixture.componentInstance;
    fixture.componentRef.setInput('imageUrl', 'https://example.com/test.jpg');
  });

  it('cree le composant', () => {
    fixture.detectChanges();
    expect(cmp).toBeTruthy();
  });

  it('affiche les boutons Annuler et Valider', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Annuler');
    expect(text).toContain('Valider');
  });

  it('emet (cancelled) au clic Annuler', () => {
    fixture.detectChanges();
    let emitted = false;
    cmp.cancelled.subscribe(() => emitted = true);
    const btn = fixture.nativeElement.querySelector('.btn-cancel') as HTMLButtonElement;
    btn.click();
    expect(emitted).toBeTrue();
  });

  it('expose les presets aspect 16:9, 4:5, 1:1, libre par defaut', () => {
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('select.aspect-select option'))
      .map((o: any) => o.textContent.trim());
    expect(options).toContain('16:9');
    expect(options).toContain('4:5');
    expect(options).toContain('1:1');
    expect(options).toContain('Libre');
  });

  it('emet le crop normalise au clic Valider', (done) => {
    fixture.detectChanges();
    cmp.validated.subscribe(crop => {
      expect(crop).toBeTruthy();
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.x).toBeLessThanOrEqualTo(100);
      done();
    });
    // Simuler l'etat Cropper via stub (les vrais tests Cropper sont en validation manuelle).
    (cmp as any).currentCrop = { x: 10, y: 20, w: 50, h: 40 };
    const btn = fixture.nativeElement.querySelector('.btn-validate') as HTMLButtonElement;
    btn.click();
  });
});
```

- [ ] **Step 2 : Run tests (échec attendu)**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/image-crop-picker.component.spec.ts'
```

- [ ] **Step 3 : Implémenter `<app-image-crop-picker>`**

```ts
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { Crop } from '../../../models/crop.model';

export interface AspectRatio { label: string; value: number; }

export const DEFAULT_ASPECT_RATIOS: AspectRatio[] = [
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
  { label: '1:1', value: 1 },
  { label: 'Libre', value: NaN },
];

@Component({
  selector: 'app-image-crop-picker',
  standalone: true,
  imports: [A11yModule],
  template: `
    <div class="crop-backdrop" role="presentation" (click)="cancel()">
      <div class="crop-panel"
           role="dialog"
           aria-modal="true"
           aria-labelledby="crop-title"
           cdkTrapFocus
           cdkTrapFocusAutoCapture
           (click)="$event.stopPropagation()">
        <header class="crop-head">
          <h3 id="crop-title">Ajuster le cadrage</h3>
          <button type="button" class="crop-close" (click)="cancel()" aria-label="Fermer">×</button>
        </header>

        <div class="crop-controls">
          <label>
            <span>Aspect :</span>
            <select class="aspect-select" (change)="onAspectChange($event)">
              @for (a of aspectRatios; track a.label) {
                <option [value]="a.label">{{ a.label }}</option>
              }
            </select>
          </label>
          <button type="button" class="btn-reset" (click)="resetCrop()">Réinitialiser</button>
        </div>

        <div class="crop-stage">
          <img #cropImage [src]="imageUrl" alt="" />
        </div>

        <footer class="crop-foot">
          @if (currentCrop) {
            <span class="crop-coords">
              X {{ currentCrop.x.toFixed(0) }}% · Y {{ currentCrop.y.toFixed(0) }}% · L {{ currentCrop.w.toFixed(0) }}% · H {{ currentCrop.h.toFixed(0) }}%
            </span>
          }
          <div class="actions">
            <button type="button" class="btn-cancel" (click)="cancel()">Annuler</button>
            <button type="button" class="btn-validate" (click)="validate()">Valider le crop</button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .crop-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1100;
                     display: flex; align-items: center; justify-content: center; padding: 24px; }
    .crop-panel { background: var(--color-bg); width: 100%; max-width: 900px; max-height: 90vh;
                  display: flex; flex-direction: column; }
    .crop-head { display: flex; align-items: center; justify-content: space-between;
                 padding: 18px 24px; border-bottom: 1px solid var(--color-line); }
    .crop-close { background: transparent; border: 0; font-size: 1.5rem; cursor: pointer; color: var(--color-mute); }
    .crop-controls { padding: 16px 24px; display: flex; gap: 16px; align-items: center;
                     border-bottom: 1px solid var(--color-line); }
    .crop-controls label { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; }
    .aspect-select { padding: 6px 10px; border: 1px solid var(--color-line); background: var(--color-bg);
                     color: var(--color-ink); font: inherit; }
    .btn-reset { padding: 6px 14px; background: var(--color-bg); border: 1px solid var(--color-line);
                 font-size: 0.78rem; cursor: pointer; color: var(--color-ink-soft); }
    .crop-stage { flex: 1; padding: 16px 24px; overflow: hidden; min-height: 400px; }
    .crop-stage img { display: block; max-width: 100%; }
    .crop-foot { padding: 16px 24px; border-top: 1px solid var(--color-line);
                 display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .crop-coords { font-size: 0.78rem; color: var(--color-mute); font-family: ui-monospace, monospace; }
    .actions { display: inline-flex; gap: 12px; }
    .btn-cancel { padding: 10px 20px; background: var(--color-bg); border: 1px solid var(--color-line);
                  font-size: 0.85rem; cursor: pointer; color: var(--color-ink); letter-spacing: 0.06em;
                  text-transform: uppercase; }
    .btn-validate { padding: 10px 24px; background: var(--color-ink); color: var(--color-bg);
                    border: 0; font-size: 0.85rem; cursor: pointer; letter-spacing: 0.06em;
                    text-transform: uppercase; }
  `]
})
export class ImageCropPickerComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) imageUrl!: string;
  @Input() initialCrop: Crop | null = null;
  @Input() aspectRatios = DEFAULT_ASPECT_RATIOS;

  @Output() validated = new EventEmitter<Crop>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('cropImage') cropImage!: ElementRef<HTMLImageElement>;

  protected currentCrop: Crop | null = null;
  private cropper?: Cropper;

  ngAfterViewInit(): void {
    const img = this.cropImage.nativeElement;
    img.onload = () => this.initCropper(img);
    if (img.complete) this.initCropper(img);
  }

  private initCropper(img: HTMLImageElement): void {
    if (this.cropper) return;
    this.cropper = new Cropper(img, {
      viewMode: 1,
      aspectRatio: this.aspectRatios[0].value,
      autoCropArea: 1,
      background: false,
      crop: (event) => this.onCrop(event.detail),
      ready: () => {
        if (this.initialCrop) {
          this.applyInitialCrop(this.initialCrop);
        }
      },
    });
  }

  private applyInitialCrop(crop: Crop): void {
    const img = this.cropImage.nativeElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    this.cropper!.setData({
      x: (crop.x / 100) * w,
      y: (crop.y / 100) * h,
      width: (crop.w / 100) * w,
      height: (crop.h / 100) * h,
    });
  }

  private onCrop(detail: Cropper.Data): void {
    const img = this.cropImage.nativeElement;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    this.currentCrop = {
      x: (detail.x / w) * 100,
      y: (detail.y / h) * 100,
      w: (detail.width / w) * 100,
      h: (detail.height / h) * 100,
    };
  }

  protected onAspectChange(event: Event): void {
    const label = (event.target as HTMLSelectElement).value;
    const ar = this.aspectRatios.find(a => a.label === label);
    if (ar && this.cropper) this.cropper.setAspectRatio(ar.value);
  }

  protected resetCrop(): void {
    if (this.cropper) this.cropper.reset();
  }

  protected validate(): void {
    if (this.currentCrop) this.validated.emit(this.currentCrop);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  ngOnDestroy(): void {
    this.cropper?.destroy();
  }
}
```

- [ ] **Step 4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/image-crop-picker.component.spec.ts'
```

Attendu : tous passent. Si Cropper.js casse Karma (TypeError sur DOM), stubber `Cropper` dans le test ou utiliser `(cmp as any).cropper = ...` mocks.

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/image-crop-picker.component.ts frontend/src/app/pages/admin/shared/image-crop-picker.component.spec.ts
git commit -m "feat(crop): composant <app-image-crop-picker> wrap Cropper.js"
```

---

## Task 10 : Étendre `<app-image-field>` avec bouton "Cadrer"

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/image-field.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/image-field.component.spec.ts`

- [ ] **Step 1 : Adapter le composant**

Ajouter Inputs `cropEnabled` (boolean, default false) et `cropValue` (Crop | null) + Output `cropChange`. Quand cropEnabled, afficher un bouton « Cadrer » à côté de "Médiathèque". Clic ouvre la modale `<app-image-crop-picker>`.

```ts
// imports
import { Crop } from '../../../models/crop.model';
import { ImageCropPickerComponent } from './image-crop-picker.component';
// …
@Component({
  selector: 'app-image-field',
  imports: [PhotoPickerComponent, ImageCropPickerComponent],
  template: `
    <div class="image-field">
      <label>
        <span>{{ label }}</span>
        <div class="image-field-row">
          <input type="url" [value]="value()" [disabled]="disabled()" (input)="onInput($event)" (blur)="onTouched()" />
          <button type="button" class="btn-pick" [disabled]="disabled()" (click)="openPicker()">Médiathèque</button>
          @if (cropEnabled) {
            <button type="button" class="btn-pick" [disabled]="disabled() || !value()" (click)="openCrop()">Cadrer</button>
          }
        </div>
      </label>
    </div>

    @if (pickerOpen()) {
      <app-photo-picker target="cover" [photos]="photos()" (selected)="onSelected($event)" (closed)="pickerOpen.set(false)" />
    }
    @if (cropOpen()) {
      <app-image-crop-picker
        [imageUrl]="value()"
        [initialCrop]="cropValue ?? null"
        (validated)="onCropValidated($event)"
        (cancelled)="cropOpen.set(false)" />
    }
  `,
  // styles inchangés
})
export class ImageFieldComponent implements ControlValueAccessor {
  @Input() cropEnabled = false;
  @Input() cropValue: Crop | null = null;
  @Output() cropChange = new EventEmitter<Crop | null>();

  protected readonly cropOpen = signal(false);
  // …

  protected openCrop(): void { this.cropOpen.set(true); }

  protected onCropValidated(crop: Crop): void {
    this.cropChange.emit(crop);
    this.cropOpen.set(false);
  }
}
```

- [ ] **Step 2 : Ajouter 2 tests**

```ts
it('affiche le bouton Cadrer quand cropEnabled=true et URL definie', () => {
  fixture.componentRef.setInput('cropEnabled', true);
  // ... patch value ...
  fixture.detectChanges();
  const btn = fixture.nativeElement.querySelector('button:last-child');
  expect(btn.textContent).toContain('Cadrer');
  expect(btn.disabled).toBeFalse();
});

it('emet cropChange quand crop validate', () => {
  fixture.componentRef.setInput('cropEnabled', true);
  // …
  let emitted: Crop | null = null;
  cmp.cropChange.subscribe(c => emitted = c);
  (cmp as any).onCropValidated({ x: 10, y: 20, w: 50, h: 40 });
  expect(emitted).toEqual({ x: 10, y: 20, w: 50, h: 40 });
});
```

- [ ] **Step 3 : Run tests image-field**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/image-field.component.spec.ts'
```

- [ ] **Step 4 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/image-field.component.ts frontend/src/app/pages/admin/shared/image-field.component.spec.ts
git commit -m "feat(crop): bouton Cadrer dans <app-image-field> (opt-in via cropEnabled)"
```

---

## Task 11 : Brancher crop cover dans admin mobilier + expositions

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.spec.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.spec.ts`

- [ ] **Step 1 : Mobilier — drop focal point picker + branche crop**

Dans `mobilier.component.ts` :
- Supprimer l'import et l'usage de `FocalPointPickerComponent`.
- Supprimer les FormControls `coverFocalX`, `coverFocalY` et la méthode `onFurnitureFocalChange`.
- Ajouter `coverCrop: this.fb.control<Crop | null>(null)` au form group.
- Dans le template, là où le picker focal était (sous `coverImage` field), remplacer par `[cropEnabled]="true"` + `[cropValue]="furnitureForm.get('coverCrop')?.value"` + `(cropChange)="onCoverCropChange($event)"` sur l'`<app-image-field>` cover.
- Ajouter la méthode `onCoverCropChange(c: Crop | null) { this.furnitureForm.patchValue({ coverCrop: c }); }`.
- Dans `loadFurniture`, patcher `coverCrop: item.coverCrop ?? null`.
- Dans `saveFurniture` payload, inclure `coverCrop` (via `getRawValue()`).

- [ ] **Step 2 : Idem pour Expositions**

Symétrique sur `expositions.component.ts`.

- [ ] **Step 3 : Tests admin mobilier**

Adapter `mobilier.component.spec.ts` :
- Supprimer les anciens tests focal point.
- Adapter `flushInitial` (s'il faisait un flush focal point).
- Ajouter 2 tests :
  - `onCoverCropChange patche le form value`
  - `saveFurniture inclut coverCrop dans le payload`

```ts
it('onCoverCropChange patche coverCrop dans le form', () => {
  const cmp = fixture.componentInstance as any;
  cmp.onCoverCropChange({ x: 10, y: 20, w: 50, h: 40 });
  expect(cmp.furnitureForm.value.coverCrop).toEqual({ x: 10, y: 20, w: 50, h: 40 });
});
```

- [ ] **Step 4 : Tests admin expositions (symétrique)**

- [ ] **Step 5 : Run tests admin**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/admin/mobilier/**' --include='**/admin/expositions/**'
```

- [ ] **Step 6 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/ frontend/src/app/pages/admin/expositions/
git commit -m "feat(crop): cover crop mobilier+expo via <app-image-field> cropEnabled"
```

---

## Task 12 : Étendre `<app-gallery-editor>` pour crop par item

**Files:**
- Modify: `frontend/src/app/pages/admin/shared/gallery-editor.component.ts`
- Modify: `frontend/src/app/pages/admin/shared/gallery-editor.component.spec.ts`

- [ ] **Step 1 : Refactor gallery-editor**

Le composant doit maintenant gérer `GalleryItem[]` (déjà préparé en Task 6 partiellement). Ajouter :
- Au hover sur chaque vignette, afficher un bouton overlay « ✂️ » qui ouvre `<app-image-crop-picker>` sur l'URL de l'item.
- Validation patche `items[i].crop` et émet `cropChange` ou `change` global pour notifier le parent.

```ts
// Dans le template
@for (item of items; track item.url; let i = $index) {
  <div class="gallery-thumb">
    <img [src]="item.url" loading="lazy" />
    @if (item.crop) {
      <span class="crop-indicator">Crop {{ item.crop.w.toFixed(0) }}×{{ item.crop.h.toFixed(0) }}</span>
    }
    <button type="button" class="thumb-crop" (click)="openCropFor(i)" aria-label="Cadrer">✂️</button>
    <button type="button" class="thumb-del" (click)="removeAt(i)" aria-label="Supprimer">×</button>
  </div>
}

@if (cropOpenForIndex() !== null) {
  <app-image-crop-picker
    [imageUrl]="items[cropOpenForIndex()!].url"
    [initialCrop]="items[cropOpenForIndex()!].crop ?? null"
    (validated)="onCropValidated($event)"
    (cancelled)="cropOpenForIndex.set(null)" />
}
```

```ts
protected readonly cropOpenForIndex = signal<number | null>(null);

protected openCropFor(i: number) { this.cropOpenForIndex.set(i); }
protected onCropValidated(crop: Crop): void {
  const i = this.cropOpenForIndex();
  if (i === null) return;
  const next = [...this.items];
  next[i] = { ...next[i], crop };
  this.itemsChange.emit(next);
  this.cropOpenForIndex.set(null);
}
```

(Adapter `items`/`itemsChange` au pattern Input/Output existant du gallery-editor.)

- [ ] **Step 2 : Ajouter 2 tests**

```ts
it('openCropFor(i) ouvre la modale crop pour l item i', () => {
  cmp.items = [{ url: '/a.jpg' }, { url: '/b.jpg' }];
  fixture.detectChanges();
  (cmp as any).openCropFor(1);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('app-image-crop-picker')).toBeTruthy();
});

it('onCropValidated patche items[i].crop et emet itemsChange', () => {
  cmp.items = [{ url: '/a.jpg' }];
  (cmp as any).cropOpenForIndex.set(0);
  let emitted: GalleryItem[] | undefined;
  cmp.itemsChange.subscribe(v => emitted = v);
  (cmp as any).onCropValidated({ x: 5, y: 5, w: 90, h: 90 });
  expect(emitted![0].crop).toEqual({ x: 5, y: 5, w: 90, h: 90 });
});
```

- [ ] **Step 3 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/gallery-editor.component.spec.ts'
```

- [ ] **Step 4 : Commit**

```powershell
git add frontend/src/app/pages/admin/shared/gallery-editor.component.ts frontend/src/app/pages/admin/shared/gallery-editor.component.spec.ts
git commit -m "feat(crop): gallery-editor permet de cadrer chaque item"
```

---

## Task 13 : Crop cover story (admin mobilier + expositions)

**Files:**
- Modify: `frontend/src/app/pages/admin/mobilier/mobilier.component.ts`
- Modify: `frontend/src/app/pages/admin/expositions/expositions.component.ts`
- Modify: tests associés

- [ ] **Step 1 : Brancher cropEnabled sur l'`<app-image-field>` de coverEditCtrl story**

Là où l'admin édite le cover d'une story (via `coverEditCtrl` + `<app-image-field>`), ajouter :
- `[cropEnabled]="true"`
- `[cropValue]="editingStoryCoverCrop"` (signal qui contient le crop de la story en cours d'édition)
- `(cropChange)="onStoryCoverCropChange($event)"`

Définir le signal :
```ts
protected readonly editingStoryCoverCrop = signal<Crop | null>(null);
```

Quand l'admin commence à éditer une story, peupler le signal depuis `story.coverCrop`. Quand il sauve, inclure `coverCrop` dans le payload PUT.

- [ ] **Step 2 : Idem expositions.component**

- [ ] **Step 3 : Tests propagation crop story dans payload save**

```ts
it('save story PUT inclut coverCrop dans le body', () => {
  // setup component avec story chargée + crop défini
  (cmp as any).onStoryCoverCropChange({ x: 10, y: 10, w: 80, h: 80 });
  (cmp as any).saveStoryCover();  // ou méthode équivalente
  const req = httpMock.expectOne(r => r.method === 'PUT' && r.url.includes('/stories/'));
  expect(req.request.body.coverCrop).toEqual({ x: 10, y: 10, w: 80, h: 80 });
  req.flush({});
});
```

- [ ] **Step 4 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/admin/mobilier/**' --include='**/admin/expositions/**'
```

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/pages/admin/mobilier/ frontend/src/app/pages/admin/expositions/
git commit -m "feat(crop): cadrer le cover d'une story depuis l'admin (mobilier+expo)"
```

---

## Task 14 : Rendu public furniture-detail (hero + galerie)

**Files:**
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.ts`
- Modify: `frontend/src/app/pages/furniture-detail/furniture-detail.component.spec.ts`

- [ ] **Step 1 : Brancher cropTransform sur hero img**

Dans le template, remplacer :

```html
<img [src]="f.coverImage" [alt]="f.title" [style.object-position]="coverPosition()" />
```

par :

```html
<div class="hero-bg">
  <img [src]="f.coverImage" [alt]="f.title"
       [style.transform]="coverCropStyle().transform"
       [style.transform-origin]="coverCropStyle().transformOrigin" />
</div>
```

(supprimer l'ancienne méthode `coverPosition()` basée sur focal point).

Ajouter `coverCropStyle()` computed :

```ts
import { cropTransform } from '../../utils/crop-transform';

protected readonly coverCropStyle = computed(() => cropTransform(this.item()?.coverCrop));
```

S'assurer que le `.hero-bg` parent a `overflow: hidden`. Vérifier les styles existants.

- [ ] **Step 2 : Brancher cropTransform sur chaque image de galerie**

Dans le template galerie, l'item est maintenant `GalleryItem` :

```html
@for (img of f.gallery; track img.url; let i = $index) {
  <figure [class.tall]="i % 3 === 0">
    <div class="gallery-img-wrap">
      <img [src]="img.url" [alt]="f.title + ' — vue ' + (i + 1)" loading="lazy"
           [style.transform]="galleryItemStyle(img).transform"
           [style.transform-origin]="galleryItemStyle(img).transformOrigin" />
    </div>
  </figure>
}
```

Ajouter méthode :

```ts
protected galleryItemStyle(item: GalleryItem): CropStyle {
  return cropTransform(item.crop);
}
```

CSS pour `.gallery-img-wrap` : `position: relative; overflow: hidden; width: 100%; height: 100%;`. Le `figure` doit avoir des dimensions définies (aspect ratio).

- [ ] **Step 3 : Tests rendu crop**

Ajouter 2 tests dans `furniture-detail.component.spec.ts` :

```ts
it('coverCropStyle() applique transform quand coverCrop est défini', () => {
  setup('onde', of({ ...mockFurniture, coverCrop: { x: 25, y: 25, w: 50, h: 50 } }));
  const fixture = TestBed.createComponent(FurnitureDetailComponent);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  expect(cmp.coverCropStyle().transform).toBe('translate(-50%, -50%) scale(2)');
});

it('coverCropStyle() retourne "none" quand coverCrop est null', () => {
  setup('onde', of({ ...mockFurniture, coverCrop: null }));
  const fixture = TestBed.createComponent(FurnitureDetailComponent);
  fixture.detectChanges();
  const cmp = fixture.componentInstance as any;
  expect(cmp.coverCropStyle().transform).toBe('none');
});
```

- [ ] **Step 4 : Run tests furniture-detail**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/furniture-detail/**'
```

- [ ] **Step 5 : Commit**

```powershell
git add frontend/src/app/pages/furniture-detail/
git commit -m "feat(crop): rendu public furniture-detail hero+galerie via cropTransform"
```

---

## Task 15 : Rendu public exhibition-detail

**Files:**
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.ts`
- Modify: `frontend/src/app/pages/exhibition-detail/exhibition-detail.component.spec.ts`

- [ ] **Step 1 : Symétrique à Task 14 sur exhibition-detail**

Mêmes opérations : `coverCropStyle()` computed, branche sur hero img, `galleryItemStyle()` pour la galerie, CSS overflow hidden sur conteneurs.

- [ ] **Step 2 : Tests rendu (symétrique)**

- [ ] **Step 3 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/exhibition-detail/**'
```

- [ ] **Step 4 : Commit**

```powershell
git add frontend/src/app/pages/exhibition-detail/
git commit -m "feat(crop): rendu public exhibition-detail hero+galerie via cropTransform"
```

---

## Task 16 : Rendu public story-viewer + story-inline + news-slider

**Files:**
- Modify: `frontend/src/app/components/story-viewer/story-viewer.component.ts`
- Modify: `frontend/src/app/components/story-inline/story-inline.component.ts`
- Modify: `frontend/src/app/components/news-slider/news-slider.component.ts`
- Modify: tests associés

- [ ] **Step 1 : story-viewer — appliquer crop sur slide cover**

Dans le template, là où le slide de type `cover` rend une `<img>`, ajouter `[style.transform]` + `[style.transform-origin]` calculés depuis le crop de la story. Le crop de story doit être propagé via les `StoryItem` que le viewer reçoit en queue.

Vérifier que `StoryItem` (modèle TS du viewer) expose `coverCrop?: Crop | null` ou que le slide cover contient un crop.

- [ ] **Step 2 : story-inline — appliquer crop sur cover affiché**

Dans le template, sur l'`<img>` qui affiche le cover de la story, brancher `cropTransform` :

```html
<img [src]="story.coverImage" [alt]="story.title"
     [style.transform]="storyCoverCropStyle().transform"
     [style.transform-origin]="storyCoverCropStyle().transformOrigin" />
```

```ts
protected readonly storyCoverCropStyle = computed(() => cropTransform(this.story()?.coverCrop));
```

(Adapter signature au composant réel.)

- [ ] **Step 3 : news-slider — appliquer crop sur thumb story**

Dans le template du news-slider, chaque card affiche `story.coverImage`. Ajouter le `[style.transform]` + `[style.transform-origin]` calculé depuis `story.coverCrop`.

- [ ] **Step 4 : Tests des 3 composants**

Pour chaque composant, 1-2 tests :
```ts
it('applique cropTransform au cover story quand coverCrop est defini', () => {
  // setup avec story.coverCrop = { x: 10, y: 10, w: 80, h: 80 }
  // expect transform = 'translate(...) scale(...)'
});
```

- [ ] **Step 5 : Run tests**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false --include='**/story-viewer/**' --include='**/story-inline/**' --include='**/news-slider/**'
```

- [ ] **Step 6 : Commit**

```powershell
git add frontend/src/app/components/story-viewer/ frontend/src/app/components/story-inline/ frontend/src/app/components/news-slider/
git commit -m "feat(crop): rendu public story-viewer+story-inline+news-slider via cropTransform"
```

---

## Task 17 : Suppression définitive de focal-point-picker

**Files:**
- Delete: `frontend/src/app/pages/admin/shared/focal-point-picker.component.ts`
- Delete: `frontend/src/app/pages/admin/shared/focal-point-picker.component.spec.ts`
- Modify: vérifier qu'aucune référence ne traîne

- [ ] **Step 1 : Vérifier qu'aucun code ne référence le composant**

```powershell
grep -rn "FocalPointPicker\|focal-point-picker" frontend/src/ 2>&1
```

Si résultats : nettoyer les imports et templates restants.

- [ ] **Step 2 : Supprimer les fichiers**

```powershell
git rm frontend/src/app/pages/admin/shared/focal-point-picker.component.ts frontend/src/app/pages/admin/shared/focal-point-picker.component.spec.ts
```

- [ ] **Step 3 : Run la suite frontend**

```powershell
docker compose -f docker-compose.test.yml run --rm frontend-test npx ng test --watch=false 2>&1 | tail -3
```

Attendu : tous passent.

- [ ] **Step 4 : Commit**

```powershell
git commit -m "chore(crop): suppression de l'ancien <app-focal-point-picker>"
```

---

## Task 18 : Validation visuelle utilisateur + tests Playwright

**Files:**
- Modify: `frontend/e2e/fixtures/furniture-detail.json`, `exhibition-detail.json` (ajouter crop sur 1-2 items)
- Modify: `frontend/e2e/__screenshots__/*.png` (regen après validation)

- [ ] **Step 1 : Build local et validation visuelle**

```powershell
docker compose up --build -d
```

Attendre que ça soit prêt, puis demander à l'utilisateur de :
- Tester l'admin mobilier : édition d'une fiche, bouton Cadrer sur le cover, modale Cropper.js fonctionne, validation persiste.
- Tester l'admin expositions : idem.
- Tester l'édition d'une story : bouton Cadrer sur le cover de story fonctionne.
- Tester gallery-editor : crop par item depuis l'admin.
- Vérifier le rendu public : fiche mobilier (hero + galerie), fiche expo, story-viewer, news-slider.

**Règle projet** : ne PAS régénérer les baselines Playwright avant validation visuelle utilisateur.

- [ ] **Step 2 : Régénérer les baselines (après "ok visuel" utilisateur)**

```powershell
cd frontend
npm run test:visual:docker:update
```

Vérifier que les seuls changements aux baselines existantes sont attendus (les fixtures n'ont pas de crop défini, donc rendu identique). Si les fixtures gagnent des items avec crop, les baselines `furniture-detail` et `exhibition-detail` seront différentes.

- [ ] **Step 3 : Run sans `--update` pour confirmer**

```powershell
npm run test:visual:docker
```

Attendu : tous les tests passent.

- [ ] **Step 4 : Commit**

```powershell
cd ..
git add frontend/e2e/
git commit -m "test(visual): regen baselines apres outil de cadrage (validation utilisateur OK)"
```

---

## Task 19 : finishing-a-development-branch (audits + doc + merge)

- [ ] **Step 1 : Invoquer la skill `superpowers:finishing-a-development-branch`**

Cette skill guide :
- Proposer audits sécurité + RGAA si scope substantiel (ici oui : breaking change DTO + nouveau composant UI + nouveau ADR).
- Proposer MAJ doc : spec technique + ADR-0017 (déjà créé) + CLAUDE.md (déjà MAJ).
- Proposer méthode de merge (PR ou merge local).

Suivre les recommandations de la skill.

- [ ] **Step 2 : Merge final sur main**

Après audits OK + doc à jour :
```powershell
git push -u origin feat/image-crop-tool
git checkout main && git pull origin main
git merge --no-ff feat/image-crop-tool -m "Merge branch 'feat/image-crop-tool': outil de cadrage d'image (crop) — sous-projet 1/4"
git push origin main
```

---

## Critères de complétion

- L'admin peut cropper le cover d'un mobilier, d'une exposition et d'une story via la modale Cropper.js.
- L'admin peut cropper chaque image de galerie depuis le gallery-editor.
- Le crop choisi s'affiche pixel-perfect sur fiche mobilier (hero + galerie), fiche expo, story-viewer, story-inline, news-slider cards.
- Aucun focal point résiduel (DB colonnes droppées, composant supprimé, aucune référence `FocalPoint`/`coverFocalX`/`coverFocalY` dans le code).
- Backend tests verts + frontend tests verts.
- Baselines Playwright régénérées après `ok visuel`.
- ADR-0017 créé + CLAUDE.md mentionne Cropper.js.

## Risques de référence

- **Cropper.js et SSR** : non applicable (pas de SSR).
- **Bundle admin +50KB gzipped** : acceptable, lazy chunk admin.
- **Cascade gallery: string[] → GalleryItem[]** : touche beaucoup de tests + fixtures. Task 6 doit être exhaustive, sinon des erreurs TS apparaîtront à n'importe quelle task suivante.
- **Story.coverCrop schéma** : vérifier que `StoryService` et `AdminStoriesController` propagent bien le champ — sinon le crop défini en admin ne sera jamais sauvegardé.
- **Tests Cropper.js dans Karma headless** : si l'init Cropper plante (Karma headless n'a pas toujours un DOM exploitable pour `getBoundingClientRect`), stubber `Cropper` ou mocker `currentCrop` directement.
