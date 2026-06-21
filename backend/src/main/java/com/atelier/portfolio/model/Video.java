package com.atelier.portfolio.model;

public record Video(
        String id, String status, String url, String poster,
        Double durationSeconds, Integer width, Integer height, String errorMessage) {}
