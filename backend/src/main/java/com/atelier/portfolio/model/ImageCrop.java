package com.atelier.portfolio.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record ImageCrop(
    @DecimalMin("0.0") @DecimalMax("100.0") Double x,
    @DecimalMin("0.0") @DecimalMax("100.0") Double y,
    @DecimalMin("0.0") @DecimalMax("100.0") Double w,
    @DecimalMin("0.0") @DecimalMax("100.0") Double h
) {}
