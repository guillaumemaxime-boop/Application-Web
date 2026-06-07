package com.atelier.portfolio.model;

import java.util.List;

public record Photo(
        String id,
        String filename,
        String originalName,
        String url,
        String uploadedAt,
        List<String> tags,
        String format,
        long sizeBytes
) {
}
