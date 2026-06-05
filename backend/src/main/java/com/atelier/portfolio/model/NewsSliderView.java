package com.atelier.portfolio.model;

import java.util.List;

public record NewsSliderView(
        String id,
        String slug,
        String title,
        String zoneKey,
        List<SliderStoryRef> stories
) {}
