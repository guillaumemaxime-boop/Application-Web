package com.atelier.portfolio.controller;

import com.atelier.portfolio.config.JwtUtil;
import com.atelier.portfolio.model.LoginRequest;
import com.atelier.portfolio.model.LoginResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthController authController;

    private static final String ADMIN_USERNAME = "admin";
    private static final String HASHED_PASSWORD = "$2b$10$hashedpasswordfortest";
    private static final String JWT_TOKEN = "header.payload.signature";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authController, "adminUsername", ADMIN_USERNAME);
        ReflectionTestUtils.setField(authController, "adminPasswordHash", HASHED_PASSWORD);
    }

    @Test
    void testLogin_ValidCredentials_Returns200WithToken() {
        when(passwordEncoder.matches("admin", HASHED_PASSWORD)).thenReturn(true);
        when(jwtUtil.generateToken(ADMIN_USERNAME)).thenReturn(JWT_TOKEN);
        when(jwtUtil.getExpirationMs()).thenReturn(86_400_000L);

        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest(ADMIN_USERNAME, "admin"));

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
                new LoginRequest(ADMIN_USERNAME, "wrong"));

        assertEquals(401, result.getStatusCode().value());
        assertNull(result.getBody());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void testLogin_WrongUsername_Returns401() {
        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest("hacker", "admin"));

        assertEquals(401, result.getStatusCode().value());
        assertNull(result.getBody());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void testLogin_EmptyUsername_Returns401() {
        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest("", "admin"));

        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void testLogin_ValidCredentials_TokenContainsExpirationMs() {
        when(passwordEncoder.matches(anyString(), eq(HASHED_PASSWORD))).thenReturn(true);
        when(jwtUtil.generateToken(any())).thenReturn(JWT_TOKEN);
        when(jwtUtil.getExpirationMs()).thenReturn(3_600_000L);

        ResponseEntity<LoginResponse> result = authController.login(
                new LoginRequest(ADMIN_USERNAME, "admin"));

        assertEquals(3_600_000L, result.getBody().expiresIn());
    }
}
