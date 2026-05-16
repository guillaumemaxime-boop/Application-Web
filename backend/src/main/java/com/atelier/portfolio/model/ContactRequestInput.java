package com.atelier.portfolio.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ContactRequestInput(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Email @Size(max = 300) String email,
        @Size(max = 50) String phone,
        @NotBlank @Pattern(regexp = "acquisition|order|press|other") String interest,
        @NotBlank @Size(min = 5, max = 5000) String message,
        @Size(max = 50) String furnitureId,
        @Size(max = 200) String furnitureSlug,
        @Size(max = 500) String furnitureTitle
) {
}
