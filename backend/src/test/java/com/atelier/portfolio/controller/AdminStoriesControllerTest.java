package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.service.StoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminStoriesControllerTest {

    @Mock private StoryService service;
    @InjectMocks private AdminStoriesController controller;

    @Test
    void get_returnsSlidesForOwner() {
        Slide.CoverSlide cover = new Slide.CoverSlide("s1", 0, "cover.jpg");
        when(service.findByOwner("furniture", "f-001")).thenReturn(List.of(cover));

        List<Slide> result = controller.get("furniture", "f-001");

        assertEquals(1, result.size());
        assertSame(cover, result.get(0));
    }

    @Test
    void replace_callsServiceAndReturnsUpdatedSlides() {
        List<Slide> input = List.of(new Slide.CoverSlide(null, 0, "new.jpg"));
        Slide.CoverSlide saved = new Slide.CoverSlide("s2", 0, "new.jpg");
        when(service.findByOwner("furniture", "f-001")).thenReturn(List.of(saved));

        var response = controller.replace("furniture", "f-001", input);

        verify(service).replaceSlides("furniture", "f-001", input);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void invalidKind_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.get("invalid", "x"));
    }
}
