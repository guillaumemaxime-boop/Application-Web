package com.atelier.portfolio.controller;

import com.atelier.portfolio.config.JwtUtil;
import com.atelier.portfolio.model.LoginRequest;
import com.atelier.portfolio.model.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private HttpServletRequest httpReq;

    // On instancie le controller manuellement plutot que via @InjectMocks pour
    // garder le constructeur AuthController(jwt, encoder) propre (cache Caffeine
    // instancie en interne).
    private AuthController authController;

    private static final String ADMIN_USERNAME = "admin";
    private static final String HASHED_PASSWORD = "$2b$10$hashedpasswordfortest";
    private static final String JWT_TOKEN = "header.payload.signature";

    @BeforeEach
    void setUp() {
        authController = new AuthController(jwtUtil, passwordEncoder);
        ReflectionTestUtils.setField(authController, "adminUsername", ADMIN_USERNAME);
        ReflectionTestUtils.setField(authController, "adminPasswordHash", HASHED_PASSWORD);
        // lenient : certains tests ne lisent jamais l'IP (cas ou la requete
        // n'arrive jamais a incrementer ou consulter le compteur — ex. test
        // qui mocke seulement le succes immediat).
        lenient().when(httpReq.getRemoteAddr()).thenReturn("203.0.113.1");
    }

    @Test
    void testLogin_ValidCredentials_Returns200WithToken() {
        when(passwordEncoder.matches("admin", HASHED_PASSWORD)).thenReturn(true);
        when(jwtUtil.generateToken(ADMIN_USERNAME)).thenReturn(JWT_TOKEN);
        when(jwtUtil.getExpirationMs()).thenReturn(86_400_000L);

        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest(ADMIN_USERNAME, "admin"), httpReq);

        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals(JWT_TOKEN, result.getBody().token());
        assertEquals(86_400_000L, result.getBody().expiresIn());
        verify(jwtUtil).generateToken(ADMIN_USERNAME);
    }

    @Test
    void testLogin_WrongPassword_Returns401() {
        when(passwordEncoder.matches("wrong", HASHED_PASSWORD)).thenReturn(false);

        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest(ADMIN_USERNAME, "wrong"), httpReq);

        assertEquals(401, result.getStatusCode().value());
        assertNull(result.getBody());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void testLogin_WrongUsername_Returns401() {
        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest("hacker", "admin"), httpReq);

        assertEquals(401, result.getStatusCode().value());
        assertNull(result.getBody());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void testLogin_EmptyUsername_Returns401() {
        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest("", "admin"), httpReq);

        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void testLogin_ValidCredentials_TokenContainsExpirationMs() {
        when(passwordEncoder.matches(anyString(), eq(HASHED_PASSWORD))).thenReturn(true);
        when(jwtUtil.generateToken(any())).thenReturn(JWT_TOKEN);
        when(jwtUtil.getExpirationMs()).thenReturn(3_600_000L);

        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest(ADMIN_USERNAME, "admin"), httpReq);

        assertEquals(3_600_000L, result.getBody().expiresIn());
    }

    // --- Rate-limit (F-06) ---

    @Test
    void login_renvoie_429_apres_10_echecs_consecutifs_meme_ip() {
        when(passwordEncoder.matches(anyString(), eq(HASHED_PASSWORD))).thenReturn(false);

        // Les 10 premieres tentatives renvoient 401 (echec credential).
        for (int i = 0; i < AuthController.MAX_FAILED_ATTEMPTS; i++) {
            ResponseEntity<LoginResponse> result = authController.login(
                    new LoginRequest(ADMIN_USERNAME, "wrong"), httpReq);
            assertEquals(401, result.getStatusCode().value(),
                    "tentative " + (i + 1) + " doit renvoyer 401");
        }

        // La 11e tentative est rejetee en 429 sans tentative de bcrypt.
        reset(passwordEncoder);
        ResponseEntity<LoginResponse> blocked = authController.login(
                new LoginRequest(ADMIN_USERNAME, "wrong"), httpReq);

        assertEquals(429, blocked.getStatusCode().value());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void login_reset_compteur_apres_succes() {
        // 9 echecs (en-dessous de la limite)
        when(passwordEncoder.matches(eq("wrong"), eq(HASHED_PASSWORD))).thenReturn(false);
        for (int i = 0; i < 9; i++) {
            authController.login(new LoginRequest(ADMIN_USERNAME, "wrong"), httpReq);
        }

        // Succes : doit reinitialiser le compteur.
        when(passwordEncoder.matches(eq("admin"), eq(HASHED_PASSWORD))).thenReturn(true);
        when(jwtUtil.generateToken(any())).thenReturn(JWT_TOKEN);
        when(jwtUtil.getExpirationMs()).thenReturn(3_600_000L);
        ResponseEntity<LoginResponse> ok = authController.login(
                new LoginRequest(ADMIN_USERNAME, "admin"), httpReq);
        assertEquals(200, ok.getStatusCode().value());

        // 10 nouveaux echecs doivent etre permis sans 429 (le compteur a redemarre a 0).
        for (int i = 0; i < AuthController.MAX_FAILED_ATTEMPTS; i++) {
            ResponseEntity<LoginResponse> result = authController.login(
                    new LoginRequest(ADMIN_USERNAME, "wrong"), httpReq);
            assertEquals(401, result.getStatusCode().value(),
                    "post-succes tentative " + (i + 1) + " doit renvoyer 401");
        }
    }

    @Test
    void login_compteur_independant_par_ip() {
        when(passwordEncoder.matches(anyString(), eq(HASHED_PASSWORD))).thenReturn(false);

        HttpServletRequest reqIp1 = mock(HttpServletRequest.class);
        when(reqIp1.getRemoteAddr()).thenReturn("203.0.113.10");
        HttpServletRequest reqIp2 = mock(HttpServletRequest.class);
        when(reqIp2.getRemoteAddr()).thenReturn("203.0.113.20");

        // IP1 atteint la limite.
        for (int i = 0; i < AuthController.MAX_FAILED_ATTEMPTS; i++) {
            authController.login(new LoginRequest(ADMIN_USERNAME, "wrong"), reqIp1);
        }
        ResponseEntity<LoginResponse> ip1Blocked = authController.login(
                new LoginRequest(ADMIN_USERNAME, "wrong"), reqIp1);
        assertEquals(429, ip1Blocked.getStatusCode().value());

        // IP2 n'a jamais echoue : doit renvoyer 401, pas 429.
        ResponseEntity<LoginResponse> ip2 = authController.login(
                new LoginRequest(ADMIN_USERNAME, "wrong"), reqIp2);
        assertEquals(401, ip2.getStatusCode().value());
    }

    @Test
    void login_x_forwarded_for_prend_premiere_ip() {
        when(passwordEncoder.matches(anyString(), eq(HASHED_PASSWORD))).thenReturn(false);

        HttpServletRequest behindProxy = mock(HttpServletRequest.class);
        when(behindProxy.getHeader("X-Forwarded-For")).thenReturn("198.51.100.7, 10.0.0.1");
        // getRemoteAddr() ne doit pas etre lu quand XFF est present.

        for (int i = 0; i < AuthController.MAX_FAILED_ATTEMPTS; i++) {
            authController.login(new LoginRequest(ADMIN_USERNAME, "wrong"), behindProxy);
        }
        ResponseEntity<LoginResponse> blocked = authController.login(
                new LoginRequest(ADMIN_USERNAME, "wrong"), behindProxy);
        assertEquals(429, blocked.getStatusCode().value());

        // Meme proxy mais autre client en aval : differente premiere IP -> doit
        // se voir traite separement.
        HttpServletRequest otherClient = mock(HttpServletRequest.class);
        when(otherClient.getHeader("X-Forwarded-For")).thenReturn("198.51.100.99, 10.0.0.1");
        ResponseEntity<LoginResponse> stillAllowed = authController.login(
                new LoginRequest(ADMIN_USERNAME, "wrong"), otherClient);
        assertEquals(401, stillAllowed.getStatusCode().value());
    }
}
