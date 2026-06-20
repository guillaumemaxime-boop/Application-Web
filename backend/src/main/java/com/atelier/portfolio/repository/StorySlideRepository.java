package com.atelier.portfolio.repository;

import com.atelier.portfolio.entity.StorySlideEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface StorySlideRepository extends JpaRepository<StorySlideEntity, String> {
    List<StorySlideEntity> findByStoryIdOrderByPosition(String storyId);
    void deleteByStoryId(String storyId);

    /** Ids des stories ayant au moins un slide (pour ne proposer que des stories non vides). */
    @Query("select distinct s.story.id from StorySlideEntity s")
    List<String> findDistinctStoryIdsWithSlides();

    /** [storyId, count] des slides groupes par story. */
    @Query("select s.story.id, count(s) from StorySlideEntity s group by s.story.id")
    List<Object[]> countSlidesByStory();
}
