package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.service.PhotoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminPhotoControllerTest {

    @Mock
    private PhotoService service;

    @InjectMocks
    private AdminPhotoController controller;

    private Photo samplePhoto;

    @BeforeEach
    void setUp() {
        samplePhoto = new Photo(
                "ph-abc12345",
                "8f3a1b2c-uuid.jpg",
                "portrait-studio.jpg",
                "/api/photos/files/8f3a1b2c-uuid.jpg",
                "2026-05-10T18:47:54.746Z",
                List.of(),
                "JPG",
                123456L
        );
    }

    @Test
    void upload_validFile_returnsCreatedWithLocation() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait-studio.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );
        when(service.store(file)).thenReturn(samplePhoto);

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(201, result.getStatusCode().value());
        assertEquals(samplePhoto, result.getBody());
        assertEquals(samplePhoto.url(), result.getHeaders().getLocation().toString());
    }

    @Test
    void upload_serviceThrowsIO_propagatesException() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "bad.jpg", "image/jpeg", new byte[]{0}
        );
        when(service.store(file)).thenThrow(new IOException("disk full"));

        assertThrows(IOException.class, () -> controller.upload(file));
    }

    @Test
    void upload_extensionInvalide_renvoie400() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "evil.html", "text/html", "<script>".getBytes()
        );
        when(service.store(file)).thenThrow(new IllegalArgumentException("Extension non autorisee: .html"));

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(400, result.getStatusCode().value());
        assertTrue(result.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertTrue(((String) body.get("error")).contains(".html"));
    }

    @Test
    void delete_existingId_returns204() {
        when(service.delete("ph-abc12345")).thenReturn(true);

        ResponseEntity<Void> result = controller.delete("ph-abc12345");

        assertEquals(204, result.getStatusCode().value());
        verify(service).delete("ph-abc12345");
    }

    @Test
    void delete_unknownId_returns404() {
        when(service.delete("ph-ghost")).thenReturn(false);

        ResponseEntity<Void> result = controller.delete("ph-ghost");

        assertEquals(404, result.getStatusCode().value());
    }

    @Test
    void updateTags_existingId_returns200WithBody() {
        Photo updated = new Photo(
                samplePhoto.id(),
                samplePhoto.filename(),
                samplePhoto.originalName(),
                samplePhoto.url(),
                samplePhoto.uploadedAt(),
                List.of("studio", "atelier"),
                samplePhoto.format(),
                samplePhoto.sizeBytes()
        );
        when(service.updateTags("ph-abc12345", List.of("Studio", "Atelier")))
                .thenReturn(Optional.of(updated));

        ResponseEntity<Photo> result = controller.updateTags(
                "ph-abc12345",
                new PhotoController.TagsRequest(List.of("Studio", "Atelier"))
        );

        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals(List.of("studio", "atelier"), result.getBody().tags());
    }

    @Test
    void updateTags_unknownId_returns404() {
        when(service.updateTags("ph-ghost", List.of("studio"))).thenReturn(Optional.empty());

        ResponseEntity<Photo> result = controller.updateTags(
                "ph-ghost",
                new PhotoController.TagsRequest(List.of("studio"))
        );

        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
    }
}
