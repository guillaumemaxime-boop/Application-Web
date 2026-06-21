# Médiathèque admin — filtre par tag + sans-tag + autocomplétion — Spec

**Date** : 2026-06-21
**Statut** : Validé — à planifier
**Type** : Feature frontend (admin médiathèque). Aucune modification backend.

## Objectif

Dans la médiathèque admin (`mediatheque.component.ts`), permettre de **filtrer les photos par tag** (logique **ET** sur plusieurs tags), d'isoler les photos **sans tag**, et offrir l'**autocomplétion** des tags — à la fois dans le filtre et dans l'édition des tags par photo.

## Contexte (existant)

- `MediathequeComponent` charge **toutes** les photos (`getPhotos()`) côté client → l'univers des tags est dérivable sans nouvel endpoint.
- Recherche texte existante : `search` (signal) + `filtered` (computed) filtrant par sous-chaîne sur `originalName` ou un tag. **Conservée.**
- Édition des tags par photo : chips supprimables + `<input>` brut « + tag » (`commitTag`/`addTag`/`removeTag` → `persistTags` : update optimiste + `updatePhotoTags`). Pas d'autocomplétion.
- Brique réutilisable : **`<app-tag-editor>`** (`components/tag-editor/`) — combobox a11y complet (listbox, flèches, Enter/virgule, Backspace, Échap, chips, suggestions filtrées excluant les tags déjà présents). Inputs `tags`/`suggestions`/`placeholder`/`ariaLabel`/`disabled` ; output `tagsChange` (tableau neuf complet).

## Décisions validées

| Sujet | Choix |
| --- | --- |
| Multi-tags | **ET** (intersection : la photo doit porter tous les tags sélectionnés). |
| Autocomplétion | **Filtre + édition par photo** (les deux via `<app-tag-editor>`). |
| Filtre « sans tag » | Toggle dédié, **mutuellement exclusif** avec la sélection de tags. |
| Source des suggestions | Dérivée client-side des photos chargées (pas d'endpoint). |
| Backend | **Inchangé.** |

## Architecture (frontend)

### État (signals)
- `allTags = computed<string[]>()` : tags distincts de `photos()`, triés alphabétiquement.
- `tagFilter = signal<string[]>([])` : tags actifs du filtre (logique ET).
- `noTagOnly = signal(false)` : filtre « sans tag ».
- Setters d'exclusion mutuelle :
  - `setTagFilter(next)` → normalise chaque entrée (`trim().toLowerCase()`, dédup, vide ignoré) puis `tagFilter.set(...)` — garantit la cohérence de casse avec l'univers des tags persistés (le backend `normalizeTags` met déjà tout en minuscules) ; si non vide → `noTagOnly.set(false)`.
  - `toggleNoTag()` → bascule `noTagOnly` ; si activé → `tagFilter.set([])`.

### `filtered()` étendu (ordre)
1. Recherche texte (nom/tag substring) — inchangée.
2. Puis si `noTagOnly()` → ne garder que les photos sans aucun tag (`(p.tags ?? []).length === 0`).
3. Sinon si `tagFilter().length > 0` → ne garder que les photos contenant **tous** les tags sélectionnés (`every`).

### UI
- Sous la recherche, avant la grille : bloc filtre
  - `<app-tag-editor [tags]="tagFilter()" [suggestions]="allTags()" placeholder="Filtrer par tag…" ariaLabel="Filtrer par tag" (tagsChange)="setTagFilter($event)">`.
  - Bouton toggle **« Sans tag »** : `[class.active]="noTagOnly()"`, `[attr.aria-pressed]="noTagOnly()"`, `(click)="toggleNoTag()"`.
- Le compteur `filtered/total` existant reflète le filtre combiné (déjà basé sur `filtered()`).
- Édition par photo : remplacer l'`<input>` brut par
  `<app-tag-editor [tags]="photo.tags ?? []" [suggestions]="allTags()" placeholder="+ tag" ariaLabel="Ajouter un tag" (tagsChange)="persistTags(photo, $event)">`.
  `persistTags` gère ajout ET retrait (tableau complet). On retire `commitTag`/`addTag`/`removeTag` devenus inutiles, ainsi que le `@for` de chips manuel et le `<input>` de la carte (le tag-editor rend chips + champ).

### a11y
- Combobox : déjà géré par `<app-tag-editor>` (role combobox/listbox, aria-expanded/activedescendant, navigation clavier).
- Toggle « Sans tag » : `aria-pressed`, focus visible (style cohérent).

## Tests (`mediatheque.component.spec.ts`)
- `allTags` : distinct + trié à partir de photos taguées.
- Filtre **ET** : 2 tags → seules les photos portant les deux.
- « Sans tag » : ne garde que les photos sans tag ; activer « Sans tag » vide `tagFilter` ; ajouter un tag remet `noTagOnly` à false.
- Combinaison recherche texte + filtre tag (intersection).
- Intégration : `setTagFilter`/`toggleNoTag` mettent à jour `filtered()`.
- (Le combobox lui-même est déjà couvert par `tag-editor.component.spec.ts`.)

## Parité photo-picker (sélecteur d'images de galerie)

Le sélecteur `photo-picker.component.ts` (modale « Ajouter à la galerie » / « Choisir une image ») a son **propre** filtre par tag, historiquement en **chips mono-sélection** (`activeTag: string | null` → cliquer un 2ᵉ tag remplace le 1ᵉ). Mise en parité de **sémantique** avec la page :
- `activeTags: signal<string[]>` (logique **ET**) + `noTagOnly: signal<boolean>`, mutuellement exclusifs (`toggleTag`/`toggleNoTag`).
- Chips multi-sélection (`[class.active]="activeTags().includes(tag)"`) + chip **« Sans tag »** en tête de la rangée.
- `filtered()` : texte → `noTagOnly` (photos sans tag) → sinon `activeTags` en `every` (ET).
- **Pas de combobox/autocomplétion ici** : la modale affiche déjà **tous** les tags en chips cliquables (la découverte est visuelle, l'autocomplétion n'apporte rien). Le contrôle diffère de la page mais la **sémantique est identique** (ET + sans-tag).

## Hors portée
- Endpoint backend d'agrégation des tags (inutile : photos déjà toutes chargées).
- Persistance de l'état du filtre dans l'URL (query params).
- Renommage/fusion de tags en masse.
