package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewsSliderInput(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 50) String zoneKey
) {}
