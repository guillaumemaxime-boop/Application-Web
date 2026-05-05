package com.atelier.portfolio.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Size(max = 50) String username,
        @NotBlank @Size(min = 1, max = 256) String password
) {}
