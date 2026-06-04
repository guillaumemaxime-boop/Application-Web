package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StoryEntity;
import com.atelier.portfolio.repository.StoryRepository;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class MigrationDefaultStoriesTest {

    @Autowired StoryRepository storyRepo;
    @Autowired StorySlideRepository slideRepo;

    @Test
    @Transactional
    void seedCreatesOneStoryPerOwnerWithExistingSlides() {
        // Précondition : le seed initial (010-seed-stories.yaml) a créé des slides
        // pour certains owners. Après 023 puis 024, chaque slide pointe vers une story
        // (via story_id), donc chaque (ownerKind, ownerId) ayant des slides a >= 1 story.
        List<StoryEntity> allStories = storyRepo.findAll();
        assertThat(allStories).isNotEmpty();

        // Owners (via la story attachee a chaque slide)
        Set<String> ownersWithSlides = slideRepo.findAll().stream()
                .map(s -> s.getStory().getOwnerKind() + ":" + s.getStory().getOwnerId())
                .collect(Collectors.toSet());
        Set<String> ownersWithStory = allStories.stream()
                .map(s -> s.getOwnerKind() + ":" + s.getOwnerId())
                .collect(Collectors.toSet());

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

    @Test
    void seededSlugsAreReadableHumanSlugsNotTechnicalIds() {
        List<StoryEntity> stories = storyRepo.findAll();
        for (StoryEntity s : stories) {
            assertThat(s.getSlug())
                .as("slug should be human-readable, not 'f-XXX-principale' or 'e-XXX-principale'")
                .doesNotMatch("^[fe]-\\d+-principale$");
        }
    }
}
