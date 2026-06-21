package com.atelier.portfolio.model;

public record Video(
        String id, String status, String url, String poster, String hls,
        Double durationSeconds, Integer width, Integer height, String errorMessage) {}
