package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record Exhibition(
        @Size(max = 50) String id,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 200) String slug,
        @Size(max = 200) String venue,
        @Size(max = 100) String city,
        @Size(max = 100) String country,
        LocalDate startDate,
        LocalDate endDate,
        @Size(max = 500) String coverImage,
        @Size(max = 50) List<String> gallery,
        @Size(max = 200) String curator,
        @Size(max = 1000) String shortDescription,
        @Size(max = 10000) String description,
        @Size(max = 30) List<String> tags,
        boolean featured,
        boolean showStoryLink,
        boolean showStoryButton,
        List<Slide> slides
) {
}
