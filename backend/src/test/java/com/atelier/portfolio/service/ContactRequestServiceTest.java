package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRequestServiceTest {

    @Mock private ContactRequestRepository repository;
    @Mock private MailSettingsService mailSettingsService;
    @Mock private MailSender mailSender;

    private ContactRequestService service;

    @BeforeEach
    void setUp() {
        when(repository.save(any(ContactRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new ContactRequestService(repository, mailSettingsService, mailSender);
    }

    private ContactRequestInput sampleInput() {
        return new ContactRequestInput(
                "Jean Test", "jean@example.com", "0600000000",
                "acquisition", "Bonjour, je suis intéressé.",
                "f-001", "onde", "Onde"
        );
    }

    private MailSettingsView configuredView() {
        return new MailSettingsView(
                "no-reply@studio.fr", "studio@example.com",
                true, "now"
        );
    }

    @Test
    void testSubmit_PersistsTrimmedFields() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(mailSender.send(any(), any(), any(), any(), any())).thenReturn(true);
        ContactRequestInput input = new ContactRequestInput(
                "  Jean  ", "  jean@example.com ", "  ", "acquisition",
                "  Hello world  ", "", "", ""
        );

        service.submit(input);

        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        ContactRequestEntity saved = captor.getValue();
        assertEquals("Jean", saved.getName());
        assertEquals("jean@example.com", saved.getEmail());
        assertNull(saved.getPhone());
        assertEquals("Hello world", saved.getMessage());
        assertEquals("NEW", saved.getStatus());
        assertTrue(saved.getId().startsWith("c-"));
    }

    @Test
    void testSubmit_ApiKeyNotConfigured_SkipsDelivery() {
        MailSettingsView noKey = new MailSettingsView(
                "no-reply@studio.fr", "studio@example.com",
                false, "now"
        );
        when(mailSettingsService.get()).thenReturn(noKey);

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(), any(), any(), any(), any());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_NoFromOrTo_SkipsDelivery() {
        MailSettingsView noTo = new MailSettingsView(
                "no-reply@studio.fr", null,
                true, "now"
        );
        when(mailSettingsService.get()).thenReturn(noTo);

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(), any(), any(), any(), any());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailConfigured_SendsViaResendAndMarksMailSent() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(mailSender.send(any(), any(), any(), any(), any())).thenReturn(true);

        service.submit(sampleInput());

        verify(mailSender).send(
                eq("no-reply@studio.fr"),
                eq("studio@example.com"),
                eq("jean@example.com"),
                argThat(s -> s.contains("Acquisition") && s.contains("Onde")),
                argThat(b -> b.contains("Jean Test") && b.contains("/mobilier/onde"))
        );
        ArgumentCaptor<ContactRequestEntity> entityCaptor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(entityCaptor.capture());
        assertTrue(entityCaptor.getValue().isMailSent());
    }

    @Test
    void testSubmit_ResendReturnsFalse_KeepsRecordWithMailSentFalse() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(mailSender.send(any(), any(), any(), any(), any())).thenReturn(false);

        ContactRequestAck ack = service.submit(sampleInput());

        assertNotNull(ack.id());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_PressInterest_UsesPressLabelInSubject() {
        when(mailSettingsService.get()).thenReturn(configuredView());
        when(mailSender.send(any(), any(), any(), any(), any())).thenReturn(true);
        ContactRequestInput input = new ContactRequestInput(
                "Reporter", "r@p.fr", null, "press",
                "Demande presse.", null, null, null
        );

        service.submit(input);

        verify(mailSender).send(
                any(), any(), any(),
                argThat(s -> s.contains("Presse")),
                any()
        );
    }
}
