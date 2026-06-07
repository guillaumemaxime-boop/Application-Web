package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.model.GalleryImage;
import com.atelier.portfolio.model.ImageCrop;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class FurnitureServiceTest {

    @Autowired
    private FurnitureService furnitureService;

    @Autowired
    private Validator validator;

    @Test
    void testFindAll_ReturnsAllFurnitureItems() {
        List<Furniture> result = furnitureService.findAll();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals(6, result.size());
    }

    @Test
    void testFindFeatured_ReturnsOnlyFeaturedItems() {
        List<Furniture> result = furnitureService.findFeatured();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertTrue(result.stream().allMatch(Furniture::featured));
        assertEquals(3, result.size());
    }

    @Test
    void testFindBySlug_ExistingSlug_ReturnsFurniture() {
        String existingSlug = "onde-fauteuil-sculpte";

        Optional<Furniture> result = furnitureService.findBySlug(existingSlug);

        assertTrue(result.isPresent());
        assertEquals(existingSlug, result.get().slug());
        assertEquals("Onde — Fauteuil sculpté", result.get().title());
    }

    @Test
    void testFindBySlug_NonExistingSlug_ReturnsEmpty() {
        Optional<Furniture> result = furnitureService.findBySlug("non-existent-slug");

        assertFalse(result.isPresent());
    }

    @Test
    void testCategories_ReturnsDistinctSortedCategories() {
        List<String> categories = furnitureService.categories();

        assertNotNull(categories);
        assertFalse(categories.isEmpty());
        assertEquals(5, categories.size());
        assertTrue(categories.contains("Sièges"));
        assertTrue(categories.contains("Tables"));
        assertTrue(categories.contains("Rangements"));
        assertTrue(categories.contains("Luminaires"));
        assertTrue(categories.contains("Cloisons"));
        assertEquals(List.of("Cloisons", "Luminaires", "Rangements", "Sièges", "Tables"), categories);
    }

    @Test
    void testCreate_PersistsNewFurniture_AndGeneratesIdAndSlug() {
        Furniture input = new Furniture(
                null, "Linéa — Banc en frêne", null,
                "Sièges", "Frêne huilé", 2026,
                "https://example.com/linea.jpg",
                null,
                List.of(new GalleryImage("https://example.com/linea-1.jpg", null)),
                "Banc épuré", "Description longue",
                List.of("L 180 cm", "H 45 cm"),
                "Milo GUILLAUME Design", false, true, true, List.of(), List.of()
        );

        Furniture created = furnitureService.create(input);

        assertNotNull(created.id());
        assertTrue(created.id().startsWith("f-"));
        assertEquals("linea-banc-en-frene", created.slug());
        assertEquals("Linéa — Banc en frêne", created.title());
        assertEquals(7, furnitureService.findAll().size());
    }

    @Test
    void testCreate_KeepsProvidedSlug() {
        Furniture input = new Furniture(
                null, "Echo", "echo-custom-slug",
                "Sièges", "Chêne", 2026,
                null, null,
                List.of(), "court", "long",
                List.of(), "Milo GUILLAUME Design", false, true, true, List.of(), List.of()
        );

        Furniture created = furnitureService.create(input);

        assertEquals("echo-custom-slug", created.slug());
        assertTrue(furnitureService.findBySlug("echo-custom-slug").isPresent());
    }

    @Test
    void testCreate_WithTags_PreservesTags() {
        Furniture input = new Furniture(
                null, "Solstice — Étagère en chêne", null,
                "Rangements", "Chêne massif", 2026,
                "https://example.com/solstice.jpg",
                null,
                List.of(),
                "Étagère minimaliste", "Description longue",
                List.of("L 120 cm", "H 180 cm"),
                "Milo GUILLAUME Design", false, true, true, List.of(),
                List.of("bois", "sculpture")
        );

        Furniture created = furnitureService.create(input);

        assertNotNull(created.tags());
        assertEquals(List.of("bois", "sculpture"), created.tags());
    }

    @Test
    void testUpdate_ExistingFurniture_AppliesChanges() {
        String slug = "onde-fauteuil-sculpte";
        Furniture original = furnitureService.findBySlug(slug).orElseThrow();

        Furniture changes = new Furniture(
                original.id(), "Onde — Édition limitée", original.slug(),
                original.category(), original.material(), original.year(),
                original.coverImage(), original.coverCrop(),
                original.gallery(),
                "Nouvelle description courte", original.description(),
                original.dimensions(), original.designer(), false, true, true, List.of(),
                List.of("métal", "édition limitée")
        );

        Optional<Furniture> updated = furnitureService.update(slug, changes);

        assertTrue(updated.isPresent());
        assertEquals("Onde — Édition limitée", updated.get().title());
        assertEquals("Nouvelle description courte", updated.get().shortDescription());
        assertFalse(updated.get().featured());
        assertEquals(List.of("métal", "édition limitée"), updated.get().tags());
    }

    @Test
    void testUpdate_NonExistingSlug_ReturnsEmpty() {
        Furniture changes = new Furniture(
                null, "X", null, "Tables", null, 2026,
                null, null,
                List.of(), "", "", List.of(), "", false, true, true, List.of(), List.of()
        );

        Optional<Furniture> updated = furnitureService.update("non-existent", changes);

        assertFalse(updated.isPresent());
    }

    @Test
    void testDelete_ExistingSlug_RemovesFurniture() {
        String slug = "onde-fauteuil-sculpte";

        boolean deleted = furnitureService.deleteBySlug(slug);

        assertTrue(deleted);
        assertFalse(furnitureService.findBySlug(slug).isPresent());
        assertEquals(5, furnitureService.findAll().size());
    }

    @Test
    void testDelete_NonExistingSlug_ReturnsFalse() {
        boolean deleted = furnitureService.deleteBySlug("non-existent");

        assertFalse(deleted);
        assertEquals(6, furnitureService.findAll().size());
    }

    @Test
    void furniture_avec_tag_trop_long_est_invalide() {
        Furniture f = new Furniture(
                null, "Titre", null,
                "Sièges", null, 2026,
                null, null,
                List.of(), null, null,
                List.of(), null, false, true, true, List.of(),
                List.of("a".repeat(256))
        );

        Set<ConstraintViolation<Furniture>> violations = validator.validate(f);

        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().contains("tags"));
    }

    @Test
    void furniture_avec_tag_de_255_chars_est_valide() {
        Furniture f = new Furniture(
                null, "Titre", null,
                "Sièges", null, 2026,
                null, null,
                List.of(), null, null,
                List.of(), null, false, true, true, List.of(),
                List.of("a".repeat(255))
        );

        Set<ConstraintViolation<Furniture>> violations = validator.validate(f);

        assertThat(violations).isEmpty();
    }

    @Test
    void testFurnitureItem_HasCorrectProperties() {
        Optional<Furniture> furniture = furnitureService.findBySlug("strate-table-basse-marbre");

        assertTrue(furniture.isPresent());
        Furniture item = furniture.get();
        assertEquals("f-002", item.id());
        assertEquals("Strate — Table basse en marbre", item.title());
        assertEquals("Tables", item.category());
        assertEquals("Marbre Calacatta & laiton brossé", item.material());
        assertEquals(2023, item.year());
        assertEquals("Milo GUILLAUME Design", item.designer());
        assertTrue(item.featured());
        assertNotNull(item.gallery());
        assertFalse(item.gallery().isEmpty());
        assertNotNull(item.dimensions());
        assertFalse(item.dimensions().isEmpty());
    }

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
}
