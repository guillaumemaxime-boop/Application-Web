# Spécification Fonctionnelle — Milo GUILLAUME Design

**Version** : 2.6.0
**Date** : 09/06/2026
**Auteur** : Maxime Guillaume
**Statut** : En cours de validation

---

## Table des Matières
1. [Introduction](#1-introduction)
2. [Contexte et Objectifs](#2-contexte-et-objectifs)
3. [Public Cible](#3-public-cible)
4. [Fonctionnalités Principales](#4-fonctionnalités-principales)
5. [Exigences Fonctionnelles](#5-exigences-fonctionnelles)
6. [Exigences Non Fonctionnelles](#6-exigences-non-fonctionnelles)
7. [Maquettes et Flux Utilisateur](#7-maquettes-et-flux-utilisateur)
8. [Contraintes Techniques](#8-contraintes-techniques)
9. [Glossaire](#9-glossaire)
10. [Annexes](#10-annexes)

---

## 1. Introduction

### 1.1 Présentation du Projet

**Milo GUILLAUME Design** est une application web portfolio full-stack conçue pour présenter le travail de Milo Guillaume — designer spécialisé dans la **création de mobilier sculpté** et de **scénographies d'exposition artistiques**, basé à Paris.

L'application permet aux visiteurs de :
- Découvrir le **catalogue de pièces uniques** (mobilier sculpté).
- Explorer les **expositions passées et à venir**.
- En savoir plus sur le **studio, son processus créatif et ses distinctions**.

L'artisan dispose d'une **interface d'administration** intégrée pour gérer lui-même le catalogue et les expositions.

### 1.2 Portée du Document

Ce document décrit :
- Les **fonctionnalités** de l'application.
- Les **exigences techniques et métiers**.
- Les **flux utilisateur** et maquettes.
- Les **contraintes** et **hypothèses** de développement.

---

## 2. Contexte et Objectifs

### 2.1 Contexte

Milo Guillaume a besoin d'une **vitrine numérique** pour :
- **Promouvoir son travail** auprès de collectionneurs, galeries et médias.
- **Centraliser ses réalisations** (mobilier, scénographies) et son parcours.
- **Faciliter la prise de contact** pour des commandes ou collaborations.
- **Mettre à jour son catalogue** de manière autonome via une interface d'administration.

### 2.2 Objectifs

| Objectif | Description | Priorité |
|----------|-------------|----------|
| **Visibilité** | Mettre en avant les œuvres et expositions du studio. | ⭐⭐⭐ |
| **Expérience Utilisateur** | Offrir une navigation intuitive et esthétique. | ⭐⭐⭐ |
| **Accessibilité** | Rendre le contenu accessible sur tous les appareils. | ⭐⭐ |
| **Maintenabilité** | Permettre des mises à jour faciles du catalogue via l'admin. | ⭐⭐⭐ |
| **SEO** | Optimiser le référencement naturel. | ⭐ |

### 2.3 Hypothèses

- Les données (pièces, expositions) sont **gérées via l'interface d'administration** intégrée à l'application (`/admin`).
- L'application est **hébergée sur Railway** (backend + base de données) avec un frontend servi par Nginx.
- Les **images** sont référencées par URL externe (hébergement tiers, ex. CDN ou service cloud).
- Aucune **transaction financière** n'est gérée via l'application.
- L'interface d'administration est **protégée par authentification JWT** (identifiants configurés via variables d'environnement).

---

## 3. Public Cible

| Type d'Utilisateur | Description | Besoins Spécifiques |
|--------------------|-------------|----------------------|
| **Visiteur occasionnel** | Personnes découvrant le studio via les réseaux sociaux ou le bouche-à-oreille. | Navigation simple, contenu visuel attractif. |
| **Collectionneur** | Acheteurs potentiels de pièces uniques. | Fiches détaillées (matériaux, dimensions), contact facile. |
| **Galerie / Média** | Professionnels du monde de l'art (galeries, journalistes). | Accès aux expositions, images, informations du studio. |
| **Milo Guillaume** | Le designer lui-même, gestionnaire du catalogue. | Interface d'admin pour créer, modifier, supprimer pièces et expositions. |

---

## 4. Fonctionnalités Principales

### 4.1 Frontend (Interface Visiteur)

#### Page d'Accueil (`/`)

- **Hero** : titre du studio, tagline, ambiance visuelle.
- **Section Mobilier phare** : grille des pièces marquées `featured` (lien vers leur fiche).
- **Sliders d'actualités** : jusqu'à 3 carrousels éditoriaux assignés aux zones `news.primary`, `news.secondary`, `news.tertiary`. Chaque slider affiche des stories sélectionnées par l'admin depuis des pièces ou expositions variées. Clic sur une story → viewer plein écran.
- **Section Expositions phares** : liste des expositions marquées `featured`.
- **Citation** : extrait éditorial du studio.

#### Page Créations (`/creations`)

Catalogue agrégé regroupant l'ensemble du mobilier et des expositions de l'atelier sur une seule page.

- **Filtre de type** : bascule Tout / Mobilier / Expositions.
- **Facette Année** : boutons générés depuis les années présentes dans le catalogue, avec compteur dynamique par facette.
- **Facette Tags** : boutons générés depuis l'union des tags mobilier et expositions, avec compteur dynamique.
- **Logique de filtrage** : union OR (sélectionner plusieurs tags élargit les résultats ; un élément matche s'il possède au moins un des tags sélectionnés).
- **Deep-linking** : l'état des filtres est encodé dans les query params de l'URL (`?tags=bois,sculpture&years=2024&kind=furniture`), permettant le partage et le bouton Retour navigateur.
- **Grille responsive** : 3 colonnes desktop, 2 colonnes tablette, 1 colonne mobile. Badge "Exposition" sur les cartes exposition.
- Clic sur un tag dans une carte active le filtre correspondant.

#### Catalogue Mobilier (`/mobilier`)

- **Grille des pièces** : image de couverture, titre, catégorie.
- **Filtres par catégorie** : boutons dynamiques générés depuis les catégories existantes en base + bouton "Tout".
- Clic sur une pièce → fiche détaillée.

#### Fiche Pièce (`/mobilier/:slug`)

- **Hero** : image de couverture + bloc de spécifications (matière, designer, dimensions). Si un crop est défini, seule la zone cadrée est affichée (rendu CSS transform pixel-perfect) ; sinon, rendu natif `object-fit: cover`.
- **Description longue** : texte éditorial de la pièce.
- **Tags** : mots-clés thématiques associés à la pièce (cliquables → `/creations?tags=...`).
- **Stories** : si la pièce possède des stories éditoriaux, un bouton "Voir la story" ouvre le viewer plein écran. Le crop du cover de story est appliqué dans le viewer et dans les cards de news-slider.
- **Galerie** : grille CSS Grid. Chaque item occupe les colonnes et lignes définies par l'admin (`colSpan` 1–3, `rowSpan` 1–4) ; valeur par défaut 1×1. Chaque item affiche son crop si défini.
- **CTA** : lien de contact par e-mail.
- Gestion 404 si le slug n'existe pas.

#### Expositions (`/expositions`)

- **Liste chronologique** (ordre `date de début` décroissant) : image, titre, lieu, dates.

#### Fiche Exposition (`/expositions/:slug`)

- **Bannière** : image principale. Si un crop est défini, seule la zone cadrée est affichée (rendu CSS transform pixel-perfect) ; sinon, rendu natif `object-fit: cover`.
- **Détails** : titre, lieu (`venue · city, country`), dates, commissaire.
- **Description** : texte éditorial.
- **Galerie** : grille CSS Grid. Chaque item occupe les colonnes et lignes définies par l'admin (`colSpan` 1–3, `rowSpan` 1–4) ; valeur par défaut 1×1. Chaque item est rendu via `<app-cropped-image-canvas>` (crop appliqué si défini).
- **Tags** associés à l'exposition.
- Gestion 404 si le slug n'existe pas.

#### Studio (`/studio`)

- **Biographie** du designer.
- **Distinctions / Prix**.
- **Presse** : mentions et publications.
- **Contact** : e-mail du studio, localisation.

#### Administration (`/admin/**`)

- Interface CRUD complète pour le mobilier, les expositions, les stories et les sliders.
- Navigation latérale : **Accueil · Mobilier · Expositions · Navigation · Médiathèque · Textes · Typographie · Statistiques · Paramètres**.
- Formulaires de création / modification avec validation et retour visuel (toast auto-dismiss).
- Suppression avec confirmation implicite.

**Page Accueil (`/admin/accueil`)** :

- Gestion du masonry home feed (visibilité, ordre des sections).
- **Composition des sliders d'actualités** : création / modification / suppression de sliders, assignation à une zone (`news.primary/.secondary/.tertiary`), ajout/retrait de stories par drag & drop depuis la liste de toutes les stories disponibles.
- `/admin/sliders` redirige vers `/admin/accueil` (les sliders sont désormais gérés dans la page Accueil).
- **Preview WYSIWYG** (sous-projet 4/4) : voir section dédiée ci-après.

**Page Mobilier (`/admin/mobilier`)** :

- CRUD mobilier avec formulaire complet (titre, catégorie, images, dimensions, description, `featured`).
- **Champ Tags** : composant `<app-tag-input>` avec autocomplétion depuis `GET /api/tags`, chips + navigation clavier (WAI-ARIA combobox/listbox).
- **Outil de cadrage de la cover** : bouton « Cadrer » à côté du sélecteur d'image. Ouvre une modale avec Cropper.js (sélecteur d'aspect ratio : Libre / 16:9 / 4:5 / 1:1, coordonnées live en %, boutons Réinitialiser / Annuler / Valider). Une vignette de prévisualisation affiche le rendu pixel-perfect du crop sous le champ.
- **Galerie** : chaque vignette dispose d'un bouton ✂ ouvrant la même modale de cadrage. Un badge `✂ LxH` sur la vignette indique qu'un crop est défini.
- **Bloc Stories** : liste des stories de la pièce, CRUD stories, éditeur de slides par story. Le cover de chaque story dispose également d'un bouton « Cadrer ».
- **Preview WYSIWYG** (sous-projet 2/4) : voir section dédiée ci-après.

**Page Expositions (`/admin/expositions`)** :

- CRUD expositions avec formulaire complet.
- **Champ Tags** : même composant `<app-tag-input>`.
- **Outil de cadrage de la cover** : identique à la page Mobilier.
- **Galerie** : même comportement que Mobilier (bouton ✂ par vignette, badge crop).
- **Bloc Stories** : idem mobilier, avec cadrage du cover de story.
- **Preview WYSIWYG** (sous-projet 3/4) : voir section dédiée ci-après.

**Page Navigation (`/admin/navigation`)** :

- Toggle CMS pour chaque entrée de menu (visible / masqué).
- L'entrée **Créations** est configurable depuis cette page.

> **Hors portée (reporté)** : fallback clavier pour drag/resize ; édition inline du champ catégorie ; édition des slides de story depuis le preview ; édition inline du contenu des news-sliders et des cards depuis l'accueil ; application à d'autres pages (about, contact). Voir [docs/superpowers/specs/2026-06-07-image-crop-tool-design.md](../superpowers/specs/2026-06-07-image-crop-tool-design.md).

---

### 4.1.1 Preview WYSIWYG — Fiche Mobilier (sous-projet 2/4)

> Spec complète : [docs/superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md](../superpowers/specs/2026-06-08-furniture-detail-wysiwyg-preview-design.md)

L'édition d'une fiche mobilier propose un **toggle** entre deux modes :

- **✏ Modifier la pièce** (mode formulaire, défaut) : formulaire de saisie à gauche.
- **👁 Aperçu** (mode preview WYSIWYG) : rendu live de la fiche à droite, identique au public.

Le layout adopte un **split 50/50** en desktop (≥ 1280 px), empilé en tablette, preview masqué en mobile (< 768 px, l'admin n'est pas conçu pour mobile).

#### Interactivité du preview

| Zone | Comportement |
| ------ | -------------- |
| **Titre / catégorie / matériau / description / lead** | Clic → scroll-into-view + focus du champ form correspondant. Double-clic → édition inline directe (`contenteditable` + outline accent) ; Entrée valide, Échap annule. |
| **Cover hero** | Hover → boutons **✂ Cadrer** et **🖼 Remplacer** (même modales que le form). |
| **Item de galerie** | Hover → boutons **✂ Cadrer**, **🖼 Remplacer**, **× Retirer**. Pastille **⋮⋮** (top-left) → drag&drop pour réordonner. Pastille **⤡** (bottom-right) → drag pour redimensionner (1–3 colonnes × 1–4 lignes) avec badge live `N × M`. |
| **Tuile « + Ajouter une image »** | En fin de galerie → ouvre la médiathèque. |
| **Story-inline** | Rendu lecture seule (données DB au dernier chargement). |
| **CTA contact** | Rendu visuel uniquement, pas de soumission depuis le preview. |

#### Toolbar du preview

- Bouton **💾 Enregistrer** : équivalent au submit du formulaire, désactivé si le formulaire est invalide.
- Toggle **⤢ Plein écran** / **⤡ Réduire** : le preview occupe tout le viewport par-dessus le reste de l'app. Les modales (Cadrer / Remplacer) s'affichent par-dessus.

#### Comportement après sauvegarde

Après une sauvegarde réussie, l'admin **reste sur la fiche** (rechargée depuis la réponse serveur) au lieu d'être redirigé vers un formulaire vide.

#### Architecture technique

- `<app-furniture-detail-view>` : composant standalone purement présentation, partagé entre la page publique et le preview admin. Prend une `Furniture` en input ; émet des Outputs en mode `editable=true`.
- `<app-furniture-preview>` : wrap le view, agrège les signaux du `MobilierComponent` (FormGroup + signal galerie) dans un objet `Furniture` virtuel via `computed()`, et branche les Outputs aux modales existantes.
- La page publique `FurnitureDetailComponent` délègue désormais tout le rendu au view (`<app-furniture-detail-view>`), garantissant le pixel-perfect validé par Playwright.

#### Accessibilité

- Boutons Cadrer / Remplacer / Retirer : `aria-label` explicite en français.
- Toggle Modifier / Aperçu : `role="tab"` + `aria-selected`.
- Drag/resize : souris uniquement (pas de fallback clavier — limitation connue, reportée).

#### Header

- Logo du studio (lien vers l'accueil).
- Navigation publique : **Mobilier · Expositions · Créations · Studio** (l'entrée Créations est entre Expositions et Studio, configurable depuis le CMS Navigation).

#### Footer

- Liens rapides, mentions légales, copyright.
- Entrée **Créations** dans les liens rapides du footer.

---

### 4.1.2 Preview WYSIWYG — Fiche Exposition (sous-projet 3/4)

> Spec complète : [docs/superpowers/specs/2026-06-09-exhibition-detail-wysiwyg-preview-design.md](../superpowers/specs/2026-06-09-exhibition-detail-wysiwyg-preview-design.md)

L'édition d'une fiche exposition propose un **toggle** entre deux modes :

- **✏ Modifier l'exposition** (mode formulaire, défaut) : formulaire de saisie, pleine largeur.
- **👁 Aperçu** (mode preview WYSIWYG) : rendu live de la fiche, identique au public.

Contrairement au mobilier (split 50/50), le layout expositions utilise un **toggle plein-largeur** : le formulaire est maintenu dans le DOM en `position: absolute; left: -100vw` en mode preview (pour préserver les `@ViewChild`) mais invisible et non-interactif.

#### Interactivité du preview — Exposition

| Zone | Comportement |
| ---- | ------------ |
| **Titre** | Clic → scroll-into-view + focus du champ form. Double-clic → édition inline (`contenteditable` + outline accent) ; Entrée ou Blur valide, Échap annule. |
| **Eyebrow `venue · city, country`** | Décomposé en **3 spans cliquables** + 2 séparateurs `aria-hidden`. Clic sur chaque span → focus du champ form correspondant. Double-clic → édition inline du champ concerné. |
| **Date début / Date fin** | Clic → focus du champ form. **Double-clic → swap vers `<input type="date">` natif** (datepicker browser, format ISO `YYYY-MM-DD`). Blur valide, Échap annule. |
| **Eyebrow commissaire `Commissariat — curator`** | Préfixe « Commissariat — » statique. `curator` cliquable individuellement : clic → focus, double-clic → édition inline. |
| **Lead (shortDescription) / Description** | Clic → focus. Double-clic → édition inline. |
| **Tags** | Rendu lecture seule (chips). Édition dans le form uniquement. |
| **Cover hero** | Hover → boutons **✂ Cadrer** et **🖼 Remplacer** (même modales que le form). |
| **Item de galerie** | Hover → boutons **✂ Cadrer**, **🖼 Remplacer**, **× Retirer**. Pastille **⋮⋮** (top-left) → drag&drop pour réordonner. Pastille **⤡** (bottom-right) → drag pour redimensionner (1–3 colonnes × 1–4 lignes) avec badge live `N × M`. |
| **Tuile « + Ajouter une image »** | En fin de galerie → ouvre la médiathèque. |
| **Bouton « Voir la story »** | Rendu conditionnel si `displaySlides.length > 0`. Lecture seule (ouvre le viewer). |

#### Toolbar du preview — Exposition

- Bouton **💾 Enregistrer** : équivalent au submit du formulaire, désactivé si le formulaire est invalide ou en cours d'enregistrement.
- Toggle **⤢ Plein écran** / **⤡ Réduire** : le preview occupe tout le viewport. Les modales (Cadrer / Remplacer) s'affichent par-dessus.

#### Comportement après sauvegarde — Exposition

Après une sauvegarde réussie, l'admin **reste sur la fiche** (rechargée depuis la réponse serveur) au lieu d'être redirigé.

#### Galerie publique — migration canvas

La galerie de la fiche exposition publique est migrée de `<img + style.transform>` vers `<app-cropped-image-canvas>`, par cohérence avec le mobilier (sous-projet 2). Le rendu visuel reste identique ; les baselines Playwright sont mises à jour après validation visuelle manuelle.

#### Architecture technique — Exposition

- `<app-exhibition-detail-view>` : composant standalone purement présentationnel, partagé entre la page publique et le preview admin. Prend une `Exhibition` en input ; émet des Outputs en mode `editable=true`.
- `<app-exhibition-preview>` : wrap le view, agrège les signaux du `ExpositionsComponent` (FormGroup + signal galerie) dans un objet `Exhibition` virtuel via `computed()`, et branche les Outputs aux modales existantes.
- La page publique `ExhibitionDetailComponent` délègue désormais tout le rendu au view (`<app-exhibition-detail-view>`), garantissant le pixel-perfect validé par Playwright.
- Pattern page/view documenté dans ADR-0018.

#### Accessibilité — Exposition

- Toggle Modifier / Aperçu : `role="tab"` + `aria-selected`.
- Plein écran : `aria-modal="true"` + `role="dialog"`.
- Édition inline texte : `aria-label` dynamique selon le mode actif.
- Spans eyebrow : séparateurs `aria-hidden` pour éviter la verbosité lecteur d'écran.
- Drag/resize : souris uniquement (pas de fallback clavier — limitation connue, reportée).

#### Hors portée — Exposition (reporté)

- Sélecteur de story dans le preview (toujours `currentStories()[0]`).
- Validation cross-field dates côté frontend (start ≤ end) — backend reste responsable.
- Fallback clavier pour drag/resize.

---

### 4.1.3 Preview WYSIWYG — Accueil (sous-projet 4/4)

> Spec complète : [docs/superpowers/specs/2026-06-09-home-wysiwyg-preview-design.md](../superpowers/specs/2026-06-09-home-wysiwyg-preview-design.md)

L'édition de l'accueil propose un **toggle** entre deux modes :

- **✏ Modifier l'accueil** (mode liste éditoriale + sliders, défaut).
- **👁 Aperçu** (mode preview WYSIWYG) : rendu live de la page d'accueil, identique au public.

Comme pour l'exposition (sous-projet 3), le layout utilise un **toggle plein-largeur** : le formulaire est maintenu en DOM (`position: absolute; left: -100vw`) en mode preview pour préserver les `@ViewChild`.

#### Interactivité du preview — Accueil

| Zone | Comportement |
| ---- | ------------ |
| **Hero eyebrow / titre / lead** | Hover → outline dashed. Double-clic → édition inline `contenteditable` + outline accent. Blur ou Entrée → **auto-save immédiat** via `updateContent` API → toast « Texte sauvegardé. » Échap annule. |
| **News-sliders (3 zones)** | Rendu lecture seule. Cartouche **`[i]`** discret en haut-droite → clic → bascule en mode Modifier + scroll vers la section sliders. |
| **Cards du feed (mobilier / expo)** | Hover → overlay : checkbox **Inclus dans le feed** + pastille drag **⋮⋮**. RouterLink désactivé en mode editable (pas de navigation accidentelle). |
| **Cards exclues** | Opacité 0,35 + badge « Exclu » (visibles en preview admin, masquées en public). |
| **Crop de la card** | Bouton **✂ Cadrer** dans l'overlay → ouvre modale crop avec image source. Crop sauvegardé dans `home_feed_entries.cover_crop_*` — **n'affecte pas la fiche source mobilier/expo**. |
| **Drag-reorder feed** | Pastille **⋮⋮** → drag&drop (HTML5) → ordre persisté via PUT `/api/admin/home/feed`. Crops préservés après réordonnancement. |
| **Toggle inclusion** | Checkbox → auto-save immédiat (même endpoint). |

#### Différences clés vs sous-projets 2 et 3

- **Pas de bouton « 💾 Enregistrer »** : tous les changements sont auto-sauvegardés (textes inline, reorder, toggle inclusion). Il n'existe pas de FormGroup global pour l'accueil.
- **Crop home-only** : le crop d'une card du feed est stocké dans `home_feed_entries` (colonnes `cover_crop_*`), indépendant du `coverCrop` de la fiche source. L'admin peut cadrer l'image pour l'affichage sur la home sans toucher à la fiche mobilier ou exposition d'origine.

#### Toolbar du preview — Accueil

- Pas de bouton « 💾 Enregistrer » (auto-save partout).
- Toggle **⤢ Plein écran** / **⤡ Réduire** : le preview occupe tout le viewport. Focus trap (`cdkTrapFocus`) + `aria-modal="true"`.
- Label « Aperçu » à gauche.

#### Refactor de la page publique — Accueil

`home.component.ts` délègue désormais tout le rendu visuel au composant `<app-home-view>` (200 → ~78 lignes). Aucune régression fonctionnelle ; le rendu public est pixel-perfect (validé par Playwright).

#### Architecture technique — Accueil

- `<app-home-view>` : composant standalone purement présentationnel, partagé entre la page publique et le preview admin. Inputs : `data`, `content`, `editable`. Outputs : `feedReorder`, `feedItemToggleInclude`, `textFieldEdit`, `sliderEditRequested`, `storyOpen`, `viewerOpen`.
- `<app-home-preview>` : wrapper admin, passe les signaux du `AccueilComponent` directement au view (`data`, `content`) et branche les Outputs vers les handlers du parent. Pas de FormGroup.
- `home.component.ts` (public) : délègue au view ; conserve le chargement API, le `<app-story-viewer>` top-level et les hooks SEO.
- Pattern page/view documenté dans ADR-0018 (3ème application : mobilier, exposition, accueil).

#### Accessibilité — Accueil

- Toggle Modifier / Aperçu : `role="tab"` + `aria-selected`.
- Plein écran : `aria-modal="true"` + `role="dialog"` + `cdkTrapFocus`.
- Édition inline : `aria-label` dynamique selon le champ actif.
- Cartouche `[i]` et drag-handle : limitations clavier acceptées (identique sous-projets 2/3 — limitation connue, reportée).

#### Hors portée — Accueil (reporté)

- Édition inline du contenu des news-sliders (titre, ordre des stories) — reste dans `<app-admin-sliders>`.
- Édition inline des cards (cover/titre/extrait) — édité dans les fiches sources.
- Drag entre les zones news-sliders (top/middle/bottom).
- Application à d'autres pages (about, contact) — hors chantier.

---

### 4.2 Backend (API REST)

#### Endpoints

| Ressource | Endpoint | Méthode | Description | Réponse |
|-----------|----------|---------|-------------|---------|
| **Mobilier** | `/api/furniture` | GET | Liste complète | `Furniture[]` |
| | `/api/furniture/featured` | GET | Pièces mises en avant | `Furniture[]` |
| | `/api/furniture/categories` | GET | Catégories distinctes | `string[]` |
| | `/api/furniture/{slug}` | GET | Détail par slug | `Furniture` / 404 |
| | `/api/furniture` | POST | Créer une pièce | `Furniture` |
| | `/api/furniture/{slug}` | PUT | Modifier une pièce | `Furniture` / 404 |
| | `/api/furniture/{slug}` | DELETE | Supprimer une pièce | 204 / 404 |
| **Expositions** | `/api/exhibitions` | GET | Liste complète (date DESC) | `Exhibition[]` |
| | `/api/exhibitions/featured` | GET | Expositions mises en avant | `Exhibition[]` |
| | `/api/exhibitions/{slug}` | GET | Détail par slug | `Exhibition` / 404 |
| | `/api/exhibitions` | POST | Créer une exposition | `Exhibition` |
| | `/api/exhibitions/{slug}` | PUT | Modifier une exposition | `Exhibition` / 404 |
| | `/api/exhibitions/{slug}` | DELETE | Supprimer une exposition | 204 / 404 |
| **Profil** | `/api/profile` | GET | Informations du studio | `Profile` |
| **Santé** | `/actuator/health` | GET | Healthcheck | `{"status":"UP"}` |

#### Modèles de Données

##### Furniture (Pièce de Mobilier)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | `String` | Identifiant unique (`f-` + 8 chars) | `"f-a3f9c12b"` |
| `title` | `String` | Titre de la pièce | `"Chaise Éclat"` |
| `slug` | `String` | URL-friendly (auto-généré) | `"chaise-eclat"` |
| `category` | `String` | Catégorie | `"Sièges"` |
| `material` | `String` | Matériau principal | `"Chêne massif"` |
| `year` | `Integer` | Année de création | `2025` |
| `coverImage` | `String` | URL de l'image principale | `"https://..."` |
| `coverCrop` | `ImageCrop` | Zone de cadrage de la cover (nullable — `null` = rendu natif `cover-fit`) | `{"x":10,"y":5,"w":80,"h":60}` |
| `gallery` | `GalleryImage[]` | Images galerie avec crop optionnel par item | `[{"url":"https://...","crop":null}]` |
| `shortDescription` | `String` | Description courte (max 1000 car.) | `"Siège sculpté..."` |
| `description` | `String` | Description longue (max 4000 car.) | `"Chaque courbe..."` |
| `dimensions` | `String[]` | Dimensions libres | `["L 52 × P 55 × H 82 cm"]` |
| `designer` | `String` | Nom du designer | `"Milo Guillaume"` |
| `featured` | `boolean` | Mis en avant sur l'accueil | `true` |

##### Exhibition (Exposition)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | `String` | Identifiant unique (`e-` + 8 chars) | `"e-b7d1e345"` |
| `title` | `String` | Titre de l'exposition | `"Lumière et Matière"` |
| `slug` | `String` | URL-friendly (auto-généré) | `"lumiere-et-matiere"` |
| `venue` | `String` | Nom du lieu | `"Galerie Perrotin"` |
| `city` | `String` | Ville | `"Paris"` |
| `country` | `String` | Pays | `"France"` |
| `startDate` | `Date` | Date de début | `"2025-05-15"` |
| `endDate` | `Date` | Date de fin | `"2025-06-30"` |
| `coverImage` | `String` | URL de l'image principale | `"https://..."` |
| `coverCrop` | `ImageCrop` | Zone de cadrage de la cover (nullable) | `{"x":0,"y":10,"w":100,"h":75}` |
| `gallery` | `GalleryImage[]` | Images galerie avec crop optionnel par item | `[{"url":"https://...","crop":null}]` |
| `curator` | `String` | Commissaire de l'exposition | `"Sophie Martin"` |
| `shortDescription` | `String` | Description courte (max 1000 car.) | `"Exposition collective..."` |
| `description` | `String` | Description longue (max 4000 car.) | `"Autour du thème..."` |
| `tags` | `String[]` | Mots-clés thématiques | `["sculpture", "bois"]` |
| `featured` | `boolean` | Mis en avant sur l'accueil | `true` |

##### Profile (Profil du Studio)

| Champ | Type | Description |
|-------|------|-------------|
| `studio` | `String` | Nom du studio (`"Milo GUILLAUME Design"`) |
| `tagline` | `String` | Accroche éditoriale |
| `bio` | `String` | Biographie du designer |
| `contactEmail` | `String` | Adresse e-mail de contact |
| `location` | `String` | Localisation (`"Paris, France"`) |
| `press` | `{title, year}[]` | Mentions presse |
| `awards` | `String[]` | Prix et distinctions |

##### ImageCrop (Zone de cadrage)

Objet partagé porté par l'entité qui utilise l'image (cover ou item de galerie). Toutes les valeurs sont des pourcentages (0–100) de l'image source.

| Champ | Type     | Description                                     | Exemple |
|-------|----------|-------------------------------------------------|---------|
| `x`   | `Double` | Abscisse du coin supérieur gauche du crop (%)   | `10.0`  |
| `y`   | `Double` | Ordonnée du coin supérieur gauche du crop (%)   | `5.0`   |
| `w`   | `Double` | Largeur du rectangle de crop (%)                | `80.0`  |
| `h`   | `Double` | Hauteur du rectangle de crop (%)                | `60.0`  |

`null` partout = pas de crop = rendu natif `object-fit: cover` (comportement par défaut).

##### GalleryImage (Item de galerie avec crop optionnel)

| Champ      | Type        | Description                                                        | Exemple         |
|------------|-------------|--------------------------------------------------------------------|-----------------|
| `url`      | `String`    | URL de l'image (max 500 car.)                                      | `"https://..."` |
| `crop`     | `ImageCrop` | Zone de cadrage de cet item (nullable)                             | `null`          |
| `colSpan`  | `Integer`   | Nombre de colonnes CSS Grid occupées (1–3, défaut 1)               | `2`             |
| `rowSpan`  | `Integer`   | Nombre de lignes CSS Grid occupées (1–4, défaut 1)                 | `1`             |

Les valeurs `colSpan` / `rowSpan` sont définies par l'admin via le preview WYSIWYG (resize depuis la pastille **⤡** en bas-droite de l'item). La valeur 1×1 s'applique rétroactivement aux items existants.

##### HomeFeedEntry (Item du feed accueil)

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `kind` | `String` | Type de fiche source (`"furniture"` ou `"exhibition"`) | `"furniture"` |
| `slug` | `String` | Slug de la fiche source | `"chaise-eclat"` |
| `included` | `boolean` | Inclusion dans le feed public | `true` |
| `position` | `Integer` | Ordre d'affichage dans le feed | `1` |
| `coverCrop` | `ImageCrop` | Crop home-only (nullable) — indépendant du `coverCrop` de la fiche source | `{"x":0,"y":10,"w":100,"h":75}` |

Le champ `coverCrop` est stocké dans `home_feed_entries` (colonnes `cover_crop_x/y/w/h`). Si défini, il est utilisé pour l'affichage de la card sur la home ; sinon, fallback au `coverCrop` de la fiche source (mobilier ou exposition).

##### Story (Cover de story avec crop)

| Champ         | Type        | Description                            |
|---------------|-------------|----------------------------------------|
| `id`          | `Long`      | Identifiant                            |
| `title`       | `String`    | Titre de la story                      |
| `coverImage`  | `String`    | URL du visuel de couverture            |
| `coverCrop`   | `ImageCrop` | Zone de cadrage de la cover (nullable) |
| `slides`      | `Slide[]`   | Slides de la story                     |

---

## 5. Exigences Fonctionnelles

### 5.1 Gestion du Catalogue

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F001** | Afficher la liste des pièces | Grille responsive avec image, titre, catégorie. | ⭐⭐⭐ | ✅ Fait |
| **F002** | Filtrer par catégorie | Boutons dynamiques générés depuis les catégories en BDD. | ⭐⭐⭐ | ✅ Fait |
| **F003** | Recherche texte | Recherche par titre ou description dans la liste. | ⭐⭐ | ⏳ À faire |
| **F004** | Détail d'une pièce | Images, matériaux, dimensions, description longue. | ⭐⭐⭐ | ✅ Fait |
| **F005** | Pièces mises en avant | Marquage `featured` → affichage page d'accueil. | ⭐⭐ | ✅ Fait |
| **F006** | Pièces similaires | Suggestion de pièces de la même catégorie sur la fiche. | ⭐ | ⏳ À faire |

### 5.2 Gestion des Expositions

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F010** | Afficher la liste des expositions | Timeline chronologique (date DESC). | ⭐⭐⭐ | ✅ Fait |
| **F011** | Détail d'une exposition | Lieu, dates, commissaire, description, galerie, tags. | ⭐⭐⭐ | ✅ Fait |
| **F012** | Expositions mises en avant | Marquage `featured` → affichage page d'accueil. | ⭐⭐ | ✅ Fait |
| **F013** | Filtrer par année / lieu | Filtres sur la liste des expositions. | ⭐ | ⏳ À faire |

### 5.3 Page Studio

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F020** | Afficher la biographie | Texte long sur le designer et sa démarche. | ⭐⭐⭐ | ✅ Fait |
| **F021** | Afficher les distinctions | Prix, récompenses, mentions. | ⭐⭐ | ✅ Fait |
| **F022** | Afficher la presse | Articles et publications. | ⭐ | ✅ Fait |
| **F023** | Formulaire de contact | Formulaire (nom, e-mail, message) avec envoi. | ⭐⭐⭐ | ⏳ À faire |

### 5.4 Administration

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F030** | CRUD mobilier | Créer, lire, modifier, supprimer des pièces. | ⭐⭐⭐ | ✅ Fait |
| **F031** | CRUD expositions | Créer, lire, modifier, supprimer des expositions. | ⭐⭐⭐ | ✅ Fait |
| **F032** | Validation des formulaires | Champs obligatoires validés avant envoi. | ⭐⭐ | ✅ Fait |
| **F033** | Retour visuel | Message de succès / erreur après chaque opération. | ⭐⭐ | ✅ Fait |
| **F034** | Protection de l'admin | Accès restreint par authentification JWT (authGuard Angular + Spring Security). | ⭐⭐⭐ | ✅ Fait |
| **F035** | Tags mobilier | Taguer chaque pièce avec des mots-clés via `<app-tag-input>` (autocomplete + WAI-ARIA). | ⭐⭐ | ✅ Fait |
| **F036** | Stories multiples | Créer N stories par pièce ou exposition, gérer les slides par story. | ⭐⭐⭐ | ✅ Fait |
| **F037** | Sliders d'actualités | Composer des sliders depuis des stories variées, assigner à une zone de la home. | ⭐⭐ | ✅ Fait |
| **F038** | Navigation CMS | Activer / désactiver des entrées de menu (dont Créations) depuis l'admin. | ⭐⭐ | ✅ Fait |
| **F039** | Outil de cadrage d'image | Cadrer précisément la zone affichée pour la cover et chaque item de galerie (mobilier, exposition, cover de story), via modale Cropper.js avec présets d'aspect ratio (Libre / 16:9 / 4:5 / 1:1). Remplace le focal point. | ⭐⭐⭐ | ✅ Fait |
| **F047** | Preview WYSIWYG fiche mobilier | Toggle Modifier / Aperçu sur la page admin mobilier. Preview live identique au public, interactif : click-to-focus textes, double-clic édition inline, hover cover/galerie → Cadrer/Remplacer/Retirer, drag-reorder galerie, resize colSpan/rowSpan, toolbar Enregistrer + Plein écran. | ⭐⭐⭐ | ✅ Fait |
| **F048** | Preview WYSIWYG fiche exposition | Toggle Modifier / Aperçu sur la page admin expositions (toggle plein-largeur). Preview live identique au public, interactif : click-to-focus textes, double-clic édition inline texte, double-clic dates → swap `<input type="date">` natif, eyebrow décomposé en 3 spans cliquables, hover cover/galerie → Cadrer/Remplacer/Retirer, drag-reorder galerie, resize colSpan/rowSpan, toolbar Enregistrer + Plein écran. Galerie publique migrée en canvas. | ⭐⭐⭐ | ✅ Fait |
| **F049** | Preview WYSIWYG accueil | Toggle Modifier / Aperçu sur la page admin Accueil (toggle plein-largeur). Preview live identique au public, interactif : double-clic hero eyebrow/titre/lead → édition inline contenteditable + **auto-save immédiat** (pas de bouton Enregistrer), hover cards feed → overlay checkbox Inclus + drag-reorder + bouton Cadrer (crop home-only, n'affecte pas la fiche source), cards exclues en opacité 0,35 + badge « Exclu », cartouche `[i]` sur sliders → retour mode Modifier + scroll. Plein écran avec focus trap. Refactor `home.component.ts` (délégation à `<app-home-view>`). | ⭐⭐⭐ | ✅ Fait |

### 5.5 Navigation et UX

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F040** | Navigation intuitive | Menu accessible depuis toutes les pages. | ⭐⭐⭐ | ✅ Fait |
| **F041** | Design responsive | Adaptation mobile, tablette, desktop. | ⭐⭐⭐ | ✅ Fait |
| **F042** | Chargement performant | Lazy loading des composants et des images. | ⭐⭐ | ✅ Fait |
| **F043** | Gestion 404 | Page ou pièce introuvable → message d'erreur clair. | ⭐⭐ | ✅ Fait |
| **F044** | Page Créations | Catalogue agrégé mobilier + expositions, filtres type/années/tags, deep-link URL. | ⭐⭐⭐ | ✅ Fait |
| **F045** | Viewer story plein écran | Modale plein écran, navigation tactile/clavier, focus trap + Échap (RGAA). | ⭐⭐ | ✅ Fait |
| **F046** | Rendu crop responsive | Le hero d'une fiche et les images cropées recalculent leur transformation CSS au redimensionnement de la fenêtre. Les images sans crop conservent le rendu `object-fit: cover` natif. | ⭐⭐⭐ | ✅ Fait |

### 5.6 Internationalisation

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F050** | Support FR/EN | Bascule de langue sur toute l'interface. | ⭐ | ⏳ À faire |

---

## 6. Exigences Non Fonctionnelles

### 6.1 Performance

| ID | Exigence | Description |
|----|----------|-------------|
| **NF001** | Temps de chargement | Pages en **< 2 secondes** (hors images). |
| **NF002** | Compression | Gzip activé sur Nginx pour CSS/JS/JSON/SVG. |
| **NF003** | Cache assets | Fichiers statiques mis en cache **7 jours** par Nginx. |
| **NF004** | Lazy-loading | Routes et composants Angular chargés à la demande. |

### 6.2 Sécurité

| ID | Exigence | Description |
|----|----------|-------------|
| **NF010** | CORS | API accessible uniquement depuis les origines autorisées (`localhost:4200`, `127.0.0.1`, `127.0.0.1:4200`, domaine de production). |
| **NF011** | Validation des entrées | Toutes les données en entrée d'API validées (`@Valid`, Bean Validation). |
| **NF012** | Authentification admin | Interface `/admin` protégée par JWT — authGuard Angular + Spring Security (`SecurityFilterChain`). Identifiants configurés via variables d'environnement. |

### 6.3 SEO

| ID | Exigence | Description |
|----|----------|-------------|
| **NF020** | Titres de page dynamiques | Chaque route a un titre distinct (implémenté via Angular Router). |
| **NF021** | URLs lisibles | Slugs humainement lisibles (ex. `/mobilier/chaise-eclat`). |
| **NF022** | Balises méta | Balises `description`, `og:image` par page. |

### 6.4 Maintenabilité

| ID | Exigence | Description |
|----|----------|-------------|
| **NF030** | Code modulaire | Architecture en composants Angular + services + contrôleurs Spring. |
| **NF031** | Tests automatisés | Couverture ≥ 80 % (JaCoCo backend, Karma frontend). |
| **NF032** | Migrations BDD | Toutes les évolutions de schéma via Liquibase (changesets versionnés). |

### 6.5 Disponibilité

| ID | Exigence | Description |
|----|----------|-------------|
| **NF040** | Uptime | **> 99.9 %** (garanti par Railway). |
| **NF041** | Healthcheck | Endpoint `/actuator/health` surveillé par les runners Docker Compose. |

---

## 7. Maquettes et Flux Utilisateur

### 7.1 Maquettes (Wireframes)

#### Page d'Accueil (`/`)

```
┌─────────────────────────────────────────┐
│  [Logo] Milo GUILLAUME Design           │
│  Mobilier · Expositions · Studio        │
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │   HERO — Tagline du studio      │   │
│   └─────────────────────────────────┘   │
│                                         │
│   Mobilier                              │
│   ┌───────┐ ┌───────┐ ┌───────┐         │
│   │ [img] │ │ [img] │ │ [img] │         │
│   │ Titre │ │ Titre │ │ Titre │         │
│   └───────┘ └───────┘ └───────┘         │
│                                         │
│   Expositions                           │
│   ┌───────────────────────────────┐     │
│   │ [img] │ Titre · Lieu · Dates  │     │
│   └───────────────────────────────┘     │
│                                         │
│   ❝ Citation éditoriale ❞               │
└─────────────────────────────────────────┘
```

#### Catalogue Mobilier (`/mobilier`)

```
┌─────────────────────────────────────────┐
│  [Tout] [Sièges] [Tables] [Luminaires]  │
├─────────────────────────────────────────┤
│   ┌───────┐ ┌───────┐ ┌───────┐         │
│   │ [img] │ │ [img] │ │ [img] │         │
│   │ Titre │ │ Titre │ │ Titre │         │
│   │ Catég.│ │ Catég.│ │ Catég.│         │
│   └───────┘ └───────┘ └───────┘         │
└─────────────────────────────────────────┘
```

#### Fiche Pièce (`/mobilier/:slug`)

```
┌─────────────────────────────────────────┐
│  [Image de couverture]                  │
│                                         │
│  Titre de la pièce                      │
│  Catégorie · Année                      │
│  Matière : Chêne massif                 │
│  Designer : Milo Guillaume              │
│  Dimensions : L 52 × P 55 × H 82 cm    │
│                                         │
│  Description longue…                    │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │img 1│ │img 2│ │img 3│  ← galerie    │
│  └─────┘ └─────┘ └─────┘               │
│                                         │
│  [Contacter le studio →]                │
└─────────────────────────────────────────┘
```

#### Fiche Exposition (`/expositions/:slug`)

```
┌─────────────────────────────────────────┐
│  [Image de couverture]                  │
│                                         │
│  Titre de l'exposition                  │
│  Galerie Perrotin · Paris, France       │
│  15 mai – 30 juin 2025                  │
│  Commissaire : Sophie Martin            │
│                                         │
│  Description…                           │
│                                         │
│  [sculpture] [bois] [forme]  ← tags     │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │img 1│ │img 2│ │img 3│               │
│  └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────┘
```

### 7.2 Flux Utilisateur

#### Flux 1 — Découverte du Catalogue

```
[Accueil] → clic "Mobilier"
         → [Liste] → filtre catégorie "Sièges"
         → [Liste filtrée] → clic sur une pièce
         → [Fiche] → clic "Contacter le studio"
         → [client e-mail]
```

#### Flux 2 — Exploration des Expositions

```
[Accueil] → clic sur une exposition featured
         → [Fiche exposition]
         → clic sur "Mobilier" pour voir d'autres œuvres
         → [Catalogue]
```

#### Flux 3 — Gestion du Catalogue (Admin)

```
[/admin] → authGuard → redirigé vers [/login]
         → saisir identifiants (admin / mot de passe)
         → [Enregistrer] → JWT stocké en localStorage
         → redirigé vers [/admin] → onglet "Mobilier"
         → clic "+ Nouveau"
         → remplir le formulaire (titre, catégorie, images, description…)
         → [Enregistrer] → message de confirmation
         → la pièce apparaît dans la liste
```

#### Flux 4 — Studio & Contact

```
[Accueil] → clic "Studio"
         → [Page Studio] → lire biographie, presse, distinctions
         → clic sur l'e-mail de contact → [client e-mail]
```

#### Flux 5 — Édition WYSIWYG d'une Fiche Mobilier (Admin)

```
[/admin/mobilier] → clic sur une pièce existante
                 → layout split : formulaire à gauche, preview à droite
                 → clic "👁 Aperçu" → bascule en mode preview plein
                 → double-clic sur le titre → édition inline, Entrée valide
                 → hover sur la cover → clic "✂ Cadrer" → modale Cropper.js → Valider
                 → hover sur un item galerie → clic "⋮⋮" → drag-reorder
                 → clic "⤢ Plein écran" → preview occupe tout le viewport
                 → clic "💾 Enregistrer" → sauvegarde, fiche rechargée depuis le serveur
```

#### Flux 6 — Édition WYSIWYG d'une Fiche Exposition (Admin)

```
[/admin/expositions] → clic sur une exposition existante
                    → formulaire pleine largeur affiché (mode défaut)
                    → clic "👁 Aperçu" → bascule en mode preview plein-largeur
                    → clic sur "Galerie Perrotin" (venue) → focus du champ venue dans le form
                    → double-clic sur la date de fin → swap vers <input type="date">, saisie, Blur valide
                    → double-clic sur le titre → édition inline, Entrée valide
                    → hover sur la cover → clic "🖼 Remplacer" → médiathèque
                    → hover sur un item galerie → clic "⤡" → drag resize 2×2, badge live "2 × 2"
                    → clic "⤢ Plein écran" → preview occupe tout le viewport
                    → clic "💾 Enregistrer" → sauvegarde, fiche rechargée depuis le serveur
```

#### Flux 7 — Édition WYSIWYG de l'Accueil (Admin)

```
[/admin/accueil] → mode défaut : liste éditoriale + sliders
               → clic "👁 Aperçu" → bascule en mode preview plein-largeur
               → double-clic sur le titre hero → édition inline contenteditable
               → Blur → auto-save immédiat → toast "Texte sauvegardé."
               → hover sur une card du feed → overlay affiché
               → clic "✂ Cadrer" → modale Cropper.js → Valider → crop sauvegardé (home-only)
               → décocher "Inclus dans le feed" → card passe en opacité 0,35 + badge "Exclu"
               → drag pastille ⋮⋮ → réordonner les cards → auto-save ordre
               → clic cartouche [i] sur un slider → retour mode Modifier + scroll vers sliders
               → clic "⤢ Plein écran" → preview occupe tout le viewport (focus trap)
               → (pas de bouton Enregistrer — tout est auto-sauvegardé)
```

---

## 8. Contraintes Techniques

### 8.1 Environnement de Développement

| Outil | Version | Usage |
|-------|---------|-------|
| Java (Eclipse Temurin) | 25 | Backend (Spring Boot) |
| Maven | 3.9 | Build backend |
| Node.js | 20 | Frontend (Angular) |
| npm | 10 | Packages frontend |
| Docker / Rancher Desktop | — | Conteneurisation locale |
| Git + GitHub Actions | — | Versioning + CI/CD |

### 8.2 Frameworks et Librairies

| Technologie | Version | Usage |
| ----------- | ------- | ----- |
| Spring Boot | 4.0 | API REST, JPA, Actuator, Liquibase |
| Angular | 21 | SPA frontend (standalone components, signals) |
| PostgreSQL | 16 | Persistance des données |
| Liquibase | — | Migrations de schéma BDD |
| Nginx | 1.27-alpine | Serveur web + reverse proxy |
| Cropper.js | 1.6 | Outil de cadrage d'image dans l'interface admin (première lib UI tierce du projet — cf. ADR-0017) |

### 8.3 Hébergement

| Service | Usage |
|---------|-------|
| **Railway** | Backend Spring Boot + PostgreSQL (staging & production) |
| **Nginx (Docker)** | Frontend Angular |
| **GHCR** | Registre d'images Docker |
| **Rancher Desktop** | Environnement local de développement |

### 8.4 Contraintes de Données

- Les **images** sont référencées par URL externe (pas de stockage en base ni sur le serveur applicatif).
- Les **slugs** sont auto-générés à partir du titre si non fournis (normalisation : minuscules, accents retirés, espaces → tirets).
- Le **profil studio** est stocké statiquement dans le code (`ProfileController`) — toute modification nécessite un redéploiement.

---

## 9. Glossaire

| Terme | Définition |
|-------|------------|
| **Slug** | Chaîne URL-friendly dérivée du titre (ex. `chaise-eclat`). |
| **Featured** | Marqueur booléen désignant un contenu mis en avant sur la page d'accueil. |
| **Record (Java)** | Classe immutable pour les DTOs (introduite en Java 16). |
| **Standalone Component** | Composant Angular autonome, sans `NgModule`. |
| **Signal** | Mécanisme de gestion d'état réactif Angular (depuis Angular 16). |
| **Lazy-loading** | Chargement d'un module/composant uniquement lorsqu'il est demandé. |
| **CORS** | Cross-Origin Resource Sharing — mécanisme de sécurité HTTP. |
| **Liquibase** | Outil de migration de schéma de base de données (changesets versionnés). |
| **Actuator** | Module Spring Boot exposant des endpoints de supervision (health, info…). |
| **GHCR** | GitHub Container Registry — registre d'images Docker hébergé par GitHub. |
| **Story** | Unité éditoriale composée de slides (images, citations…) attachée à une pièce ou exposition. Un owner peut avoir N stories. |
| **Slider d'actualités** | Carrousel composé de stories issues de N owners différents, assigné à une zone de la home. |
| **Zone (home)** | Emplacement nommé sur la home pour un slider : `news.primary`, `news.secondary`, `news.tertiary`. |
| **Tag** | Mot-clé thématique associé à une pièce ou une exposition. L'union des tags est accessible via `GET /api/tags`. |
| **Création** | Terme générique regroupant une pièce de mobilier ou une exposition dans la page `/creations`. |
| **ControlValueAccessor** | Interface Angular permettant à un composant custom (ex. `TagInputComponent`) de s'intégrer nativement dans `ReactiveFormsModule`. |
| **ImageCrop** | Objet `{x, y, w, h}` en pourcentages (0–100) décrivant le rectangle à afficher sur une image. `null` = pas de crop, rendu natif `object-fit: cover`. |
| **GalleryImage** | Item de galerie composé d'une URL, d'un `ImageCrop` optionnel et de valeurs `colSpan`/`rowSpan` pour le positionnement CSS Grid. |
| **Crop** | Synonyme de cadrage : délimitation d'une zone rectangulaire d'une image à afficher côté public. |
| **Cropper.js** | Bibliothèque JavaScript de cadrage d'image (v1.6), première lib UI tierce du projet — utilisée dans `<app-image-crop-picker>` (cf. ADR-0017). |
| **Focal point** | Ancien mécanisme de centrage (coordonnées X/Y simples) — remplacé par `ImageCrop` dans cette version. |
| **WYSIWYG** | What You See Is What You Get — mode d'édition où le rendu admin est identique au rendu public. Dans ce projet, désigne le preview interactif de la fiche mobilier dans l'interface admin. |
| **colSpan / rowSpan** | Propriétés d'un `GalleryImage` définissant le nombre de colonnes (1–3) et de lignes (1–4) CSS Grid occupées par l'item. Remplacent l'heuristique `figure.tall` (ancien item tall automatique). |
| **app-furniture-detail-view** | Composant Angular standalone purement présentationnel, partagé entre la page publique `/mobilier/:slug` et le preview admin. Prend une `Furniture` en input ; émet des Outputs en mode `editable=true` pour les interactions admin. |
| **click-to-focus** | Pattern UX du preview WYSIWYG : clic sur un texte du preview → scroll-into-view + focus du champ form correspondant côté formulaire. Double-clic → édition inline directe. |
| **app-exhibition-detail-view** | Composant Angular standalone purement présentationnel, partagé entre la page publique `/expositions/:slug` et le preview admin. Prend une `Exhibition` en input ; émet des Outputs en mode `editable=true` pour les interactions admin. Parallèle exact de `app-furniture-detail-view`. |
| **eyebrow composite** | Dans la fiche exposition, ligne `venue · city, country` rendue en un seul span côté public. En mode editable, décomposée en 3 spans cliquables individuellement + séparateurs `aria-hidden`, pour permettre le click-to-focus et l'édition inline champ par champ. |
| **date swap** | Mécanisme d'édition inline des dates dans le preview exposition : double-clic sur le span de date → remplacement visible par un `<input type="date">` natif (datepicker browser, format ISO `YYYY-MM-DD`). Blur valide, Échap annule. Préféré à `contenteditable` pour éviter les ambiguïtés de format. |
| **app-home-view** | Composant Angular standalone purement présentationnel, partagé entre la page publique `/` et le preview admin accueil. Inputs : `data`, `content`, `editable`. Outputs : `feedReorder`, `feedItemToggleInclude`, `textFieldEdit`, `sliderEditRequested`, `storyOpen`, `viewerOpen`. 3ème application du pattern page/view (ADR-0018). |
| **app-home-preview** | Wrapper admin du preview accueil. Passe les signaux du `AccueilComponent` directement à `<app-home-view editable=true>` et branche les Outputs vers les handlers parent. Pas de FormGroup — toutes les sauvegardes sont des auto-save immédiats. |
| **auto-save** | Mécanisme de sauvegarde immédiate sans bouton « Enregistrer » global. Dans le preview accueil : édition inline texte → blur/Entrée → API call immédiat ; reorder/toggle inclusion → PUT immédiat. Différencie le preview accueil des previews mobilier/exposition qui utilisent un FormGroup avec bouton 💾. |
| **crop home-only** | Crop d'une card du feed accueil stocké dans `home_feed_entries` (colonnes `cover_crop_*`), indépendant du `coverCrop` de la fiche source mobilier/expo. Permet de cadrer l'image pour l'affichage sur la home sans modifier la fiche d'origine. Fallback au `coverCrop` source si non défini. |
| **cartouche [i]** | Indicateur discret (rond, opacité 0,6 → 1 au hover) positionné en haut-droite d'un news-slider en mode preview admin accueil. Clic → bascule en mode Modifier + scroll vers la section sliders correspondante. Signale que l'édition du slider se fait form-side. |

---

## 10. Annexes

### 10.1 Exemples de Données

#### Pièce de Mobilier

```json
{
  "id": "f-a3f9c12b",
  "title": "Chaise Éclat",
  "slug": "chaise-eclat",
  "category": "Sièges",
  "material": "Chêne massif",
  "year": 2025,
  "coverImage": "https://example.com/images/chaise-eclat-cover.jpg",
  "coverCrop": { "x": 10.0, "y": 5.0, "w": 80.0, "h": 90.0 },
  "gallery": [
    { "url": "https://example.com/images/chaise-eclat-1.jpg", "crop": null },
    { "url": "https://example.com/images/chaise-eclat-2.jpg", "crop": { "x": 0.0, "y": 0.0, "w": 100.0, "h": 75.0 } }
  ],
  "shortDescription": "Siège sculpté en chêne, formes organiques.",
  "description": "Chaque courbe de cette chaise naît d'un dialogue entre la main et le bois...",
  "dimensions": ["L 52 × P 55 × H 82 cm"],
  "designer": "Milo Guillaume",
  "featured": true
}
```

#### Exposition

```json
{
  "id": "e-b7d1e345",
  "title": "Lumière et Matière",
  "slug": "lumiere-et-matiere",
  "venue": "Galerie Perrotin",
  "city": "Paris",
  "country": "France",
  "startDate": "2025-05-15",
  "endDate": "2025-06-30",
  "coverImage": "https://example.com/images/expo-cover.jpg",
  "coverCrop": null,
  "gallery": [
    { "url": "https://example.com/images/expo-1.jpg", "crop": null }
  ],
  "curator": "Sophie Martin",
  "shortDescription": "Exposition collective autour de la lumière et des matières brutes.",
  "description": "Autour du thème de la lumière filtrée par la matière...",
  "tags": ["sculpture", "bois", "lumière"],
  "featured": true
}
```

### 10.2 Diagramme d'Architecture

```
Navigateur
    │ HTTP
    ▼
Nginx 1.27 (:4200 / :80)
    │ /api/* reverse proxy
    ▼
Spring Boot 4.0 (:8080)
    │ JDBC / JPA + Liquibase
    ▼
PostgreSQL 16 (:5432)
```

### 10.3 Roadmap

| Phase | Objectifs | Statut |
|-------|-----------|--------|
| **Phase 1** | MVP — Frontend Angular + API Spring Boot (données statiques) | ✅ Terminé |
| **Phase 2** | Persistance PostgreSQL + migrations Liquibase | ✅ Terminé |
| **Phase 3** | Interface d'administration CRUD | ✅ Terminé |
| **Phase 4** | Protection de l'admin (authentification JWT) | ✅ Terminé |
| **Phase 5** | Formulaire de contact (envoi d'e-mail via Resend) | ✅ Terminé |
| **Phase 6** | Stories multiples + sliders d'actualités + page Créations + tags mobilier | ✅ Terminé |
| **Phase 6bis** | Outil de cadrage d'image (crop) — sous-projet 1/4 : modale Cropper.js, crop cover + galerie mobilier/expo/story, rendu public CSS transform | ✅ Terminé |
| **Phase 6ter** | Preview WYSIWYG fiche mobilier — sous-projet 2/4 : toggle Modifier/Aperçu, interactivité textes/images/galerie, toolbar Enregistrer + Plein écran, CSS Grid colSpan/rowSpan galerie | ✅ Terminé |
| **Phase 6quater** | Preview WYSIWYG fiche exposition — sous-projet 3/4 : toggle Modifier/Aperçu plein-largeur, interactivité textes/images/galerie, dates inline via swap input natif, eyebrow décomposé, toolbar Enregistrer + Plein écran, galerie publique migrée canvas | ✅ Terminé |
| **Phase 6quinquies** | Preview WYSIWYG accueil — sous-projet 4/4 : toggle Modifier/Aperçu plein-largeur, édition inline hero avec auto-save, overlay cards feed (inclusion, reorder, crop home-only), cartouche `[i]` sliders, plein écran focus trap, refactor `home.component.ts`. **Chantier WYSIWYG complet (4/4).** | ✅ Terminé |
| **Phase 7** | Recherche texte dans le catalogue | ⏳ À faire |
| **Phase 8** | Internationalisation FR/EN | ⏳ À faire |
| **Phase 9** | Optimisations SEO (balises méta, sitemap) | ⏳ À faire |

---

## Historique des Révisions

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0.0 | 01/05/2026 | Équipe Atelier Lumen | Création initiale |
| 2.0.0 | 04/05/2026 | Maxime Guillaume | Rebrand Milo GUILLAUME Design · Mise à jour du modèle de données réel · Routes corrigées · Roadmap synchronisée · Admin CRUD documenté · Hébergement Railway |
| 2.1.0 | 11/05/2026 | Maxime Guillaume | Authentification admin JWT (F034 ✅) · Suppression du lien Admin du menu de navigation · Correction CORS (`127.0.0.1:4200`) · Roadmap Phase 4 terminée |
| 2.2.0 | 07/06/2026 | Maxime Guillaume | Stories multiples + sliders d'actualités (F036, F037 ✅) · Page publique `/creations` + tags mobilier (F044, F035 ✅) · Navigation CMS (F038 ✅) · Viewer story plein écran (F045 ✅) · Page Accueil admin consolidant masonry + sliders · Roadmap Phase 5 et 6 terminées · Glossaire enrichi |
| 2.3.0 | 08/06/2026 | Maxime Guillaume | Outil de cadrage d'image — sous-projet 1/4 (F039, F046 ✅) · Remplacement du focal point par `ImageCrop` · Modèle `GalleryImage[]` sur mobilier/exposition · Crop cover de story · Modale Cropper.js admin · Rendu public CSS transform · Cropper.js ajouté aux frameworks (ADR-0017) · Roadmap Phase 6bis terminée · Glossaire enrichi (ImageCrop, GalleryImage, Focal point, Cropper.js) |
| 2.4.0 | 08/06/2026 | Maxime Guillaume | Preview WYSIWYG fiche mobilier — sous-projet 2/4 (F047 ✅) · Section 4.1.1 dédiée (toggle Modifier/Aperçu, interactivité textes + images + galerie, toolbar, plein écran, comportement post-sauvegarde) · Flux 5 admin WYSIWYG · Galerie publique migre en CSS Grid colSpan/rowSpan · `GalleryImage` enrichi (colSpan, rowSpan) · Roadmap Phase 6ter terminée, Phase 6quater ajoutée · Glossaire enrichi (WYSIWYG, colSpan/rowSpan, app-furniture-detail-view, click-to-focus) |
| 2.5.0 | 09/06/2026 | Maxime Guillaume | Preview WYSIWYG fiche exposition — sous-projet 3/4 (F048 ✅) · Section 4.1.2 dédiée (toggle plein-largeur Modifier/Aperçu, eyebrow composite 3 spans, date swap input natif, interactivité textes + images + galerie, toolbar, plein écran, migration galerie publique canvas) · Fiche Exposition publique enrichie (CSS Grid galerie, canvas) · Flux 6 admin WYSIWYG exposition · Roadmap Phase 6quater terminée, Phase 6quinquies ajoutée · Glossaire enrichi (app-exhibition-detail-view, eyebrow composite, date swap) |
| 2.6.0 | 09/06/2026 | Maxime Guillaume | Preview WYSIWYG accueil — sous-projet 4/4, dernier du chantier WYSIWYG (F049 ✅) · Section 4.1.3 dédiée (toggle plein-largeur Modifier/Aperçu, auto-save inline hero, overlay cards feed — inclusion + reorder + crop home-only, cartouche `[i]` sliders, plein écran focus trap, refactor `home.component.ts`) · Modèle `HomeFeedEntry` ajouté · Page Accueil admin : mention preview WYSIWYG · Note hors-portée mise à jour · Flux 7 admin WYSIWYG accueil · Roadmap Phase 6quinquies terminée — **chantier WYSIWYG complet** · Glossaire enrichi (app-home-view, app-home-preview, auto-save, crop home-only, cartouche [i]) |

---

**Approbations** :
- [ ] Milo Guillaume (Client)
- [ ] Équipe Développement
