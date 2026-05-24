package com.atelier.portfolio.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ResendMailService {

    private static final Logger log = LoggerFactory.getLogger(ResendMailService.class);

    private final Resend client;
    private final boolean degraded;

    /** Production constructor: receives the API key from Spring. */
    public ResendMailService(@Value("${app.resend.api-key:}") String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("RESEND_API_KEY not set — Resend in degraded mode, no email will be sent");
            this.client = null;
            this.degraded = true;
            return;
        }
        this.client = new Resend(apiKey);
        this.degraded = false;
    }

    /** Package-visible constructor for tests: direct injection of a mocked client. */
    ResendMailService(Resend client) {
        this.client = client;
        this.degraded = false;
    }

    public boolean isConfigured() {
        return !degraded;
    }

    /**
     * Sends an email via Resend. Returns true if Resend accepted the message,
     * false otherwise (degraded mode OR exception). Never propagates.
     */
    public boolean send(String from, String to, String replyTo, String subject, String body) {
        if (degraded) return false;
        try {
            CreateEmailOptions opts = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .replyTo(replyTo)
                    .subject(subject)
                    .text(body)
                    .build();
            client.emails().send(opts);
            return true;
        } catch (ResendException ex) {
            log.warn("Resend send failed: {}", ex.getMessage());
            return false;
        }
    }
}
