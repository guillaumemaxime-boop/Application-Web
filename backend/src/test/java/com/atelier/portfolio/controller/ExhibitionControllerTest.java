package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Exhibition;
import com.atelier.portfolio.service.ExhibitionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExhibitionControllerTest {

    @Mock
    private ExhibitionService exhibitionService;

    @InjectMocks
    private ExhibitionController exhibitionController;

    private Exhibition sampleExhibition;
    private List<Exhibition> sampleExhibitionList;

    @BeforeEach
    void setUp() {
        sampleExhibition = new Exhibition(
                "e-001",
                "Matières silencieuses",
                "matieres-silencieuses",
                "Galerie Joseph",
                "Paris",
                "France",
                LocalDate.of(2025, 3, 14),
                LocalDate.of(2025, 5, 18),
                "https://picsum.photos/seed/matieres-cover/1200/800",
                List.of("https://picsum.photos/seed/matieres-1/1200/800"),
                "Léa Bornand",
                "Une exploration du silence comme matière première",
                "Description détaillée",
                List.of("Mobilier", "Sculpture"),
                true
        );

        sampleExhibitionList = List.of(sampleExhibition);
    }

    @Test
    void testAll_ReturnsAllExhibitions() {
        // Arrange
        when(exhibitionService.findAll()).thenReturn(sampleExhibitionList);

        // Act
        List<Exhibition> result = exhibitionController.all();

        // Assert
        assertNotNull(result);
        assertEquals(sampleExhibitionList, result);
        verify(exhibitionService, times(1)).findAll();
    }

    @Test
    void testFeatured_ReturnsFeaturedExhibitions() {
        // Arrange
        when(exhibitionService.findFeatured()).thenReturn(sampleExhibitionList);

        // Act
        List<Exhibition> result = exhibitionController.featured();

        // Assert
        assertNotNull(result);
        assertEquals(sampleExhibitionList, result);
        verify(exhibitionService, times(1)).findFeatured();
    }

    @Test
    void testBySlug_ExistingSlug_ReturnsExhibition() {
        // Arrange
        String slug = "matieres-silencieuses";
        when(exhibitionService.findBySlug(slug)).thenReturn(Optional.of(sampleExhibition));

        // Act
        ResponseEntity<Exhibition> result = exhibitionController.bySlug(slug);

        // Assert
        assertNotNull(result);
        assertTrue(result.getStatusCode().is2xxSuccessful());
        assertEquals(sampleExhibition, result.getBody());
        verify(exhibitionService, times(1)).findBySlug(slug);
    }

    @Test
    void testBySlug_NonExistingSlug_ReturnsNotFound() {
        // Arrange
        String slug = "non-existent-exhibition";
        when(exhibitionService.findBySlug(slug)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<Exhibition> result = exhibitionController.bySlug(slug);

        // Assert
        assertNotNull(result);
        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
        verify(exhibitionService, times(1)).findBySlug(slug);
    }

    @Test
    void testAll_EmptyList_ReturnsEmptyList() {
        // Arrange
        when(exhibitionService.findAll()).thenReturn(List.of());

        // Act
        List<Exhibition> result = exhibitionController.all();

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(exhibitionService, times(1)).findAll();
    }

    @Test
    void testFeatured_EmptyList_ReturnsEmptyList() {
        // Arrange
        when(exhibitionService.findFeatured()).thenReturn(List.of());

        // Act
        List<Exhibition> result = exhibitionController.featured();

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(exhibitionService, times(1)).findFeatured();
    }

    @Test
    void testBySlug_WithSpecialCharacters_ReturnsExhibition() {
        // Arrange
        String slug = "l-atelier-ouvert";
        Exhibition specialExhibition = new Exhibition(
                "e-002",
                "L'atelier ouvert",
                slug,
                "Design Miami",
                "Miami",
                "États-Unis",
                LocalDate.of(2024, 12, 3),
                LocalDate.of(2024, 12, 8),
                "https://picsum.photos/seed/atelier-cover/1200/800",
                List.of(),
                "Hans Verlaat",
                "L'atelier reconstitué au cœur de la foire",
                "Description",
                List.of(),
                true
        );
        when(exhibitionService.findBySlug(slug)).thenReturn(Optional.of(specialExhibition));

        // Act
        ResponseEntity<Exhibition> result = exhibitionController.bySlug(slug);

        // Assert
        assertNotNull(result);
        assertTrue(result.getStatusCode().is2xxSuccessful());
        assertEquals(specialExhibition, result.getBody());
        verify(exhibitionService, times(1)).findBySlug(slug);
    }
}
