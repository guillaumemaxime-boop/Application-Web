package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.service.StoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminStoriesControllerTest {

    @Mock private StoryService service;
    @InjectMocks private AdminStoriesController controller;

    @Test
    void list_returnsStoriesForOwner() {
        Story story = new Story("st-1", "furniture", "f-001", "Principale",
                "https://example.com/c.jpg", null, "tabouret-principale", 0, Instant.now());
        when(service.findByOwner("furniture", "f-001")).thenReturn(List.of(story));

        List<Story> result = controller.list("furniture", "f-001");

        assertEquals(1, result.size());
        assertSame(story, result.get(0));
    }

    @Test
    void create_delegatesToServiceAndReturnsCreatedStory() {
        StoryInput input = new StoryInput("furniture", "f-001", "Test", "https://example.com/c.jpg", null);
        Story created = new Story("st-new", "furniture", "f-001", "Test",
                "https://example.com/c.jpg", null, "f-001-abc", 1, Instant.now());
        when(service.create(input)).thenReturn(created);

        var response = controller.create(input);

        verify(service).create(input);
        assertEquals(200, response.getStatusCode().value());
        assertSame(created, response.getBody());
    }

    @Test
    void update_delegatesToServiceWithIdAndInput() {
        StoryInput input = new StoryInput("furniture", "f-001", "Renomme", "https://example.com/c.jpg", null);
        Story updated = new Story("st-1", "furniture", "f-001", "Renomme",
                "https://example.com/c.jpg", null, "tabouret-principale", 0, Instant.now());
        when(service.update("st-1", input)).thenReturn(updated);

        var response = controller.update("st-1", input);

        verify(service).update("st-1", input);
        assertEquals(200, response.getStatusCode().value());
        assertSame(updated, response.getBody());
    }

    @Test
    void updatePosition_delegatesAndReturnsNoContent() {
        var response = controller.updatePosition("st-1", 3);

        verify(service).updatePosition("st-1", 3);
        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void delete_delegatesAndReturnsNoContent() {
        var response = controller.delete("st-1");

        verify(service).delete("st-1");
        assertEquals(204, response.getStatusCode().value());
    }

    @Test
    void getSlides_returnsSlidesForStory() {
        Slide.ImageSlide image = new Slide.ImageSlide("s1", 0, "img.jpg", "Detail", null);
        when(service.findSlidesByStoryId("st-1")).thenReturn(List.of(image));

        List<Slide> result = controller.getSlides("st-1");

        assertEquals(1, result.size());
        assertSame(image, result.get(0));
    }

    @Test
    void replaceSlides_delegatesToServiceAndReturnsUpdatedSlides() {
        List<Slide> input = List.of(new Slide.ImageSlide(null, 0, "new.jpg", "Apercu", null));
        Slide.ImageSlide saved = new Slide.ImageSlide("s2", 0, "new.jpg", "Apercu", null);
        when(service.replaceSlides("st-1", input)).thenReturn(List.of(saved));

        var response = controller.replaceSlides("st-1", input);

        verify(service).replaceSlides("st-1", input);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
        assertSame(saved, response.getBody().get(0));
    }

    @Test
    void list_invalidKindThrowsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.list("invalid", "x"));
    }

    @Test
    void create_invalidKindThrowsIllegalArgument() {
        StoryInput input = new StoryInput("invalid", "f-001", "Test", "https://example.com/c.jpg", null);
        assertThrows(IllegalArgumentException.class,
                () -> controller.create(input));
    }

    @Test
    void all_delegatesToServiceAndReturnsAllStories() {
        Story s1 = new Story("st-1", "furniture", "f-001", "Story 1",
                "https://example.com/c.jpg", null, "f-001-abc", 0, Instant.now());
        Story s2 = new Story("st-2", "exhibition", "e-001", "Story 2",
                "https://example.com/c.jpg", null, "e-001-xyz", 0, Instant.now());
        when(service.findAll()).thenReturn(List.of(s1, s2));

        List<Story> result = controller.all();

        verify(service).findAll();
        assertEquals(2, result.size());
        assertSame(s1, result.get(0));
        assertSame(s2, result.get(1));
    }
}
