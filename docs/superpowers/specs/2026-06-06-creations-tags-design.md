# Page « Créations » : tags sur mobilier + filtres unifiés

Date : 2026-06-06
Statut : Validé (en attente de plan d'implémentation)

## Contexte

Aujourd'hui le site public expose `mobilier` et `expositions` dans deux pages indépendantes. Le visiteur qui cherche par matière, technique ou thème doit naviguer entre les deux. Les expositions ont déjà un champ `tags: string[]`, mais le mobilier non — et ces tags ne sont ni exposés en admin ni utilisés en filtre côté public.

Objectif : permettre à l'admin de **taguer chaque mobilier et exposition**, et offrir une nouvelle page publique **`/creations`** qui agrège les deux types et propose des **filtres unifiés par type / année / tags**.

## Décisions structurantes

| Axe | Décision |
|---|---|
| Coexistence avec /mobilier et /expositions | **3 pages** : Créations s'ajoute, les listes existantes restent |
| Modèle des tags | **Libres + autocomplete** sur tags déjà utilisés (partagés mobilier ∪ expo) |
| Multi-tags filter | **Union (OR)** — affiche les créations ayant AU MOINS UN des tags sélectionnés |
| Filtre année | **Multi-années** (boutons cliquables, union) avec compteurs |
| Filtre type | **Toggle 3-états** : Tout / Mobilier / Expositions (exclusif) |
| API | **Réutilise** `/api/furniture` + `/api/exhibitions` ; merge côté frontend |
| Gestion tags admin | **Pas d'onglet dédié** ; édition uniquement par fiche owner |

## Périmètre

**Inclus (v1) :**

- Migration Liquibase `026-add-tags-to-furniture.yaml` (colonne `tags` sur `furniture`, type/convertisseur cohérent avec `exhibition.tags`).
- `FurnitureEntity`, `Furniture` DTO record, `FurnitureInput` → ajout du champ `tags`.
- Nouveau composant partagé `<app-tag-input>` (chips + autocomplete + ControlValueAccessor) factorisant le code tag-input éventuellement existant sur `/admin/expositions`.
- Intégration `<app-tag-input>` dans les pages admin mobilier ET expositions.
- Nouveau endpoint public `GET /api/tags` (union dédupliquée des tags `furniture` + `exhibition`, triée).
- Nouvelle route Angular `/creations` + entrée nav header entre Expositions et Studio.
- Composant public `CreationsComponent` (grille + filtres).
- Affichage des tags en pied de card (max 3 + `+N`) sur la page Créations.
- Tags affichés en chips cliquables sur les pages détail mobilier et expo, deep-link vers `/creations?tags=<tag>`.
- Tests unitaires (backend + frontend) + tests visuels Playwright (nouveau spec `creations.spec.ts`).

**Exclus (v1) :**

- Pas d'onglet `/admin/tags` ni gestion centralisée — les tags vivent et meurent avec les créations qui les portent.
- Pas de renommage global de tag — l'admin renomme sur chaque création concernée s'il a fait un doublon orthographique.
- Pas de tag avec icône, couleur ou métadonnée — juste une chaîne.
- Pas de toggle de visibilité de la page Créations dans `site-content` — toujours visible.
- Pas de remplacement des pages `/mobilier` et `/expositions` — elles coexistent.
- Pas de tri configurable par l'utilisateur — toujours année desc puis titre asc.
- Pas de pagination — le portfolio reste de taille modeste.

## Architecture

### Modèle DB

| Table | Action | Détail |
|---|---|---|
| `furniture` | **ALTER** | Ajout colonne `tags` (même type et convertisseur que `exhibition.tags`) |
| `exhibition` | INCHANGÉE | `tags` déjà présent |

Changeset `026-add-tags-to-furniture.yaml` :
- Vérifier d'abord le type exact de `exhibition.tags` (probablement `varchar(1000)` ou `text` avec convertisseur Hibernate `StringListConverter`).
- Reproduire à l'identique sur `furniture` pour cohérence des converters côté JPA.
- Default `''` (chaîne vide) pour les rows existants.

### Entités JPA

`FurnitureEntity` :
- Ajouter `private List<String> tags = new ArrayList<>();` mappé via `@Convert(converter = StringListConverter.class)` (ou équivalent — copier le style d'`ExhibitionEntity.tags`).
- Getter/setter standard.

`Furniture` (record DTO public) :
- Ajout `List<String> tags` comme dernier champ pour minimiser le diff des constructeurs.
- Tous les sites qui construisent ce record (`toDto`, tests) doivent passer `entity.getTags()`.

`FurnitureInput` (record DTO admin POST/PUT) :
- Ajout `List<String> tags` (sans annotation `@NotNull` — la liste peut être vide).

### API

**Nouveau endpoint public** :

| Méthode | URL | Réponse | Authentification |
|---|---|---|---|
| `GET` | `/api/tags` | `string[]` (union dédupliquée triée) | Aucune (public) |

Implémentation : `TagController` qui appelle `TagService.findAllTags()` qui fait deux queries :
- `SELECT DISTINCT tag FROM furniture_tags …` (ou `SELECT tags FROM furniture` puis split + flatten Java)
- idem pour exhibition
- union, dedup, sort
- retour `List<String>`

Si le convertisseur stocke en CSV (varchar), la requête doit charger les rows et splitter en Java (pas de `DISTINCT` SQL direct possible). Coût acceptable pour le volume.

**Endpoints existants — pas de changement de signature, juste de payload** :

- `GET /api/furniture` retourne désormais aussi `tags` sur chaque entrée (déjà sérialisé via le record refactoré).
- `GET /api/furniture/{slug}` idem.
- `PUT /api/furniture/{slug}` accepte `tags` dans le body via `FurnitureInput` (rien à changer côté controller).
- `GET /api/exhibitions`, `GET /api/exhibitions/{slug}`, `PUT /api/exhibitions/{slug}` continuent inchangés (tags déjà présents).

### Frontend — composant partagé `<app-tag-input>`

`frontend/src/app/pages/admin/shared/tag-input.component.ts` :

```ts
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TagInputComponent),
    multi: true,
  }],
  template: `…`,
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() suggestions: string[] = [];
  @Input() placeholder = 'Ajouter un tag…';

  // signals : tags (valeur courante), inputValue, dropdownOpen
  // computed : filteredSuggestions = suggestions filtrées par inputValue et non déjà présentes dans tags
  // méthodes : addTag(value), removeTag(tag), onKey(event) — Enter, ',', Backspace
  // ControlValueAccessor : writeValue, registerOnChange, registerOnTouched, setDisabledState
}
```

Comportement détaillé :
- Affiche chaque tag courant en chip avec bouton suppression (×).
- Input texte avec autocomplete via `<datalist>` ou dropdown custom — pattern usuel.
- `Enter` ou `,` valide la valeur courante de l'input :
  - Si vide, ignore.
  - Si déjà présente dans la liste, ignore.
  - Sinon ajoute, vide l'input, ferme le dropdown.
- `Backspace` sur input vide : supprime le dernier chip.
- Sélection d'une suggestion via clic dans dropdown : équivalent à Enter avec cette valeur.
- A11y : `role="combobox"` sur input, `aria-expanded` sur dropdown, chips traversables au clavier (`Tab`), suppression chip avec `Delete`.

### Frontend — intégration admin

Sur `/admin/mobilier/:slug` et `/admin/expositions/:slug` :

1. Ajouter un signal `allTags = signal<string[]>([])` chargé via `portfolio.getAllTags()` dans `ngOnInit` / constructor.
2. Ajouter un champ tags dans le `FormGroup` :
   ```ts
   tags: [<string[]>[]],  // FormControl<string[]>
   ```
3. Dans le template, après les champs existants (avant le bloc Stories ou Gallery) :
   ```html
   <label>
     <span>Tags</span>
     <app-tag-input
       formControlName="tags"
       [suggestions]="allTags()"
       placeholder="Frêne, Sculpture, Atelier…" />
   </label>
   ```
4. Au save (`saveFurniture` / `saveExhibition`), le body inclut automatiquement `tags` via le FormGroup.
5. Au load (`loadFurniture` / `loadExhibition`), `tags` est patché dans le form via `setValue(..., { emitEvent: false })`.

**Factorisation** : si un champ tag existe déjà inline dans `/admin/expositions`, le remplacer par `<app-tag-input>`. Diff résultant = simplification.

### Frontend — page publique `/creations`

`frontend/src/app/pages/creations/creations.component.ts` (composant standalone).

**Modèle TS local** :

```ts
// frontend/src/app/models/creation.model.ts
export interface CreationItem {
  kind: 'furniture' | 'exhibition';
  slug: string;
  title: string;
  cover: string;
  subtitle: string;
  year: number;
  tags: string[];
  href: string;
}
```

**Composant** :

```ts
@Component({
  selector: 'app-creations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `…`,
})
export class CreationsComponent implements OnInit {
  private portfolio = inject(PortfolioService);
  private route = inject(ActivatedRoute);

  protected allItems = signal<CreationItem[]>([]);
  protected availableTags = signal<string[]>([]);
  protected availableYears = signal<number[]>([]);
  protected selectedTags = signal<Set<string>>(new Set());
  protected selectedYears = signal<Set<number>>(new Set());
  protected selectedKind = signal<'all' | 'furniture' | 'exhibition'>('all');

  protected filteredItems = computed(() => {
    const kind = this.selectedKind();
    const years = this.selectedYears();
    const tags = this.selectedTags();
    return this.allItems().filter(i =>
      (kind === 'all' || i.kind === kind) &&
      (years.size === 0 || years.has(i.year)) &&
      (tags.size === 0 || i.tags.some(t => tags.has(t)))
    );
  });

  // Compteurs dynamiques : pour chaque tag/année disponible, compter le nombre
  // de filteredItems "qui passeraient" si on l'ajoutait à la sélection.
  // (calculé par computed dédié, optimisé via map year→count et tag→count)

  ngOnInit() {
    forkJoin({
      furniture: this.portfolio.getAllFurniture(),
      exhibitions: this.portfolio.getAllExhibitions(),
    }).subscribe(({ furniture, exhibitions }) => { /* merge + setters */ });

    // Deep-link initial via query params
    this.route.queryParamMap.subscribe(params => {
      const tagsParam = params.get('tags');
      if (tagsParam) this.selectedTags.set(new Set(tagsParam.split(',')));
      // idem 'kind', 'years'
    });
  }

  toggleTag(tag: string): void { /* update signal */ }
  toggleYear(year: number): void { /* update signal */ }
  setKind(kind: 'all' | 'furniture' | 'exhibition'): void { /* update */ }
  clearFilters(): void { /* reset 3 signals */ }
}
```

**Layout (visuel)** :

```
Hero court : titre serif "Créations" + lead "L'ensemble des pièces et expositions de l'atelier."

Bloc filtres :
  [Tout] [Mobilier] [Expositions]      ← role="radiogroup", aria-checked
  Année : [2025 (8)] [2024 (5)] [2023 (3)]  …  ← buttons, aria-pressed
  Tags :  [Frêne (4)] [Bohème (2)] [Sculpture (7)] …
  [Réinitialiser]   ·   <span aria-live="polite">12 résultats</span>

Grille de cards (réutilise le style de .feed .grid de la home) :
  - aspect-ratio 4:5
  - 3 colonnes desktop / 2 colonnes ≤960px / 1 colonne ≤600px
  - badge "EXPOSITION" en haut-gauche si kind === 'exhibition'
  - card link → href de l'item (/mobilier/slug ou /expositions/slug)
  - en bas de meta : ligne chips tags (max 3 visibles, +N silencieux pour le reste)
  - chips cliquables → ajoute le tag à selectedTags (stopPropagation pour éviter d'aller à la page détail)

État vide :
  <p>Aucune création ne correspond aux filtres sélectionnés.</p>
  <button (click)="clearFilters()">Réinitialiser les filtres</button>
```

**Compteurs dynamiques** :

Chaque facette (tag, année) affiche `[Label (N)]` où `N` est le nombre d'items qui matcheraient les autres filtres + cette facette. Ex : si "Mobilier" est sélectionné, le compteur de "Frêne" reflète seulement les mobiliers en frêne, pas les expos.

Implémentation : pour chaque facette `f`, recalculer `filteredItems` en remplaçant cette facette par "seulement f sélectionné" et compter. Cache via `computed` (re-trigger automatique).

**Deep-linking** :

URL `/creations?tags=frêne,bois&kind=furniture&years=2024,2025` :
- Au load, parser les query params et peupler `selectedTags`, `selectedKind`, `selectedYears`.
- À chaque changement de filtre, mettre à jour les query params via `router.navigate([], { queryParams: …, replaceUrl: true })`.
- Permet le partage de filtres et le retour en arrière fonctionnel.

### Frontend — pages détail

Sur `/mobilier/:slug` et `/expositions/:slug`, après les autres méta-données (matériau / dates / etc.) et avant les sections suivantes :

```html
@if (item.tags && item.tags.length > 0) {
  <div class="tags">
    @for (tag of item.tags; track tag) {
      <a class="tag-chip" [routerLink]="['/creations']" [queryParams]="{ tags: tag }">
        {{ tag }}
      </a>
    }
  </div>
}
```

Le styling utilise `<a>` (pas `<button>`) car c'est une navigation. Apparence chip : background `--color-bg-alt`, padding réduit, hover discret.

### Nav header

Modifier `header.component.ts` template (entre Expositions et Studio) :

```html
@if (expositionsVisible()) {
  <a routerLink="/expositions" routerLinkActive="active" (click)="closeMenu()">Expositions</a>
}
<a routerLink="/creations" routerLinkActive="active" (click)="closeMenu()">Créations</a>
@if (studioVisible()) {
  <a routerLink="/studio" routerLinkActive="active" (click)="closeMenu()">Studio</a>
}
```

Pas de signal de visibilité — la page est toujours présente. Pas d'entrée dans `site-content` à modifier.

### Tests

**Backend** :

- `TagControllerTest` : `GET /api/tags` retourne la liste union dédupliquée triée.
- `TagServiceTest` (si extrait) : merge mobilier + expo, dedup case-sensitive.
- `FurnitureServiceTest` : refactor pour inclure tags dans les DTOs renvoyés.
- Test d'intégration migration 026 : tags column présente avec default vide.

**Frontend unit** :

- `TagInputComponent` (5+ tests) : ajout/suppression chip, Enter, comma, Backspace, autocomplete filter, dedup à l'ajout, ControlValueAccessor write+change+disabled.
- `CreationsComponent` (10+ tests) : merge mobilier+expo, tri année desc, toggleType, toggleYear, toggleTag, filtres combinés, clearFilters, deep-linking initial, deep-linking persisté en URL, compteurs dynamiques.
- Specs admin mobilier/expositions : test "saveFurniture envoie tags dans le payload", test "loadFurniture peuple le FormControl tags".

**Frontend Playwright** :

- Nouveau spec `frontend/e2e/tests/visual/creations.spec.ts` (style identique aux existants, pattern wait + freeze + screenshot).
- Fixtures `frontend/e2e/fixtures/furniture-list.json` et `exhibitions-list.json` → ajouter `tags` sur quelques items.
- Stub `**/api/tags` dans `helpers/stub-api.ts` (nouvelle entrée STUBS).
- Baseline desktop+mobile pour la page Créations avec filtres affichés et aucun sélectionné.

## Risques et points d'attention

- **Convertisseur tags** : si `ExhibitionEntity.tags` utilise `@ElementCollection` au lieu d'un `StringListConverter`, l'ajout sur `Furniture` doit refléter ce choix — important pour la cohérence des converters. À confirmer en lisant l'entité expo en début de plan.
- **Compteurs dynamiques** : la logique "compte si on ajoutait cette facette" est subtile. À tester explicitement avec plusieurs scénarios (1 tag sélectionné, 2 tags sélectionnés union, mix tag + année, etc.).
- **Deep-linking + interaction** : le double binding URL ↔ signals doit utiliser `replaceUrl: true` pour ne pas polluer l'historique du navigateur à chaque clic de filtre. Backspace navigateur attendu : revient au listing pré-filtres.
- **Autocomplete avec tags vides** : si `/api/tags` retourne `[]` (cas initial après migration), l'autocomplete ne propose rien — comportement correct, pas une régression.
- **Encodage des tags en URL** : un tag "frêne" en query param doit être `tags=fr%C3%AAne` — `RouterLink` s'en charge automatiquement, mais à valider dans un test Playwright pour les caractères accentués.
- **Tests visuels Playwright** : la home a déjà été régénérée à plusieurs reprises ; l'ajout d'une nouvelle page n'impacte pas les baselines existantes (sauf si le nav header est modifié visuellement — il l'est). Les 7 baselines existantes (home + 6 pages) devront être régénérées car l'entrée "Créations" apparaît dans le header partout.

## Évolutions possibles (hors v1)

- Onglet `/admin/tags` avec compteurs et bouton "renommer ce tag partout".
- Tags hiérarchiques (catégories de tags : Matières, Techniques, Thèmes).
- Tags avec icône / couleur configurable.
- Endpoint `/api/creations` dédié si la volumétrie justifie le payload allégé.
- Filtre intersection (AND) optionnel via toggle.
- Recherche plein-texte combinée aux filtres tags.
- Génération automatique de tags via NLP sur les descriptions.
