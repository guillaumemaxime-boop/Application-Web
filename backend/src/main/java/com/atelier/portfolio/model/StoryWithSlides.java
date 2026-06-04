package com.atelier.portfolio.model;

import java.util.List;

public record StoryWithSlides(
        Story story,
        List<Slide> slides
) {}
