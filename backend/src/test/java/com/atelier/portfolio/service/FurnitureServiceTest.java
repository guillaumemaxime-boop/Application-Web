package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Furniture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class FurnitureServiceTest {

    private FurnitureService furnitureService;

    @BeforeEach
    void setUp() {
        furnitureService = new FurnitureService();
    }

    @Test
    void testFindAll_ReturnsAllFurnitureItems() {
        // Act
        List<Furniture> result = furnitureService.findAll();

        // Assert
        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals(6, result.size()); // 6 items in the static list
    }

    @Test
    void testFindFeatured_ReturnsOnlyFeaturedItems() {
        // Act
        List<Furniture> result = furnitureService.findFeatured();

        // Assert
        assertNotNull(result);
        assertFalse(result.isEmpty());
        // Check all returned items are featured
        assertTrue(result.stream().allMatch(Furniture::featured));
        // Expected 3 featured items (Onde, Strate, Racine)
        assertEquals(3, result.size());
    }

    @Test
    void testFindBySlug_ExistingSlug_ReturnsFurniture() {
        // Arrange
        String existingSlug = "onde-fauteuil-sculpte";

        // Act
        Optional<Furniture> result = furnitureService.findBySlug(existingSlug);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(existingSlug, result.get().slug());
        assertEquals("Onde — Fauteuil sculpté", result.get().title());
    }

    @Test
    void testFindBySlug_NonExistingSlug_ReturnsEmpty() {
        // Arrange
        String nonExistingSlug = "non-existent-slug";

        // Act
        Optional<Furniture> result = furnitureService.findBySlug(nonExistingSlug);

        // Assert
        assertFalse(result.isPresent());
    }

    @Test
    void testCategories_ReturnsDistinctSortedCategories() {
        // Act
        List<String> categories = furnitureService.categories();

        // Assert
        assertNotNull(categories);
        assertFalse(categories.isEmpty());
        // Expected categories: Cloisons, Luminaires, Rangements, Sièges, Tables
        assertEquals(5, categories.size());
        assertTrue(categories.contains("Sièges"));
        assertTrue(categories.contains("Tables"));
        assertTrue(categories.contains("Rangements"));
        assertTrue(categories.contains("Luminaires"));
        assertTrue(categories.contains("Cloisons"));
        // Check sorted
        assertEquals(List.of("Cloisons", "Luminaires", "Rangements", "Sièges", "Tables"), categories);
    }

    @Test
    void testFindAll_ReturnsImmutableList() {
        // Act
        List<Furniture> result1 = furnitureService.findAll();
        List<Furniture> result2 = furnitureService.findAll();

        // Assert
        assertNotSame(result1, result2, "Should return a new list instance each time");
    }

    @Test
    void testFurnitureItem_HasCorrectProperties() {
        // Arrange
        Optional<Furniture> furniture = furnitureService.findBySlug("strate-table-basse-marbre");

        // Assert
        assertTrue(furniture.isPresent());
        Furniture item = furniture.get();
        assertEquals("f-002", item.id());
        assertEquals("Strate — Table basse en marbre", item.title());
        assertEquals("Tables", item.category());
        assertEquals("Marbre Calacatta & laiton brossé", item.material());
        assertEquals(2023, item.year());
        assertEquals("Atelier Lumen", item.designer());
        assertTrue(item.featured());
        assertNotNull(item.gallery());
        assertFalse(item.gallery().isEmpty());
        assertNotNull(item.dimensions());
        assertFalse(item.dimensions().isEmpty());
    }
}
