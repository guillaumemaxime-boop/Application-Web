package com.atelier.portfolio.model;

public record Photo(
        String id,
        String filename,
        String originalName,
        String url,
        String uploadedAt
) {
}
