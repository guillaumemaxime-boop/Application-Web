package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.service.ContactRequestService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContactControllerTest {

    @Mock
    private ContactRequestService service;

    @InjectMocks
    private ContactController controller;

    @Test
    void testSubmit_ReturnsAccepted() {
        ContactRequestInput input = new ContactRequestInput(
                "Jean", "jean@example.com", null, "acquisition",
                "Bonjour, je suis intéressé par la pièce.",
                "f-001", "onde", "Onde"
        );
        ContactRequestAck ack = new ContactRequestAck("c-abc", "2026-05-16T12:00:00Z", "NEW");
        when(service.submit(input)).thenReturn(ack);

        ResponseEntity<ContactRequestAck> result = controller.submit(input);

        assertEquals(HttpStatus.ACCEPTED, result.getStatusCode());
        assertEquals(ack, result.getBody());
        verify(service, times(1)).submit(input);
    }
}
