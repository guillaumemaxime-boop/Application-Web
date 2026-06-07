package com.atelier.portfolio.model;

import java.util.List;

public record NewsSlider(
        String id,
        String slug,
        String title,
        String zoneKey,
        List<String> storyIds
) {}
