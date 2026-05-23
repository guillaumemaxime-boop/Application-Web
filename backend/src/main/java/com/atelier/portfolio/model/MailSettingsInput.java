package com.atelier.portfolio.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MailSettingsInput(
        @Size(max = 200) String host,
        @Min(1) @Max(65535) Integer port,
        @Size(max = 200) String username,
        @Size(max = 500) String password,
        @Pattern(regexp = "NONE|STARTTLS|SSL", message = "encryption must be NONE, STARTTLS, or SSL")
        String encryption,
        @Email @Size(max = 300) String fromAddress,
        @Email @Size(max = 300) String toAddress
) {
}
