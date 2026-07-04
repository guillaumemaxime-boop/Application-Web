package com.atelier.portfolio.model;

import java.util.List;

public record VideoSummary(
        String id, String status, String originalName,
        String url, String poster, String hls,
        Double durationSeconds, Integer width, Integer height,
        String createdAt, String errorMessage,
        List<VideoUsage> usedBy) {}
