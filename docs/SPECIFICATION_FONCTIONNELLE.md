# Spécification Fonctionnelle — Milo GUILLAUME Design

**Version** : 2.0.0
**Date** : 04/05/2026
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
- **Section Expositions phares** : liste des expositions marquées `featured`.
- **Citation** : extrait éditorial du studio.

#### Catalogue Mobilier (`/mobilier`)

- **Grille des pièces** : image de couverture, titre, catégorie.
- **Filtres par catégorie** : boutons dynamiques générés depuis les catégories existantes en base + bouton "Tout".
- Clic sur une pièce → fiche détaillée.

#### Fiche Pièce (`/mobilier/:slug`)

- **Hero** : image de couverture + bloc de spécifications (matière, designer, dimensions).
- **Description longue** : texte éditorial de la pièce.
- **Galerie** : mosaïque d'images complémentaires (3 colonnes, alternance portrait/paysage).
- **CTA** : lien de contact par e-mail.
- Gestion 404 si le slug n'existe pas.

#### Expositions (`/expositions`)

- **Liste chronologique** (ordre `date de début` décroissant) : image, titre, lieu, dates.

#### Fiche Exposition (`/expositions/:slug`)

- **Bannière** : image principale.
- **Détails** : titre, lieu, ville, pays, dates, commissaire.
- **Description** : texte éditorial.
- **Galerie** d'images.
- **Tags** associés à l'exposition.
- Gestion 404 si le slug n'existe pas.

#### Studio (`/studio`)

- **Biographie** du designer.
- **Distinctions / Prix**.
- **Presse** : mentions et publications.
- **Contact** : e-mail du studio, localisation.

#### Administration (`/admin`)

- Interface CRUD complète pour le mobilier et les expositions.
- Onglets : **Mobilier** | **Expositions**.
- Sidebar : liste des éléments + sélection pour édition.
- Formulaires de création / modification avec validation.
- Retour visuel (messages de succès / erreur).
- Suppression avec confirmation implicite.

#### Header

- Logo du studio (lien vers l'accueil).
- Navigation : Mobilier · Expositions · Studio.

#### Footer

- Liens rapides, mentions légales, copyright.

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
| `gallery` | `String[]` | URLs des images galerie | `["https://...", "..."]` |
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
| `gallery` | `String[]` | URLs des images galerie | `["https://..."]` |
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

### 5.5 Navigation et UX

| ID | Exigence | Description | Priorité | Statut |
|----|----------|-------------|----------|--------|
| **F040** | Navigation intuitive | Menu accessible depuis toutes les pages. | ⭐⭐⭐ | ✅ Fait |
| **F041** | Design responsive | Adaptation mobile, tablette, desktop. | ⭐⭐⭐ | ✅ Fait |
| **F042** | Chargement performant | Lazy loading des composants et des images. | ⭐⭐ | ✅ Fait |
| **F043** | Gestion 404 | Page ou pièce introuvable → message d'erreur clair. | ⭐⭐ | ✅ Fait |

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
|-------------|---------|-------|
| Spring Boot | 4.0 | API REST, JPA, Actuator, Liquibase |
| Angular | 21 | SPA frontend (standalone components, signals) |
| PostgreSQL | 16 | Persistance des données |
| Liquibase | — | Migrations de schéma BDD |
| Nginx | 1.27-alpine | Serveur web + reverse proxy |

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
  "gallery": [
    "https://example.com/images/chaise-eclat-1.jpg",
    "https://example.com/images/chaise-eclat-2.jpg"
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
  "gallery": ["https://example.com/images/expo-1.jpg"],
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
| **Phase 5** | Formulaire de contact (envoi d'e-mail) | ⏳ À faire |
| **Phase 6** | Recherche texte dans le catalogue | ⏳ À faire |
| **Phase 7** | Internationalisation FR/EN | ⏳ À faire |
| **Phase 8** | Optimisations SEO (balises méta, sitemap) | ⏳ À faire |

---

## Historique des Révisions

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0.0 | 01/05/2026 | Équipe Atelier Lumen | Création initiale |
| 2.0.0 | 04/05/2026 | Maxime Guillaume | Rebrand Milo GUILLAUME Design · Mise à jour du modèle de données réel · Routes corrigées · Roadmap synchronisée · Admin CRUD documenté · Hébergement Railway |
| 2.1.0 | 11/05/2026 | Maxime Guillaume | Authentification admin JWT (F034 ✅) · Suppression du lien Admin du menu de navigation · Correction CORS (`127.0.0.1:4200`) · Roadmap Phase 4 terminée |

---

**Approbations** :
- [ ] Milo Guillaume (Client)
- [ ] Équipe Développement
