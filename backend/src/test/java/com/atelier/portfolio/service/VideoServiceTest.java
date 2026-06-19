package com.atelier.portfolio.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class VideoServiceTest {

    private VideoService newService(Path dir) {
        VideoService service = new VideoService();
        ReflectionTestUtils.setField(service, "uploadDir", dir.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "/api/videos/files");
        return service;
    }

    @Test
    void store_accepte_mp4_et_renvoie_url(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        MockMultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[]{1, 2, 3});

        VideoService.StoredVideo result = service.store(file);

        assertTrue(result.url().startsWith("/api/videos/files/"));
        assertTrue(result.filename().endsWith(".mp4"));
    }

    @Test
    void store_accepte_vtt(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        MockMultipartFile file = new MockMultipartFile("file", "subs.vtt", "text/vtt", "WEBVTT".getBytes());

        VideoService.StoredVideo result = service.store(file);

        assertTrue(result.filename().endsWith(".vtt"));
    }

    @Test
    void store_rejette_extension_interdite(@TempDir Path dir) {
        VideoService service = newService(dir);
        MockMultipartFile file = new MockMultipartFile("file", "hack.exe", "application/octet-stream", new byte[]{0});

        assertThrows(IllegalArgumentException.class, () -> service.store(file));
    }

    @Test
    void loadAsResource_bloque_path_traversal(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        assertNull(service.loadAsResource("../../etc/passwd"));
    }

    @Test
    void loadAsResource_renvoie_null_si_absent(@TempDir Path dir) throws Exception {
        VideoService service = newService(dir);
        assertNull(service.loadAsResource("inexistant.mp4"));
    }
}
