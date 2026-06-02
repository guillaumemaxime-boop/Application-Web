package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.service.PhotoService;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private final PhotoService service;

    public PhotoController(PhotoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Photo> list() {
        return service.findAll();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam MultipartFile file) throws IOException {
        try {
            Photo photo = service.store(file);
            return ResponseEntity.created(URI.create(photo.url())).body(photo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Resource resource = service.loadAsResource(filename);
        if (resource == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = contentTypeFor(filename);
        return ResponseEntity.ok()
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @PutMapping(value = "/{id}/tags", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Photo> updateTags(@PathVariable String id, @RequestBody TagsRequest body) {
        return service.updateTags(id, body.tags())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record TagsRequest(@Size(max = 30) List<@Size(max = 100) String> tags) {}
}
