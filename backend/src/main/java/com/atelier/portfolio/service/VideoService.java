package com.atelier.portfolio.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Stockage et service des fichiers video auto-heberges (et de leurs pistes
 * de sous-titres .vtt). Distinct de PhotoService : pas d'optimisation, pas
 * d'entite DB — l'URL retournee est persistee sur l'entite proprietaire
 * (fiche) ou la cle SiteContent (studio.video.*).
 */
@Service
public class VideoService {

    // Allowlist stricte. Pas de transcodage : l'admin fournit un mp4 web-ready.
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".mp4", ".webm", ".vtt");

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.video.base-url:/api/videos/files}")
    private String baseUrl;

    public StoredVideo store(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "video";
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalName.substring(dotIndex);
        }
        String normalizedExt = extension.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(normalizedExt)) {
            throw new IllegalArgumentException("Extension non autorisee: " + extension);
        }
        String filename = UUID.randomUUID() + normalizedExt;

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        Files.write(target, file.getBytes());

        return new StoredVideo(filename, baseUrl + "/" + filename);
    }

    public Resource loadAsResource(String filename) throws MalformedURLException {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = uploadPath.resolve(filename).normalize();
        if (!filePath.startsWith(uploadPath)) {
            return null;
        }
        Resource resource = new UrlResource(filePath.toUri());
        if (resource.exists() && resource.isReadable()) {
            return resource;
        }
        return null;
    }

    public boolean delete(String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(filename).normalize();
            if (!filePath.startsWith(uploadPath)) {
                return false;
            }
            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            return false;
        }
    }

    public record StoredVideo(String filename, String url) {}
}
