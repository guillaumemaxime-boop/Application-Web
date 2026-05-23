package com.atelier.portfolio.model;

public record MailSettingsView(
        String host,
        Integer port,
        String username,
        boolean hasPassword,
        String encryption,
        String fromAddress,
        String toAddress,
        String updatedAt
) {
}
