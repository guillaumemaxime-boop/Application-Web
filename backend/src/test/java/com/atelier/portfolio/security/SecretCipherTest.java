package com.atelier.portfolio.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SecretCipherTest {

    // Clé AES-256 base64 de 32 octets, déterministe pour les tests.
    private static final String VALID_KEY_B64 = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

    @Test
    void encrypt_thenDecrypt_returnsOriginalPlaintext() {
        SecretCipher cipher = new SecretCipher(VALID_KEY_B64);

        String enc = cipher.encrypt("hello-smtp-password");

        assertNotNull(enc);
        assertTrue(enc.contains(":"), "expected base64(iv) ':' base64(ct+tag)");
        assertEquals("hello-smtp-password", cipher.decrypt(enc));
    }

    @Test
    void encrypt_sameInputTwice_yieldsDifferentCiphertexts() {
        SecretCipher cipher = new SecretCipher(VALID_KEY_B64);

        String a = cipher.encrypt("same");
        String b = cipher.encrypt("same");

        assertNotEquals(a, b, "IV must be random per call");
        assertEquals("same", cipher.decrypt(a));
        assertEquals("same", cipher.decrypt(b));
    }

    @Test
    void constructor_rejectsKeyWithWrongLength() {
        // 16 octets en base64 — pas AES-256.
        String shortKey = "AAECAwQFBgcICQoLDA0ODw==";

        assertThrows(IllegalArgumentException.class, () -> new SecretCipher(shortKey));
    }

    @Test
    void degradedMode_whenKeyBlank_throwsOnEncryptAndDecrypt() {
        SecretCipher cipher = new SecretCipher("");

        assertTrue(cipher.isDegraded());
        assertThrows(IllegalStateException.class, () -> cipher.encrypt("x"));
        assertThrows(IllegalStateException.class, () -> cipher.decrypt("x"));
    }

    @Test
    void decrypt_rejectsTamperedCiphertext() {
        SecretCipher cipher = new SecretCipher(VALID_KEY_B64);
        String enc = cipher.encrypt("payload");
        // Modifie un caractère après le ':' pour casser le tag GCM.
        int sep = enc.indexOf(':');
        char swap = enc.charAt(sep + 1) == 'A' ? 'B' : 'A';
        String tampered = enc.substring(0, sep + 1) + swap + enc.substring(sep + 2);

        assertThrows(IllegalStateException.class, () -> cipher.decrypt(tampered));
    }
}
