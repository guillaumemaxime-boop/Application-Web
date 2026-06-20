package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.service.PhotoService;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService service;

    /**
     * Image servie par défaut quand une référence est perdue (fichier supprimé ou
     * absent de ce volume). Le serve renvoie une redirection vers ce chemin plutôt
     * qu'une image cassée. Vide => 404 historique (fallback désactivé).
     */
    @Value("${app.upload.fallback-image:/logo.jpg}")
    private String fallbackImage;

    public PhotoController(PhotoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Photo> list() {
        return service.findAll();
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Resource resource = service.loadAsResource(filename);
        if (resource == null) {
            // Référence perdue (fichier supprimé ou jamais présent sur ce volume) :
            // on redirige vers une image par défaut (le logo) plutôt que de renvoyer
            // une image cassée. Couvre galeries, covers, slides... et les pertes
            // futures, en un seul endroit. Cache no-store : ne fige pas le placeholder
            // sur l'URL d'UUID (au cas où le fichier réapparaîtrait).
            if (fallbackImage == null || fallbackImage.isBlank()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.FOUND)
                    .cacheControl(CacheControl.noStore())
                    .location(URI.create(fallbackImage))
                    .build();
        }
        String contentType = contentTypeFor(filename);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    private static String contentTypeFor(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return switch (filename.substring(dot + 1).toLowerCase(Locale.ROOT)) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "avif" -> "image/avif";
            default -> MediaType.APPLICATION_OCTET_STREAM_VALUE;
        };
    }

    public record TagsRequest(@Size(max = 30) List<@Size(max = 100) String> tags) {}
}
