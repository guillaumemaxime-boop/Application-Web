package com.atelier.portfolio.service;

import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import com.atelier.portfolio.model.StoryWithSlides;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class StoryServiceTest {

    @Autowired StoryService service;

    @Test
    void createStoryAssignsIncrementalPosition() {
        // Note : utiliser 'f-001' (id technique present dans le seed) au lieu d'un slug
        Story s1 = service.create(new StoryInput("furniture", "f-001", "Story extra 1", "https://example.com/c.jpg"));
        Story s2 = service.create(new StoryInput("furniture", "f-001", "Story extra 2", "https://example.com/c.jpg"));
        assertThat(s2.position()).isGreaterThan(s1.position());
    }

    @Test
    void createStoryGeneratesUniqueSlug() {
        Story s1 = service.create(new StoryInput("furniture", "f-001", "Premiere", "https://example.com/c.jpg"));
        Story s2 = service.create(new StoryInput("furniture", "f-001", "Deuxieme", "https://example.com/c.jpg"));
        assertThat(s1.slug()).isNotEqualTo(s2.slug());
    }

    @Test
    void findByOwnerReturnsStoriesInPositionOrder() {
        // Apres seed 023, f-001 a au moins 1 story (« principale »)
        List<Story> stories = service.findByOwner("furniture", "f-001");
        assertThat(stories).isNotEmpty();
        for (int i = 1; i < stories.size(); i++) {
            assertThat(stories.get(i).position()).isGreaterThanOrEqualTo(stories.get(i - 1).position());
        }
    }

    @Test
    void replaceSlidesAttachesSlidesToStory() {
        Story s = service.create(new StoryInput("furniture", "f-001", "Test", "https://example.com/c.jpg"));
        service.replaceSlides(s.id(), List.of(
                new Slide.ImageSlide(null, 0, "https://example.com/1.jpg", "Caption 1"),
                new Slide.ImageSlide(null, 1, "https://example.com/2.jpg", "Caption 2")
        ));
        StoryWithSlides loaded = service.findBySlugWithSlides(s.slug()).orElseThrow();
        assertThat(loaded.slides()).hasSize(2);
    }

    @Test
    void deleteStoryRemovesItAndCascadesSlides() {
        Story s = service.create(new StoryInput("furniture", "f-001", "Tmp", "https://example.com/c.jpg"));
        service.replaceSlides(s.id(), List.of(new Slide.ImageSlide(null, 0, "https://example.com/x.jpg", null)));
        service.delete(s.id());
        assertThatThrownBy(() -> service.update(s.id(), new StoryInput("furniture", "f-001", "X", "https://example.com/c.jpg")))
                .isInstanceOf(RuntimeException.class);
    }
}
