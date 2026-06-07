package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.service.PhotoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import java.util.Map;

/**
 * Mutations photos sous /api/admin/** : route authentifiee par SecurityConfig.
 * Le GET public (liste + serve) reste expose par {@link PhotoController}.
 */
@RestController
@RequestMapping("/api/admin/photos")
public class AdminPhotoController {

    private final PhotoService service;

    public AdminPhotoController(PhotoService service) {
        this.service = service;
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    @PutMapping(value = "/{id}/tags", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Photo> updateTags(@PathVariable String id, @RequestBody PhotoController.TagsRequest body) {
        return service.updateTags(id, body.tags())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Migration one-shot : applique l'optimisation a toutes les photos deja uploadees.
     * Idempotent : peut etre rejoue sans risque, les fichiers deja optimises sont laisses.
     */
    @PostMapping("/optimize")
    public ResponseEntity<PhotoService.OptimizeReport> optimizeAll() {
        return ResponseEntity.ok(service.optimizeAll());
    }
}
