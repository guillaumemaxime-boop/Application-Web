package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

/**
 * Mutations video sous /api/admin/** : route authentifiee par SecurityConfig.
 * Le GET public (serve) reste expose par {@link VideoController}.
 */
@RestController
@RequestMapping("/api/admin/videos")
public class AdminVideoController {

    private final VideoService service;

    public AdminVideoController(VideoService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam MultipartFile file) throws IOException {
        try {
            VideoService.StoredVideo stored = service.store(file);
            return ResponseEntity.created(URI.create(stored.url()))
                    .body(Map.of("url", stored.url(), "filename", stored.filename()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/files/{filename:.+}")
    public ResponseEntity<Void> delete(@PathVariable String filename) {
        return service.delete(filename)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
