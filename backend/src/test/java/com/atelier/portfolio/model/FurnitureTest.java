package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FurnitureTest {

    @Test
    void testFurnitureRecord_HasAllRequiredFields() {
        // Arrange & Act
        Furniture furniture = new Furniture(
                "f-001",
                "Onde — Fauteuil sculpté",
                "onde-fauteuil-sculpte",
                "Sièges",
                "Chêne massif & cuir tanné",
                2024,
                "https://picsum.photos/seed/onde-cover/1200/800",
                null, null,
                List.of("https://picsum.photos/seed/onde-1/1200/800"),
                "Une silhouette inspirée du mouvement de la mer",
                "Description détaillée",
                List.of("Hauteur 92 cm", "Largeur 78 cm"),
                "Milo GUILLAUME Design",
                true,
                true,
                true,
                List.of(),
                List.of()
        );

        // Assert
        assertNotNull(furniture);
        assertEquals("f-001", furniture.id());
        assertEquals("Onde — Fauteuil sculpté", furniture.title());
        assertEquals("onde-fauteuil-sculpte", furniture.slug());
        assertEquals("Sièges", furniture.category());
        assertEquals("Chêne massif & cuir tanné", furniture.material());
        assertEquals(2024, furniture.year());
        assertEquals("https://picsum.photos/seed/onde-cover/1200/800", furniture.coverImage());
        assertEquals(List.of("https://picsum.photos/seed/onde-1/1200/800"), furniture.gallery());
        assertEquals("Une silhouette inspirée du mouvement de la mer", furniture.shortDescription());
        assertEquals("Description détaillée", furniture.description());
        assertEquals(List.of("Hauteur 92 cm", "Largeur 78 cm"), furniture.dimensions());
        assertEquals("Milo GUILLAUME Design", furniture.designer());
        assertTrue(furniture.featured());
    }

    @Test
    void testFurnitureRecord_WithEmptyGallery() {
        // Arrange & Act
        Furniture furniture = new Furniture(
                "f-002",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                List.of(), // Empty gallery
                "Short description",
                "Full description",
                List.of(),
                "Test Designer",
                false,
                true,
                true,
                List.of(),
                List.of()
        );

        // Assert
        assertNotNull(furniture);
        assertNotNull(furniture.gallery());
        assertTrue(furniture.gallery().isEmpty());
    }

    @Test
    void testFurnitureRecord_WithMultipleGalleryImages() {
        // Arrange
        List<String> galleryImages = List.of(
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
                "https://example.com/image3.jpg"
        );

        // Act
        Furniture furniture = new Furniture(
                "f-003",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                galleryImages,
                "Short description",
                "Full description",
                List.of(),
                "Test Designer",
                false,
                true,
                true,
                List.of(),
                List.of()
        );

        // Assert
        assertNotNull(furniture);
        assertEquals(3, furniture.gallery().size());
        assertEquals("https://example.com/image1.jpg", furniture.gallery().get(0));
        assertEquals("https://example.com/image2.jpg", furniture.gallery().get(1));
        assertEquals("https://example.com/image3.jpg", furniture.gallery().get(2));
    }

    @Test
    void testFurnitureRecord_WithEmptyValues() {
        // Records can have empty strings but not null
        Furniture furniture = new Furniture(
                "f-001",
                "", // Empty title
                "test-furniture",
                "", // Empty category
                "", // Empty material
                0,   // Year 0
                "", // Empty coverImage
                null, null,
                List.of(),
                "", // Empty shortDescription
                "", // Empty description
                List.of(),
                "", // Empty designer
                false,
                true,
                true,
                List.of(),
                List.of()
        );
        assertNotNull(furniture);
        assertEquals("", furniture.title());
        assertEquals("", furniture.category());
    }

    @Test
    void testFurnitureRecord_Equality() {
        // Arrange
        Furniture furniture1 = new Furniture(
                "f-001",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                List.of("https://example.com/image1.jpg"),
                "Short description",
                "Full description",
                List.of("Dimension 1"),
                "Test Designer",
                true,
                true,
                true,
                List.of(),
                List.of()
        );

        Furniture furniture2 = new Furniture(
                "f-001",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                List.of("https://example.com/image1.jpg"),
                "Short description",
                "Full description",
                List.of("Dimension 1"),
                "Test Designer",
                true,
                true,
                true,
                List.of(),
                List.of()
        );

        // Act & Assert
        assertEquals(furniture1, furniture2);
    }

    @Test
    void testFurnitureRecord_ToString() {
        // Arrange
        Furniture furniture = new Furniture(
                "f-001",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Short description",
                "Full description",
                List.of(),
                "Test Designer",
                false,
                true,
                true,
                List.of(),
                List.of()
        );

        // Act
        String toString = furniture.toString();

        // Assert
        assertNotNull(toString);
        assertTrue(toString.contains("f-001"));
        assertTrue(toString.contains("Test Furniture"));
        assertTrue(toString.contains("test-furniture"));
    }

    @Test
    void testFurnitureRecord_HashCode() {
        // Arrange
        Furniture furniture1 = new Furniture(
                "f-001",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Short description",
                "Full description",
                List.of(),
                "Test Designer",
                false,
                true,
                true,
                List.of(),
                List.of()
        );

        Furniture furniture2 = new Furniture(
                "f-001",
                "Test Furniture",
                "test-furniture",
                "Test Category",
                "Test Material",
                2023,
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Short description",
                "Full description",
                List.of(),
                "Test Designer",
                false,
                true,
                true,
                List.of(),
                List.of()
        );

        // Act & Assert
        assertEquals(furniture1.hashCode(), furniture2.hashCode());
    }
}
