package com.atelier.portfolio.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record GalleryImage(
    @Size(max = 500) String url,
    @Valid ImageCrop crop,
    @Min(1) @Max(3) Integer colSpan,
    @Min(1) @Max(4) Integer rowSpan
) {}
