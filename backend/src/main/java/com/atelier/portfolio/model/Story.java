package com.atelier.portfolio.model;

import java.time.Instant;

public record Story(
        String id,
        String ownerKind,
        String ownerId,
        String title,
        String coverImage,
        String slug,
        int position,
        Instant createdAt
) {}
