package com.atelier.portfolio.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PhotoTest {

    private static final String ID           = "ph-abc12345";
    private static final String FILENAME     = "8f3a1b2c-uuid.jpg";
    private static final String ORIGINAL     = "portrait-studio.jpg";
    private static final String URL          = "/api/photos/files/8f3a1b2c-uuid.jpg";
    private static final String UPLOADED_AT  = "2026-05-10T18:47:54.746Z";
    private static final List<String> TAGS   = List.of();

    private Photo sample() {
        return new Photo(ID, FILENAME, ORIGINAL, URL, UPLOADED_AT, TAGS);
    }

    @Test
    void testRecordCreation_AllFieldsAccessible() {
        Photo photo = sample();

        assertEquals(ID, photo.id());
        assertEquals(FILENAME, photo.filename());
        assertEquals(ORIGINAL, photo.originalName());
        assertEquals(URL, photo.url());
        assertEquals(UPLOADED_AT, photo.uploadedAt());
        assertEquals(TAGS, photo.tags());
    }

    @Test
    void testEquality_SameValues_AreEqual() {
        Photo a = sample();
        Photo b = sample();

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
    }

    @Test
    void testEquality_DifferentId_AreNotEqual() {
        Photo a = sample();
        Photo b = new Photo("ph-different", FILENAME, ORIGINAL, URL, UPLOADED_AT, TAGS);

        assertNotEquals(a, b);
    }

    @Test
    void testEquality_DifferentUrl_AreNotEqual() {
        Photo a = sample();
        Photo b = new Photo(ID, FILENAME, ORIGINAL, "/api/photos/files/other.jpg", UPLOADED_AT, TAGS);

        assertNotEquals(a, b);
    }

    @Test
    void testToString_ContainsFieldValues() {
        String str = sample().toString();

        assertTrue(str.contains(ID));
        assertTrue(str.contains(FILENAME));
        assertTrue(str.contains(ORIGINAL));
    }

    @Test
    void testNullableFields_AcceptNull() {
        Photo photo = new Photo(ID, FILENAME, null, URL, null, TAGS);

        assertNull(photo.originalName());
        assertNull(photo.uploadedAt());
    }

    @Test
    void testEquality_NullFieldsMatch() {
        Photo a = new Photo(ID, FILENAME, null, URL, null, TAGS);
        Photo b = new Photo(ID, FILENAME, null, URL, null, TAGS);

        assertEquals(a, b);
    }
}
