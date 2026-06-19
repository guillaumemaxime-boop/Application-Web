package com.atelier.portfolio.controller;

import com.atelier.portfolio.service.VideoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminVideoControllerTest {

    @Mock
    private VideoService service;

    @InjectMocks
    private AdminVideoController controller;

    @Test
    void upload_ok_renvoie_201() throws IOException {
        MultipartFile file = new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[]{1});
        when(service.store(file)).thenReturn(new VideoService.StoredVideo("uuid.mp4", "/api/videos/files/uuid.mp4"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(201, result.getStatusCode().value());
    }

    @Test
    void upload_extension_refusee_renvoie_400() throws IOException {
        MultipartFile file = new MockMultipartFile("file", "x.exe", "application/octet-stream", new byte[]{1});
        when(service.store(file)).thenThrow(new IllegalArgumentException("Extension non autorisee: .exe"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(400, result.getStatusCode().value());
    }

    @Test
    void delete_ok_renvoie_204() {
        when(service.delete("uuid.mp4")).thenReturn(true);
        assertEquals(204, controller.delete("uuid.mp4").getStatusCode().value());
    }

    @Test
    void delete_absent_renvoie_404() {
        when(service.delete("missing.mp4")).thenReturn(false);
        assertEquals(404, controller.delete("missing.mp4").getStatusCode().value());
    }
}
