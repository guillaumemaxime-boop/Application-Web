package com.atelier.portfolio.service;

import com.atelier.portfolio.model.NewsSlider;
import com.atelier.portfolio.model.NewsSliderInput;
import com.atelier.portfolio.model.Story;
import com.atelier.portfolio.model.StoryInput;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class NewsSliderServiceTest {

    @Autowired NewsSliderService service;
    @Autowired StoryService stories;

    @Test
    void createSliderWithoutZoneIsAllowed() {
        NewsSlider s = service.create(new NewsSliderInput("Test slider", null));
        assertThat(s.zoneKey()).isNull();
    }

    @Test
    void createSliderWithZoneClaimsZone() {
        NewsSlider s = service.create(new NewsSliderInput("Top slider", "home-top"));
        assertThat(s.zoneKey()).isEqualTo("home-top");
    }

    @Test
    void assigningSecondSliderToSameZoneThrows409() {
        service.create(new NewsSliderInput("First", "home-top"));
        assertThatThrownBy(() -> service.create(new NewsSliderInput("Second", "home-top")))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void unknownZoneKeyRejected() {
        assertThatThrownBy(() -> service.create(new NewsSliderInput("Foo", "non-existant")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void replaceStoriesPreservesGivenOrder() {
        NewsSlider slider = service.create(new NewsSliderInput("Mix", null));
        Story s1 = stories.create(new StoryInput("furniture", "f-001", "S1", "https://e.com/c.jpg", null));
        Story s2 = stories.create(new StoryInput("furniture", "f-001", "S2", "https://e.com/c.jpg", null));
        NewsSlider updated = service.replaceStories(slider.id(), List.of(s2.id(), s1.id()));
        assertThat(updated.storyIds()).containsExactly(s2.id(), s1.id());
    }
}
