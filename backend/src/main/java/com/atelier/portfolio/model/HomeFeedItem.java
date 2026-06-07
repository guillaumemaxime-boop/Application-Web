package com.atelier.portfolio.model;
public record HomeFeedItem(
        String kind,
        String slug,
        String title,
        String cover,
        ImageCrop coverCrop,
        String subtitle,
        String description
) {}
