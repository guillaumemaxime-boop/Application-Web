# ADR-0004 : Angular standalone + signaux pour le frontend

- **Statut** : Accepted
- **Date** : 2026-05-02
- **Décideurs** : Équipe Atelier Lumen
- **Tags** : frontend, framework, architecture

## Contexte

Le frontend doit offrir une expérience visuelle riche (galeries, transitions, mise en valeur du contenu artistique), un routage type SPA, et rester maintenable à long terme. L'équipe possède une expertise Angular et souhaite tirer parti des évolutions récentes du framework qui rapprochent significativement la DX de celle de React.

Angular 21 introduit (ou stabilise) plusieurs avancées majeures :
- **Composants standalone** : plus besoin de NgModule
- **Signaux** (`signal`, `computed`) : système de réactivité fine, alternative à Zone.js
- **Nouveau control flow** : `@if`, `@for`, `@empty`, `@else` directement dans les templates
- **Lazy-loading par route** via `loadComponent`

## Décision

Implémenter le frontend en **Angular 21** avec :

- **Bootstrap standalone** (pas de `AppModule`, `bootstrapApplication` direct)
- **Signaux** pour l'état local des composants, `computed` pour l'état dérivé
- **Nouveau control flow** (`@if` / `@for` / `@empty`) au lieu de `*ngIf` / `*ngFor`
- **Lazy-loading** des routes via `loadComponent`
- **`provideHttpClient(withFetch())`** pour les appels HTTP
- TypeScript strict, services injectables typés, modèles partagés sous `models/`

## Conséquences

### Positives
- Code plus concis : suppression du boilerplate NgModule, templates plus lisibles
- Meilleure réactivité fine grain via les signaux (moins de re-renders inutiles)
- Lazy-loading par défaut → premier chargement rapide
- Aligné sur la trajectoire à long terme d'Angular (moins de dette à payer plus tard)

### Négatives / compromis
- Tutoriels et StackOverflow majoritairement encore en `*ngIf` / NgModule → friction pour nouveaux contributeurs
- Quelques bibliothèques tierces n'exposent pas encore d'API standalone (à vérifier au cas par cas)

### Neutres
- Pas de SSR pour l'instant (cf. *Pistes d'extension* du README) : peut être ajouté plus tard avec `@angular/ssr` sans réécriture majeure

## Alternatives envisagées

### Option A — React + Vite
Écartée : l'équipe est plus à l'aise avec Angular, et le besoin métier ne justifie pas le changement d'écosystème.

### Option B — Angular avec NgModule (style "classique")
Écartée : c'est l'ancien chemin par défaut, mais il sera progressivement déprécié et le coût de migration future serait inutile pour un projet qui démarre maintenant.

### Option C — Vue 3
Écartée : pas d'expertise interne, écosystème moins fourni pour les besoins entreprise (formulaires, i18n, validation).

## Références

- [README.md](../../README.md) — caractéristiques techniques frontend
- [`frontend/src/app/app.config.ts`](../../frontend/src/app/app.config.ts) — bootstrap standalone
- [`frontend/src/app/app.routes.ts`](../../frontend/src/app/app.routes.ts) — lazy-loading
- [Angular signals guide](https://angular.dev/guide/signals)
