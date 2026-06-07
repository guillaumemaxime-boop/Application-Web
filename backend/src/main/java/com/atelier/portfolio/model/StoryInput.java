package com.atelier.portfolio.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoryInput(
        @NotBlank @Size(max = 20) String ownerKind,
        @NotBlank @Size(max = 50) String ownerId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 500) String coverImage,
        @Valid ImageCrop coverCrop
) {}
