package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.PhotoEntity;
import com.atelier.portfolio.model.Photo;
import com.atelier.portfolio.repository.PhotoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class PhotoService {

    private final PhotoRepository repository;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.upload.base-url:/api/photos/files}")
    private String baseUrl;

    public PhotoService(PhotoRepository repository) {
        this.repository = repository;
    }

    public List<Photo> findAll() {
        return repository.findAllByOrderByUploadedAtDesc().stream()
                .map(PhotoService::toDto)
                .toList();
    }

    @Transactional
    public Photo store(MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo";
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalName.substring(dotIndex);
        }
        String filename = UUID.randomUUID() + extension;

        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        file.transferTo(target);

        String url = baseUrl + "/" + filename;

        PhotoEntity entity = new PhotoEntity();
        entity.setId("ph-" + UUID.randomUUID().toString().substring(0, 8));
        entity.setFilename(filename);
        entity.setOriginalName(originalName);
        entity.setUrl(url);
        entity.setUploadedAt(Instant.now().toString());
        entity.setTags(new ArrayList<>());

        return toDto(repository.save(entity));
    }

    public Resource loadAsResource(String filename) throws MalformedURLException {
        Path file = Paths.get(uploadDir).resolve(filename).normalize();
        Resource resource = new UrlResource(file.toUri());
        if (resource.exists() && resource.isReadable()) {
            return resource;
        }
        return null;
    }

    @Transactional
    public boolean delete(String id) {
        return repository.findById(id).map(entity -> {
            try {
                Path file = Paths.get(uploadDir).resolve(entity.getFilename()).normalize();
                Files.deleteIfExists(file);
            } catch (IOException ignored) {
            }
            repository.delete(entity);
            return true;
        }).orElse(false);
    }

    @Transactional
    public Optional<Photo> updateTags(String id, List<String> tags) {
        return repository.findById(id).map(entity -> {
            entity.getTags().clear();
            entity.getTags().addAll(normalizeTags(tags));
            return toDto(repository.save(entity));
        });
    }

    static List<String> normalizeTags(List<String> input) {
        if (input == null) return List.of();
        return input.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .map(s -> s.length() > 100 ? s.substring(0, 100) : s)
                .distinct()
                .limit(30)
                .toList();
    }

    private static Photo toDto(PhotoEntity entity) {
        return new Photo(
                entity.getId(),
                entity.getFilename(),
                entity.getOriginalName(),
                entity.getUrl(),
                entity.getUploadedAt(),
                List.copyOf(entity.getTags())
        );
    }
}
