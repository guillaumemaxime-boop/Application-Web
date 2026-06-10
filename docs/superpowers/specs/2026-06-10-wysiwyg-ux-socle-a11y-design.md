# UX socle + a11y des previews WYSIWYG — Spec

**Date** : 2026-06-10
**Statut** : Validé — prêt pour writing-plans
**Sous-projet** : 2/6 du chantier « Améliorations WYSIWYG v2 » (découpage : voir spec `2026-06-10-wysiwyg-socle-factorise-design.md`, section Contexte). S'appuie sur le sous-projet 1 (socle factorisé `<app-admin-preview-shell>` + `preview-page-helpers`), mergé sur main.

## Objectif

Apporter aux 3 pages admin WYSIWYG (accueil, mobilier, expositions) le confort d'édition et l'accessibilité que la factorisation du sous-projet 1 rend désormais implémentables une seule fois : garde-fou contre la perte de saisie, Ctrl+S, plein écran conforme (Échap + focus + neutralisation), tablist au pattern APG complet, annonces lecteur d'écran, et feedback visuel du drag-reorder.

Solde les 5 dettes a11y listées par l'audit RGAA du 10/06/2026 (sauf résiduel documenté en « Hors portée »).

## Périmètre validé

| Axe | Retenu | Écarté (choix utilisateur) |
| --- | --- | --- |
| Dirty state | Garde-fou au changement d'item (liste, « + Nouvelle ») | Badge visuel, `canDeactivate`, `beforeunload` |
| Raccourcis | Ctrl+S = Enregistrer (mobilier/expo) | Échap = retour form, réordonnancement clavier galerie |
| Fluidité drag | Placeholder de drop + transitions FLIP | Ghost custom, resize animé |
| A11y | Roving tabindex APG, Échap plein écran + restitution focus, neutralisation fullscreen, aria-controls conditionnel, annonces SR | — |

Note : Échap plein écran relève du volet a11y (dette RGAA), indépendamment du choix « raccourcis ».

## Décisions architecturales

### 1. Shell `<app-admin-preview-shell>` — clavier & ARIA

Toutes ces capacités s'implémentent dans le shell, les 3 pages en héritent sans modification (ou presque) :

- **Roving tabindex (pattern APG Tabs)** : `[attr.tabindex]` 0/-1 selon l'onglet actif ; `keydown` flèches ←/→ (cycliques) + Home/End sur la tablist déplacent le focus **et activent l'onglet** (activation automatique — adaptée à 2 onglets au contenu instantané). Clic/Enter/Espace inchangés.
- **Ctrl+S** : `document:keydown` (host listener) actif uniquement si `showSave()`. `preventDefault()` systématique quand `showSave()` (bloque la boîte « Enregistrer la page » du navigateur), puis `save.emit()` si `!saveDisabled() && !saving()`. Accueil (`showSave=false`) : non capturé (auto-save, rien à sauver).
- **Échap en plein écran** : si `previewFullscreen() && !formModalOpen()` → réduit l'aperçu et **rend le focus au bouton `.btn-preview-toggle`**. La garde `formModalOpen` laisse Échap aux modales crop/picker ouvertes au-dessus (leur handler `document:keydown.escape` existant ferme la modale).
- **`aria-controls` conditionnel** : le tab Aperçu ne porte `aria-controls="panel-preview"` que si `viewMode() === 'preview'` (le panel n'existe pas sinon). Le tab Modifier garde `aria-controls="panel-form"` statique (panel toujours rendu).
- **Neutralisation du plein écran** (dette `aria-modal` sans effet réel) :
  - le shell rend sa propre mode-bar `inert` quand `previewFullscreen()` ;
  - nouvel output `fullscreenChange: boolean` ; mobilier/expo/accueil posent `[attr.inert]` sur leur `<aside class="list">` (mobilier/expo — l'accueil n'a pas de liste, rien à faire) quand l'aperçu est en plein écran.

### 2. Annonces lecteur d'écran (`LiveAnnouncer` de `@angular/cdk/a11y`)

- **Shell** : à la bascule de `viewMode` → « Mode aperçu » / « Mode édition » ; au toggle plein écran → « Aperçu plein écran » / « Aperçu réduit ». Annonces `polite`.
- **`createGalleryPreviewHandlers`** : `onGalleryReorder` → « Image déplacée en position {n} sur {total} » ; `onGalleryItemResize` → « Image redimensionnée : {c} colonnes sur {r} lignes ». L'announcer est passé en option au composable (les composables restent sans `inject()` interne, signature explicite comme `formTickSignal`).
- **Déjà couvert, ne pas dupliquer** : sauvegardes et feed accueil — les toasts (`toasts.component.ts`) sont `aria-live="polite"` + `role="status"`.

### 3. Garde-fou dirty (mobilier/expo uniquement)

- Composable `confirmIfDirty(form: FormGroup, message: string): boolean` dans `preview-page-helpers.ts` : retourne `true` si le form n'est pas `dirty`, sinon `window.confirm(message)` (pattern confirm natif déjà utilisé pour les suppressions).
- **Branché dans des wrappers UI** appelés par le template uniquement : `(click)` des items de la liste et de « + Nouvelle pièce/exposition ». Les flux internes appellent les méthodes existantes **sans garde** : reload post-save (`saveFurniture` → `loadFurniture(saved)`), suppression de l'item édité (`removeFurniture` → `newFurniture()`), `?new=1`.
- **`markAsPristine()` après save réussi** (dans le `next` du subscribe, avant le reload) — sinon le reload post-save déclencherait le confirm. Effet collatéral souhaitable : l'état dirty redevient fiable après sauvegarde.
- Le signal galerie n'est pas couvert par `form.dirty` : les modifications de galerie depuis le preview (reorder/resize/remove) ne marquent pas le form dirty aujourd'hui. Pour que le garde-fou les couvre, `createGalleryPreviewHandlers` gagne une option `onMutate?: () => void`, invoquée par les handlers mutateurs (`remove`/`reorder`/`resize`) ; les pages passent `() => this.furnitureForm.markAsDirty()`. Côté form-side, le binding `(imagesChange)` des pages ajoute le même `markAsDirty()`.
- Accueil : non concerné (auto-save immédiat).

### 4. Drag : placeholder + transitions FLIP (`ReorderableDirective`)

La directive HTML5 partagée (galeries mobilier/expo, feed accueil preview, liste éditoriale accueil) gagne le feedback visuel qu'elle n'a pas :

- **Pendant le drag** : classe `reorder-dragging` sur l'élément source ; classe `reorder-drag-over` sur la cible survolée (`dragenter`/`dragleave`, avec compteur pour les enter/leave imbriqués). Nettoyage au `drop` et au `dragend`.
- **Styles globaux** dans `styles.css` (les zones de drag vivent dans des composants à view encapsulation différente — même logique que l'override `pointer-events` existant) : source en opacité ~0.4, cible avec liseré `var(--color-accent)` et léger décalage.
- **FLIP au drop** : la directive capture les `getBoundingClientRect()` des enfants draggables au moment du drop ; après le re-render déclenché par le parent (son `MutationObserver` existant le détecte), elle applique à chaque enfant déplacé un `transform` inverse puis le laisse transitionner vers zéro (~180 ms, `ease`). Implémentation hors NgZone (déjà le cas des listeners).
- **`prefers-reduced-motion: reduce`** : aucune transition FLIP (vérification `matchMedia`), les classes drag restent (feedback statique).
- L'API de la directive ne change pas (`(reordered)` émet le même ordre) — aucun changement dans les composants consommateurs.

## Tests

- **Shell** : roving tabindex (flèches/Home/End, activation auto), Ctrl+S (émission conditionnée à showSave/saveDisabled/saving + preventDefault), Échap (réduit + focus restitué + inactif si formModalOpen), aria-controls conditionnel, mode-bar inert en fullscreen, output `fullscreenChange`, annonces (spy `LiveAnnouncer`).
- **Composables** : `confirmIfDirty` (pristine → true sans confirm ; dirty → suit la réponse du confirm, spy `window.confirm`), annonces galerie (spy announcer).
- **Pages (mobilier/expo)** : wrappers gardés (sélection liste/nouveau avec form dirty → confirm ; refus → état inchangé), `markAsPristine` après save, marquage dirty par les opérations galerie.
- **Directive** : classes posées/nettoyées (dragstart/dragenter/drop/dragend simulés), ordre émis inchangé. Le rendu FLIP est visuel — validation manuelle.
- **Baselines Playwright intactes** : aucun changement d'état au repos (les classes/transitions n'existent que pendant l'interaction).

## Hors portée

- Undo/redo → sous-projet 3. Couverture éditoriale → sous-projets 4-6.
- Réordonnancement clavier de la galerie, Échap = retour form, badge dirty visuel, `canDeactivate`/`beforeunload`, ghost de drag custom, resize animé (choix utilisateur).
- Neutralisation de la nav admin globale en plein écran : résiduel assumé (`aria-modal` + trap focus couvrent les SR modernes ; un vrai `<dialog>` top-layer pourra le solder plus tard).
