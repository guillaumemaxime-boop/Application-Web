package com.atelier.portfolio.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record Furniture(
        @Size(max = 50) String id,
        @NotBlank @Size(max = 500) String title,
        @Size(max = 200) String slug,
        @NotBlank @Size(max = 100) String category,
        @Size(max = 100) String material,
        @Min(1900) @Max(2100) Integer year,
        @Size(max = 500) String coverImage,
        @DecimalMin("0.0") @DecimalMax("100.0") Double coverFocalX,
        @DecimalMin("0.0") @DecimalMax("100.0") Double coverFocalY,
        @Size(max = 50) List<String> gallery,
        @Size(max = 1000) String shortDescription,
        @Size(max = 10000) String description,
        @Size(max = 20) List<String> dimensions,
        @Size(max = 200) String designer,
        boolean featured,
        boolean showStoryLink,
        boolean showStoryButton,
        List<Slide> slides,
        @Size(max = 30) List<@Size(max = 255) String> tags
) {
}
