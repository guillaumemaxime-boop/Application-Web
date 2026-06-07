package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryWithSlides;
import com.atelier.portfolio.service.StoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoryControllerTest {

    @Mock StoryService stories;
    @InjectMocks StoryController controller;

    @Test
    void listDelegatesToService() {
        when(stories.findByOwner("furniture", "f-001")).thenReturn(List.of());
        assertThat(controller.list("furniture", "f-001")).isEmpty();
    }

    @Test
    void bySlugReturns200WhenFound() {
        Story s = new Story("st-1", "furniture", "f-001", "T", "c.jpg", null, "test-slug", 0, Instant.now());
        when(stories.findBySlugWithSlides("test-slug")).thenReturn(Optional.of(new StoryWithSlides(s, List.of(), true, "test-slug")));
        assertThat(controller.bySlug("test-slug").getStatusCode().value()).isEqualTo(200);
    }

    @Test
    void bySlugReturns404WhenNotFound() {
        when(stories.findBySlugWithSlides("absent")).thenReturn(Optional.empty());
        assertThat(controller.bySlug("absent").getStatusCode().value()).isEqualTo(404);
    }
}
