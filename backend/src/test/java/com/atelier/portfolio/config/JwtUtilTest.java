package com.atelier.portfolio.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String SECRET = "portfolio-test-secret-key-used-only-in-unit-tests";
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, 3_600_000L); // 1 heure
    }

    @Test
    void testGenerateToken_ReturnsNonNullToken() {
        String token = jwtUtil.generateToken("admin");

        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void testGenerateToken_HasThreeParts() {
        String token = jwtUtil.generateToken("admin");

        assertEquals(3, token.split("\\.").length, "Un JWT doit comporter 3 parties séparées par des points");
    }

    @Test
    void testExtractUsername_ReturnsCorrectSubject() {
        String token = jwtUtil.generateToken("admin");

        assertEquals("admin", jwtUtil.extractUsername(token));
    }

    @Test
    void testIsValid_FreshToken_ReturnsTrue() {
        String token = jwtUtil.generateToken("admin");

        assertTrue(jwtUtil.isValid(token));
    }

    @Test
    void testIsValid_ExpiredToken_ReturnsFalse() {
        JwtUtil expiredUtil = new JwtUtil(SECRET, -1000L); // expiration dans le passé
        String token = expiredUtil.generateToken("admin");

        assertFalse(jwtUtil.isValid(token));
    }

    @Test
    void testIsValid_GarbageString_ReturnsFalse() {
        assertFalse(jwtUtil.isValid("not.a.jwt"));
    }

    @Test
    void testIsValid_EmptyString_ReturnsFalse() {
        assertFalse(jwtUtil.isValid(""));
    }

    @Test
    void testIsValid_TokenSignedWithDifferentSecret_ReturnsFalse() {
        JwtUtil otherUtil = new JwtUtil("completely-different-secret-key-at-least-32-chars", 3_600_000L);
        String token = otherUtil.generateToken("admin");

        assertFalse(jwtUtil.isValid(token));
    }

    @Test
    void testGetExpirationMs_ReturnsConfiguredValue() {
        assertEquals(3_600_000L, jwtUtil.getExpirationMs());
    }

    @Test
    void testGenerateToken_DifferentUsers_ProduceDifferentTokens() {
        String t1 = jwtUtil.generateToken("admin");
        String t2 = jwtUtil.generateToken("other");

        assertNotEquals(t1, t2);
    }
}
