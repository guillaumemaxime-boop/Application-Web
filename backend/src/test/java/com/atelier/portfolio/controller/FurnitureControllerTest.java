package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Furniture;
import com.atelier.portfolio.service.FurnitureService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FurnitureControllerTest {

    @Mock
    private FurnitureService furnitureService;

    @InjectMocks
    private FurnitureController furnitureController;

    private Furniture sampleFurniture;
    private List<Furniture> sampleFurnitureList;
    private List<String> sampleCategories;

    @BeforeEach
    void setUp() {
        sampleFurniture = new Furniture(
                "f-001",
                "Onde — Fauteuil sculpté",
                "onde-fauteuil-sculpte",
                "Sièges",
                "Chêne massif & cuir tanné",
                2024,
                "https://picsum.photos/seed/onde-cover/1200/800",
                List.of("https://picsum.photos/seed/onde-1/1200/800"),
                "Une silhouette inspirée du mouvement de la mer",
                "Description détaillée",
                List.of("Hauteur 92 cm", "Largeur 78 cm"),
                "Milo GUILLAUME Design",
                true
        );

        sampleFurnitureList = List.of(sampleFurniture);
        sampleCategories = List.of("Sièges", "Tables", "Rangements");
    }

    @Test
    void testAll_ReturnsAllFurniture() {
        // Arrange
        when(furnitureService.findAll()).thenReturn(sampleFurnitureList);

        // Act
        List<Furniture> result = furnitureController.all();

        // Assert
        assertNotNull(result);
        assertEquals(sampleFurnitureList, result);
        verify(furnitureService, times(1)).findAll();
    }

    @Test
    void testFeatured_ReturnsFeaturedFurniture() {
        // Arrange
        when(furnitureService.findFeatured()).thenReturn(sampleFurnitureList);

        // Act
        List<Furniture> result = furnitureController.featured();

        // Assert
        assertNotNull(result);
        assertEquals(sampleFurnitureList, result);
        verify(furnitureService, times(1)).findFeatured();
    }

    @Test
    void testCategories_ReturnsAllCategories() {
        // Arrange
        when(furnitureService.categories()).thenReturn(sampleCategories);

        // Act
        List<String> result = furnitureController.categories();

        // Assert
        assertNotNull(result);
        assertEquals(sampleCategories, result);
        verify(furnitureService, times(1)).categories();
    }

    @Test
    void testBySlug_ExistingSlug_ReturnsFurniture() {
        // Arrange
        String slug = "onde-fauteuil-sculpte";
        when(furnitureService.findBySlug(slug)).thenReturn(Optional.of(sampleFurniture));

        // Act
        ResponseEntity<Furniture> result = furnitureController.bySlug(slug);

        // Assert
        assertNotNull(result);
        assertTrue(result.getStatusCode().is2xxSuccessful());
        assertEquals(sampleFurniture, result.getBody());
        verify(furnitureService, times(1)).findBySlug(slug);
    }

    @Test
    void testBySlug_NonExistingSlug_ReturnsNotFound() {
        // Arrange
        String slug = "non-existent-slug";
        when(furnitureService.findBySlug(slug)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<Furniture> result = furnitureController.bySlug(slug);

        // Assert
        assertNotNull(result);
        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
        verify(furnitureService, times(1)).findBySlug(slug);
    }

    @Test
    void testAll_EmptyList_ReturnsEmptyList() {
        // Arrange
        when(furnitureService.findAll()).thenReturn(List.of());

        // Act
        List<Furniture> result = furnitureController.all();

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(furnitureService, times(1)).findAll();
    }

    @Test
    void testFeatured_EmptyList_ReturnsEmptyList() {
        // Arrange
        when(furnitureService.findFeatured()).thenReturn(List.of());

        // Act
        List<Furniture> result = furnitureController.featured();

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(furnitureService, times(1)).findFeatured();
    }

    @Test
    void testCreate_ReturnsCreatedWithLocationHeader() {
        when(furnitureService.create(sampleFurniture)).thenReturn(sampleFurniture);

        ResponseEntity<Furniture> result = furnitureController.create(sampleFurniture);

        assertEquals(201, result.getStatusCode().value());
        assertEquals(sampleFurniture, result.getBody());
        assertNotNull(result.getHeaders().getLocation());
        assertEquals("/api/furniture/" + sampleFurniture.slug(), result.getHeaders().getLocation().toString());
        verify(furnitureService, times(1)).create(sampleFurniture);
    }

    @Test
    void testUpdate_ExistingSlug_ReturnsOk() {
        String slug = sampleFurniture.slug();
        when(furnitureService.update(slug, sampleFurniture)).thenReturn(Optional.of(sampleFurniture));

        ResponseEntity<Furniture> result = furnitureController.update(slug, sampleFurniture);

        assertTrue(result.getStatusCode().is2xxSuccessful());
        assertEquals(sampleFurniture, result.getBody());
        verify(furnitureService, times(1)).update(slug, sampleFurniture);
    }

    @Test
    void testUpdate_NonExistingSlug_ReturnsNotFound() {
        String slug = "missing";
        when(furnitureService.update(slug, sampleFurniture)).thenReturn(Optional.empty());

        ResponseEntity<Furniture> result = furnitureController.update(slug, sampleFurniture);

        assertEquals(404, result.getStatusCode().value());
        verify(furnitureService, times(1)).update(slug, sampleFurniture);
    }

    @Test
    void testDelete_ExistingSlug_ReturnsNoContent() {
        String slug = sampleFurniture.slug();
        when(furnitureService.deleteBySlug(slug)).thenReturn(true);

        ResponseEntity<Void> result = furnitureController.delete(slug);

        assertEquals(204, result.getStatusCode().value());
        verify(furnitureService, times(1)).deleteBySlug(slug);
    }

    @Test
    void testDelete_NonExistingSlug_ReturnsNotFound() {
        String slug = "missing";
        when(furnitureService.deleteBySlug(slug)).thenReturn(false);

        ResponseEntity<Void> result = furnitureController.delete(slug);

        assertEquals(404, result.getStatusCode().value());
        verify(furnitureService, times(1)).deleteBySlug(slug);
    }

    @Test
    void testCategories_EmptyList_ReturnsEmptyList() {
        // Arrange
        when(furnitureService.categories()).thenReturn(List.of());

        // Act
        List<String> result = furnitureController.categories();

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(furnitureService, times(1)).categories();
    }
}
