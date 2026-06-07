package com.atelier.portfolio.model;

import jakarta.validation.Valid;
import java.time.Instant;

public record Story(
        String id,
        String ownerKind,
        String ownerId,
        String title,
        String coverImage,
        @Valid ImageCrop coverCrop,
        String slug,
        int position,
        Instant createdAt
) {}
