# **Spécification Fonctionnelle - Atelier Lumen Portfolio**

**Version** : 1.0.0  
**Date** : 01/05/2026  
**Auteur** : Équipe Atelier Lumen  
**Statut** : En cours de validation  

---

## **📌 Table des Matières**
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

## **1. Introduction**

### **1.1 Présentation du Projet**
**Atelier Lumen Portfolio** est une **application web full-stack** conçue pour présenter le travail de **Guillaume Maxime Boop**, un artisan spécialisé dans la **création de mobilier sculpté** et de **scénographies d'exposition artistiques**. 

L'application permet aux visiteurs de :
- Découvrir le **catalogue de pièces uniques** (mobilier, sculptures).
- Explorer les **expositions passées et à venir**.
- En savoir plus sur l'**artisan, son processus créatif et ses distinctions**.

### **1.2 Portée du Document**
Ce document décrit :
- Les **fonctionnalités** de l'application.
- Les **exigences techniques et métiers**.
- Les **flux utilisateur** et maquettes.
- Les **contraintes** et **hypothèses** de développement.

---

## **2. Contexte et Objectifs**

### **2.1 Contexte**
Guillaume Maxime Boop, artisan et designer, a besoin d'une **vitrine numérique** pour :
- **Promouvoir son travail** auprès de collectionneurs, galeries et médias.
- **Centraliser ses réalisations** (mobilier, scénographies) et son parcours.
- **Faciliter la prise de contact** pour des commandes ou collaborations.

### **2.2 Objectifs**
| Objectif | Description | Priorité |
|----------|-------------|----------|
| **Visibilité** | Mettre en avant les œuvres et expositions de l'atelier. | ⭐⭐⭐ |
| **Expérience Utilisateur** | Offrir une navigation intuitive et esthétique. | ⭐⭐⭐ |
| **Accessibilité** | Rendre le contenu accessible sur tous les appareils. | ⭐⭐ |
| **Maintenabilité** | Permettre des mises à jour faciles du catalogue. | ⭐⭐ |
| **SEO** | Optimiser le référencement naturel. | ⭐ |

### **2.3 Hypothèses**
- Les données (pièces, expositions) seront **gérées manuellement** dans un premier temps (via le code ou un futur espace admin).
- L'application sera **hébergée** sur un service cloud (ex: Vercel pour le frontend, Heroku pour le backend).
- Aucune **transaction financière** ne sera gérée via l'application (liens vers des plateformes externes si besoin).

---

## **3. Public Cible**

| Type d'Utilisateur | Description | Besoins Spécifiques |
|--------------------|-------------|----------------------|
| **Visiteur occasionnel** | Personnes découvrant l'atelier via les réseaux sociaux ou le bouche-à-oreille. | Navigation simple, contenu visuel attractif. |
| **Collectionneur** | Acheteurs potentiels de pièces uniques. | Fiches détaillées (matériaux, dimensions, prix), contact facile. |
| **Galerie/Média** | Professionnels du monde de l'art (galeries, journalistes). | Accès aux expositions, dossier de presse, images haute résolution. |
| **Artisan lui-même** | Guillaume Maxime Boop. | Mise à jour du catalogue, gestion des expositions. |

---

## **4. Fonctionnalités Principales**

### **4.1 Frontend (Interface Utilisateur)**

#### **🏠 Page d'Accueil (`/home`)**
- **Bannière principale** : Image de fond + titre "Atelier Lumen".
- **Section "Pièces phares"** : Carrousel des 3-4 pièces les plus emblématiques (avec lien vers leur fiche détaillée).
- **Section "Expositions à l'affiche"** : Carrousel des expositions en cours ou à venir.
- **Lien vers le studio** : Bouton pour en savoir plus sur l'artisan.

#### **🪑 Catalogue (`/furniture`)**
- **Liste des pièces** : Grille ou liste des meubles/sculptures avec :
  - Image principale.
  - Titre.
  - Catégorie (ex: Chaise, Table, Sculpture).
  - Année de création.
- **Filtres** :
  - Par **catégorie** (ex: Siège, Table, Luminaire).
  - Par **année**.
  - Par **matériau** (ex: Bois, Métal, Résine).
- **Recherche** : Barre de recherche par titre ou description.

#### **📜 Fiche Pièce (`/furniture/:slug`)**
- **Galerie d'images** : Diaporama des photos de la pièce (zoom possible).
- **Informations techniques** :
  - Titre, année, catégorie.
  - Matériaux utilisés.
  - Dimensions (L x l x H).
  - Description détaillée.
- **Disponibilité** : Indication si la pièce est disponible à la vente (lien vers contact).
- **Pièces similaires** : Suggestion de 3 autres pièces de la même catégorie.

#### **🎨 Expositions (`/exhibitions`)**
- **Timeline des expositions** : Liste chronologique (passées et futures) avec :
  - Titre.
  - Lieu (galerie, musée).
  - Dates (début/fin).
  - Image de l'exposition.
- **Filtres** :
  - Par **année**.
  - Par **lieu**.

#### **🏛️ Fiche Exposition (`/exhibitions/:slug`)**
- **Bannière** : Image principale de l'exposition.
- **Détails** :
  - Titre, lieu, dates.
  - Description (contexte, thème).
  - Liste des **pièces exposées** (liens vers leurs fiches).
- **Presse** : Liens vers des articles ou critiques (si disponibles).

#### **👤 Studio (`/studio`)**
- **Biographie** : Parcours de Guillaume Maxime Boop.
- **Distinctions** : Prix, récompenses, mentions.
- **Presse** : Articles, interviews (liens ou extraits).
- **Processus créatif** : Explication de la méthode de travail (croquis, matériaux, etc.).
- **Contact** :
  - Formulaire de contact (nom, email, message).
  - Liens vers les réseaux sociaux (Instagram, LinkedIn).
  - Adresse de l'atelier (si applicable).

#### **🔍 Barre de Recherche Globale**
- Recherche dans :
  - Les titres et descriptions des **pièces**.
  - Les titres et descriptions des **expositions**.
  - Le contenu de la page **Studio**.

#### **📱 Footer**
- Liens rapides : Accueil, Catalogue, Expositions, Studio, Contact.
- Mentions légales (RGPD, droits d'auteur).
- Copyright : "© 2026 Atelier Lumen - Tous droits réservés".

---

#### **🎨 Header**
- **Logo** : "Atelier Lumen" (lien vers l'accueil).
- **Navigation** :
  - Accueil
  - Catalogue
  - Expositions
  - Studio
- **Langue** : Sélecteur FR/EN (à implémenter).

---

### **4.2 Backend (API REST)**

#### **📡 Endpoints Principaux**

| **Ressource**       | **Endpoint**                     | **Méthode** | **Description** | **Réponse** |
|---------------------|----------------------------------|-------------|-----------------|-------------|
| **Pièces**          | `/api/furniture`                 | GET         | Liste complète des pièces. | `Furniture[]` |
|                     | `/api/furniture/featured`        | GET         | Pièces phares (mises en avant). | `Furniture[]` |
|                     | `/api/furniture/categories`      | GET         | Liste des catégories uniques. | `string[]` |
|                     | `/api/furniture/{slug}`          | GET         | Détail d'une pièce par slug. | `Furniture` |
| **Expositions**     | `/api/exhibitions`               | GET         | Liste complète des expositions. | `Exhibition[]` |
|                     | `/api/exhibitions/featured`      | GET         | Expositions à l'affiche. | `Exhibition[]` |
|                     | `/api/exhibitions/{slug}`        | GET         | Détail d'une exposition par slug. | `Exhibition` |
| **Profil**          | `/api/profile`                   | GET         | Informations sur l'atelier. | `Profile` |
| **Santé**           | `/actuator/health`               | GET         | Vérification de l'état de l'API. | `200 OK` |

#### **📦 Modèles de Données**

##### **Furniture (Pièce de Mobilier)**
| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | `Long` | Identifiant unique. | `1` |
| `title` | `String` | Titre de la pièce. | "Chaise Lumen" |
| `slug` | `String` | URL-friendly (pour les routes). | `chaise-lumen` |
| `category` | `String` | Catégorie (Siège, Table, etc.). | `Siège` |
| `description` | `String` | Description détaillée. | "Chaise en chêne sculpté..." |
| `materials` | `String[]` | Liste des matériaux. | `["Chêne", "Acier"]` |
| `dimensions` | `String` | Dimensions (L x l x H). | "80 x 60 x 120 cm" |
| `year` | `Year` | Année de création. | `2023` |
| `images` | `String[]` | URLs des images. | `["url1.jpg", "url2.jpg"]` |
| `featured` | `boolean` | Pièce mise en avant. | `true` |
| `available` | `boolean` | Disponible à la vente. | `true` |
| `price` | `BigDecimal` | Prix (optionnel). | `1200.00` |

##### **Exhibition (Exposition)**
| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | `Long` | Identifiant unique. | `1` |
| `title` | `String` | Titre de l'exposition. | "Lumière et Matière" |
| `slug` | `String` | URL-friendly. | `lumiere-et-matiere` |
| `location` | `String` | Lieu (galerie, musée). | "Galerie XYZ, Paris" |
| `startDate` | `LocalDate` | Date de début. | `2024-05-15` |
| `endDate` | `LocalDate` | Date de fin. | `2024-06-30` |
| `description` | `String` | Description de l'exposition. | "Exposition collective..." |
| `images` | `String[]` | URLs des images. | `["url1.jpg"]` |
| `featured` | `boolean` | Exposition mise en avant. | `true` |
| `furnitureIds` | `Long[]` | IDs des pièces exposées. | `[1, 2, 3]` |
| `pressLinks` | `String[]` | Liens vers des articles. | `["url1", "url2"]` |

##### **Profile (Profil de l'Atelier)**
| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `bio` | `String` | Biographie de l'artisan. | "Guillaume Maxime Boop est un..." |
| `distinctions` | `String[]` | Liste des distinctions. | `["Prix XYZ 2023"]` |
| `press` | `String[]` | Extraits ou liens presse. | `["Article dans Le Monde"]` |
| `process` | `String` | Description du processus créatif. | "Chaque pièce commence par..." |
| `contactEmail` | `String` | Email de contact. | `contact@atelier-lumen.fr` |
| `socialLinks` | `Map<String, String>` | Liens réseaux sociaux. | `{"instagram": "@lumen", "linkedin": "..."}` |
| `address` | `String` | Adresse de l'atelier. | "12 Rue de Paris, 75001" |

---

## **5. Exigences Fonctionnelles**

### **5.1 Gestion du Catalogue**
| ID | Exigence | Description | Priorité |
|----|----------|-------------|----------|
| **F001** | **Afficher la liste des pièces** | L'utilisateur peut voir toutes les pièces du catalogue sous forme de grille ou liste. | ⭐⭐⭐ |
| **F002** | **Filtrer les pièces** | L'utilisateur peut filtrer les pièces par catégorie, année ou matériau. | ⭐⭐⭐ |
| **F003** | **Rechercher une pièce** | L'utilisateur peut rechercher une pièce par titre ou description. | ⭐⭐ |
| **F004** | **Afficher les détails d'une pièce** | L'utilisateur peut cliquer sur une pièce pour voir ses détails (images, matériaux, dimensions). | ⭐⭐⭐ |
| **F005** | **Mettre en avant des pièces** | Certaines pièces sont marquées comme "phares" et apparaissent en premier. | ⭐⭐ |

### **5.2 Gestion des Expositions**
| ID | Exigence | Description | Priorité |
|----|----------|-------------|----------|
| **F010** | **Afficher la liste des expositions** | L'utilisateur peut voir toutes les expositions (passées et futures) sous forme de timeline. | ⭐⭐⭐ |
| **F011** | **Filtrer les expositions** | L'utilisateur peut filtrer les expositions par année ou lieu. | ⭐⭐ |
| **F012** | **Afficher les détails d'une exposition** | L'utilisateur peut voir les détails d'une exposition (lieu, dates, pièces exposées). | ⭐⭐⭐ |
| **F013** | **Mettre en avant les expositions actuelles** | Les expositions en cours ou à venir sont mises en avant sur la page d'accueil. | ⭐⭐ |

### **5.3 Page Studio**
| ID | Exigence | Description | Priorité |
|----|----------|-------------|----------|
| **F020** | **Afficher la biographie** | L'utilisateur peut lire la biographie de l'artisan. | ⭐⭐⭐ |
| **F021** | **Afficher les distinctions** | L'utilisateur peut voir les prix et récompenses de l'atelier. | ⭐⭐ |
| **F022** | **Afficher la presse** | L'utilisateur peut consulter les articles et mentions médiatiques. | ⭐ |
| **F023** | **Afficher le processus créatif** | L'utilisateur peut comprendre la méthode de travail de l'artisan. | ⭐⭐ |
| **F024** | **Formulaire de contact** | L'utilisateur peut envoyer un message via un formulaire (nom, email, message). | ⭐⭐⭐ |

### **5.4 Navigation et UX**
| ID | Exigence | Description | Priorité |
|----|----------|-------------|----------|
| **F030** | **Navigation intuitive** | L'utilisateur peut accéder à toutes les pages via un menu clair. | ⭐⭐⭐ |
| **F031** | **Design responsive** | L'application s'adapte à tous les écrans (mobile, tablette, desktop). | ⭐⭐⭐ |
| **F032** | **Chargement rapide** | Les pages et images se chargent rapidement (optimisation des assets). | ⭐⭐ |
| **F033** | **Accessibilité** | L'application respecte les normes WCAG (contrastes, balises ARIA). | ⭐ |

### **5.5 Internationalisation**
| ID | Exigence | Description | Priorité |
|----|----------|-------------|----------|
| **F040** | **Support FR/EN** | L'utilisateur peut basculer entre le français et l'anglais. | ⭐ |

---

## **6. Exigences Non Fonctionnelles**

### **6.1 Performance**
| ID | Exigence | Description |
|----|----------|-------------|
| **NF001** | Temps de chargement | Les pages doivent se charger en **< 2 secondes** (hors images). |
| **NF002** | Optimisation images | Les images doivent être compressées et servies en **WebP**. |
| **NF003** | Lazy-loading | Les images et composants doivent être chargés dynamiquement. |

### **6.2 Sécurité**
| ID | Exigence | Description |
|----|----------|-------------|
| **NF010** | Protection des données | Aucune donnée sensible (ex: emails) n'est stockée sans chiffrement. |
| **NF011** | CORS | L'API doit être accessible uniquement depuis le domaine du frontend. |
| **NF012** | Validation des entrées | Toutes les requêtes API doivent être validées (ex: slugs, IDs). |

### **6.3 SEO**
| ID | Exigence | Description |
|----|----------|-------------|
| **NF020** | Balises méta | Chaque page doit avoir des balises `title`, `description`, `og:image`. |
| **NF021** | URLs propres | Les URLs doivent être lisibles (ex: `/furniture/chaise-lumen`). |
| **NF022** | Sitemap | Un fichier `sitemap.xml` doit être généré pour les moteurs de recherche. |

### **6.4 Maintenabilité**
| ID | Exigence | Description |
|----|----------|-------------|
| **NF030** | Code modulaire | Le code doit être organisé en composants/services réutilisables. |
| **NF031** | Documentation | Le code doit être commenté et documenté (Javadoc, TypeScript). |
| **NF032** | Tests | Des tests unitaires doivent couvrir au moins **80%** du code. |

### **6.5 Hébergement**
| ID | Exigence | Description |
|----|----------|-------------|
| **NF040** | Disponibilité | L'application doit avoir un **uptime > 99.9%**. |
| **NF041** | Sauvegardes | Les données doivent être sauvegardées quotidiennement. |

---

## **7. Maquettes et Flux Utilisateur**

### **7.1 Maquettes (Wireframes)**

#### **🏠 Page d'Accueil**
```
+-------------------------------------+
|  [Logo] Atelier Lumen    [FR/EN]   |
+-------------------------------------+
|                                     |
|  +-------------------------------+  |
|  |                               |  |
|  |   [Bannière : Image de fond]   |  |
|  |                               |  |
|  |   "Créations uniques en bois   |  |
|  |    et métal"                  |  |
|  +-------------------------------+  |
|                                     |
|  +-------------+ +-------------+    |
|  | Pièces      | | Expositions |    |
|  | phares      | | à l'affiche |    |
|  +-------------+ +-------------+    |
|  | [Image]     | | [Image]     |    |
|  | Chaise      | | Lumière et  |    |
|  | Lumen       | | Matière     |    |
|  +-------------+ +-------------+    |
|                                     |
|  [En savoir plus sur le studio]      |
+-------------------------------------+
|  Footer: Accueil | Catalogue | ...  |
+-------------------------------------+
```

#### **🪑 Page Catalogue**
```
+-------------------------------------+
|  [Logo] Atelier Lumen    [FR/EN]   |
+-------------------------------------+
|  +-------------------------------+  |
|  | Catalogue                     |  |
|  +-------------------------------+  |
|                                     |
|  [Filtres: Catégorie ▼ | Année ▼]   |
|  [Recherche: ______________]        |
|                                     |
|  +------+ +------+ +------+          |
|  |[Img] | |[Img] | |[Img] |          |
|  |Chaise| |Table | |Lum. |          |
|  |Lumen | |Éclat | |Soleil|          |
|  +------+ +------+ +------+          |
|  +------+ +------+ +------+          |
|  |[Img] | |[Img] | |[Img] |          |
|  |Banc  | |Armoire| |Sculp.|          |
|  +------+ +------+ +------+          |
+-------------------------------------+
```

#### **📜 Fiche Pièce**
```
+-------------------------------------+
|  [Logo] Atelier Lumen    [FR/EN]   |
+-------------------------------------+
|                                     |
|  +-------------------------------+  |
|  | [Diaporama: Image 1/3]        |  |
|  |                               |  |
|  |   <       >       >           |  |
|  +-------------------------------+  |
|                                     |
|  Chaise Lumen                       |
|  --------------------------------    |
|  Catégorie: Siège                   |
|  Année: 2023                        |
|  Matériaux: Chêne, Acier            |
|  Dimensions: 80 x 60 x 120 cm       |
|  Prix: 1 200 €                      |
|  Disponible: ✅                      |
|                                     |
|  Description:                       |
|  "Chaise en chêne sculpté à la main,|
|   avec des motifs géométriques..."  |
|                                     |
|  [Contactez-nous] [Pièces similaires]|
+-------------------------------------+
```

### **7.2 Flux Utilisateur**

#### **Flux 1 : Découverte du Catalogue**
```
[Accueil] → Clique sur "Catalogue" → [Liste des pièces]
   → Filtre par "Siège" → [Liste filtrée]
   → Clique sur "Chaise Lumen" → [Fiche détaillée]
   → Clique sur "Contactez-nous" → [Formulaire de contact]
```

#### **Flux 2 : Exploration des Expositions**
```
[Accueil] → Clique sur "Expositions à l'affiche" → [Fiche exposition]
   → Clique sur une pièce exposée → [Fiche pièce]
```

#### **Flux 3 : Prise de Contact**
```
[Accueil] → Clique sur "Studio" → [Page Studio]
   → Remplit le formulaire (nom, email, message)
   → Soumet le formulaire → [Message de confirmation]
```

---

## **8. Contraintes Techniques**

### **8.1 Environnement de Développement**
| Outil | Version | Usage |
|-------|---------|-------|
| **Java** | 25 | Backend (Spring Boot) |
| **Maven** | 3.9+ | Gestion des dépendances |
| **Node.js** | 20+ | Frontend (Angular) |
| **npm** | 10+ | Gestion des packages |
| **Git** | - | Versioning |
| **Docker** | - | Conteneurisation |

### **8.2 Frameworks et Librairies**
| Technologie | Version | Usage |
|-------------|---------|-------|
| **Spring Boot** | 4.0 | Backend (API REST) |
| **Angular** | 21 | Frontend (UI) |
| **RxJS** | 7+ | Gestion des flux |
| **HttpClient** | - | Requêtes API |

### **8.3 Hébergement**
| Service | Usage |
|---------|-------|
| **Vercel** | Frontend (Angular) |
| **Heroku** | Backend (Spring Boot) |
| **PostgreSQL** | Base de données (futur) |

### **8.4 Contraintes de Données**
- Les **images** doivent être stockées dans un service externe (ex: Cloudinary, AWS S3).
- Les **données** (pièces, expositions) seront initialement **statiques** (chargées en mémoire), puis migrées vers une base de données.
- Les **formulaires** (contact) doivent être protégés contre les spams (ex: reCAPTCHA).

---

## **9. Glossaire**

| Terme | Définition |
|-------|------------|
| **Slug** | Chaîne de caractères URL-friendly (ex: `chaise-lumen`). |
| **Record (Java)** | Classe immutable pour stocker des données (introduit en Java 16). |
| **Standalone Component (Angular)** | Composant qui n'a pas besoin d'être déclaré dans un `NgModule`. |
| **Signal (Angular)** | Mécanisme de gestion d'état réactif (introduit en Angular 16). |
| **Lazy-loading** | Chargement dynamique des composants pour améliorer les performances. |
| **CORS** | Mécanisme de sécurité pour autoriser les requêtes cross-origin. |
| **JPA** | Java Persistence API (pour l'interaction avec une base de données). |

---

## **10. Annexes**

### **10.1 Exemple de Données**

#### **Pièce : Chaise Lumen**
```json
{
  "id": 1,
  "title": "Chaise Lumen",
  "slug": "chaise-lumen",
  "category": "Siège",
  "description": "Chaise en chêne sculpté à la main, avec des motifs géométriques inspirés de la lumière.",
  "materials": ["Chêne", "Acier"],
  "dimensions": "80 x 60 x 120 cm",
  "year": 2023,
  "images": [
    "https://example.com/images/chaise-lumen-1.jpg",
    "https://example.com/images/chaise-lumen-2.jpg"
  ],
  "featured": true,
  "available": true,
  "price": 1200.00
}
```

#### **Exposition : Lumière et Matière**
```json
{
  "id": 1,
  "title": "Lumière et Matière",
  "slug": "lumiere-et-matiere",
  "location": "Galerie XYZ, Paris",
  "startDate": "2024-05-15",
  "endDate": "2024-06-30",
  "description": "Exposition collective explorant les interactions entre lumière et matériaux.",
  "images": ["https://example.com/images/expo-1.jpg"],
  "featured": true,
  "furnitureIds": [1, 2, 3],
  "pressLinks": [
    "https://lemonde.fr/article-1",
    "https://lefigaro.fr/article-2"
  ]
}
```

### **10.2 Diagramme d'Architecture**
```
+-------------------+       +-------------------+       +-------------------+
|                   |       |                   |       |                   |
|   Frontend        |------>|   Backend         |------>|   Base de         |
|   (Angular 21)    |       |   (Spring Boot)    |       |   Données         |
|                   |       |                   |       |   (PostgreSQL)    |
+-------------------+       +-------------------+       +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+       +-------------------+       +-------------------+
|   Utilisateur     |       |   API REST        |       |   Données         |
|   (Navigateur)    |       |   (8080)          |       |   (JPA)           |
+-------------------+       +-------------------+       +-------------------+
```

### **10.3 Roadmap**

| Phase | Objectifs | Durée Estimée | Statut |
|-------|-----------|---------------|--------|
| **Phase 1** | MVP (Frontend + Backend statique) | 2 semaines | ✅ Terminé |
| **Phase 2** | Ajout de la persistance (PostgreSQL) | 1 semaine | ⏳ À faire |
| **Phase 3** | Espace admin (CRUD) | 2 semaines | ⏳ À faire |
| **Phase 4** | Internationalisation (FR/EN) | 1 semaine | ⏳ À faire |
| **Phase 5** | Optimisations (SSR, images) | 1 semaine | ⏳ À faire |

---

## **📝 Historique des Révisions**

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0.0 | 01/05/2026 | Équipe Atelier Lumen | Création initiale |

---

**Approbations** :
- [ ] Guillaume Maxime Boop (Client)
- [ ] Équipe Développement
- [ ] Équipe Design
