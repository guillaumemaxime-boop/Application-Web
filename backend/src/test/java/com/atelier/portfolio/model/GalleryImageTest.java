package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GalleryImageTest {

    @Test
    void item_construit_avec_url_et_crop() {
        GalleryImage item = new GalleryImage("/uploads/a.jpg", new ImageCrop(0.0, 0.0, 100.0, 100.0), 1, 1);
        assertThat(item.url()).isEqualTo("/uploads/a.jpg");
        assertThat(item.crop().w()).isEqualTo(100.0);
    }

    @Test
    void item_accepte_crop_null() {
        GalleryImage item = new GalleryImage("/uploads/a.jpg", null, 1, 1);
        assertThat(item.crop()).isNull();
    }

    @Test
    void item_equals_compare_url_et_crop() {
        GalleryImage a = new GalleryImage("/x.jpg", null, 1, 1);
        GalleryImage b = new GalleryImage("/x.jpg", null, 1, 1);
        GalleryImage c = new GalleryImage("/x.jpg", new ImageCrop(0.0, 0.0, 50.0, 50.0), 1, 1);
        assertThat(a).isEqualTo(b);
        assertThat(a).isNotEqualTo(c);
    }
}
