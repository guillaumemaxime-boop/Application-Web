package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExhibitionTest {

    @Test
    void testExhibitionRecord_HasAllRequiredFields() {
        // Arrange & Act
        Exhibition exhibition = new Exhibition(
                "e-001",
                "Matières silencieuses",
                "matieres-silencieuses",
                "Galerie Joseph",
                "Paris",
                "France",
                LocalDate.of(2025, 3, 14),
                LocalDate.of(2025, 5, 18),
                "https://picsum.photos/seed/matieres-cover/1200/800",
                null, null,
                List.of("https://picsum.photos/seed/matieres-1/1200/800"),
                "Léa Bornand",
                "Une exploration du silence comme matière première",
                "Description détaillée",
                List.of("Mobilier", "Sculpture"),
                true,
                true,
                true,
                List.of()
        );

        // Assert
        assertNotNull(exhibition);
        assertEquals("e-001", exhibition.id());
        assertEquals("Matières silencieuses", exhibition.title());
        assertEquals("matieres-silencieuses", exhibition.slug());
        assertEquals("Galerie Joseph", exhibition.venue());
        assertEquals("Paris", exhibition.city());
        assertEquals("France", exhibition.country());
        assertEquals(LocalDate.of(2025, 3, 14), exhibition.startDate());
        assertEquals(LocalDate.of(2025, 5, 18), exhibition.endDate());
        assertEquals("https://picsum.photos/seed/matieres-cover/1200/800", exhibition.coverImage());
        assertEquals(List.of("https://picsum.photos/seed/matieres-1/1200/800"), exhibition.gallery());
        assertEquals("Léa Bornand", exhibition.curator());
        assertEquals("Une exploration du silence comme matière première", exhibition.shortDescription());
        assertEquals("Description détaillée", exhibition.description());
        assertEquals(List.of("Mobilier", "Sculpture"), exhibition.tags());
        assertTrue(exhibition.featured());
    }

    @Test
    void testExhibitionRecord_WithEmptyGallery() {
        // Arrange & Act
        Exhibition exhibition = new Exhibition(
                "e-002",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of(), // Empty gallery
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        // Assert
        assertNotNull(exhibition);
        assertNotNull(exhibition.gallery());
        assertTrue(exhibition.gallery().isEmpty());
    }

    @Test
    void testExhibitionRecord_WithMultipleGalleryImages() {
        // Arrange
        List<String> galleryImages = List.of(
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg",
                "https://example.com/image3.jpg"
        );

        // Act
        Exhibition exhibition = new Exhibition(
                "e-003",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                galleryImages,
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        // Assert
        assertNotNull(exhibition);
        assertEquals(3, exhibition.gallery().size());
        assertEquals("https://example.com/image1.jpg", exhibition.gallery().get(0));
        assertEquals("https://example.com/image2.jpg", exhibition.gallery().get(1));
        assertEquals("https://example.com/image3.jpg", exhibition.gallery().get(2));
    }

    @Test
    void testExhibitionRecord_WithEmptyValues() {
        // Records can have empty strings but not null
        Exhibition exhibition = new Exhibition(
                "e-001",
                "", // Empty title
                "test-exhibition",
                "", // Empty venue
                "", // Empty city
                "", // Empty country
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "", // Empty coverImage
                null, null,
                List.of(),
                "", // Empty curator
                "", // Empty shortDescription
                "", // Empty description
                List.of(),
                false,
                true,
                true,
                List.of()
        );
        assertNotNull(exhibition);
        assertEquals("", exhibition.title());
        assertEquals("", exhibition.venue());
    }

    @Test
    void testExhibitionRecord_Equality() {
        // Arrange
        Exhibition exhibition1 = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of("https://example.com/image1.jpg"),
                "Test Curator",
                "Short description",
                "Full description",
                List.of("Tag1"),
                true,
                true,
                true,
                List.of()
        );

        Exhibition exhibition2 = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of("https://example.com/image1.jpg"),
                "Test Curator",
                "Short description",
                "Full description",
                List.of("Tag1"),
                true,
                true,
                true,
                List.of()
        );

        // Act & Assert
        assertEquals(exhibition1, exhibition2);
    }

    @Test
    void testExhibitionRecord_ToString() {
        // Arrange
        Exhibition exhibition = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        // Act
        String toString = exhibition.toString();

        // Assert
        assertNotNull(toString);
        assertTrue(toString.contains("e-001"));
        assertTrue(toString.contains("Test Exhibition"));
        assertTrue(toString.contains("test-exhibition"));
    }

    @Test
    void testExhibitionRecord_HashCode() {
        // Arrange
        Exhibition exhibition1 = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        Exhibition exhibition2 = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        // Act & Assert
        assertEquals(exhibition1.hashCode(), exhibition2.hashCode());
    }

    @Test
    void testExhibitionRecord_DatesAreValid() {
        // Arrange & Act
        Exhibition exhibition = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 10),
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        // Assert
        assertNotNull(exhibition.startDate());
        assertNotNull(exhibition.endDate());
        assertTrue(exhibition.endDate().isAfter(exhibition.startDate()));
    }

    @Test
    void testExhibitionRecord_WithSameStartAndEndDate() {
        // Arrange & Act
        LocalDate date = LocalDate.of(2024, 1, 1);
        Exhibition exhibition = new Exhibition(
                "e-001",
                "Test Exhibition",
                "test-exhibition",
                "Test Venue",
                "Test City",
                "Test Country",
                date,
                date, // Same start and end date
                "https://example.com/cover.jpg",
                null, null,
                List.of(),
                "Test Curator",
                "Short description",
                "Full description",
                List.of(),
                false,
                true,
                true,
                List.of()
        );

        // Assert
        assertNotNull(exhibition);
        assertEquals(date, exhibition.startDate());
        assertEquals(date, exhibition.endDate());
    }
}
