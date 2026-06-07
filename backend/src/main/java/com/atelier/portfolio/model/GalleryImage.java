package com.atelier.portfolio.model;

import jakarta.validation.constraints.Size;

public record GalleryImage(
    @Size(max = 500) String url,
    ImageCrop crop
) {}
