package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.PhotoEntity;
import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.repository.PhotoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoServiceTest {

    @TempDir
    Path tempDir;

    @Mock
    private PhotoRepository repository;

    @InjectMocks
    private PhotoService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "uploadDir", tempDir.toString());
        ReflectionTestUtils.setField(service, "baseUrl", "/api/photos/files");
    }

    // --- findAll ---

    @Test
    void testFindAll_ReturnsMostRecentFirst() {
        PhotoEntity older = entity("ph-001", "a.jpg", "alpha.jpg", "2026-01-01T00:00:00Z");
        PhotoEntity newer = entity("ph-002", "b.jpg", "beta.jpg",  "2026-05-10T12:00:00Z");
        // le tri est délégué au SQL (ORDER BY uploaded_at DESC)
        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of(newer, older));

        List<Photo> result = service.findAll();

        assertEquals(2, result.size());
        assertEquals("ph-002", result.get(0).id());
        assertEquals("ph-001", result.get(1).id());
    }

    @Test
    void testFindAll_EmptyRepository_ReturnsEmptyList() {
        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of());

        List<Photo> result = service.findAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // --- store ---

    // Magic bytes JPEG : FF D8 FF
    private static final byte[] JPEG_MAGIC = {(byte)0xFF, (byte)0xD8, (byte)0xFF, 0x00, 0x00, 0x00,
                                               0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    // Magic bytes PNG : 89 50 4E 47
    private static final byte[] PNG_MAGIC  = {(byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                                              0x00, 0x00, 0x00, 0x00};

    @Test
    void testStore_CreatesFileOnDisk_AndPersistsEntity() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait.jpg", "image/jpeg", JPEG_MAGIC
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Photo result = service.store(file);

        assertNotNull(result.id());
        assertTrue(result.id().startsWith("ph-"));
        assertEquals("portrait.jpg", result.originalName());
        assertTrue(result.url().startsWith("/api/photos/files/"));
        assertTrue(result.filename().endsWith(".jpg"));

        Path stored = tempDir.resolve(result.filename());
        assertTrue(Files.exists(stored));

        verify(repository, times(1)).save(any(PhotoEntity.class));
    }

    @Test
    void testStore_TwoFilesWithSameName_GetDistinctFilenames() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", "image/png", PNG_MAGIC
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Photo first  = service.store(file);
        Photo second = service.store(file);

        assertNotEquals(first.filename(), second.filename());
    }

    @Test
    void testStore_FileWithoutExtension_RejectsAsUnsupportedMediaType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "noext", "image/jpeg", JPEG_MAGIC
        );

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.store(file));
    }

    @Test
    void testStore_DisallowedExtension_RejectsAsUnsupportedMediaType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "page.html", "text/html", new byte[]{'<', 'h', 't', 'm', 'l', '>'}
        );

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.store(file));
    }

    @Test
    void testStore_ValidExtensionInvalidMagicBytes_Rejects() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.jpg", "image/jpeg", new byte[]{0x00, 0x01, 0x02, 0x03,
                        0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B}
        );

        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> service.store(file));
    }

    // --- loadAsResource ---

    @Test
    void testLoadAsResource_ExistingFile_ReturnsReadableResource() throws IOException {
        Path file = tempDir.resolve("existing.jpg");
        Files.write(file, new byte[]{1, 2, 3});

        Resource resource = service.loadAsResource("existing.jpg");

        assertNotNull(resource);
        assertTrue(resource.exists());
        assertTrue(resource.isReadable());
    }

    @Test
    void testLoadAsResource_NonExistingFile_ReturnsNull() throws IOException {
        Resource resource = service.loadAsResource("ghost.jpg");

        assertNull(resource);
    }

    // --- delete ---

    @Test
    void testDelete_ExistingId_DeletesFileAndEntity() throws IOException {
        Path file = tempDir.resolve("to-delete.jpg");
        Files.write(file, new byte[]{9, 8, 7});

        PhotoEntity entity = entity("ph-del01", "to-delete.jpg", "original.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-del01")).thenReturn(Optional.of(entity));

        boolean result = service.delete("ph-del01");

        assertTrue(result);
        assertFalse(Files.exists(file));
        verify(repository, times(1)).delete(entity);
    }

    @Test
    void testDelete_NonExistingId_ReturnsFalse() {
        when(repository.findById("ph-ghost")).thenReturn(Optional.empty());

        boolean result = service.delete("ph-ghost");

        assertFalse(result);
        verify(repository, never()).delete(any());
    }

    @Test
    void testDelete_MissingFileOnDisk_StillDeletesEntity() {
        PhotoEntity entity = entity("ph-nf01", "missing-on-disk.jpg", "orig.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-nf01")).thenReturn(Optional.of(entity));

        boolean result = service.delete("ph-nf01");

        assertTrue(result);
        verify(repository, times(1)).delete(entity);
    }

    // --- updateTags ---

    @Test
    void updateTags_normalizesTrimLowercaseDistinct() {
        PhotoEntity entity = entity("ph-tag01", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-tag01")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<Photo> result = service.updateTags(
                "ph-tag01",
                new ArrayList<>(List.of("  Atelier ", "STUDIO", "atelier", ""))
        );

        assertTrue(result.isPresent());
        assertEquals(List.of("atelier", "studio"), entity.getTags());
        assertEquals(List.of("atelier", "studio"), result.get().tags());
    }

    @Test
    void updateTags_clipsAtMaxLength() {
        PhotoEntity entity = entity("ph-tag02", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-tag02")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        String huge = "x".repeat(150);

        Optional<Photo> result = service.updateTags("ph-tag02", List.of(huge));

        assertTrue(result.isPresent());
        assertEquals(1, entity.getTags().size());
        assertEquals(100, entity.getTags().get(0).length());
    }

    @Test
    void updateTags_clipsAtMax30Tags() {
        PhotoEntity entity = entity("ph-tag03", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        when(repository.findById("ph-tag03")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        List<String> manyTags = IntStream.range(0, 50)
                .mapToObj(i -> "tag" + i)
                .toList();

        Optional<Photo> result = service.updateTags("ph-tag03", manyTags);

        assertTrue(result.isPresent());
        assertEquals(30, entity.getTags().size());
    }

    @Test
    void updateTags_returnsEmptyForUnknownId() {
        when(repository.findById("ph-ghost")).thenReturn(Optional.empty());

        Optional<Photo> result = service.updateTags("ph-ghost", List.of("studio"));

        assertTrue(result.isEmpty());
        verify(repository, never()).save(any());
    }

    @Test
    void updateTags_nullInput_storesEmptyList() {
        PhotoEntity entity = entity("ph-tag04", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        entity.getTags().add("preexisting");
        when(repository.findById("ph-tag04")).thenReturn(Optional.of(entity));
        when(repository.save(any(PhotoEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        Optional<Photo> result = service.updateTags("ph-tag04", null);

        assertTrue(result.isPresent());
        assertTrue(entity.getTags().isEmpty());
        assertTrue(result.get().tags().isEmpty());
    }

    @Test
    void toDto_includesTagsListSnapshot() {
        PhotoEntity entity = entity("ph-tag05", "x.jpg", "x.jpg", "2026-05-10T00:00:00Z");
        entity.getTags().addAll(List.of("a", "b"));
        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of(entity));

        List<Photo> result = service.findAll();

        assertEquals(1, result.size());
        assertEquals(List.of("a", "b"), result.get(0).tags());
    }

    // --- helper ---

    private static PhotoEntity entity(String id, String filename, String originalName, String uploadedAt) {
        PhotoEntity e = new PhotoEntity();
        e.setId(id);
        e.setFilename(filename);
        e.setOriginalName(originalName);
        e.setUrl("/api/photos/files/" + filename);
        e.setUploadedAt(uploadedAt);
        return e;
    }
}
