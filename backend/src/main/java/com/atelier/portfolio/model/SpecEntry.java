package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpecEntry(
        @NotBlank @Size(max = 100) String label,
        @NotBlank @Size(max = 200) String value
) {}
