package com.atelier.portfolio.config;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Translates a Heroku/Railway-style {@code postgresql://user:pass@host:port/db}
 * connection string into the JDBC form Spring Boot's datasource expects.
 * Runs before datasource auto-configuration so it transparently fixes
 * {@code spring.datasource.url} or the upstream {@code DATABASE_URL} env var.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String JDBC_PREFIX = "jdbc:postgresql://";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        String raw = firstNonJdbcCandidate(
                env.getProperty("spring.datasource.url"),
                env.getProperty("DATABASE_URL"));
        if (raw == null) {
            return;
        }

        try {
            URI uri = URI.create(raw);
            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (host == null) {
                return;
            }

            String jdbcUrl = JDBC_PREFIX + host + ":" + port + path;

            Map<String, Object> props = new HashMap<>();
            props.put("spring.datasource.url", jdbcUrl);
            props.put("spring.liquibase.url", jdbcUrl);

            String userInfo = uri.getUserInfo();
            if (userInfo != null && !userInfo.isEmpty()) {
                String[] parts = userInfo.split(":", 2);
                String user = parts[0];
                String password = parts.length > 1 ? parts[1] : "";
                props.put("spring.datasource.username", user);
                props.put("spring.datasource.password", password);
                props.put("spring.liquibase.user", user);
                props.put("spring.liquibase.password", password);
            }

            env.getPropertySources().addFirst(new MapPropertySource("databaseUrlPostProcessor", props));
        } catch (IllegalArgumentException ignored) {
            // Leave the original value untouched if it is not a valid URI.
        }
    }

    private static String firstNonJdbcCandidate(String... values) {
        for (String value : values) {
            if (value == null || value.isEmpty()) continue;
            String lower = value.toLowerCase();
            if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
                return value;
            }
        }
        return null;
    }
}
