package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

/**
 * Service public des fichiers vidéo/sous-titres. GET permitAll (catalogue).
 * Supporte les requêtes HTTP Range (seek vidéo) via ResourceRegion : 206
 * Partial Content si en-tête Range présent, 200 complet sinon.
 */
@RestController
@RequestMapping("/api/videos")
public class VideoController {

    // Taille max d'un chunk renvoyé pour une requête Range (1 Mo).
    private static final long MAX_CHUNK = 1_048_576L;

    private final VideoService service;

    public VideoController(VideoService service) {
        this.service = service;
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<ResourceRegion> serve(@PathVariable String filename,
                                                @RequestHeader HttpHeaders headers) throws IOException {
        Resource resource = service.loadAsResource(filename);
        if (resource == null) {
            return ResponseEntity.notFound().build();
        }
        long length = resource.contentLength();
        List<HttpRange> ranges = headers.getRange();

        ResourceRegion region;
        HttpStatus status;
        if (ranges.isEmpty()) {
            region = new ResourceRegion(resource, 0, length);
            status = HttpStatus.OK;
        } else {
            HttpRange range = ranges.get(0);
            long start = range.getRangeStart(length);
            long end = range.getRangeEnd(length);
            long count = Math.min(MAX_CHUNK, end - start + 1);
            region = new ResourceRegion(resource, start, count);
            status = HttpStatus.PARTIAL_CONTENT;
        }

        return ResponseEntity.status(status)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(contentTypeFor(filename))
                .body(region);
    }

    private static MediaType contentTypeFor(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0) return MediaType.APPLICATION_OCTET_STREAM;
        return switch (filename.substring(dot + 1).toLowerCase(Locale.ROOT)) {
            case "mp4"  -> MediaType.parseMediaType("video/mp4");
            case "webm" -> MediaType.parseMediaType("video/webm");
            case "vtt"  -> MediaType.parseMediaType("text/vtt");
            default     -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }
}
