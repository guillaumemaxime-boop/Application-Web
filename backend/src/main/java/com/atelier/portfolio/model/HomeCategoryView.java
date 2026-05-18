package com.atelier.portfolio.model;
import java.util.List;
public record HomeCategoryView(
        String category,
        String slug,
        String cover,
        List<String> itemSlugs
) {}
