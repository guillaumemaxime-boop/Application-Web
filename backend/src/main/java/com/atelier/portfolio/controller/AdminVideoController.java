package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Video;
import com.atelier.portfolio.service.VideoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Mutations vidéo sous /api/admin/videos — authentifié par SecurityConfig (JWT).
 *
 * Routes :
 *   POST   /                    — upload async (.mp4/.webm → async UPLOADED ; .vtt → url directe)
 *   GET    /{id}                — statut de transcodage
 *   POST   /{id}/retry          — relance si FAILED ; 409 si état non-relançable
 *   DELETE /{id}                — suppression par id d'entité VideoEntity
 *   DELETE /files/{filename:.+} — suppression d'un fichier sans entité (ex : .vtt)
 *
 * Choix 409 pour retry impossible : l'entité peut exister dans un état non-relançable
 * (PROCESSING, READY, UPLOADED) ; 409 Conflict signal que la ressource est présente
 * mais l'opération est invalide dans l'état courant. Le client peut faire un GET
 * préalable pour distinguer "id inexistant" de "id non-FAILED".
 */
@RestController
@RequestMapping("/api/admin/videos")
public class AdminVideoController {

    private final VideoService service;

    public AdminVideoController(VideoService service) {
        this.service = service;
    }

    // -----------------------------------------------------------------------
    // POST / — upload
    // -----------------------------------------------------------------------

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam MultipartFile file) throws IOException {
        try {
            VideoService.StoredVideo stored = service.store(file);
            // Construit la map de réponse avec les champs non-null uniquement
            Map<String, Object> body = new LinkedHashMap<>();
            if (stored.id() != null)       body.put("id",       stored.id());
            if (stored.status() != null)   body.put("status",   stored.status());
            if (stored.url() != null)      body.put("url",      stored.url());
            if (stored.filename() != null) body.put("filename", stored.filename());
            return ResponseEntity.status(201).body(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // -----------------------------------------------------------------------
    // GET /{id} — statut
    // -----------------------------------------------------------------------

    @GetMapping("/{id}")
    public ResponseEntity<Video> getStatus(@PathVariable String id) {
        Video video = service.getStatus(id);
        return video != null
                ? ResponseEntity.ok(video)
                : ResponseEntity.notFound().build();
    }

    // -----------------------------------------------------------------------
    // POST /{id}/retry — relance
    // -----------------------------------------------------------------------

    @PostMapping("/{id}/retry")
    public ResponseEntity<Void> retry(@PathVariable String id) {
        return service.retry(id)
                ? ResponseEntity.ok().build()
                : ResponseEntity.status(409).build();
    }

    // -----------------------------------------------------------------------
    // POST /hls — génération HLS batch
    // -----------------------------------------------------------------------

    @PostMapping("/hls")
    public ResponseEntity<?> generateHls() {
        VideoService.VideoHlsReport report = service.generateHlsAll();
        return ResponseEntity.ok(Map.of("count", report.count(), "generated", report.generated()));
    }

    // -----------------------------------------------------------------------
    // DELETE /{id} — suppression par id d'entité
    // -----------------------------------------------------------------------

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable String id) {
        return service.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

    // -----------------------------------------------------------------------
    // DELETE /files/{filename} — suppression fichier sans entité (ex : .vtt)
    // -----------------------------------------------------------------------

    @DeleteMapping("/files/{filename:.+}")
    public ResponseEntity<Void> deleteByFilename(@PathVariable String filename) {
        return service.deleteByFilename(filename)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
