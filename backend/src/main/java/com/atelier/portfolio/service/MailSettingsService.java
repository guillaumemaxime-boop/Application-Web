package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.repository.MailSettingsRepository;
import com.atelier.portfolio.security.SecretCipher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.Properties;

@Service
public class MailSettingsService {

    private static final Logger log = LoggerFactory.getLogger(MailSettingsService.class);

    private final MailSettingsRepository repository;
    private final SecretCipher cipher;

    public MailSettingsService(MailSettingsRepository repository, SecretCipher cipher) {
        this.repository = repository;
        this.cipher = cipher;
    }

    @Transactional(readOnly = true)
    public MailSettingsView get() {
        return toView(loadOrInit());
    }

    @Transactional
    public MailSettingsView save(MailSettingsInput input) {
        MailSettingsEntity entity = loadOrInit();
        entity.setHost(blankToNull(input.host()));
        entity.setPort(input.port());
        entity.setUsername(blankToNull(input.username()));
        entity.setEncryption(input.encryption() == null || input.encryption().isBlank() ? "NONE" : input.encryption());
        entity.setFromAddress(blankToNull(input.fromAddress()));
        entity.setToAddress(blankToNull(input.toAddress()));
        entity.setUpdatedAt(Instant.now().toString());

        String password = input.password();
        if (password != null && !password.isBlank()) {
            entity.setPasswordEncrypted(cipher.encrypt(password));
        }
        // si password est null ou vide : on conserve l'existant
        return toView(repository.save(entity));
    }

    /**
     * Construit un JavaMailSender à partir de la configuration enregistrée.
     * Retourne null si la conf est incomplète, ou si le password ne peut pas être déchiffré
     * (par exemple cipher en mode dégradé). Ne jette jamais.
     */
    public JavaMailSender buildSender() {
        MailSettingsEntity entity = repository.findById(MailSettingsEntity.DEFAULT_ID).orElse(null);
        if (entity == null || entity.getHost() == null || entity.getHost().isBlank() || entity.getPort() == null) {
            return null;
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(entity.getHost());
        sender.setPort(entity.getPort());

        boolean hasAuth = entity.getUsername() != null && !entity.getUsername().isBlank();
        if (hasAuth) {
            sender.setUsername(entity.getUsername());
            if (entity.getPasswordEncrypted() != null && !entity.getPasswordEncrypted().isBlank()) {
                try {
                    sender.setPassword(cipher.decrypt(entity.getPasswordEncrypted()));
                } catch (IllegalStateException ex) {
                    log.warn("Cannot decrypt mail password ({}); sender unavailable", ex.getMessage());
                    return null;
                }
            }
        }

        Properties props = sender.getJavaMailProperties();
        props.setProperty("mail.transport.protocol", "smtp");
        props.setProperty("mail.smtp.auth", Boolean.toString(hasAuth));
        props.setProperty("mail.smtp.starttls.enable", Boolean.toString("STARTTLS".equals(entity.getEncryption())));
        props.setProperty("mail.smtp.ssl.enable", Boolean.toString("SSL".equals(entity.getEncryption())));
        return sender;
    }

    /**
     * Renvoie l'entité brute (utile pour lire from/to sans repasser par le DTO).
     * Optional.empty() si la ligne n'existe pas.
     */
    @Transactional(readOnly = true)
    public Optional<MailSettingsEntity> getConfigSnapshot() {
        return repository.findById(MailSettingsEntity.DEFAULT_ID);
    }

    public MailTestResult sendTest() {
        MailSettingsEntity entity = repository.findById(MailSettingsEntity.DEFAULT_ID).orElse(null);
        if (entity == null
                || entity.getHost() == null || entity.getHost().isBlank()
                || entity.getPort() == null
                || entity.getFromAddress() == null || entity.getFromAddress().isBlank()
                || entity.getToAddress() == null || entity.getToAddress().isBlank()) {
            return MailTestResult.failure("incomplete");
        }
        JavaMailSender sender = buildSender();
        if (sender == null) {
            return MailTestResult.failure("sender unavailable (encryption key or password issue)");
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(entity.getFromAddress());
            msg.setTo(entity.getToAddress());
            msg.setSubject("Test de configuration mail — Atelier");
            msg.setText("Mail de test envoyé le " + Instant.now() + ".");
            sender.send(msg);
            return MailTestResult.ok();
        } catch (Exception ex) {
            log.warn("Mail test failed: {}", ex.getMessage());
            return MailTestResult.failure(ex.getMessage());
        }
    }

    private MailSettingsEntity loadOrInit() {
        return repository.findById(MailSettingsEntity.DEFAULT_ID).orElseGet(() -> {
            MailSettingsEntity e = new MailSettingsEntity();
            e.setId(MailSettingsEntity.DEFAULT_ID);
            e.setEncryption("NONE");
            e.setUpdatedAt(Instant.now().toString());
            return e;
        });
    }

    private static MailSettingsView toView(MailSettingsEntity e) {
        return new MailSettingsView(
                e.getHost(),
                e.getPort(),
                e.getUsername(),
                e.getPasswordEncrypted() != null && !e.getPasswordEncrypted().isBlank(),
                e.getEncryption(),
                e.getFromAddress(),
                e.getToAddress(),
                e.getUpdatedAt()
        );
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
