package com.atelier.portfolio.model;

import java.util.List;

/**
 * Vue enrichie d'une story pour la page de gestion admin : la story + le nombre
 * de slides + les sliders qui la contiennent + le titre de l'owner (meuble/expo).
 */
public record StoryAdminView(
        String id,
        String ownerKind,
        String ownerId,
        String ownerTitle,
        String title,
        String coverImage,
        ImageCrop coverCrop,
        String slug,
        int position,
        int slideCount,
        List<SliderRef> sliders
) {
    public record SliderRef(String id, String title) {}
}
