package com.atelier.portfolio.controller;

import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.service.PhotoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoControllerTest {

    @Mock
    private PhotoService service;

    @InjectMocks
    private PhotoController controller;

    private Photo samplePhoto;

    @BeforeEach
    void setUp() {
        samplePhoto = new Photo(
                "ph-abc12345",
                "8f3a1b2c-uuid.jpg",
                "portrait-studio.jpg",
                "/api/photos/files/8f3a1b2c-uuid.jpg",
                "2026-05-10T18:47:54.746Z",
                List.of()
        );
    }

    // --- list ---

    @Test
    void testList_ReturnsAllPhotos() {
        when(service.findAll()).thenReturn(List.of(samplePhoto));

        List<Photo> result = controller.list();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(samplePhoto, result.get(0));
        verify(service, times(1)).findAll();
    }

    @Test
    void testList_EmptyLibrary_ReturnsEmptyList() {
        when(service.findAll()).thenReturn(List.of());

        List<Photo> result = controller.list();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // --- upload ---

    @Test
    void testUpload_ValidFile_ReturnsCreatedWithLocation() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait-studio.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );
        when(service.store(file)).thenReturn(samplePhoto);

        ResponseEntity<?> result = controller.upload(file);

        assertEquals(201, result.getStatusCode().value());
        assertEquals(samplePhoto, result.getBody());
        assertNotNull(result.getHeaders().getLocation());
        assertEquals(samplePhoto.url(), result.getHeaders().getLocation().toString());
        verify(service, times(1)).store(file);
    }

    @Test
    void testUpload_ServiceThrows_PropagatesException() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "bad.jpg", "image/jpeg", new byte[]{0}
        );
        when(service.store(file)).thenThrow(new IOException("disk full"));

        assertThrows(IOException.class, () -> controller.upload(file));
    }

    @Test
    void upload_renvoie_400_pour_extension_invalide() throws IOException {
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

    // --- serve ---

    @Test
    void testServe_ExistingFile_ReturnsOkWithBody() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("8f3a1b2c-uuid.jpg")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("8f3a1b2c-uuid.jpg");

        assertEquals(200, result.getStatusCode().value());
        assertEquals(mockResource, result.getBody());
        assertNotNull(result.getHeaders().get(HttpHeaders.CONTENT_DISPOSITION));
    }

    @Test
    void testServe_NonExistingFile_ReturnsNotFound() throws IOException {
        when(service.loadAsResource("missing.jpg")).thenReturn(null);

        ResponseEntity<Resource> result = controller.serve("missing.jpg");

        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
    }

    @Test
    void serve_renvoie_image_jpeg_pour_jpg() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("photo.jpg")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("photo.jpg");

        assertEquals(200, result.getStatusCode().value());
        assertEquals("image/jpeg", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_renvoie_image_png_pour_png() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("photo.PNG")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("photo.PNG");

        assertEquals("image/png", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_renvoie_octet_stream_pour_extension_inconnue() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("file.xyz")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("file.xyz");

        assertEquals("application/octet-stream", result.getHeaders().getContentType().toString());
    }

    @Test
    void serve_renvoie_octet_stream_pour_fichier_sans_extension() throws IOException {
        Resource mockResource = mock(Resource.class);
        when(service.loadAsResource("noext")).thenReturn(mockResource);

        ResponseEntity<Resource> result = controller.serve("noext");

        assertEquals("application/octet-stream", result.getHeaders().getContentType().toString());
    }

    // --- delete ---

    @Test
    void testDelete_ExistingId_ReturnsNoContent() {
        when(service.delete("ph-abc12345")).thenReturn(true);

        ResponseEntity<Void> result = controller.delete("ph-abc12345");

        assertEquals(204, result.getStatusCode().value());
        verify(service, times(1)).delete("ph-abc12345");
    }

    @Test
    void testDelete_NonExistingId_ReturnsNotFound() {
        when(service.delete("ph-unknown")).thenReturn(false);

        ResponseEntity<Void> result = controller.delete("ph-unknown");

        assertEquals(404, result.getStatusCode().value());
    }

    // --- updateTags ---

    @Test
    void testUpdateTags_ExistingId_ReturnsOkWithBody() {
        Photo updated = new Photo(
                samplePhoto.id(),
                samplePhoto.filename(),
                samplePhoto.originalName(),
                samplePhoto.url(),
                samplePhoto.uploadedAt(),
                List.of("studio", "atelier")
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
    void testUpdateTags_UnknownId_ReturnsNotFound() {
        when(service.updateTags("ph-ghost", List.of("studio"))).thenReturn(Optional.empty());

        ResponseEntity<Photo> result = controller.updateTags(
                "ph-ghost",
                new PhotoController.TagsRequest(List.of("studio"))
        );

        assertEquals(404, result.getStatusCode().value());
        assertNull(result.getBody());
    }
}
