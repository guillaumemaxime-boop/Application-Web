package com.atelier.portfolio.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "slider_story")
@IdClass(NewsSliderStoryId.class)
public class NewsSliderStoryEntity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slider_id", nullable = false)
    private NewsSliderEntity slider;

    @Id
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private StoryEntity story;

    @Column(nullable = false)
    private int position;

    public NewsSliderEntity getSlider() { return slider; }
    public void setSlider(NewsSliderEntity slider) { this.slider = slider; }
    public StoryEntity getStory() { return story; }
    public void setStory(StoryEntity story) { this.story = story; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}
