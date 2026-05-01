package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Exhibition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class ExhibitionServiceTest {

    private ExhibitionService exhibitionService;

    @BeforeEach
    void setUp() {
        exhibitionService = new ExhibitionService();
    }

    @Test
    void testFindAll_ReturnsAllExhibitions() {
        // Act
        List<Exhibition> result = exhibitionService.findAll();

        // Assert
        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals(5, result.size()); // 5 exhibitions in the static list
    }

    @Test
    void testFindAll_ReturnsExhibitionsSortedByStartDateDescending() {
        // Act
        List<Exhibition> result = exhibitionService.findAll();

        // Assert
        assertNotNull(result);
        assertFalse(result.isEmpty());
        // Check sorted by startDate descending
        for (int i = 0; i < result.size() - 1; i++) {
            assertTrue(result.get(i).startDate().isAfter(result.get(i + 1).startDate()) ||
                    result.get(i).startDate().isEqual(result.get(i + 1).startDate()));
        }
    }

    @Test
    void testFindFeatured_ReturnsOnlyFeaturedExhibitions() {
        // Act
        List<Exhibition> result = exhibitionService.findFeatured();

        // Assert
        assertNotNull(result);
        assertFalse(result.isEmpty());
        // Check all returned items are featured
        assertTrue(result.stream().allMatch(Exhibition::featured));
        // Expected 3 featured exhibitions (Matières silencieuses, L'atelier ouvert, Saison brute)
        assertEquals(3, result.size());
    }

    @Test
    void testFindFeatured_ReturnsExhibitionsSortedByStartDateDescending() {
        // Act
        List<Exhibition> result = exhibitionService.findFeatured();

        // Assert
        assertNotNull(result);
        assertFalse(result.isEmpty());
        // Check sorted by startDate descending
        for (int i = 0; i < result.size() - 1; i++) {
            assertTrue(result.get(i).startDate().isAfter(result.get(i + 1).startDate()) ||
                    result.get(i).startDate().isEqual(result.get(i + 1).startDate()));
        }
    }

    @Test
    void testFindBySlug_ExistingSlug_ReturnsExhibition() {
        // Arrange
        String existingSlug = "matieres-silencieuses";

        // Act
        Optional<Exhibition> result = exhibitionService.findBySlug(existingSlug);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(existingSlug, result.get().slug());
        assertEquals("Matières silencieuses", result.get().title());
    }

    @Test
    void testFindBySlug_NonExistingSlug_ReturnsEmpty() {
        // Arrange
        String nonExistingSlug = "non-existent-exhibition";

        // Act
        Optional<Exhibition> result = exhibitionService.findBySlug(nonExistingSlug);

        // Assert
        assertFalse(result.isPresent());
    }

    @Test
    void testFindAll_ReturnsImmutableList() {
        // Act
        List<Exhibition> result1 = exhibitionService.findAll();
        List<Exhibition> result2 = exhibitionService.findAll();

        // Assert
        assertNotSame(result1, result2, "Should return a new list instance each time");
    }

    @Test
    void testExhibitionItem_HasCorrectProperties() {
        // Arrange
        Optional<Exhibition> exhibition = exhibitionService.findBySlug("bois-et-lumiere");

        // Assert
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
        // Act
        List<Exhibition> exhibitions = exhibitionService.findAll();

        // Assert
        for (Exhibition exhibition : exhibitions) {
            assertNotNull(exhibition.startDate());
            assertNotNull(exhibition.endDate());
            assertTrue(exhibition.endDate().isAfter(exhibition.startDate()) ||
                    exhibition.endDate().isEqual(exhibition.startDate()));
        }
    }

    @Test
    void testFeaturedExhibitions_ContainsExpectedItems() {
        // Act
        List<Exhibition> featured = exhibitionService.findFeatured();

        // Assert
        List<String> featuredTitles = featured.stream().map(Exhibition::title).toList();
        assertTrue(featuredTitles.contains("Matières silencieuses"));
        assertTrue(featuredTitles.contains("L'atelier ouvert"));
        assertTrue(featuredTitles.contains("Saison brute"));
        assertFalse(featuredTitles.contains("Bois & lumière"));
        assertFalse(featuredTitles.contains("Esquisses"));
    }
}
