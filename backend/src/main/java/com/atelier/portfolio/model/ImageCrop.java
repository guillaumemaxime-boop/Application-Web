package com.atelier.portfolio.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record ImageCrop(
    @DecimalMin("0.0") @DecimalMax("100.0") Double x,
    @DecimalMin("0.0") @DecimalMax("100.0") Double y,
    @DecimalMin("0.0") @DecimalMax("100.0") Double w,
    @DecimalMin("0.0") @DecimalMax("100.0") Double h
) {
    /**
     * Renvoie {@code null} si les 4 coordonnees sont null, sinon un crop construit.
     * Helper pour les services qui assemblent un crop a partir de colonnes DB nullables.
     */
    public static ImageCrop ofNullable(Double x, Double y, Double w, Double h) {
        if (x == null && y == null && w == null && h == null) return null;
        return new ImageCrop(x, y, w, h);
    }
}
