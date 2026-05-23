package com.atelier.portfolio.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class SecretCipher {

    private static final Logger log = LoggerFactory.getLogger(SecretCipher.class);
    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;        // 96 bits
    private static final int TAG_LENGTH_BITS = 128;
    private static final int KEY_LENGTH = 32;       // AES-256

    private final SecretKeySpec key;
    private final boolean degraded;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${app.secrets.key:}") String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            log.warn("APP_SECRETS_KEY is not set — SecretCipher in degraded mode, mail config will not be usable");
            this.key = null;
            this.degraded = true;
            return;
        }
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("APP_SECRETS_KEY is not valid base64", ex);
        }
        if (raw.length != KEY_LENGTH) {
            throw new IllegalArgumentException(
                    "APP_SECRETS_KEY must decode to " + KEY_LENGTH + " bytes (AES-256); got " + raw.length);
        }
        this.key = new SecretKeySpec(raw, "AES");
        this.degraded = false;
    }

    public boolean isDegraded() {
        return degraded;
    }

    public String encrypt(String clear) {
        if (degraded) {
            throw new IllegalStateException("SecretCipher is in degraded mode (APP_SECRETS_KEY not set)");
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ct = cipher.doFinal(clear.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(ct);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Encryption failure", ex);
        }
    }

    public String decrypt(String stored) {
        if (degraded) {
            throw new IllegalStateException("SecretCipher is in degraded mode (APP_SECRETS_KEY not set)");
        }
        int sep = stored.indexOf(':');
        if (sep < 0) {
            throw new IllegalStateException("Stored ciphertext is malformed (missing ':')");
        }
        try {
            byte[] iv = Base64.getDecoder().decode(stored.substring(0, sep));
            byte[] ct = Base64.getDecoder().decode(stored.substring(sep + 1));
            Cipher cipher = Cipher.getInstance(ALGO);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("Decryption failure", ex);
        }
    }
}
