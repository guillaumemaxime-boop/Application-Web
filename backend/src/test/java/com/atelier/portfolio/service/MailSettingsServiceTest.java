package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.repository.MailSettingsRepository;
import com.atelier.portfolio.security.SecretCipher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MailSettingsServiceTest {

    @Mock private MailSettingsRepository repository;
    @Mock private SecretCipher cipher;

    private MailSettingsService service;

    @BeforeEach
    void setUp() {
        service = new MailSettingsService(repository, cipher);
    }

    private MailSettingsEntity existingEntity() {
        MailSettingsEntity e = new MailSettingsEntity();
        e.setId("default");
        e.setHost("smtp.example.com");
        e.setPort(587);
        e.setUsername("user@example.com");
        e.setPasswordEncrypted("iv:ct");
        e.setEncryption("STARTTLS");
        e.setFromAddress("noreply@example.com");
        e.setToAddress("studio@example.com");
        e.setUpdatedAt("2026-05-17T00:00:00Z");
        return e;
    }

    @Test
    void get_returnsViewWithMaskedPassword() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));

        MailSettingsView v = service.get();

        assertEquals("smtp.example.com", v.host());
        assertEquals(587, v.port());
        assertEquals("user@example.com", v.username());
        assertTrue(v.hasPassword(), "hasPassword must be true when password_encrypted is non-null");
        assertEquals("STARTTLS", v.encryption());
        assertEquals("noreply@example.com", v.fromAddress());
        assertEquals("studio@example.com", v.toAddress());
        assertEquals("2026-05-17T00:00:00Z", v.updatedAt());
    }

    @Test
    void get_emptyEntity_returnsViewWithHasPasswordFalse() {
        MailSettingsEntity empty = new MailSettingsEntity();
        empty.setId("default");
        empty.setEncryption("NONE");
        empty.setUpdatedAt("2026-05-17T00:00:00Z");
        when(repository.findById("default")).thenReturn(Optional.of(empty));

        MailSettingsView v = service.get();

        assertNull(v.host());
        assertFalse(v.hasPassword());
        assertEquals("NONE", v.encryption());
    }

    @Test
    void save_withNonEmptyPassword_encryptsAndStores() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cipher.encrypt("newsecret")).thenReturn("ENC");
        MailSettingsInput input = new MailSettingsInput(
                "smtp2.example.com", 465, "user2", "newsecret", "SSL",
                "from2@example.com", "to2@example.com");

        MailSettingsView v = service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        MailSettingsEntity saved = captor.getValue();
        assertEquals("smtp2.example.com", saved.getHost());
        assertEquals(465, saved.getPort());
        assertEquals("user2", saved.getUsername());
        assertEquals("ENC", saved.getPasswordEncrypted());
        assertEquals("SSL", saved.getEncryption());
        assertEquals("from2@example.com", saved.getFromAddress());
        assertEquals("to2@example.com", saved.getToAddress());
        assertNotNull(saved.getUpdatedAt());
        assertTrue(v.hasPassword());
    }

    @Test
    void save_withBlankPassword_keepsExistingEncryptedPassword() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        MailSettingsInput input = new MailSettingsInput(
                "smtp2.example.com", 587, "user", "", "STARTTLS",
                "from@example.com", "to@example.com");

        service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("iv:ct", captor.getValue().getPasswordEncrypted(),
                "blank password input must not overwrite existing encrypted password");
        verify(cipher, never()).encrypt(any());
    }

    @Test
    void save_withNullPassword_keepsExistingEncryptedPassword() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        MailSettingsInput input = new MailSettingsInput(
                "smtp2.example.com", 587, "user", null, "STARTTLS",
                "from@example.com", "to@example.com");

        service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("iv:ct", captor.getValue().getPasswordEncrypted());
        verify(cipher, never()).encrypt(any());
    }

    @Test
    void buildSender_whenConfigComplete_returnsConfiguredJavaMailSender() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(cipher.decrypt("iv:ct")).thenReturn("plain-pwd");

        JavaMailSender sender = service.buildSender();

        assertNotNull(sender);
        assertInstanceOf(JavaMailSenderImpl.class, sender);
        JavaMailSenderImpl impl = (JavaMailSenderImpl) sender;
        assertEquals("smtp.example.com", impl.getHost());
        assertEquals(587, impl.getPort());
        assertEquals("user@example.com", impl.getUsername());
        assertEquals("plain-pwd", impl.getPassword());
        assertEquals("true", impl.getJavaMailProperties().getProperty("mail.smtp.starttls.enable"));
        assertEquals("true", impl.getJavaMailProperties().getProperty("mail.smtp.auth"));
    }

    @Test
    void buildSender_whenHostMissing_returnsNull() {
        MailSettingsEntity empty = new MailSettingsEntity();
        empty.setId("default");
        empty.setEncryption("NONE");
        empty.setUpdatedAt("now");
        when(repository.findById("default")).thenReturn(Optional.of(empty));

        assertNull(service.buildSender());
    }

    @Test
    void buildSender_whenCipherDegraded_returnsNullAndDoesNotThrow() {
        when(repository.findById("default")).thenReturn(Optional.of(existingEntity()));
        when(cipher.decrypt("iv:ct")).thenThrow(new IllegalStateException("degraded"));

        assertNull(service.buildSender());
    }
}
