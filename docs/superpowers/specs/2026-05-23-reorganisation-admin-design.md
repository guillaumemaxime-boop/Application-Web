# Réorganisation de l'espace d'administration

Date : 2026-05-23
Statut : Validé (en attente de plan d'implémentation)

## Contexte

L'espace `/admin` actuel est un composant Angular monolithique unique
([frontend/src/app/pages/admin/admin.component.ts](../../../frontend/src/app/pages/admin/admin.component.ts), **2429 lignes**) regroupant 7 onglets affichés à plat — Mobilier, Expositions, Textes du site, Médiathèque, Accueil, Typographie, Analytics — pilotés par un signal `tab: 'furniture' | 'exhibitions' | …`.

Deux problèmes principaux :

1. **Pas de vue d'ensemble.** L'arrivée se fait directement dans le premier onglet (Mobilier), sans page d'accueil offrant les actions courantes.
2. **Composant monolithique.** Toute modification touche le même fichier ; formulaires, médiathèque, picker photo, gestion du feed home et configuration typographique cohabitent dans une seule classe, ce qui rend les tests longs et la collaboration risquée.

Objectif : introduire un tableau de bord, regrouper les sections par thème, et décomposer le monolithe en composants standalone lazy-chargés par route — sans modifier les API backend (`/api/admin/**`) ni rompre les fonctionnalités existantes.

## Périmètre

**Inclus :**

- Tableau de bord (`/admin`) avec 4 actions rapides.
- Layout shell partagé avec sidebar groupée (Contenu / Site / Mesures).
- 9 routes enfants lazy sous `/admin`, chacune un composant standalone dédié.
- Re-thématisation des contenus de l'ancien onglet "Accueil" : catégories vers Mobilier, métadonnées d'expositions vers Expositions, visibilité du menu de navigation vers une nouvelle section "Navigation".
- Extraction de 3 composants partagés (`PhotoPickerComponent`, `GalleryEditorComponent`, `ToastsComponent` + `ToastService`).
- Migration incrémentale section par section, chaque étape commit-able et testée.
- Tests par section : un `*.component.spec.ts` par composant page + specs pour les composants partagés.
- Suppression finale de l'ancien `admin.component.ts` une fois toutes les sections migrées.

**Exclus :**

- Aucune modification backend (controllers `/api/admin/**`, entités, migrations Liquibase inchangés).
- Pas d'évolution fonctionnelle des sections : on déplace et on découpe, on ne change pas le comportement métier.
- Pas de nouveau design system / refonte visuelle : on reste sur les styles existants, on les redistribue.
- Pas d'ajout de librairie tierce (NgRx, etc.) — signals + services restent la norme.
- Pas de routes enfants pour l'édition (`/admin/mobilier/:slug`) : la sélection d'une pièce/expo reste pilotée par signal interne au composant, comme aujourd'hui.

## Architecture cible

### Arborescence des routes

`/admin` devient une route parent avec `loadChildren` retournant le shell + 9 routes enfants, toutes protégées par `authGuard` :

```text
/admin                       → DashboardComponent
/admin/mobilier              → MobilierComponent       (pièces + catégories)
/admin/expositions           → ExpositionsComponent    (expos + position sur la home)
/admin/textes                → TextesComponent
/admin/mediatheque           → MediathequeComponent
/admin/accueil               → AccueilComponent        (feed homepage uniquement)
/admin/navigation            → NavigationComponent     (visibilité menu nav)
/admin/typographie           → TypographieComponent
/admin/analytics             → AnalyticsComponent
```

Chaque route enfant utilise `loadComponent` pour un découpage de bundle effectif. Le composant shell reste chargé pour toute la session admin.

### Sidebar groupée

Le shell affiche la sidebar avec 3 sous-titres visuels :

```text
┌──────────────────────────────┐
│ Tableau de bord              │
│                              │
│ CONTENU                      │
│   Mobilier                   │
│   Expositions                │
│   Textes du site             │
│   Médiathèque                │
│                              │
│ SITE                         │
│   Accueil                    │
│   Navigation                 │
│   Typographie                │
│                              │
│ MESURES                      │
│   Analytics                  │
└──────────────────────────────┘
```

Les sous-titres (`CONTENU`, `SITE`, `MESURES`) sont des labels purs (non cliquables), reprenant le style `eyebrow` existant. La sidebar conserve son comportement responsive actuel (toggle hamburger en mobile via le signal `sidebarOpen`).

### Dashboard

`DashboardComponent` est volontairement minimaliste : titre + 4 cartes-boutons d'action rapide.

| Action            | Cible                            |
|-------------------|----------------------------------|
| + Nouvelle pièce  | `/admin/mobilier?new=1`          |
| + Nouvelle expo   | `/admin/expositions?new=1`       |
| + Importer photo  | `/admin/mediatheque?import=1`    |
| Éditer l'accueil  | `/admin/accueil`                 |

Les query params `?new=1` / `?import=1` sont lus à l'init de la section cible pour ouvrir directement le formulaire de création ou la boîte de dialogue d'import. Pas de query param consommé ⇒ comportement par défaut (liste affichée).

### Re-thématisation du contenu "Accueil"

L'ancien onglet "Accueil" mélangeait 4 préoccupations. Elles sont redistribuées :

| Contenu actuel                                       | Nouvelle localisation                         |
|------------------------------------------------------|-----------------------------------------------|
| Liste / ordre / inclusion du feed homepage           | `/admin/accueil`                              |
| Ordre + visibilité des **catégories** de mobilier    | `/admin/mobilier` (bloc en bas de la page)    |
| Ordre + visibilité des **expositions sur la home**   | `/admin/expositions` (bloc en bas de la page) |
| Visibilité des entrées du **menu de navigation**     | `/admin/navigation` (nouvelle section)        |

Aucune API backend ne change : les appels `/api/admin/home/feed`, `/api/admin/categories`, `/api/admin/exhibitions-meta`, `/api/admin/home/navigation` sont conservés tels quels, simplement consommés depuis le composant pertinent.

## Décomposition en composants

### Arborescence des fichiers cible

```text
frontend/src/app/pages/admin/
  admin-layout.component.ts          (shell : header + sidebar + <router-outlet>)
  admin-layout.component.spec.ts
  admin.routes.ts                    (export des 9 routes enfants)

  dashboard/
    dashboard.component.ts
    dashboard.component.spec.ts

  mobilier/
    mobilier.component.ts            (liste pièces + form + bloc Catégories)
    mobilier.component.spec.ts

  expositions/
    expositions.component.ts         (liste expos + form + bloc Home position)
    expositions.component.spec.ts

  textes/
    textes.component.ts
    textes.component.spec.ts

  mediatheque/
    mediatheque.component.ts
    mediatheque.component.spec.ts

  accueil/
    accueil.component.ts             (feed homepage uniquement)
    accueil.component.spec.ts

  navigation/
    navigation.component.ts          (visibilité menu nav)
    navigation.component.spec.ts

  typographie/
    typographie.component.ts
    typographie.component.spec.ts

  analytics/
    analytics.component.ts           (iframe Umami)
    analytics.component.spec.ts

  shared/
    photo-picker.component.ts        (extrait du monolithe)
    photo-picker.component.spec.ts
    gallery-editor.component.ts      (extrait du monolithe)
    gallery-editor.component.spec.ts
    toasts.component.ts              (déplacé du monolithe)
    toast.service.ts                 (nouveau, injectable)
    toast.service.spec.ts
    slides-editor.component.ts       (déjà extrait, déplacé ici)
    slides-editor.component.spec.ts
```

Cible : chaque fichier composant entre **200 et 400 lignes** (template + classe). Le monolithe actuel `admin.component.ts` est supprimé à la fin de la migration ; `slides-editor.component.ts` est déplacé dans `shared/` sans modification fonctionnelle.

### Composants partagés à extraire

**`PhotoPickerComponent`** — modal de sélection depuis la médiathèque. Inputs : `target: 'cover' | 'gallery'`. Outputs : `selected: Photo` et `closed: void`. Aujourd'hui dupliqué inline pour Mobilier et Expositions via les méthodes `openPicker` / `selectPhoto` du monolithe.

**`GalleryEditorComponent`** — bloc "galerie" avec thumbnails réorderables et bouton "+ Ajouter" déclenchant `PhotoPickerComponent`. Inputs : `images: string[]`. Outputs : `imagesChange: string[]`. Aujourd'hui dupliqué via les blocs `gallery-block` du template du monolithe pour Mobilier et Expositions.

**`ToastsComponent` + `ToastService`** — gestion des toasts globaux (succès / erreur). Le service expose `success(msg)` / `error(msg)`, le composant affiche les toasts en overlay. Promu en service injectable Angular utilisé par toutes les sections. Le composant est instancié une seule fois dans `AdminLayoutComponent`.

`SlidesEditorComponent` reste tel quel (déjà extrait), simplement déplacé dans `shared/`.

### Services métier

`PortfolioService` reste l'unique point d'entrée HTTP (convention CLAUDE.md). Aucune nouvelle classe service métier n'est créée — le découpage du monolithe se limite à la couche composant.

## Stratégie de migration

Migration **incrémentale**, une section à la fois. Chaque étape est un commit qui :

1. Ajoute le nouveau composant + ses tests.
2. Retire la section correspondante du monolithe (template + code + tests).
3. Passe `npm test` (frontend) en intégralité.

Ordre suggéré (du plus simple au plus complexe, pour valider l'infrastructure tôt) :

1. **Setup infrastructure** : créer `AdminLayoutComponent`, `admin.routes.ts`, `DashboardComponent`, mettre à jour `app.routes.ts` pour pointer vers `loadChildren`. Le monolithe reste accessible via une route temporaire `/admin/legacy` pendant la migration.
2. **Analytics** — section la plus isolée (iframe Umami).
3. **Typographie** — formulaire indépendant, peu d'état partagé.
4. **Textes** — formulaire indépendant.
5. **Médiathèque** — extraire en même temps `PhotoPickerComponent`. Les deux composants consomment la même source de données (`PortfolioService.getPhotos()`) mais restent indépendants côté template : la Médiathèque expose les actions "copier URL" / "supprimer", le PhotoPicker expose l'action "sélectionner". Pas de composant présentationnel commun pour éviter une abstraction prématurée.
6. **Mobilier** + extraction de `GalleryEditorComponent` (première utilisation du picker dans son nouveau format) ; inclut le bloc Catégories.
7. **Expositions** — réutilise `GalleryEditorComponent` et `PhotoPickerComponent` ; inclut le bloc Position sur la home.
8. **Accueil** (feed seulement) et **Navigation** (menu nav).
9. **Nettoyage final** : suppression de `admin.component.ts` + `admin.component.spec.ts`, suppression de la route `/admin/legacy`.

À chaque étape, le `ToastService` global est utilisé en remplacement de la gestion de toasts du monolithe. Pendant la migration, le service est instancié dans `AdminLayoutComponent`, ce qui permet aux nouvelles sections de l'utiliser immédiatement même si le monolithe legacy garde sa gestion inline.

## Tests

**Tests par composant** : chaque composant page reçoit son `*.component.spec.ts` couvrant :

- Rendu initial (liste, formulaire vide).
- Soumission / suppression / réordonnancement quand applicable.
- Gestion d'erreur API (toast d'erreur attendu).

**Tests des composants partagés :**

- `PhotoPickerComponent` : ouverture, sélection, fermeture par clic extérieur + touche Échap.
- `GalleryEditorComponent` : ajout via picker, suppression, réordonnancement (DnD).
- `ToastService` : empilement, expiration, dismiss manuel.

**Tests d'intégration routing :** un test vérifie que les 9 routes `/admin/*` sont gardées par `authGuard` (déjà implicite par la configuration, mais explicité par un test pour éviter les régressions).

**Couverture** : le seuil global de 80 % défini par `karma.conf.js` est conservé. La décomposition devrait améliorer la couverture (les helpers privés du monolithe deviennent testables isolément).

**Bilan attendu** : `admin.component.spec.ts` actuel disparaît à l'étape 9 ; il est remplacé par la somme des nouveaux specs.

## Conventions et contraintes

- **Standalone components + signals** uniquement, comme l'existant.
- `@if` / `@for` / `@empty` / `@else` dans les templates (jamais `*ngIf` / `*ngFor`).
- `loadComponent` pour les routes enfants.
- Tous les appels API passent par `PortfolioService` (aucun `HttpClient` injecté dans les composants).
- Aucun NgModule, aucun NgRx, aucune librairie d'état.
- Copy / labels en français (convention codebase).
- Pas d'inline `<script>` (CSP stricte côté backend).

## Hors-périmètre

Pour mémoire, ce design n'aborde pas :

- L'ajout de fonctionnalités sur le dashboard (stats, dernières modifs, alertes contenu) — explicitement écarté lors du brainstorming, à reconsidérer dans un futur design si besoin.
- L'introduction d'URL d'édition (`/admin/mobilier/:slug`) — pourrait faire l'objet d'un design ultérieur si la fonctionnalité de lien partageable devient utile.
- Tout changement backend.
