package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.repository.MailSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class MailSettingsService {

    private final MailSettingsRepository repository;
    private final MailSender mailSender;

    public MailSettingsService(MailSettingsRepository repository,
                               MailSender mailSender) {
        this.repository = repository;
        this.mailSender = mailSender;
    }

    @Transactional(readOnly = true)
    public MailSettingsView get() {
        return toView(loadOrInit());
    }

    @Transactional
    public MailSettingsView save(MailSettingsInput input) {
        MailSettingsEntity entity = loadOrInit();
        entity.setFromAddress(blankToNull(input.fromAddress()));
        entity.setToAddress(blankToNull(input.toAddress()));
        entity.setUpdatedAt(Instant.now().toString());
        return toView(repository.save(entity));
    }

    public MailTestResult sendTest() {
        MailSettingsEntity entity = repository.findById(MailSettingsEntity.DEFAULT_ID).orElse(null);
        if (entity == null
                || entity.getFromAddress() == null || entity.getFromAddress().isBlank()
                || entity.getToAddress() == null || entity.getToAddress().isBlank()
                || !mailSender.isConfigured()) {
            return MailTestResult.failure("incomplete");
        }
        String from = entity.getFromAddress();
        String to = entity.getToAddress();
        boolean ok = mailSender.send(
                from, to, from,
                "Test de configuration mail — Atelier",
                "Mail de test envoyé le " + Instant.now() + "."
        );
        if (ok) {
            return MailTestResult.ok();
        }
        return MailTestResult.failure("Resend a refusé l'envoi (voir logs serveur)");
    }

    private MailSettingsEntity loadOrInit() {
        return repository.findById(MailSettingsEntity.DEFAULT_ID).orElseGet(() -> {
            MailSettingsEntity e = new MailSettingsEntity();
            e.setId(MailSettingsEntity.DEFAULT_ID);
            e.setUpdatedAt(Instant.now().toString());
            return e;
        });
    }

    private MailSettingsView toView(MailSettingsEntity e) {
        return new MailSettingsView(
                e.getFromAddress(),
                e.getToAddress(),
                mailSender.isConfigured(),
                e.getUpdatedAt()
        );
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
