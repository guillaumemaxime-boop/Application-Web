# 17. Cropper.js pour l'outil de cadrage d'image admin

Date : 2026-06-07
Statut : Accepté

## Contexte

L'admin a besoin d'un outil de cropping pixel-perfect pour les covers (mobilier, exposition, story) et items de galerie. Le focal point précédent (X/Y simples) ne suffisait pas pour décrire un rendu précis multi-format.

## Décision

Utiliser **Cropper.js 1.6.x** (lib JS standalone, ~50KB gzipped) wrappée dans un composant Angular standalone `<app-image-crop-picker>`. Première lib UI tierce du projet.

## Conséquences

- (+) Mature, supportée, fonctionnalités natives (touch, clavier, présets aspect ratio, zoom).
- (+) Évite de réinventer une UI de crop avec edge cases (touch, snap, accessibilité).
- (+) Bundle lazy chunk admin → pas d'impact SEO ni first-paint sur les pages publiques.
- (-) Première lib UI tierce du projet. Tous les composants UI existants sont signals + standalone Angular natif.
- (-) +50KB sur le bundle admin (lazy chunk). Acceptable, admin pas critique pour SEO.
- (-) Cropper.js n'a pas de wrapper Angular maintenu : on l'instancie manuellement dans `ngAfterViewInit` + cleanup dans `ngOnDestroy`.

## Alternatives écartées

- **Custom** (~200-300 LOC pour reproduire Cropper.js correctement) : surface bugs touch + a11y trop importante, drift inévitable avec le temps.
- **ngx-image-cropper** (wrapper Angular existant) : 2 dépendances au lieu d'une, moins de contrôle sur le style.
- **Cropper.js v2** (réécriture custom-elements) : moins mature au moment du choix, API moins stable.

## Référence

Spec sous-projet 1/4 : [docs/superpowers/specs/2026-06-07-image-crop-tool-design.md](../superpowers/specs/2026-06-07-image-crop-tool-design.md).
