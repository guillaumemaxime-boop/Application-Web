package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.repository.MailSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MailSettingsServiceTest {

    @Mock private MailSettingsRepository repository;
    @Mock private MailSender mailSender;

    private MailSettingsService service;

    @BeforeEach
    void setUp() {
        service = new MailSettingsService(repository, mailSender);
    }

    private MailSettingsEntity existing() {
        MailSettingsEntity e = new MailSettingsEntity();
        e.setId("default");
        e.setFromAddress("from@example.com");
        e.setToAddress("to@example.com");
        e.setUpdatedAt("2026-05-24T00:00:00Z");
        return e;
    }

    @Test
    void get_returnsViewWithApiKeyConfiguredTrueWhenServiceIsConfigured() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(mailSender.isConfigured()).thenReturn(true);

        MailSettingsView v = service.get();

        assertEquals("from@example.com", v.fromAddress());
        assertEquals("to@example.com", v.toAddress());
        assertTrue(v.apiKeyConfigured());
        assertEquals("2026-05-24T00:00:00Z", v.updatedAt());
    }

    @Test
    void get_apiKeyConfiguredFalseWhenServiceIsDegraded() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(mailSender.isConfigured()).thenReturn(false);

        assertFalse(service.get().apiKeyConfigured());
    }

    @Test
    void save_updatesFromAndToOnly() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(repository.save(any(MailSettingsEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mailSender.isConfigured()).thenReturn(true);
        MailSettingsInput input = new MailSettingsInput("new-from@example.com", "new-to@example.com");

        MailSettingsView v = service.save(input);

        ArgumentCaptor<MailSettingsEntity> captor = ArgumentCaptor.forClass(MailSettingsEntity.class);
        verify(repository).save(captor.capture());
        MailSettingsEntity saved = captor.getValue();
        assertEquals("new-from@example.com", saved.getFromAddress());
        assertEquals("new-to@example.com", saved.getToAddress());
        assertNotNull(saved.getUpdatedAt());
        assertEquals("new-from@example.com", v.fromAddress());
    }

    @Test
    void sendTest_callsResendWithStoredFromTo() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(mailSender.isConfigured()).thenReturn(true);
        when(mailSender.send(
                eq("from@example.com"), eq("to@example.com"), eq("from@example.com"),
                any(), any()
        )).thenReturn(true);

        MailTestResult result = service.sendTest();

        assertTrue(result.success());
        assertNull(result.error());
        verify(mailSender).send(
                eq("from@example.com"), eq("to@example.com"), eq("from@example.com"),
                any(), any()
        );
    }

    @Test
    void sendTest_returnsIncompleteWhenFromOrToMissing() {
        MailSettingsEntity incomplete = new MailSettingsEntity();
        incomplete.setId("default");
        incomplete.setUpdatedAt("now");
        when(repository.findById("default")).thenReturn(Optional.of(incomplete));

        MailTestResult result = service.sendTest();

        assertFalse(result.success());
        assertEquals("incomplete", result.error());
        verify(mailSender, never()).send(any(), any(), any(), any(), any());
    }

    @Test
    void sendTest_returnsIncompleteWhenApiKeyMissing() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(mailSender.isConfigured()).thenReturn(false);

        MailTestResult result = service.sendTest();

        assertFalse(result.success());
        assertEquals("incomplete", result.error());
        verify(mailSender, never()).send(any(), any(), any(), any(), any());
    }

    @Test
    void sendTest_returnsFailureWhenResendRejects() {
        when(repository.findById("default")).thenReturn(Optional.of(existing()));
        when(mailSender.isConfigured()).thenReturn(true);
        when(mailSender.send(any(), any(), any(), any(), any())).thenReturn(false);

        MailTestResult result = service.sendTest();

        assertFalse(result.success());
        assertNotEquals("incomplete", result.error(),
                "real rejection must not be reported as 'incomplete' (HTTP 409 mapping)");
    }
}
