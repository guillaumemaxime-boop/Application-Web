package com.atelier.portfolio.model;

import java.time.LocalDate;
import java.util.List;

public record Exhibition(
        String id,
        String title,
        String slug,
        String venue,
        String city,
        String country,
        LocalDate startDate,
        LocalDate endDate,
        String coverImage,
        List<String> gallery,
        String curator,
        String shortDescription,
        String description,
        List<String> tags,
        boolean featured
) {
}
