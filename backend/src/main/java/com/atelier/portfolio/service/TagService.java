package com.atelier.portfolio.service;

import com.atelier.portfolio.repository.FurnitureRepository;
import com.atelier.portfolio.repository.ExhibitionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.TreeSet;

@Service
@Transactional(readOnly = true)
public class TagService {

    private final FurnitureRepository furnitureRepo;
    private final ExhibitionRepository exhibitionRepo;

    public TagService(FurnitureRepository furnitureRepo, ExhibitionRepository exhibitionRepo) {
        this.furnitureRepo = furnitureRepo;
        this.exhibitionRepo = exhibitionRepo;
    }

    public List<String> findAllTags() {
        TreeSet<String> set = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        furnitureRepo.findAll().forEach(f -> set.addAll(f.getTags()));
        exhibitionRepo.findAll().forEach(e -> set.addAll(e.getTags()));
        return set.stream().toList();
    }
}
