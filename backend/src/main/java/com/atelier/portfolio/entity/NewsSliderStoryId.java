package com.atelier.portfolio.entity;

import java.io.Serializable;
import java.util.Objects;

public class NewsSliderStoryId implements Serializable {
    private String slider;
    private String story;

    public NewsSliderStoryId() {}
    public NewsSliderStoryId(String slider, String story) { this.slider = slider; this.story = story; }

    public String getSlider() { return slider; }
    public void setSlider(String slider) { this.slider = slider; }
    public String getStory() { return story; }
    public void setStory(String story) { this.story = story; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof NewsSliderStoryId that)) return false;
        return Objects.equals(slider, that.slider) && Objects.equals(story, that.story);
    }

    @Override
    public int hashCode() { return Objects.hash(slider, story); }
}
