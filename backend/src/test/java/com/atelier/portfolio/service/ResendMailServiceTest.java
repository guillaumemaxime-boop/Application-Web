package com.atelier.portfolio.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResendMailServiceTest {

    @Mock private Resend resendClient;
    @Mock private Emails emails;

    @Test
    void blankApiKey_putsServiceInDegradedMode() {
        ResendMailService svc = new ResendMailService("");

        assertFalse(svc.isConfigured());
        assertFalse(svc.send("from@x", "to@x", "reply@x", "s", "b"),
                "degraded send() must return false without touching network");
    }

    @Test
    void nullApiKey_putsServiceInDegradedMode() {
        ResendMailService svc = new ResendMailService((String) null);

        assertFalse(svc.isConfigured());
        assertFalse(svc.send("from@x", "to@x", "reply@x", "s", "b"));
    }

    @Test
    void send_successfulCall_returnsTrue() throws Exception {
        when(resendClient.emails()).thenReturn(emails);
        when(emails.send(any(CreateEmailOptions.class))).thenReturn(new CreateEmailResponse("email_123"));
        ResendMailService svc = new ResendMailService(resendClient);

        boolean ok = svc.send("from@x", "to@x", "reply@x", "subject", "body");

        assertTrue(ok);
        assertTrue(svc.isConfigured());
        verify(emails).send(any(CreateEmailOptions.class));
    }

    @Test
    void send_resendException_returnsFalseAndDoesNotPropagate() throws Exception {
        when(resendClient.emails()).thenReturn(emails);
        when(emails.send(any(CreateEmailOptions.class)))
                .thenThrow(new ResendException("invalid from address"));
        ResendMailService svc = new ResendMailService(resendClient);

        boolean ok = svc.send("from@x", "to@x", "reply@x", "subject", "body");

        assertFalse(ok);
    }
}
