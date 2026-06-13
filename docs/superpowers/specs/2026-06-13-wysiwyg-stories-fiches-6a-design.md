# Gestion des stories in-preview + retrait des fiches publiques (sous-projet 6a) — Spec

**Date** : 2026-06-13
**Statut** : Validé — à planifier
**Sous-projet** : 6a du chantier « Améliorations WYSIWYG v2 ». Le sous-projet 6 (« Stories depuis les fiches », le plus gros) a été **décomposé en 6a + 6b** :
- **6a** (cette spec) : retrait de la story du rendu **public** de la fiche + gestion des stories au niveau **story** depuis un bloc d'auteur admin dans le preview (sélection active, créer/renommer/supprimer/réordonner, cover), avec édition du contenu des slides via une **modale réutilisant l'éditeur existant**.
- **6b** (cycle ultérieur) : édition des slides **en place** (pure WYSIWYG) dans le bloc d'auteur, en auto-save, remplaçant la modale.

S'appuie sur les sous-projets 1-5, mergés sur main.

## Contexte

Aujourd'hui, une story (slideshow rattaché à un mobilier ou une exposition via `ownerKind`/`ownerId`) est :
- **rendue dans la fiche publique** (`furniture-detail-view` / `exhibition-detail-view` → `<app-story-inline [displaySlides]>` + bouton « Voir en plein écran ») ;
- **gérée uniquement depuis le panneau form-side** de la fiche admin (`mobilier.component` / `expositions.component`) : liste `currentStories()`, `newStory`/`renameStory`/`deleteStory`/`moveStoryUp`/`moveStoryDown`/`openCoverEditor`/`editStory`, et `<app-slides-editor [storyId]>` pour le contenu ;
- **aussi consommée via les sliders d'actualités de l'accueil** (un slider référence des stories ; clic → `story-viewer` plein écran).

Le preview de la fiche affiche la story en lecture seule, sans aucune affordance d'édition.

## Décision produit majeure : la story quitte la fiche publique

La story **n'est plus affichée dans la fiche publique**. Publiquement, une story n'est consommée que **via les sliders de l'accueil** (clic → `story-viewer`). La fiche publique se limite désormais aux détails de la pièce + galerie. La story reste **rattachée** à un mobilier/expo (ownership = contexte d'auteur), mais ce rattachement n'a plus d'effet de rendu sur la fiche.

Cela réalise le backlog « masquer story-inline fiches ».

## Périmètre validé (6a)

| Choix | Retenu | Écarté |
| --- | --- | --- |
| Rendu public fiche | **Retrait** de la section story (`<app-story-inline>` + bouton plein écran) | Conserver la story sur la fiche ; toggle par fiche |
| Gestion stories | Parité complète au **niveau story** depuis le preview : sélection active, créer, renommer, supprimer, réordonner, cover | Garder la gestion uniquement form-side |
| Surface d'édition admin | **Bloc d'auteur dans le preview, mode édition seulement**, badgé « non affiché publiquement » | Panneau form-side enrichi ; déplacement vers l'accueil/sliders |
| Édition contenu des slides (6a) | **Modale** réutilisant `<app-slides-editor>` existant | Édition en place (→ reportée en 6b) |
| Persistance ops story | **Auto-save immédiat** + toast | Bouton Enregistrer groupé |
| Form-side | **Conservé** (double accès) | Remplacé par le preview |
| Backend | **Aucun changement** (endpoints existants) | Nouveaux endpoints |

## Décisions architecturales

### 1. Retrait du rendu public de la story (vues détail)

Dans `furniture-detail-view` et `exhibition-detail-view`, en mode **public (non-editable)** : supprimer le bloc `@if (displaySlides.length > 0) { <app-story-inline> … bouton « Voir en plein écran » }`. La fiche publique = hero/détails + galerie.

- Les champs `showStoryLink` / `showStoryButton` (entité furniture) ne pilotent plus le rendu public de la fiche. **Pas de migration** : les colonnes restent en base ; les contrôles de formulaire correspondants sont **masqués** (devenus sans effet). Une suppression propre des champs pourra être traitée plus tard (hors 6a).
- Le `story-viewer` n'est plus lancé depuis la fiche publique ; il reste utilisé depuis les sliders accueil (inchangé).

### 2. Bloc d'auteur admin (mode editable seulement)

Toujours dans les vues détail, en mode **editable uniquement**, ajouter un bloc d'auteur, rendu **à la place** de l'ancienne section story et **absent en public** :

- Un libellé/badge : « Story — non affichée sur la fiche publique (visible via les sliders) ».
- `<app-story-manager-bar>` (cf. §3).
- La story active rendue via `<app-story-inline [slides]="displaySlides">` (lecture seule en 6a — l'admin voit le contenu tel qu'il apparaîtra dans le slider/viewer ; édition en place = 6b).

### 3. Composant `<app-story-manager-bar>` (extrait, pur, partagé)

Composant d'édition pur, rendu seulement en mode editable, partagé par les deux vues détail (extraction DRY, même esprit que `<app-tag-editor>` au SP4 et `<app-slider-composition-editor>` au SP5). Emplacement : aligné sur celui de `<app-tag-editor>`.

- **Inputs** : `stories: Story[]`, `activeStoryId: string | null`, `editable: boolean`.
- **Outputs** :
  - `select: string` (id de la story à afficher),
  - `create: void`,
  - `rename: { id: string; title: string }`,
  - `delete: string`,
  - `move: { id: string; dir: 'up' | 'down' }`,
  - `coverEdit: string`,
  - `slidesEdit: string`,
  - `viewerPreview: string` (aperçu plein écran de la story comme dans le slider).
- **UX** :
  - Chips = toutes les stories de l'owner (active surlignée) ; clic sur une chip → `select`.
  - Titre de la story active **renommable inline** (`contenteditable`, blur → `rename` ; pattern SP5).
  - Bouton `+ Nouvelle` → `create`.
  - Sur la story active : `↑`/`↓` (→ `move`), `cover` (→ `coverEdit`), `⚙ éditer slides` (→ `slidesEdit`), `🔍 aperçu plein écran` (→ `viewerPreview`), `🗑` (→ `delete`).
- État sans logique métier : pas d'appel API, pas de Router. a11y : `aria-label` sur les boutons icône, focus visible (conventions globales).
- S'il n'y a aucune story : afficher seulement `+ Nouvelle` (et un texte « Aucune story »).

### 4. Édition slides + cover (réutilisation)

- `slidesEdit(id)` → la page ouvre `<app-slides-editor [storyId]="id" [ownerSlug]>` en **modale/overlay** (role=dialog, aria-modal, cdkTrapFocus, Échap pour fermer, restitution de focus au déclencheur visée). L'éditeur conserve son bouton « Enregistrer les slides » (persistance batch existante) ; après enregistrement, la page rafraîchit les slides de l'active. *(En 6b, cette modale est remplacée par l'édition en place auto-save.)*
- `coverEdit(id)` → la page ouvre le `<app-image-crop-picker>` déjà utilisé pour les covers de story (logique `openCoverEditor`/`saveCover` existante).
- `viewerPreview(id)` → la page charge les slides de la story et ouvre le `story-viewer` existant (aperçu admin du rendu plein écran).

### 5. Flux de données (vues pures → pages)

ADR-0018 : les vues détail restent pures (aucun `HttpClient`/Router pour ces opérations) ; elles reçoivent `stories`/`activeStoryId`/`displaySlides` et émettent des events. Les pages (`mobilier.component`, `expositions.component`) détiennent `PortfolioService` et **réutilisent les méthodes CRUD stories déjà existantes** (`newStory`, `renameStory`, `deleteStory`, `moveStoryUp`/`moveStoryDown`, `openCoverEditor`/`saveCover`, `editStory`). Les pages relaient via `furniture-preview` / `exhibition-preview`.

- Nouvel état page : `activeStoryId` (signal) ; `displaySlides` de l'active dérivés/chargés pour le rendu du bloc admin.
- Auto-save : chaque op story = appel API + toast + rafraîchissement de `currentStories()` (déjà le comportement form-side).
- Le panneau form-side reste en place (double accès), inchangé.

### 6. Consommation publique (inchangée)

La story reste publiquement accessible **uniquement via les sliders accueil** (SP5) → `story-viewer`. Aucune modification slider/viewer. Le filtre `NewsSliderService.toView` (story sans slide exclue de l'affichage public) devient le seul garde-fou de visibilité publique — déjà documenté/annoncé via la note de l'éditeur de composition (SP5).

## Tests

- **`story-manager-bar.spec.ts`** (nouveau) : rend les chips des stories, active surlignée ; chaque action (`select`/`create`/`rename`/`delete`/`move`/`coverEdit`/`slidesEdit`/`viewerPreview`) émet le bon event ; renommage inline au blur ; cas « aucune story » ; absente quand `editable=false`.
- **`furniture-detail-view.spec.ts` / `exhibition-detail-view.spec.ts`** : mode **public** ne rend plus `<app-story-inline>` ni le bouton plein écran (assertions existantes à inverser/supprimer) ; mode **editable** rend le bloc d'auteur (badge + `story-manager-bar` + `story-inline` lecture seule) et relaie les events.
- **`mobilier.component.spec.ts` / `expositions.component.spec.ts`** : chaque event de la barre déclenche la bonne méthode/API ; `slidesEdit` ouvre la modale ; `coverEdit` ouvre le crop ; `activeStoryId` pilote les `displaySlides` rendus ; les méthodes CRUD existantes restent vertes.
- **Baselines Playwright** des fiches publiques : la story disparaît du rendu → **baselines à régénérer**, mais seulement **après validation visuelle manuelle** de la fiche par l'utilisateur (règle projet : jamais de baseline avant validation humaine).

## Hors portée (6a)

- Édition des slides **en place** (auto-save in-preview) → **6b**.
- Suppression définitive des champs `showStoryLink`/`showStoryButton` (entité + migration) → cleanup ultérieur.
- Modification du `story-viewer`, des sliders, ou du filtre `toView` (déjà traités au SP5).
- Gestion des stories depuis l'accueil/sliders (écarté : on reste « depuis les fiches »).
- Réordonnancement des slides par drag dans la modale (la modale réutilise l'éditeur existant tel quel).
- Restitution de focus fine après fermeture de la modale slides (dette a11y du chantier ; la modale garde cdkTrapFocus + Échap).
