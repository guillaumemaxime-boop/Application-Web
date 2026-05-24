package com.atelier.portfolio.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record MailSettingsInput(
        @Email @Size(max = 300) String fromAddress,
        @Email @Size(max = 300) String toAddress
) {
}
