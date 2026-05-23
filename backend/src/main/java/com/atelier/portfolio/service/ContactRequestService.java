package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.ContactRequestEntity;
import com.atelier.portfolio.entity.MailSettingsEntity;
import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.repository.ContactRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ContactRequestService {

    private static final Logger log = LoggerFactory.getLogger(ContactRequestService.class);

    private final ContactRequestRepository repository;
    private final MailSettingsService mailSettingsService;

    public ContactRequestService(ContactRequestRepository repository,
                                 MailSettingsService mailSettingsService) {
        this.repository = repository;
        this.mailSettingsService = mailSettingsService;
    }

    @Transactional
    public ContactRequestAck submit(ContactRequestInput input) {
        ContactRequestEntity entity = new ContactRequestEntity();
        entity.setId("c-" + UUID.randomUUID().toString().substring(0, 12));
        entity.setCreatedAt(Instant.now().toString());
        entity.setName(input.name().trim());
        entity.setEmail(input.email().trim());
        entity.setPhone(blankToNull(input.phone()));
        entity.setInterest(input.interest());
        entity.setMessage(input.message().trim());
        entity.setFurnitureId(blankToNull(input.furnitureId()));
        entity.setFurnitureSlug(blankToNull(input.furnitureSlug()));
        entity.setFurnitureTitle(blankToNull(input.furnitureTitle()));
        entity.setStatus("NEW");
        entity.setMailSent(tryDeliver(entity));
        ContactRequestEntity saved = repository.save(entity);
        return new ContactRequestAck(saved.getId(), saved.getCreatedAt(), saved.getStatus());
    }

    private boolean tryDeliver(ContactRequestEntity req) {
        JavaMailSender sender = mailSettingsService.buildSender();
        if (sender == null) {
            log.info("Mail delivery skipped (no SMTP sender) — contact request {} stored only", req.getId());
            return false;
        }
        Optional<MailSettingsEntity> cfg = mailSettingsService.getConfigSnapshot();
        if (cfg.isEmpty()
                || cfg.get().getToAddress() == null || cfg.get().getToAddress().isBlank()
                || cfg.get().getFromAddress() == null || cfg.get().getFromAddress().isBlank()) {
            log.info("Mail delivery skipped (from/to missing) — contact request {} stored only", req.getId());
            return false;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(cfg.get().getFromAddress());
            msg.setTo(cfg.get().getToAddress());
            msg.setReplyTo(req.getEmail());
            msg.setSubject(buildSubject(req));
            msg.setText(buildBody(req));
            sender.send(msg);
            return true;
        } catch (Exception ex) {
            log.warn("Failed to deliver contact mail for request {} — kept in DB", req.getId(), ex);
            return false;
        }
    }

    private static String buildSubject(ContactRequestEntity req) {
        String label = interestLabel(req.getInterest());
        if (req.getFurnitureTitle() != null && !req.getFurnitureTitle().isBlank()) {
            return "[Contact · " + label + "] " + req.getFurnitureTitle();
        }
        return "[Contact · " + label + "] " + req.getName();
    }

    private static String buildBody(ContactRequestEntity req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Nouvelle demande depuis le site\n");
        sb.append("--------------------------------\n\n");
        sb.append("Nom        : ").append(req.getName()).append('\n');
        sb.append("Email      : ").append(req.getEmail()).append('\n');
        if (req.getPhone() != null) sb.append("Téléphone  : ").append(req.getPhone()).append('\n');
        sb.append("Intérêt    : ").append(interestLabel(req.getInterest())).append('\n');
        if (req.getFurnitureTitle() != null) {
            sb.append("Pièce      : ").append(req.getFurnitureTitle());
            if (req.getFurnitureSlug() != null) sb.append(" (/mobilier/").append(req.getFurnitureSlug()).append(')');
            sb.append('\n');
        }
        sb.append("\nMessage\n-------\n").append(req.getMessage()).append('\n');
        return sb.toString();
    }

    private static String interestLabel(String key) {
        return switch (key) {
            case "acquisition" -> "Acquisition";
            case "order" -> "Commande spéciale";
            case "press" -> "Presse";
            default -> "Autre";
        };
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
