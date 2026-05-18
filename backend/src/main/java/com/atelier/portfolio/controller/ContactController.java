package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.ContactRequestAck;
import com.atelier.portfolio.model.ContactRequestInput;
import com.atelier.portfolio.service.ContactRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final ContactRequestService service;

    public ContactController(ContactRequestService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ContactRequestAck> submit(@Valid @RequestBody ContactRequestInput input) {
        ContactRequestAck ack = service.submit(input);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ack);
    }
}
