package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Exhibition;
import com.atelier.portfolio.model.GalleryImage;
import com.atelier.portfolio.model.ImageCrop;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class ExhibitionServiceTest {

    @Autowired
    private ExhibitionService exhibitionService;

    @Test
    void testFindAll_ReturnsAllExhibitions() {
        List<Exhibition> result = exhibitionService.findAll();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals(5, result.size());
    }

    @Test
    void testFindAll_ReturnsExhibitionsSortedByStartDateDescending() {
        List<Exhibition> result = exhibitionService.findAll();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        for (int i = 0; i < result.size() - 1; i++) {
            assertTrue(result.get(i).startDate().isAfter(result.get(i + 1).startDate()) ||
                    result.get(i).startDate().isEqual(result.get(i + 1).startDate()));
        }
    }

    @Test
    void testFindFeatured_ReturnsOnlyFeaturedExhibitions() {
        List<Exhibition> result = exhibitionService.findFeatured();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertTrue(result.stream().allMatch(Exhibition::featured));
        assertEquals(3, result.size());
    }

    @Test
    void testFindFeatured_ReturnsExhibitionsSortedByStartDateDescending() {
        List<Exhibition> result = exhibitionService.findFeatured();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        for (int i = 0; i < result.size() - 1; i++) {
            assertTrue(result.get(i).startDate().isAfter(result.get(i + 1).startDate()) ||
                    result.get(i).startDate().isEqual(result.get(i + 1).startDate()));
        }
    }

    @Test
    void testFindBySlug_ExistingSlug_ReturnsExhibition() {
        String existingSlug = "matieres-silencieuses";

        Optional<Exhibition> result = exhibitionService.findBySlug(existingSlug);

        assertTrue(result.isPresent());
        assertEquals(existingSlug, result.get().slug());
        assertEquals("Matières silencieuses", result.get().title());
    }

    @Test
    void testFindBySlug_NonExistingSlug_ReturnsEmpty() {
        Optional<Exhibition> result = exhibitionService.findBySlug("non-existent-exhibition");

        assertFalse(result.isPresent());
    }

    @Test
    void testExhibitionItem_HasCorrectProperties() {
        Optional<Exhibition> exhibition = exhibitionService.findBySlug("bois-et-lumiere");

        assertTrue(exhibition.isPresent());
        Exhibition item = exhibition.get();
        assertEquals("e-003", item.id());
        assertEquals("Bois & lumière", item.title());
        assertEquals("Fondation Cartier", item.venue());
        assertEquals("Tokyo", item.city());
        assertEquals("Japon", item.country());
        assertEquals(LocalDate.of(2024, 9, 1), item.startDate());
        assertEquals(LocalDate.of(2024, 11, 24), item.endDate());
        assertEquals("Mariko Tanaka", item.curator());
        assertFalse(item.featured());
        assertNotNull(item.gallery());
        assertFalse(item.gallery().isEmpty());
        assertNotNull(item.tags());
        assertFalse(item.tags().isEmpty());
    }

    @Test
    void testExhibitionDates_AreValid() {
        List<Exhibition> exhibitions = exhibitionService.findAll();

        for (Exhibition exhibition : exhibitions) {
            assertNotNull(exhibition.startDate());
            assertNotNull(exhibition.endDate());
            assertTrue(exhibition.endDate().isAfter(exhibition.startDate()) ||
                    exhibition.endDate().isEqual(exhibition.startDate()));
        }
    }

    @Test
    void testCreate_PersistsNewExhibition_AndGeneratesIdAndSlug() {
        Exhibition input = new Exhibition(
                null, "Souffles éphémères", null,
                "Palais de Tokyo", "Paris", "France",
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 9, 30),
                "https://example.com/souffles.jpg",
                null,
                List.of(new GalleryImage("https://example.com/souffles-1.jpg", null, 1, 1)),
                "Camille Lévy", "court", "long",
                List.of("Sculpture", "Lumière"), true, true, true, List.of(),
                null, null, null, null, null, null, null, null
        );

        Exhibition created = exhibitionService.create(input);

        assertNotNull(created.id());
        assertTrue(created.id().startsWith("e-"));
        assertEquals("souffles-ephemeres", created.slug());
        assertEquals("Souffles éphémères", created.title());
        assertEquals(6, exhibitionService.findAll().size());
    }

    @Test
    void testCreate_KeepsProvidedSlug() {
        Exhibition input = new Exhibition(
                null, "Test", "custom-expo-slug",
                "Lieu", "Ville", "Pays",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1),
                null, null,
                List.of(), "", "", "", List.of(), false, true, true, List.of(),
                null, null, null, null, null, null, null, null
        );

        Exhibition created = exhibitionService.create(input);

        assertEquals("custom-expo-slug", created.slug());
    }

    @Test
    void testUpdate_ExistingExhibition_AppliesChanges() {
        String slug = "matieres-silencieuses";
        Exhibition original = exhibitionService.findBySlug(slug).orElseThrow();

        Exhibition changes = new Exhibition(
                original.id(), "Matières silencieuses — édition 2", original.slug(),
                original.venue(), original.city(), original.country(),
                original.startDate(), original.endDate(),
                original.coverImage(), original.coverCrop(),
                original.gallery(), original.curator(),
                "Description courte mise à jour", original.description(),
                original.tags(), false, true, true, List.of(),
                null, null, null, null, null, null, null, null
        );

        Optional<Exhibition> updated = exhibitionService.update(slug, changes);

        assertTrue(updated.isPresent());
        assertEquals("Matières silencieuses — édition 2", updated.get().title());
        assertEquals("Description courte mise à jour", updated.get().shortDescription());
        assertFalse(updated.get().featured());
    }

    @Test
    void update_persiste_le_champ_videoId() {
        String slug = "matieres-silencieuses";
        Exhibition original = exhibitionService.findBySlug(slug).orElseThrow();

        Exhibition changes = new Exhibition(
                original.id(), original.title(), original.slug(),
                original.venue(), original.city(), original.country(),
                original.startDate(), original.endDate(),
                original.coverImage(), original.coverCrop(),
                original.gallery(), original.curator(),
                original.shortDescription(), original.description(),
                original.tags(), original.featured(), original.showStoryLink(),
                original.showStoryButton(), List.of(),
                null,   // videoUrl (lecture seulement)
                "/api/photos/files/poster.jpg",
                "/api/videos/files/subs.vtt",
                "vid-test-42", // videoId
                null, null, null, null
        );

        Optional<Exhibition> result = exhibitionService.update(slug, changes);

        assertTrue(result.isPresent());
        // videoId est persisté et retourné dans le DTO
        assertEquals("vid-test-42", result.get().videoId());
        // videoCaptions est conservé tel quel
        assertEquals("/api/videos/files/subs.vtt", result.get().videoCaptions());
        // videoPoster override est conservé
        assertEquals("/api/photos/files/poster.jpg", result.get().videoPoster());
        // videoUrl est null car la Video vid-test-42 n'existe pas en base (H2 test)
        assertNull(result.get().videoUrl());
    }

    @Test
    void testUpdate_NonExistingSlug_ReturnsEmpty() {
        Exhibition changes = new Exhibition(
                null, "X", null, "", "", "",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1),
                null, null,
                List.of(), "", "", "", List.of(), false, true, true, List.of(),
                null, null, null, null, null, null, null, null
        );

        Optional<Exhibition> updated = exhibitionService.update("non-existent", changes);

        assertFalse(updated.isPresent());
    }

    @Test
    void testDelete_ExistingSlug_RemovesExhibition() {
        String slug = "matieres-silencieuses";

        boolean deleted = exhibitionService.deleteBySlug(slug);

        assertTrue(deleted);
        assertFalse(exhibitionService.findBySlug(slug).isPresent());
        assertEquals(4, exhibitionService.findAll().size());
    }

    @Test
    void testDelete_NonExistingSlug_ReturnsFalse() {
        boolean deleted = exhibitionService.deleteBySlug("non-existent");

        assertFalse(deleted);
        assertEquals(5, exhibitionService.findAll().size());
    }

    @Test
    void create_avec_gallery_items_persiste_crop_par_item() {
        Exhibition input = new Exhibition(null, "T", null, "venue", "city", "country",
                java.time.LocalDate.of(2024, 1, 1), java.time.LocalDate.of(2024, 12, 31),
                "/c.jpg",
                null,
                List.of(new GalleryImage("/g1.jpg", new ImageCrop(0.0, 0.0, 50.0, 50.0), 1, 1),
                        new GalleryImage("/g2.jpg", null, 1, 1)),
                "curator", "s", "d", List.of(), false, true, true, List.of(),
                null, null, null, null, null, null, null, null);
        Exhibition created = exhibitionService.create(input);
        Exhibition reloaded = exhibitionService.findBySlug(created.slug()).orElseThrow();
        assertEquals(2, reloaded.gallery().size());
        assertEquals(50.0, reloaded.gallery().get(0).crop().w());
        assertNull(reloaded.gallery().get(1).crop());
    }

    @Test
    void testFeaturedExhibitions_ContainsExpectedItems() {
        List<Exhibition> featured = exhibitionService.findFeatured();

        List<String> featuredTitles = featured.stream().map(Exhibition::title).toList();
        assertTrue(featuredTitles.contains("Matières silencieuses"));
        assertTrue(featuredTitles.contains("L'atelier ouvert"));
        assertTrue(featuredTitles.contains("Saison brute"));
        assertFalse(featuredTitles.contains("Bois & lumière"));
        assertFalse(featuredTitles.contains("Esquisses"));
    }
}
