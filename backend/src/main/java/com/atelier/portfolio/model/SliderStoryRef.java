package com.atelier.portfolio.model;

public record SliderStoryRef(
        String id,
        String slug,
        String title,
        String coverImage,
        String ownerKind,
        String ownerId,
        String ownerLabel
) {}
