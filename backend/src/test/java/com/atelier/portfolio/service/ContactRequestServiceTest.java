package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRequestServiceTest {

    @Mock private ContactRequestRepository repository;
    @Mock private MailSettingsService mailSettingsService;
    @Mock private JavaMailSender mailSender;

    private ContactRequestService service;

    @BeforeEach
    void setUp() {
        when(repository.save(any(ContactRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new ContactRequestService(repository, mailSettingsService);
    }

    private ContactRequestInput sampleInput() {
        return new ContactRequestInput(
                "Jean Test", "jean@example.com", "0600000000",
                "acquisition", "Bonjour, je suis intéressé.",
                "f-001", "onde", "Onde"
        );
    }

    private MailSettingsEntity configuredEntity() {
        MailSettingsEntity e = new MailSettingsEntity();
        e.setId(MailSettingsEntity.DEFAULT_ID);
        e.setHost("smtp.x");
        e.setPort(587);
        e.setEncryption("STARTTLS");
        e.setFromAddress("no-reply@studio.fr");
        e.setToAddress("studio@example.com");
        e.setUpdatedAt("now");
        return e;
    }

    @Test
    void testSubmit_PersistsTrimmedFields() {
        when(mailSettingsService.buildSender()).thenReturn(null);
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
    void testSubmit_NoSenderAvailable_SkipsDelivery() {
        when(mailSettingsService.buildSender()).thenReturn(null);

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_NoToAddress_SkipsDelivery() {
        MailSettingsEntity noTo = configuredEntity();
        noTo.setToAddress(null);
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(noTo));

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void testSubmit_MailConfigured_SendsAndMarksMailSent() {
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(configuredEntity()));

        service.submit(sampleInput());

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage msg = captor.getValue();
        assertArrayEquals(new String[]{"studio@example.com"}, msg.getTo());
        assertEquals("no-reply@studio.fr", msg.getFrom());
        assertEquals("jean@example.com", msg.getReplyTo());
        assertTrue(msg.getSubject().contains("Acquisition"));
        assertTrue(msg.getSubject().contains("Onde"));
        assertTrue(msg.getText().contains("/mobilier/onde"));

        ArgumentCaptor<ContactRequestEntity> entityCaptor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(entityCaptor.capture());
        assertTrue(entityCaptor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailDeliveryFails_KeepsRecordWithMailSentFalse() {
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(configuredEntity()));
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        ContactRequestAck ack = service.submit(sampleInput());

        assertNotNull(ack.id());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_PressInterest_UsesPressLabelInSubject() {
        when(mailSettingsService.buildSender()).thenReturn(mailSender);
        when(mailSettingsService.getConfigSnapshot()).thenReturn(Optional.of(configuredEntity()));
        ContactRequestInput input = new ContactRequestInput(
                "Reporter", "r@p.fr", null, "press",
                "Demande presse.", null, null, null
        );

        service.submit(input);

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertTrue(captor.getValue().getSubject().contains("Presse"));
    }
}
