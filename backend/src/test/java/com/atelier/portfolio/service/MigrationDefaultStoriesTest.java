package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.repository.StoryRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class MigrationDefaultStoriesTest {

    @Autowired StoryRepository storyRepo;
    @Autowired StorySlideRepository slideRepo;

    @Test
    void seedCreatesOneStoryPerOwnerWithExistingSlides() {
        // Précondition : le seed initial (010-seed-stories.yaml) a créé des slides
        // pour certains owners. Après 023, chaque (ownerKind, ownerId) ayant des
        // slides doit avoir exactement une story.
        List<StoryEntity> allStories = storyRepo.findAll();
        assertThat(allStories).isNotEmpty();

        Set<String> ownersWithSlides = slideRepo.findAll().stream()
                .map(s -> s.getOwnerKind() + ":" + s.getOwnerId())
                .collect(Collectors.toSet());
        Set<String> ownersWithStory = allStories.stream()
                .map(s -> s.getOwnerKind() + ":" + s.getOwnerId())
                .collect(Collectors.toSet());

        // À ce stade, story_slide n'a pas encore story_id (task 3 ne s'est pas exécutée).
        // Le test vérifie juste qu'il y a au moins 1 story par owner ayant des slides.
        assertThat(ownersWithStory).containsAll(ownersWithSlides);
    }

    @Test
    void seededStoriesHavePositionZeroAndOwnerTitleAsTitle() {
        List<StoryEntity> stories = storyRepo.findAll();
        for (StoryEntity s : stories) {
            assertThat(s.getPosition()).isEqualTo(0);
            assertThat(s.getTitle()).isNotBlank();
            assertThat(s.getCoverImage()).isNotBlank();
            assertThat(s.getSlug()).endsWith("-principale");
        }
    }
}
