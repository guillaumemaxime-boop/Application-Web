# Milo GUILLAUME Design — Portfolio

Application Web full-stack présentant un portfolio de **mobilier sculpté** et de **scénographies d'exposition artistiques**.

- **Backend** : Java 25 + Spring Boot 4.0 (REST API, PostgreSQL, Liquibase)
- **Frontend** : Angular 21 (composants standalone, signaux, nouveau control flow `@if` / `@for`)

## Fonctionnalités principales

- **Catalogue Créations** (`/creations`) : page agrégée mobilier + expositions avec filtres type, années et tags en union, compteurs dynamiques et deep-linking via query params.
- **Stories multiples + sliders d'actualités** : chaque pièce ou exposition peut porter N stories éditoriales (slides visuels). La home affiche jusqu'à 3 carrousels d'actualités composés par l'admin depuis des stories variées, avec viewer plein écran accessible (focus trap, navigation tactile et clavier).
- **Admin consolidé** : la page Accueil admin regroupe le masonry home feed et la composition des sliders d'actualités (drag & drop). Les tags mobilier et expositions sont gérés via un composant `<app-tag-input>` avec autocomplétion WAI-ARIA.

## Structure

```
Application Web/
├── backend/                  Spring Boot — API REST sur :8080
│   ├── pom.xml
│   └── src/main/java/com/atelier/portfolio/
│       ├── PortfolioApplication.java
│       ├── config/WebConfig.java         (CORS pour localhost:4200)
│       ├── controller/                   (Furniture, Exhibition, Profile)
│       ├── model/                        (records Java 25)
│       └── service/                      (données en mémoire)
│
└── frontend/                 Angular 21 — UI sur :4200
    ├── package.json
    ├── angular.json
    └── src/app/
        ├── app.component.ts / app.routes.ts / app.config.ts
        ├── components/{header,footer}/
        ├── pages/
        │   ├── home/                     Accueil avec sélection
        │   ├── furniture-list/           Catalogue + filtres par catégorie
        │   ├── furniture-detail/         Fiche pièce + galerie
        │   ├── exhibitions-list/         Timeline des expositions
        │   ├── exhibition-detail/        Fiche exposition immersive
        │   └── studio/                   Bio, distinctions, presse, processus
        ├── services/portfolio.service.ts (HttpClient → API)
        └── models/                       (Furniture, Exhibition, Profile)
```

## Prérequis

- **JDK 25** (`java -version` doit indiquer 25)
- **Maven** 3.9+
- **Node.js** 20+ et npm 10+

## Lancer le backend

```powershell
cd backend
./mvnw spring-boot:run     # ou : mvn spring-boot:run
```

API disponible sur `http://localhost:8080`.

### Endpoints

| Méthode | URL                                   | Description                          |
|---------|---------------------------------------|--------------------------------------|
| GET     | `/api/furniture`                      | Liste complète des pièces            |
| GET     | `/api/furniture/featured`             | Pièces phares                        |
| GET     | `/api/furniture/categories`           | Catégories distinctes                |
| GET     | `/api/furniture/{slug}`               | Détail d'une pièce                   |
| GET     | `/api/exhibitions`                    | Toutes les expositions               |
| GET     | `/api/exhibitions/featured`           | Expositions à l'affiche              |
| GET     | `/api/exhibitions/{slug}`             | Détail d'une exposition              |
| GET     | `/api/profile`                        | Profil du studio                     |
| GET     | `/actuator/health`                    | Healthcheck                          |

## Lancer le frontend

```powershell
cd frontend
npm install
npm start
```

L'application est accessible sur `http://localhost:4200`.

## Données

Les données (6 pièces de mobilier, 5 expositions, 1 profil) sont **chargées en mémoire** dans les services Spring (`FurnitureService`, `ExhibitionService`, `ProfileController`). Pour passer à une base de données :

1. Ajouter `spring-boot-starter-data-jpa` + driver dans `pom.xml`
2. Convertir les `record` en entités `@Entity` et créer des `JpaRepository`
3. Remplacer les listes en dur par des appels au repository

## Caractéristiques techniques

### Backend
- Java 25 (records, text blocks)
- Spring Boot 4.0 — Web, Validation, Actuator
- CORS configuré pour le dev front (`localhost:4200`)
- Sérialisation JSON des dates en `yyyy-MM-dd`

### Frontend
- Angular 21 standalone bootstrap (pas de NgModule)
- Signaux (`signal`, `computed`) pour l'état local
- Nouveau control flow : `@if`, `@for`, `@empty`, `@else`
- Lazy-loading des routes (`loadComponent`)
- `provideHttpClient(withFetch())`
- Typographie Cormorant Garamond + Inter
- Design responsive (3 breakpoints)

## Pistes d'extension

- Persistance PostgreSQL + Flyway
- Espace admin protégé (Spring Security + JWT)
- Upload d'images vers S3 / Cloudinary
- SSR / hydratation (`@angular/ssr`)
- Internationalisation (FR/EN)
- Optimisation des images (`@angular/image`)
