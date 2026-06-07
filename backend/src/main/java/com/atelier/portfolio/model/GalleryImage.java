package com.atelier.portfolio.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

public record GalleryImage(
    @Size(max = 500) String url,
    @Valid ImageCrop crop
) {}
