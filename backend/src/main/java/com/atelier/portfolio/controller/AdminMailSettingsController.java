package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.MailSettingsInput;
import com.atelier.portfolio.model.MailSettingsView;
import com.atelier.portfolio.model.MailTestResult;
import com.atelier.portfolio.service.MailSettingsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/mail-settings")
public class AdminMailSettingsController {

    private final MailSettingsService service;

    public AdminMailSettingsController(MailSettingsService service) {
        this.service = service;
    }

    @GetMapping
    public MailSettingsView get() {
        return service.get();
    }

    @PutMapping
    public MailSettingsView put(@Valid @RequestBody MailSettingsInput input) {
        return service.save(input);
    }

    @PostMapping("/test")
    public ResponseEntity<MailTestResult> test() {
        MailTestResult result = service.sendTest();
        if (!result.success() && "incomplete".equals(result.error())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(MailTestResult.failure("Configuration incomplète"));
        }
        return ResponseEntity.ok(result);
    }
}
