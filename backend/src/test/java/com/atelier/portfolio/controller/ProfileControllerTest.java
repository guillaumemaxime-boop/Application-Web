package com.atelier.portfolio.controller;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ProfileControllerTest {

    private final ProfileController profileController = new ProfileController();

    @Test
    void testProfile_ReturnsNotNull() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertNotNull(result);
    }

    @Test
    void testProfile_ReturnsCorrectStudioName() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertEquals("Atelier Lumen", result.studio());
    }

    @Test
    void testProfile_ReturnsCorrectTagline() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertEquals("Mobilier sculpté & scénographies sensibles", result.tagline());
    }

    @Test
    void testProfile_ReturnsNonEmptyBio() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertNotNull(result.bio());
        assertFalse(result.bio().isEmpty());
        assertTrue(result.bio().contains("Atelier Lumen"));
        assertTrue(result.bio().contains("2017"));
    }

    @Test
    void testProfile_ReturnsCorrectContactEmail() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertEquals("studio@atelier-lumen.fr", result.contactEmail());
    }

    @Test
    void testProfile_ReturnsCorrectLocation() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertEquals("Lyon, France", result.location());
    }

    @Test
    void testProfile_ReturnsNonEmptyPress() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertNotNull(result.press());
        assertFalse(result.press().isEmpty());
        assertEquals(3, result.press().size());
    }

    @Test
    void testProfile_PressContainsExpectedEntries() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        List<Map<String, String>> press = result.press();
        boolean hasADMagazine = press.stream()
                .anyMatch(entry -> entry.get("title").contains("AD Magazine"));
        boolean hasWallpaper = press.stream()
                .anyMatch(entry -> entry.get("title").contains("Wallpaper*"));
        boolean hasLeMonde = press.stream()
                .anyMatch(entry -> entry.get("title").contains("Le Monde"));

        assertTrue(hasADMagazine);
        assertTrue(hasWallpaper);
        assertTrue(hasLeMonde);
    }

    @Test
    void testProfile_ReturnsNonEmptyAwards() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertNotNull(result.awards());
        assertFalse(result.awards().isEmpty());
        assertEquals(2, result.awards().size());
    }

    @Test
    void testProfile_AwardsContainsExpectedEntries() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        List<String> awards = result.awards();
        boolean hasLilianeBettencourt = awards.stream()
                .anyMatch(award -> award.contains("Liliane Bettencourt"));
        boolean hasWallpaperAwards = awards.stream()
                .anyMatch(award -> award.contains("Wallpaper*"));

        assertTrue(hasLilianeBettencourt);
        assertTrue(hasWallpaperAwards);
    }

    @Test
    void testProfile_AllFieldsArePopulated() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        assertNotNull(result.studio());
        assertNotNull(result.tagline());
        assertNotNull(result.bio());
        assertNotNull(result.contactEmail());
        assertNotNull(result.location());
        assertNotNull(result.press());
        assertNotNull(result.awards());
    }

    @Test
    void testProfile_PressEntriesHaveRequiredFields() {
        // Act
        ProfileController.Profile result = profileController.profile();

        // Assert
        for (Map<String, String> entry : result.press()) {
            assertTrue(entry.containsKey("title"));
            assertTrue(entry.containsKey("year"));
            assertNotNull(entry.get("title"));
            assertNotNull(entry.get("year"));
            assertFalse(entry.get("title").isEmpty());
            assertFalse(entry.get("year").isEmpty());
        }
    }
}
