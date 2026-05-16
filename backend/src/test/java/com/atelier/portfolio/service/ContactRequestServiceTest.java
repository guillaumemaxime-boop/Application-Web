package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactRequestServiceTest {

    @Mock
    private ContactRequestRepository repository;

    @Mock
    private ObjectProvider<JavaMailSender> mailSenderProvider;

    @Mock
    private JavaMailSender mailSender;

    private ContactRequestService service;

    @BeforeEach
    void setUp() {
        // default: no mail configured
        when(repository.save(any(ContactRequestEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private ContactRequestService buildService(String mailTo) {
        return new ContactRequestService(repository, mailSenderProvider, mailTo, "no-reply@studio.fr");
    }

    private ContactRequestInput sampleInput() {
        return new ContactRequestInput(
                "Jean Test", "jean@example.com", "0600000000",
                "acquisition", "Bonjour, je suis intéressé.",
                "f-001", "onde", "Onde"
        );
    }

    @Test
    void testSubmit_PersistsTrimmedFields() {
        service = buildService("");
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
        assertNull(saved.getFurnitureId());
        assertNull(saved.getFurnitureSlug());
        assertNull(saved.getFurnitureTitle());
        assertEquals("Hello world", saved.getMessage());
        assertEquals("NEW", saved.getStatus());
        assertNotNull(saved.getId());
        assertTrue(saved.getId().startsWith("c-"));
        assertNotNull(saved.getCreatedAt());
    }

    @Test
    void testSubmit_ReturnsAckWithGeneratedIdAndTimestamp() {
        service = buildService("");

        ContactRequestAck ack = service.submit(sampleInput());

        assertNotNull(ack.id());
        assertTrue(ack.id().startsWith("c-"));
        assertNotNull(ack.createdAt());
        assertEquals("NEW", ack.status());
    }

    @Test
    void testSubmit_NoMailConfigured_SkipsDelivery() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        service = buildService("");

        service.submit(sampleInput());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailSenderUnavailable_SkipsDelivery() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);
        service = buildService("studio@example.com");

        service.submit(sampleInput());

        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailConfigured_SendsAndMarksMailSent() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        service = buildService("studio@example.com");

        service.submit(sampleInput());

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage msg = captor.getValue();
        assertArrayEquals(new String[]{"studio@example.com"}, msg.getTo());
        assertEquals("jean@example.com", msg.getReplyTo());
        assertNotNull(msg.getSubject());
        assertTrue(msg.getSubject().contains("Acquisition"));
        assertTrue(msg.getSubject().contains("Onde"));
        assertNotNull(msg.getText());
        assertTrue(msg.getText().contains("Jean Test"));
        assertTrue(msg.getText().contains("/mobilier/onde"));

        ArgumentCaptor<ContactRequestEntity> entityCaptor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(entityCaptor.capture());
        assertTrue(entityCaptor.getValue().isMailSent());
    }

    @Test
    void testSubmit_MailDeliveryFails_KeepsRecordWithMailSentFalse() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        service = buildService("studio@example.com");

        ContactRequestAck ack = service.submit(sampleInput());

        assertNotNull(ack.id());
        ArgumentCaptor<ContactRequestEntity> captor = ArgumentCaptor.forClass(ContactRequestEntity.class);
        verify(repository).save(captor.capture());
        assertFalse(captor.getValue().isMailSent());
        assertEquals("NEW", captor.getValue().getStatus());
    }

    @Test
    void testSubmit_PressInterest_UsesPressLabelInSubject() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        service = buildService("studio@example.com");
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
