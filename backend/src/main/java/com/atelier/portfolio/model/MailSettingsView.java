package com.atelier.portfolio.model;

public record MailSettingsView(
        String fromAddress,
        String toAddress,
        boolean apiKeyConfigured,
        String updatedAt
) {
}
