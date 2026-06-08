# 18. Pattern page/view pour les fiches détail

Date : 2026-06-08
Statut : Accepté

## Contexte

Les fiches détail (mobilier, exposition) étaient rendues par des composants `*-detail.component.ts` qui mélangeaient :
- Routing Angular et chargement API
- Story viewer queue + contact form + hooks SEO
- Rendu visuel (hero, description, galerie, CTA)

Le sous-projet 2/4 (preview WYSIWYG Fiche Mobilier) demande le MÊME rendu visuel mais avec :
- Données différentes (FormGroup en cours d'édition au lieu de DB)
- Mode editable (overlays hover Cadrer/Remplacer/Retirer, édition inline texte au double-clic, drag-reorder, resize WYSIWYG)
- Identité pixel-perfect avec le rendu public

## Décision

Séparer chaque fiche en deux composants :
- **Page** (`furniture-detail.component.ts`) : route Angular, chargement via `PortfolioService`, hooks SEO (`Meta`/`Title`), story viewer queue, contact-form projeté dans un slot `[ctaSlot]`. Délègue tout le rendu visuel.
- **View** (`furniture-detail-view.component.ts`) : composant standalone pur, prend une entité `Furniture` en input, rend hero / description / galerie / CTA via `<ng-content select="[ctaSlot]">`. Accepte un mode `editable` (boolean) pour activer les overlays admin + édition inline + drag/resize.

Le view est ré-utilisé tel quel par :
- `furniture-detail.component.ts` (page publique, `editable=false`)
- `<app-furniture-preview>` (wrapper admin, `editable=true`)

## Conséquences

- (+) Rendu public et preview admin partagent EXACTEMENT le même composant — zéro drift.
- (+) Le view est testable indépendamment des routes et de l'API (Inputs/Outputs purs).
- (+) Le refactor est validé par Playwright sans `--update` (pixel-identité avant/après).
- (+) Réduction de complexité côté page (375 → 137 lignes sur furniture-detail).
- (-) Surface API plus grande (Inputs/Outputs publiés par le view).
- (-) Refactor à appliquer aussi aux fiches exposition (sous-projet 3) et home (sous-projet 4).
- (-) Le slot `[ctaSlot]` permet la projection mais introduit une dépendance template entre page et view (la page doit savoir nommer son slot correctement).

## Alternatives écartées

- **Réutiliser FurnitureDetailComponent avec input override** : aurait gardé la logique de chargement et de routing dans le composant utilisé par l'admin. Mélange des responsabilités, risque que le contact form se soumette en preview.
- **Dupliquer le template** : drift garanti à la première évolution de structure.

## Référence

Spec sous-projet 2/4 : [docs/superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md](../superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md).
Plan d'implémentation : [docs/superpowers/plans/2026-06-08-furniture-detail-wysiwyg-preview.md](../superpowers/plans/2026-06-08-furniture-detail-wysiwyg-preview.md).
ADR-0017 (Cropper.js) : `docs/adr/0017-cropperjs-image-crop-tool.md`.
