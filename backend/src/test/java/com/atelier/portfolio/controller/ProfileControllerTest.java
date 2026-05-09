package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.SiteContentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;

class ProfileControllerTest {

    private ProfileController profileController;

    @BeforeEach
    void setUp() {
        SiteContentService contentService = Mockito.mock(SiteContentService.class);
        Mockito.when(contentService.get(anyString(), anyString()))
                .thenAnswer(inv -> inv.getArgument(1));
        profileController = new ProfileController(contentService);
    }

    @Test
    void testProfile_ReturnsNotNull() {
        ProfileController.Profile result = profileController.profile();
        assertNotNull(result);
    }

    @Test
    void testProfile_ReturnsCorrectStudioName() {
        ProfileController.Profile result = profileController.profile();
        assertEquals("Milo GUILLAUME Design", result.studio());
    }

    @Test
    void testProfile_ReturnsCorrectTagline() {
        ProfileController.Profile result = profileController.profile();
        assertEquals("Mobilier sculpté & scénographies sensibles", result.tagline());
    }

    @Test
    void testProfile_ReturnsNonEmptyBio() {
        ProfileController.Profile result = profileController.profile();
        assertNotNull(result.bio());
        assertFalse(result.bio().isBlank());
        assertTrue(result.bio().contains("Milo GUILLAUME Design"));
        assertTrue(result.bio().contains("2017"));
    }

    @Test
    void testProfile_ReturnsCorrectContactEmail() {
        ProfileController.Profile result = profileController.profile();
        assertEquals("contact@miloguillaume.fr", result.contactEmail());
    }

    @Test
    void testProfile_ReturnsCorrectLocation() {
        ProfileController.Profile result = profileController.profile();
        assertEquals("Paris, France", result.location());
    }

    @Test
    void testProfile_ReturnsNonEmptyPress() {
        ProfileController.Profile result = profileController.profile();
        assertNotNull(result.press());
        assertFalse(result.press().isEmpty());
        assertEquals(3, result.press().size());
    }

    @Test
    void testProfile_PressContainsExpectedEntries() {
        ProfileController.Profile result = profileController.profile();
        List<ProfileController.PressItem> press = result.press();
        boolean hasADMagazine = press.stream().anyMatch(e -> e.title().contains("AD Magazine"));
        boolean hasWallpaper  = press.stream().anyMatch(e -> e.title().contains("Wallpaper*"));
        boolean hasLeMonde    = press.stream().anyMatch(e -> e.title().contains("Le Monde"));
        assertTrue(hasADMagazine);
        assertTrue(hasWallpaper);
        assertTrue(hasLeMonde);
    }

    @Test
    void testProfile_ReturnsNonEmptyAwards() {
        ProfileController.Profile result = profileController.profile();
        assertNotNull(result.awards());
        assertFalse(result.awards().isEmpty());
        assertEquals(2, result.awards().size());
    }

    @Test
    void testProfile_AwardsContainsExpectedEntries() {
        ProfileController.Profile result = profileController.profile();
        List<String> awards = result.awards();
        assertTrue(awards.stream().anyMatch(a -> a.contains("Liliane Bettencourt")));
        assertTrue(awards.stream().anyMatch(a -> a.contains("Wallpaper*")));
    }

    @Test
    void testProfile_AllFieldsArePopulated() {
        ProfileController.Profile result = profileController.profile();
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
        ProfileController.Profile result = profileController.profile();
        for (ProfileController.PressItem entry : result.press()) {
            assertNotNull(entry.title());
            assertNotNull(entry.year());
            assertFalse(entry.title().isBlank());
            assertFalse(entry.year().isBlank());
        }
    }
}
