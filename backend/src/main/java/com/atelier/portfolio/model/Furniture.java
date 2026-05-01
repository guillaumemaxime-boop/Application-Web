package com.atelier.portfolio.model;

import java.util.List;

public record Furniture(
        String id,
        String title,
        String slug,
        String category,
        String material,
        Integer year,
        String coverImage,
        List<String> gallery,
        String shortDescription,
        String description,
        List<String> dimensions,
        String designer,
        boolean featured
) {
}
