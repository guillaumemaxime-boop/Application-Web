package com.atelier.portfolio.controller;

import com.atelier.portfolio.config.JwtUtil;
import com.atelier.portfolio.model.LoginRequest;
import com.atelier.portfolio.model.LoginResponse;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // Au-dela de MAX_FAILED_ATTEMPTS echecs consecutifs depuis la meme IP sur
    // FAILED_WINDOW, on renvoie 429 sans tenter le bcrypt. La fenetre glisse
    // (expireAfterWrite) : un succes invalide manuellement le compteur.
    static final int MAX_FAILED_ATTEMPTS = 10;
    private static final Duration FAILED_WINDOW = Duration.ofMinutes(15);

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final Cache<String, AtomicInteger> failedLogins;

    @Value("${admin.username}")
    private String adminUsername;

    @Value("${admin.password-hash}")
    private String adminPasswordHash;

    public AuthController(JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.failedLogins = Caffeine.newBuilder()
                .expireAfterWrite(FAILED_WINDOW)
                .maximumSize(10_000)
                .build();
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest httpReq) {
        String clientIp = resolveClientIp(httpReq);

        AtomicInteger counter = failedLogins.getIfPresent(clientIp);
        if (counter != null && counter.get() >= MAX_FAILED_ATTEMPTS) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        boolean usernameMatch = adminUsername.equals(req.username());
        // Always run passwordEncoder.matches() to prevent timing attacks
        boolean passwordMatch = passwordEncoder.matches(req.password(), adminPasswordHash);
        if (!usernameMatch || !passwordMatch) {
            failedLogins.asMap()
                    .computeIfAbsent(clientIp, k -> new AtomicInteger())
                    .incrementAndGet();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Reset le compteur sur succes pour ne pas verrouiller l'utilisateur legitime
        // apres N echecs suivis d'un succes.
        failedLogins.invalidate(clientIp);
        String token = jwtUtil.generateToken(req.username());
        return ResponseEntity.ok(new LoginResponse(token, jwtUtil.getExpirationMs()));
    }

    private static String resolveClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) {
            return req.getRemoteAddr();
        }
        // X-Forwarded-For peut etre "ip1, ip2, ip3" : la premiere est le client originel.
        int comma = xff.indexOf(',');
        return (comma > 0 ? xff.substring(0, comma) : xff).trim();
    }
}
