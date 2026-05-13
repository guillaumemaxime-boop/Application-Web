package com.atelier.portfolio.service;

import com.atelier.portfolio.entity.StorySlideEntity;
import com.atelier.portfolio.entity.StorySlideSpecEntry;
import com.atelier.portfolio.model.Slide;
import com.atelier.portfolio.model.SpecEntry;
import com.atelier.portfolio.repository.StorySlideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class StoryService {

    private final StorySlideRepository repository;

    public StoryService(StorySlideRepository repository) {
        this.repository = repository;
    }

    public List<Slide> findByOwner(String ownerKind, String ownerId) {
        return repository.findByOwnerKindAndOwnerIdOrderByPosition(ownerKind, ownerId)
                .stream()
                .map(StoryService::toDto)
                .toList();
    }

    @Transactional
    public void replaceSlides(String ownerKind, String ownerId, List<Slide> slides) {
        repository.deleteByOwnerKindAndOwnerId(ownerKind, ownerId);
        List<StorySlideEntity> entities = new ArrayList<>();
        for (int i = 0; i < slides.size(); i++) {
            entities.add(toEntity(slides.get(i), ownerKind, ownerId, i));
        }
        repository.saveAll(entities);
    }

    @Transactional
    public void deleteAllForOwner(String ownerKind, String ownerId) {
        repository.deleteByOwnerKindAndOwnerId(ownerKind, ownerId);
    }

    private static Slide toDto(StorySlideEntity e) {
        return switch (e.getType()) {
            case "cover" -> new Slide.CoverSlide(e.getId(), e.getPosition(), e.getSrc());
            case "image" -> new Slide.ImageSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption());
            case "spec"  -> new Slide.SpecSlide(e.getId(), e.getPosition(),
                    e.getSpecs().stream().map(s -> new SpecEntry(s.getLabel(), s.getValue())).toList());
            case "quote" -> new Slide.QuoteSlide(e.getId(), e.getPosition(), e.getQuoteBody(), e.getQuoteCite());
            case "link"  -> new Slide.LinkSlide(e.getId(), e.getPosition(), e.getLinkLabel(), e.getLinkDesc(), e.getLinkHref());
            default -> throw new IllegalStateException("Unknown slide type: " + e.getType());
        };
    }

    private static StorySlideEntity toEntity(Slide slide, String ownerKind, String ownerId, int position) {
        StorySlideEntity e = new StorySlideEntity();
        e.setId(slide.id() != null && !slide.id().isBlank() ? slide.id() : "sl-" + UUID.randomUUID().toString().substring(0, 8));
        e.setOwnerKind(ownerKind);
        e.setOwnerId(ownerId);
        e.setPosition(position);
        switch (slide) {
            case Slide.CoverSlide c -> { e.setType("cover"); e.setSrc(c.src()); }
            case Slide.ImageSlide i -> { e.setType("image"); e.setSrc(i.src()); e.setCaption(i.caption()); }
            case Slide.SpecSlide s -> {
                e.setType("spec");
                List<StorySlideSpecEntry> specs = s.specs().stream().map(entry -> {
                    StorySlideSpecEntry se = new StorySlideSpecEntry();
                    se.setLabel(entry.label());
                    se.setValue(entry.value());
                    return se;
                }).toList();
                e.setSpecs(new ArrayList<>(specs));
            }
            case Slide.QuoteSlide q -> { e.setType("quote"); e.setQuoteBody(q.body()); e.setQuoteCite(q.cite()); }
            case Slide.LinkSlide l -> { e.setType("link"); e.setLinkLabel(l.label()); e.setLinkDesc(l.description()); e.setLinkHref(l.href()); }
        }
        return e;
    }
}
