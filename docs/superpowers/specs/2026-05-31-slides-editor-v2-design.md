# Éditeur de slides v2 — simplification UX + intégration vidéo

Date : 2026-05-31
Statut : ✅ Implémenté — couvert par le chantier WYSIWYG v2 (6a/6b) + vidéos (ADR-0019)

## Contexte

L'éditeur de slides actuel ([frontend/src/app/pages/admin/shared/slides-editor.component.ts](../../../frontend/src/app/pages/admin/shared/slides-editor.component.ts)) gère 5 types de slides (`cover`, `image`, `spec`, `quote`, `link`) avec des champs texte bruts pour les URLs d'image, sans aperçu, et impose à l'admin de respecter une convention « cover en première position, link en dernière » (avertissements affichés sinon). Aucun support vidéo.

Quatre douleurs ciblées :

1. **Champs URL nus** pour la source d'image alors que la médiathèque (avec recherche et picker) existe déjà côté admin via [ImageFieldComponent](../../../frontend/src/app/pages/admin/shared/image-field.component.ts).
2. **Convention cover/link à la charge de l'admin**, qui doit penser à ajouter ces slides « techniques » en plus du contenu narratif.
3. **Absence d'aperçu** : pour voir le rendu d'une slide, il faut enregistrer puis ouvrir la page publique.
4. **Pas de slide vidéo**, alors que les supports audiovisuels font partie du portfolio.

## Périmètre

**Inclus :**

- Suppression des types `cover` et `link` du modèle ; le rendu public les génère implicitement.
- Nouveau type `video` : embed YouTube/Vimeo, un seul champ URL avec détection automatique de la plateforme et extraction de l'ID.
- Mini-aperçu (vignette 140×84) à gauche de chaque carte slide dans l'admin, mis à jour en direct au fil de la saisie.
- Picker médiathèque pour la source d'image des slides `image` (réutilisation de `ImageFieldComponent`).
- Migration Liquibase qui supprime tous les `story_slide` existants de type `cover` ou `link`.
- Adaptation du rendu public (`story-viewer`, `story-inline`) pour préfixer une cover synthétique (depuis `coverImage`) et suffixer un lien synthétique (depuis le slug) à la liste reçue.
- Tests par composant adaptés (admin + public viewers).

**Exclus :**

- Pas de support d'upload de fichiers vidéo (mp4 hébergé maison) ni d'URL vidéo libre.
- Pas de panneau d'aperçu sticky en taille réelle ni de modale « prévisualiser la story complète » : seul le mini-aperçu par carte est livré.
- Pas de consolidation des autres types (`image`, `spec`, `quote` restent distincts).
- Pas de nouvelle colonne `video_url` : l'URL YouTube/Vimeo est stockée dans la colonne `src` existante.
- Pas d'évolution du picker médiathèque lui-même (recherche, etc.) déjà livré.

## Architecture cible

### Modèle de données

#### Frontend ([frontend/src/app/models/slide.model.ts](../../../frontend/src/app/models/slide.model.ts))

```typescript
export type Slide = ImageSlide | VideoSlide | SpecSlide | QuoteSlide;

export interface BaseSlide {
  id: string;
  position: number;
}

export interface ImageSlide extends BaseSlide { type: 'image'; src: string; caption: string | null; }
export interface VideoSlide extends BaseSlide { type: 'video'; src: string; caption: string | null; }
export interface SpecSlide  extends BaseSlide { type: 'spec';  specs: SpecEntry[]; }
export interface QuoteSlide extends BaseSlide { type: 'quote'; body: string; cite: string | null; }

export interface SpecEntry { label: string; value: string; }
```

Les types `CoverSlide` et `LinkSlide` sont supprimés. Le type `VideoSlide` a la même structure que `ImageSlide` (paire `src` + `caption`), seul le rendu diffère.

#### Backend — modèle DTO ([backend/src/main/java/com/atelier/portfolio/model/Slide.java](../../../backend/src/main/java/com/atelier/portfolio/model/Slide.java))

L'interface scellée `Slide` est mise à jour :

- Retirer `CoverSlide` et `LinkSlide` des `permits` et des `@JsonSubTypes`.
- Ajouter `VideoSlide` (mêmes champs qu'`ImageSlide` : `id`, `position`, `src` `@NotBlank`, `caption` optionnel) avec `@JsonSubTypes.Type(value = Slide.VideoSlide.class, name = "video")`.

Conséquence : Jackson refuse automatiquement (`400 Bad Request`) toute requête contenant un slide de type `cover` ou `link` (`Could not resolve type id 'cover' as a subtype of Slide`). Pas de validation supplémentaire à écrire.

#### Backend — entité JPA ([StorySlideEntity.java](../../../backend/src/main/java/com/atelier/portfolio/entity/StorySlideEntity.java))

Aucune modification d'entité ni de schéma. La colonne `src` (déjà présente) accueille l'URL YouTube/Vimeo pour `type='video'`. Les colonnes `link_label`, `link_desc`, `link_href` restent présentes mais deviennent données mortes.

#### Backend — mapping ([StoryService.java](../../../backend/src/main/java/com/atelier/portfolio/service/StoryService.java))

Les deux `switch` de mapping entité↔DTO (lignes ~48-55 et ~65-79) sont mis à jour :

- Retirer les `case "cover"` et `case "link"` du mapping entité→DTO.
- Retirer les `case Slide.CoverSlide c` et `case Slide.LinkSlide l` du mapping DTO→entité.
- Ajouter `case "video" -> new Slide.VideoSlide(e.getId(), e.getPosition(), e.getSrc(), e.getCaption())` côté entité→DTO.
- Ajouter `case Slide.VideoSlide v -> { e.setType("video"); e.setSrc(v.src()); e.setCaption(v.caption()); }` côté DTO→entité.

Le `default -> throw new IllegalStateException(...)` reste : il déclenchera pour toute ligne legacy oubliée en base, ce qui est attendu (la migration 008 nettoie le terrain).

### Migration Liquibase

Nouveau changelog `008-drop-legacy-cover-link-slides.yaml` :

- Un `<sql>` change qui exécute `DELETE FROM story_slide WHERE type IN ('cover','link');`
- Aucun changement de schéma (les colonnes `link_*` restent en place).

Idempotent par construction (un second run n'a plus rien à supprimer). Tourne en local (H2 + PostgreSQL prod).

### Backend — gestion du type `video`

Le mapping DTO ↔ entité actuel (cf. `AdminStoriesController` ou le service associé) doit accepter `'video'` comme valeur de `type`. Pour `video`, `src` est mappé sur `entity.src` et `caption` sur `entity.caption`. Aucun champ supplémentaire.

### Frontend admin — `SlidesEditorComponent` v2

#### Template

- En-tête inchangée (titre + bouton replier/déplier).
- Barre d'actions : 4 boutons (`+ Image`, `+ Vidéo`, `+ Caractéristiques`, `+ Citation`) — disparition de `+ Cover` et `+ Lien`.
- Disparition du bloc d'avertissements (`warnings`) : plus de convention cover/link à respecter.
- Liste des slides : chaque carte devient une grille deux colonnes :
  - Colonne gauche (140×84) : **mini-aperçu** dépendant du type (cf. ci-dessous).
  - Colonne droite : formulaire d'édition.

#### Mini-aperçu par type

- `image` : `<img>` avec `src` du formulaire, `object-fit: cover`. Placeholder gris si `src` vide.
- `video` : fond noir avec icône `▶` au centre + badge de plateforme (`YT` rouge ou `Vimeo` cyan) selon détection. Si on veut être plus fidèle, on peut afficher le thumbnail YouTube (`https://i.ytimg.com/vi/<id>/hqdefault.jpg`) mais ça ajoute une dépendance externe — **on commence sans, l'icône suffit**.
- `spec` : tableau condensé des 2-3 premières entrées (clé/valeur) en typo serif réduite.
- `quote` : début de citation en italique (`« texte tronqué… »`), tronqué à ~80 caractères.

#### Champs de formulaire

- `image` : `<app-image-field formControlName="src">` (réutilisation directe du composant existant) + champ texte « Légende ».
- `video` : `<input type="url">` pour l'URL + indicateur de plateforme/ID détectés en temps réel sous le champ (« ✓ YouTube détecté · ID `dQw4w9WgXcQ` » ou « ⚠ URL non reconnue »). Champ « Légende » optionnel.
- `spec` : inchangé (liste d'entrées clé/valeur).
- `quote` : inchangé (textarea citation + champ source).

#### Détection d'URL vidéo

Une fonction utilitaire pure `parseVideoUrl(url: string): { platform: 'youtube' | 'vimeo'; id: string } | null` reconnaît :

- YouTube : `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/embed/<id>`.
- Vimeo : `vimeo.com/<id>`, `player.vimeo.com/video/<id>`.

Retourne `null` pour toute autre URL. Utilisée à la fois pour l'indicateur d'admin et pour le rendu public (qui construit l'iframe). Localisée dans `frontend/src/app/utils/video-url.ts` avec son spec.

#### Plus de logique `defaultHref` / warnings

Les méthodes `defaultHref()`, `recomputeWarnings()`, le signal `warnings`, la branche « `link` » de `add()` et `canSave()` sont supprimées. `canSave()` ne valide plus que les champs requis par type (image/video : `src` non vide ; quote : `body` non vide ; spec : au moins une entrée).

### Frontend public — story-viewer et story-inline

Les deux composants consomment `slides: Slide[]` reçues du parent (furniture-detail / exhibition-detail). Le parent doit désormais leur passer une liste enrichie :

```typescript
// Pseudo-code dans furniture-detail.component.ts (et exhibition-detail)
const slides = furniture.slides; // depuis l'API, types image/video/spec/quote uniquement
const enriched: DisplaySlide[] = [
  { type: 'cover', src: furniture.coverImage },
  ...slides,
  { type: 'link', label: 'Découvrir la pièce', href: `/mobilier/${furniture.slug}` },
];
```

Le type `DisplaySlide` (interne au rendu public, pas exposé à l'API) reprend l'ancienne union à 5 types (`cover`, `image`, `video`, `spec`, `quote`, `link`). C'est le **seul endroit** où ces 6 types coexistent.

#### Branche `video` dans story-viewer / story-inline

Pour `type='video'`, le composant :

1. Appelle `parseVideoUrl(src)` pour obtenir `{ platform, id }`.
2. Construit l'URL d'embed :
   - YouTube : `https://www.youtube.com/embed/<id>`
   - Vimeo : `https://player.vimeo.com/video/<id>`
3. Rend `<iframe [src]="...sanitized..." allow="autoplay; fullscreen; encrypted-media" allowfullscreen>` dans le slot médiatique (même slot que les images).
4. Affiche la légende sous l'iframe si `caption` non vide.

Le `DomSanitizer.bypassSecurityTrustResourceUrl` est requis pour l'attribut `src` de l'iframe.

#### Élargissement de la CSP

L'iframe YouTube/Vimeo charge depuis `https://www.youtube.com` et `https://player.vimeo.com`. La CSP actuelle (`frame-src 'self'` implicite via `default-src 'self'`) doit être élargie. Modification dans [SecurityConfig.java](../../../backend/src/main/java/com/atelier/portfolio/config/SecurityConfig.java) :

```text
frame-src 'self' https://www.youtube.com https://player.vimeo.com;
```

(les autres directives restent inchangées). À documenter dans le commit.

### Diagramme de flux

```text
                ┌─ admin éditeur (4 types : image/video/spec/quote)
                │
PUT /api/admin/slides/<kind>/<id>
                │
                ▼
        StorySlideService.replaceSlides()
                │   (rejette cover/link en input)
                ▼
        DB : story_slide (rows uniquement image/video/spec/quote)
                │
GET /api/furniture/<slug>  /  GET /api/exhibitions/<slug>
                │
                ▼
        Furniture/Exhibition.slides : Slide[] (4 types)
                │
                ▼
        Component parent enrichit :
        [cover synthétique] + slides + [link synthétique]
                │
                ▼
        story-viewer / story-inline (rend les 6 types incluant cover/link/video)
```

## Tests

**Frontend admin :**

- `slides-editor.component.spec.ts` : adapter aux nouveaux 4 boutons (plus de cover/link), vérifier l'absence de warnings, vérifier l'ouverture du picker via ImageField, vérifier la détection YouTube/Vimeo (cas ✓ et cas non reconnu).
- `video-url.spec.ts` (nouveau) : test unitaire pur sur `parseVideoUrl` couvrant les 5 patterns d'URL listés + null pour URL inconnues.

**Frontend public :**

- `story-viewer.component.spec.ts` / `story-inline.component.spec.ts` : tester l'enrichissement (slides arrivent à 4 types, le viewer en rend 6 : cover prépendée, link appendé), le rendu de la branche `video` avec mock du sanitizer.
- `furniture-detail.component.spec.ts` / `exhibition-detail.component.spec.ts` : vérifier l'enrichissement passé à `story-inline`.

**Backend :**

- `AdminStoriesControllerTest` (ou équivalent) : tester PUT avec un slide vidéo (accepté), PUT avec un slide de type 'cover' ou 'link' (400 Bad Request), tester le mapping `src ↔ entity.src` pour video.
- Test d'intégration sur la migration Liquibase 008 : avant migration, insérer des rows cover/link ; après, vérifier qu'elles sont supprimées et que les autres types restent intacts.

**Couverture :** maintenir ≥ 80 % comme imposé par karma.conf.js et par le pipeline CI.

## Plan de déploiement

1. Merge sur main → CI build images backend + frontend.
2. Au démarrage du backend, Liquibase exécute la migration 008 (DELETE des rows cover/link). Idempotent.
3. Le frontend déployé n'envoie plus de types cover/link et utilise le nouveau type video.
4. Le rendu public continue de fonctionner pendant et après le déploiement : avant la migration côté DB, les anciens cover/link en base seraient renvoyés par l'API, mais le viewer côté frontend nouveau les ignorerait (un filtre défensif `slides.filter(s => s.type !== 'cover' && s.type !== 'link')` dans furniture-detail / exhibition-detail garantit la transition propre même si la migration n'a pas encore tourné).

## Conventions et contraintes

- Angular 21 standalone components, signals, `@if` / `@for`.
- Pas de NgModule, pas de librairie tierce (pas de player vidéo custom, on s'appuie sur les iframes officiels).
- Tous les appels API passent par `PortfolioService`.
- Liquibase pour toute modification de données ; Hibernate reste `ddl-auto=validate`.
- Conventional commits français (`feat(admin):`, `feat(public):`, `refactor(slides):`, `chore(db):`, etc.).
- CSP : élargie pour `frame-src` mais le reste reste strict.
