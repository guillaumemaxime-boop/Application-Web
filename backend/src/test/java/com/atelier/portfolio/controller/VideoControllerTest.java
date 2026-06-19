package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VideoControllerTest {

    @Mock
    private VideoService service;

    @InjectMocks
    private VideoController controller;

    @Test
    void serve_sans_range_renvoie_200_complet_et_accept_ranges() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(1000L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        HttpHeaders headers = new HttpHeaders();
        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", headers);

        assertEquals(200, result.getStatusCode().value());
        assertEquals("bytes", result.getHeaders().getFirst(HttpHeaders.ACCEPT_RANGES));
        assertEquals("video/mp4", result.getHeaders().getContentType().toString());
        assertNotNull(result.getBody());
        assertEquals(0, result.getBody().getPosition());
        assertEquals(1000L, result.getBody().getCount());
    }

    @Test
    void serve_avec_range_renvoie_206_partiel() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(1000L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.RANGE, "bytes=100-199");
        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", headers);

        assertEquals(206, result.getStatusCode().value());
        assertEquals(100, result.getBody().getPosition());
        assertEquals(100, result.getBody().getCount());
    }

    @Test
    void serve_pose_cache_immuable() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(10L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", new HttpHeaders());

        String cc = result.getHeaders().getCacheControl();
        assertTrue(cc.contains("max-age=31536000"));
        assertTrue(cc.contains("immutable"));
    }

    @Test
    void serve_vtt_renvoie_text_vtt() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(50L);
        when(service.loadAsResource("subs.vtt")).thenReturn(resource);

        ResponseEntity<ResourceRegion> result = controller.serve("subs.vtt", new HttpHeaders());

        assertEquals("text/vtt", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_absent_renvoie_404() throws IOException {
        when(service.loadAsResource("missing.mp4")).thenReturn(null);

        ResponseEntity<ResourceRegion> result = controller.serve("missing.mp4", new HttpHeaders());

        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
    }

    @Test
    void serve_range_hors_borne_renvoie_416() throws IOException {
        Resource resource = mock(Resource.class);
        when(resource.contentLength()).thenReturn(1000L);
        when(service.loadAsResource("clip.mp4")).thenReturn(resource);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.RANGE, "bytes=5000-");
        ResponseEntity<ResourceRegion> result = controller.serve("clip.mp4", headers);

        assertEquals(416, result.getStatusCode().value());
        assertEquals("bytes */1000", result.getHeaders().getFirst(HttpHeaders.CONTENT_RANGE));
        assertNull(result.getBody());
    }
}
