package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImageCropTest {

    @Test
    void crop_construit_avec_valeurs_valides() {
        ImageCrop crop = new ImageCrop(10.0, 20.0, 60.0, 40.0);
        assertThat(crop.x()).isEqualTo(10.0);
        assertThat(crop.y()).isEqualTo(20.0);
        assertThat(crop.w()).isEqualTo(60.0);
        assertThat(crop.h()).isEqualTo(40.0);
    }

    @Test
    void crop_accepte_null_partout() {
        ImageCrop crop = new ImageCrop(null, null, null, null);
        assertThat(crop.x()).isNull();
        assertThat(crop.y()).isNull();
        assertThat(crop.w()).isNull();
        assertThat(crop.h()).isNull();
    }

    @Test
    void crop_equals_et_hashcode_coherents() {
        ImageCrop a = new ImageCrop(10.0, 20.0, 60.0, 40.0);
        ImageCrop b = new ImageCrop(10.0, 20.0, 60.0, 40.0);
        ImageCrop c = new ImageCrop(11.0, 20.0, 60.0, 40.0);
        assertThat(a).isEqualTo(b);
        assertThat(a.hashCode()).isEqualTo(b.hashCode());
        assertThat(a).isNotEqualTo(c);
    }
}
