package com.atelier.portfolio.controller;

import com.atelier.portfolio.config.JwtUtil;
import com.atelier.portfolio.model.LoginRequest;
import com.atelier.portfolio.model.LoginResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.username}")
    private String adminUsername;

    @Value("${admin.password-hash}")
    private String adminPasswordHash;

    public AuthController(JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        boolean usernameMatch = adminUsername.equals(req.username());
        // Always run passwordEncoder.matches() to prevent timing attacks
        boolean passwordMatch = passwordEncoder.matches(req.password(), adminPasswordHash);
        if (!usernameMatch || !passwordMatch) {
            return ResponseEntity.status(401).build();
        }
        String token = jwtUtil.generateToken(req.username());
        return ResponseEntity.ok(new LoginResponse(token, jwtUtil.getExpirationMs()));
    }
}
