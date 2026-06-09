package com.atelier.portfolio.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record HomeFeedCoverCropRequest(
    @NotNull @Pattern(regexp = "furniture|exhibition") String kind,
    @NotBlank String slug,
    @Valid ImageCrop crop
) {}
