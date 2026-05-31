package com.atelier.portfolio.config;

import com.atelier.portfolio.model.LoginRequest;
import com.atelier.portfolio.model.LoginResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:security-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE"
)
class SecurityIntegrationTest {

    @Value("${local.server.port}")
    private int port;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    @AfterEach
    void cleanup() throws Exception {
        String token = getValidToken();
        var req = HttpRequest.newBuilder()
                .uri(uri("/api/furniture/test-securite"))
                .header("Authorization", "Bearer " + token)
                .DELETE().build();
        client.send(req, HttpResponse.BodyHandlers.discarding());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    // -----------------------------------------------------------------------
    // Endpoints publics (GET) — accessibles sans token
    // -----------------------------------------------------------------------

    @Test
    void testGetFurniture_NoToken_Returns200() throws Exception {
        var request = HttpRequest.newBuilder().uri(uri("/api/furniture")).GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
    }

    @Test
    void testGetExhibitions_NoToken_Returns200() throws Exception {
        var request = HttpRequest.newBuilder().uri(uri("/api/exhibitions")).GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
    }

    @Test
    void testGetProfile_NoToken_Returns200() throws Exception {
        var request = HttpRequest.newBuilder().uri(uri("/api/profile")).GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
    }

    @Test
    void testActuatorHealth_NoToken_Returns200() throws Exception {
        var request = HttpRequest.newBuilder().uri(uri("/actuator/health")).GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
    }

    @Test
    void testGetContent_NoToken_Returns200() throws Exception {
        var request = HttpRequest.newBuilder().uri(uri("/api/content")).GET().build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
    }

    // -----------------------------------------------------------------------
    // Endpoints protégés sans token → 401
    // -----------------------------------------------------------------------

    @Test
    void testPostFurniture_NoToken_Returns401() throws Exception {
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/furniture"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, response.statusCode());
    }

    @Test
    void testPostExhibition_NoToken_Returns401() throws Exception {
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/exhibitions"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, response.statusCode());
    }

    @Test
    void testDeleteFurniture_NoToken_Returns401() throws Exception {
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/furniture/some-slug"))
                .DELETE()
                .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, response.statusCode());
    }

    // -----------------------------------------------------------------------
    // Authentification
    // -----------------------------------------------------------------------

    @Test
    void testLogin_ValidCredentials_Returns200WithToken() throws Exception {
        String body = objectMapper.writeValueAsString(new LoginRequest("admin", "admin"));
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        LoginResponse loginResponse = objectMapper.readValue(response.body(), LoginResponse.class);
        assertNotNull(loginResponse.token());
        assertTrue(loginResponse.token().length() > 20);
        assertTrue(loginResponse.expiresIn() > 0);
    }

    @Test
    void testLogin_WrongPassword_Returns401() throws Exception {
        String body = objectMapper.writeValueAsString(new LoginRequest("admin", "wrongpassword"));
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, response.statusCode());
    }

    @Test
    void testLogin_UnknownUser_Returns401() throws Exception {
        String body = objectMapper.writeValueAsString(new LoginRequest("unknown", "admin"));
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(401, response.statusCode());
    }

    // -----------------------------------------------------------------------
    // Endpoint protégé avec token valide → 2xx
    // -----------------------------------------------------------------------

    @Test
    void testPostFurniture_ValidToken_Returns201() throws Exception {
        String token = getValidToken();
        String payload = "{\"title\":\"Test Securite\",\"slug\":\"test-securite\","
                + "\"category\":\"Test\",\"year\":2026,\"featured\":false,\"showStoryLink\":true,\"showStoryButton\":true}";
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/furniture"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, response.statusCode());
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private String getValidToken() throws Exception {
        String body = objectMapper.writeValueAsString(new LoginRequest("admin", "admin"));
        var request = HttpRequest.newBuilder()
                .uri(uri("/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), LoginResponse.class).token();
    }
}
