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
import java.util.List;
import java.util.Optional;

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
        when(repository.findAll()).thenReturn(List.of(older, newer));

        List<Photo> result = service.findAll();

        assertEquals(2, result.size());
        assertEquals("ph-002", result.get(0).id());
        assertEquals("ph-001", result.get(1).id());
    }

    @Test
    void testFindAll_EmptyRepository_ReturnsEmptyList() {
        when(repository.findAll()).thenReturn(List.of());

        List<Photo> result = service.findAll();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // --- store ---

    @Test
    void testStore_CreatesFileOnDisk_AndPersistsEntity() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "portrait.jpg", "image/jpeg", new byte[]{10, 20, 30}
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
        assertArrayEquals(new byte[]{10, 20, 30}, Files.readAllBytes(stored));

        verify(repository, times(1)).save(any(PhotoEntity.class));
    }

    @Test
    void testStore_TwoFilesWithSameName_GetDistinctFilenames() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", "image/png", new byte[]{1}
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Photo first  = service.store(file);
        Photo second = service.store(file);

        assertNotEquals(first.filename(), second.filename());
    }

    @Test
    void testStore_FileWithoutExtension_StoresWithoutExtension() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "noext", "image/jpeg", new byte[]{1}
        );
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Photo result = service.store(file);

        assertFalse(result.filename().contains("."));
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
