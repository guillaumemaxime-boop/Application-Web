# Bascule de SMTP vers Resend pour l'envoi de mails transactionnels

Date : 2026-05-24
Statut : Validé (en attente de plan d'implémentation)
Supersede : [ADR-0013](../../adr/0013-config-smtp-en-base-chiffree.md)

## Contexte

Le travail livré le 2026-05-23 (plan `2026-05-23-config-smtp-admin.md`, 13 tâches mergées sur main via `7c37755`) a introduit une configuration SMTP générique éditable depuis `/admin > onglet Email`, avec chiffrement AES-256-GCM du mot de passe (`SecretCipher`, `APP_SECRETS_KEY`) et endpoints admin protégés par JWT.

À l'usage, deux frictions :

1. Le déploiement Railway crash au boot avec `Failed to instantiate SecretCipher: Constructor threw exception` parce que `APP_SECRETS_KEY` est présente mais invalide côté Railway. La feature ne tourne pas en staging.
2. Un fournisseur transactionnel Resend est désormais provisionné sur Railway (intégration marketplace), qui expose `RESEND_API_KEY`. Resend remplace toute la couche SMTP par un POST HTTP, gère la déliverabilité (DKIM/SPF/DMARC) et n'a pas de password à chiffrer.

Objectif : remplacer l'envoi SMTP par l'API Resend, en gardant l'admin éditable sur les seuls champs qui restent pertinents (`from`/`to`), et démonter la complexité de chiffrement qui n'a plus de raison d'être.

## Périmètre

**Inclus :**
- Nouvelle classe `ResendMailService` qui encapsule le client `com.resend.Resend` et expose `boolean send(from, to, replyTo, subject, body)`.
- `ContactRequestService` bascule sur `ResendMailService` pour la livraison.
- `MailSettingsService` se réduit à `get()`, `save()`, `sendTest()` ; les méthodes `buildSender()` et `getConfigSnapshot()` disparaissent.
- DTOs `MailSettingsView` et `MailSettingsInput` réduits à `fromAddress`, `toAddress`, `updatedAt`, + un nouveau flag `apiKeyConfigured` côté View pour signaler à l'admin si la clé serveur est posée.
- Migration Liquibase `017-drop-smtp-columns-from-mail-settings.yaml` qui DROP les 5 colonnes `host`, `port`, `username`, `password_encrypted`, `encryption`.
- Suppression complète de `SecretCipher` + `SecretCipherTest` + property `app.secrets.key` + variable `APP_SECRETS_KEY` du `docker-compose.yml` racine.
- Suppression de la dépendance `spring-boot-starter-mail` dans `pom.xml`, remplacée par `com.resend:resend-java:4.0.0`.
- Page admin Angular `MailSettingsComponent` simplifiée à 2 champs (from/to) + indicateur lecture seule "clé API configurée" + bouton de test.
- ADR-0014 actant la décision, ADR-0013 marquée `Superseded`.
- Mise à jour `backend/README.md` et `deploy/README.md` pour refléter le nouveau secret (`RESEND_API_KEY`).

**Exclus :**
- Pas de gestion d'API key éditable depuis l'admin (volontairement : env var only — option A retenue lors du brainstorming, voir « Alternatives rejetées »).
- Pas de fallback SMTP si Resend est down. Si Resend est inaccessible, la demande de contact est persistée avec `mail_sent = false` (comportement actuel préservé) et l'admin la voit via les rows de `contact_request`.
- Pas de gestion de templates Resend ou de pièces jointes ; on continue à envoyer du `text/plain` simple.
- Pas de rotation/expiration de la clé.
- Pas de support multi-domaines (un seul `from` à la fois — domaine vérifié dans Resend).
- Pas de remise en cause des migrations existantes (015, 016) : on construit par-dessus, on n'altère pas l'historique.

## Architecture retenue (option A)

```
┌─────────────────────────────────────────────────────────────────┐
│  Railway service backend                                        │
│                                                                 │
│  Env vars Railway → Spring @Value :                             │
│    RESEND_API_KEY  →  app.resend.api-key                        │
│                                                                 │
│  DB table mail_settings (4 colonnes) :                          │
│    id | from_address | to_address | updated_at                  │
│                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │ AdminController │ ── │ MailSettingsSvc  │  ← get/save        │
│  └─────────────────┘    │  (from/to only)  │     from+to        │
│                         └──────────────────┘                    │
│  ┌──────────────────┐   ┌──────────────────┐                    │
│  │ContactRequestSvc │── │ ResendMailService│ ──► api.resend.com │
│  └──────────────────┘   │  (uses SDK)      │                    │
│                         └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

`ResendMailService` est l'unique point d'intégration avec Resend. Il est instancié au démarrage à partir de `RESEND_API_KEY` ; en mode dégradé (clé absente), il logue un WARN au boot, `isConfigured()` renvoie `false`, et `send(...)` renvoie immédiatement `false` sans tenter d'appel HTTP.

### Pourquoi pas l'option B (clé en base, chiffrée) ?
Maintenir `SecretCipher` + `APP_SECRETS_KEY` n'avait de sens que pour chiffrer un password SMTP. Avec Resend, le seul secret est l'API key, dont la rotation est rare et passe naturellement par l'env var Railway (comme `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, identifiants Postgres). Stocker la clé en base (même chiffrée) introduit un secret supplémentaire (`APP_SECRETS_KEY`) à gérer pour le seul gain d'une édition admin qui n'arrive jamais. YAGNI.

## Composant `ResendMailService`

```java
package com.atelier.portfolio.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;

@Service
public class ResendMailService {

    private static final Logger log = LoggerFactory.getLogger(ResendMailService.class);
    private final Resend client;
    private final boolean degraded;

    public ResendMailService(@Value("${app.resend.api-key:}") String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("RESEND_API_KEY not set — Resend in degraded mode, no email will be sent");
            this.client = null;
            this.degraded = true;
            return;
        }
        this.client = new Resend(apiKey);
        this.degraded = false;
    }

    public boolean isConfigured() {
        return !degraded;
    }

    /** Renvoie true si Resend a accepté le message, false sinon. Ne jette jamais. */
    public boolean send(String from, String to, String replyTo, String subject, String body) {
        if (degraded) return false;
        try {
            CreateEmailOptions opts = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .replyTo(replyTo)
                    .subject(subject)
                    .text(body)
                    .build();
            client.emails().send(opts);
            return true;
        } catch (ResendException ex) {
            log.warn("Resend send failed: {}", ex.getMessage());
            return false;
        }
    }
}
```

Note : le constructeur de `com.resend.Resend(apiKey)` ne valide pas la clé localement, c'est un wrapper HTTP. Une clé malformée se manifestera au premier `send()` via `ResendException`. Aucun chemin ne fait planter le démarrage de Spring.

## Modèle de données

### Migration Liquibase `017-drop-smtp-columns-from-mail-settings.yaml`

```yaml
databaseChangeLog:
  - changeSet:
      id: 017-drop-smtp-columns-from-mail-settings
      author: atelier-lumen
      changes:
        - dropColumn:
            tableName: mail_settings
            columns:
              - column: { name: host }
              - column: { name: port }
              - column: { name: username }
              - column: { name: password_encrypted }
              - column: { name: encryption }
```

La ligne `id='default'` est préservée, ses valeurs `from_address` / `to_address` / `updated_at` aussi.

### Table `mail_settings` après migration 017

| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| `id` | varchar(20) | PK, NOT NULL | Valeur fixe `'default'` |
| `from_address` | varchar(300) | nullable | Doit être sur un domaine vérifié dans Resend |
| `to_address` | varchar(300) | nullable | Adresse destinataire des demandes du formulaire `/contact` |
| `updated_at` | varchar(50) | NOT NULL | ISO instant |

### DTOs

```java
public record MailSettingsView(
        String fromAddress,
        String toAddress,
        boolean apiKeyConfigured,   // calculé serveur, lu via ResendMailService.isConfigured()
        String updatedAt
) {}

public record MailSettingsInput(
        @Email @Size(max = 300) String fromAddress,
        @Email @Size(max = 300) String toAddress
) {}
```

`MailTestResult` est inchangé (`success: boolean`, `error: String`).

## Endpoints

Tous sous `/api/admin/mail-settings`, protégés par JWT via la règle `/api/admin/**` de `SecurityConfig` (ajoutée le 2026-05-23 dans le commit `7a3161d`).

### `GET /api/admin/mail-settings`
Renvoie un `MailSettingsView`. `apiKeyConfigured` est calculé via `resendMailService.isConfigured()`.

### `PUT /api/admin/mail-settings`
Reçoit un `MailSettingsInput` (validation Bean `@Email`, `@Size`). Renvoie le View mis à jour.

### `POST /api/admin/mail-settings/test`
Envoie un mail de test depuis `fromAddress` vers `toAddress` (valeurs persistées en base, pas du formulaire — l'admin doit avoir sauvegardé avant). Sujet "Test de configuration mail — Atelier", corps avec date/heure.

Réponses :
- `200 { "success": true, "error": null }` si Resend a accepté.
- `200 { "success": false, "error": "..." }` si Resend a refusé (message tronqué à 500 caractères).
- `409 { "success": false, "error": "Configuration incomplète" }` si `fromAddress`, `toAddress` ou la clé API ne sont pas tous renseignés.

## Page admin Angular

`MailSettingsComponent` passe de ~230 lignes à ~80 lignes.

```
┌─────────────────────────────────────────────────────────┐
│  Configuration email                                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ✓  Clé API Resend configurée                   │    │
│  │     (ou : ⚠ RESEND_API_KEY non definie côté     │    │
│  │     serveur — envois desactives)                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Adresse expéditeur                                     │
│  [noreply@atelier-domain.com               ]            │
│  Doit être sur un domaine vérifié dans Resend.          │
│                                                         │
│  Adresse destinataire                                   │
│  [studio@atelier-domain.com                ]            │
│  Où arrivent les demandes du formulaire /contact.       │
│                                                         │
│  [Enregistrer]  [Envoyer un mail de test]               │
│                                                         │
│  Dernière mise à jour : 2026-05-24T13:42:00Z            │
└─────────────────────────────────────────────────────────┘
```

Règles préservées :
- Bouton « Tester » désactivé tant que le formulaire est `dirty` OU si un des deux champs est vide OU si `apiKeyConfigured === false`.
- Toast inline « Configuration enregistrée » à la sauvegarde.
- Bloc résultat du test (succès / erreur).
- Validation `@Email` côté front et serveur.
- Le pattern signal `formTick` introduit dans la version SMTP pour rendre `testDisabled()` réactif au form est conservé.

## Backend — fichiers

| Fichier | Action |
|---|---|
| `pom.xml` | retirer `spring-boot-starter-mail`, ajouter `com.resend:resend-java:4.0.0` |
| `application.properties` | retirer `app.secrets.key`, ajouter `app.resend.api-key=${RESEND_API_KEY:}` |
| `db/changelog/changes/017-drop-smtp-columns-from-mail-settings.yaml` | NOUVEAU |
| `db/changelog/db.changelog-master.yaml` | inclure `017-...` |
| `entity/MailSettingsEntity.java` | retirer 5 champs + getters/setters |
| `model/MailSettingsView.java` | nouveau shape (fromAddress, toAddress, apiKeyConfigured, updatedAt) |
| `model/MailSettingsInput.java` | nouveau shape (fromAddress, toAddress uniquement) |
| `model/MailTestResult.java` | inchangé |
| `security/SecretCipher.java` | SUPPRIMÉ |
| `service/MailSettingsService.java` | shrink majeur : retirer `buildSender()` et `getConfigSnapshot()`, simplifier `save()`, refondre `sendTest()` |
| `service/ResendMailService.java` | NOUVEAU |
| `service/ContactRequestService.java` | dépend de `ResendMailService` au lieu de `MailSettingsService` pour l'envoi |
| `controller/AdminMailSettingsController.java` | inchangé en surface (3 endpoints) ; les DTOs derrière ont changé |
| `test/security/SecretCipherTest.java` | SUPPRIMÉ |
| `test/service/MailSettingsServiceTest.java` | rewrite, plus simple |
| `test/service/ResendMailServiceTest.java` | NOUVEAU |
| `test/controller/AdminMailSettingsControllerTest.java` | adapter aux nouveaux DTOs |
| `test/service/ContactRequestServiceTest.java` | rewrite, mock ResendMailService |
| `backend/README.md` | retirer `APP_SECRETS_KEY`, ajouter `RESEND_API_KEY` |

## Frontend — fichiers

| Fichier | Action |
|---|---|
| `models/mail-settings.model.ts` | nouveaux types (fromAddress/toAddress/apiKeyConfigured/updatedAt + Input simplifié) |
| `services/portfolio.service.ts` | inchangé en surface (3 méthodes, mêmes URLs, mêmes verbes) |
| `pages/admin/mail-settings/mail-settings.component.ts` | shrink à ~80 lignes |
| `pages/admin/mail-settings/mail-settings.component.spec.ts` | rewrite |
| `pages/admin/admin.component.ts` | inchangé (l'onglet et l'intégration restent) |

## Infrastructure

| Fichier | Action |
|---|---|
| `docker-compose.yml` (racine) | retirer `APP_SECRETS_KEY`, ajouter `RESEND_API_KEY: ${RESEND_API_KEY:-}` (sans default, mode dégradé en local par défaut sauf si l'utilisateur l'exporte) |
| `deploy/base/docker-compose.yml` | ajouter `RESEND_API_KEY: ${RESEND_API_KEY}` au bloc env du service backend |
| `deploy/envs/local/.env` | retirer `APP_SECRETS_KEY` si présente, ajouter `RESEND_API_KEY=` (vide par défaut côté local) |
| Railway staging | UI : supprimer `APP_SECRETS_KEY`, vérifier que `RESEND_API_KEY` est bien injectée par l'intégration Resend (sinon la définir manuellement) |
| Railway production | idem |

## Tests

| Test | Couverture |
|---|---|
| `ResendMailServiceTest` (nouveau) | constructeur dégradé sans clé (`isConfigured() == false`), `send()` retourne `false` en mode dégradé, `send()` succès avec client Resend mocké, `send()` capture `ResendException` et retourne `false` |
| `MailSettingsServiceTest` (rewrite) | `get()` renvoie view avec apiKeyConfigured calculé via ResendMailService, `save()` ne touche plus que from/to/updatedAt, `sendTest()` retourne failure("incomplete") si from/to/apiKey manquent, `sendTest()` délègue à `resendMailService.send(...)` |
| `AdminMailSettingsControllerTest` (rewrite) | délégation GET/PUT/POST inchangée en logique, DTOs ajustés, mapping `incomplete → 409` toujours présent |
| `ContactRequestServiceTest` (rewrite) | dépend de `ResendMailService` (mocké) au lieu de `MailSettingsService.buildSender()`, vérifie que `send(...)` est appelé avec les bons paramètres, `mail_sent` cohérent avec le retour de `send` |
| `mail-settings.component.spec.ts` (rewrite) | form prefilled avec from/to + apiKeyConfigured affiché, save n'envoie que from/to, testDisabled prend en compte apiKeyConfigured |
| `SecretCipherTest` | SUPPRIMÉ |

Pas de test d'intégration contre la vraie API Resend (coût + flakiness). Le client `com.resend.Resend` est injecté via constructor donc mockable.

## Documentation

- **Nouveau ADR-0014** `0014-bascule-vers-resend.md` : Status `Accepted`, supersede 0013.
- **Mise à jour ADR-0013** : ajout d'un en-tête `Superseded by ADR-0014` et lien.
- **Index ADR README** : nouvelle ligne pour 0014, marquage 0013 comme superseded.
- **`backend/README.md`** : tableau des env vars revu (`APP_SECRETS_KEY` retirée, `RESEND_API_KEY` ajoutée), section "Configuration SMTP" remplacée par "Configuration email (Resend)".
- **`deploy/README.md`** : section "Required secrets" complétée avec `RESEND_API_KEY` (oui pour les deux environnements).

## Migration des données existantes

1. Liquibase applique `017-drop-smtp-columns-from-mail-settings.yaml` au prochain boot — DROP des 5 colonnes (H2 et Postgres supportent `dropColumn`).
2. La ligne `id='default'` reste intacte. Les valeurs `from_address` / `to_address` éventuelles sont préservées.
3. L'admin va sur `/admin > Email`, vérifie/met à jour les deux adresses, sauvegarde. Si l'indicateur "clé API configurée" est rouge, c'est que `RESEND_API_KEY` manque côté serveur.
4. Côté Railway, vérifier que l'intégration Resend a bien injecté `RESEND_API_KEY` ; sinon la poser manuellement à la valeur du dashboard Resend.

Le commit `e64ffa7 chore(infra): plumber APP_SECRETS_KEY dans docker-compose local` n'est pas reverté mais devient sans effet ; la nouvelle migration et l'édition du compose retirent la variable.

## Alternatives rejetées

- **B. Garder l'API key éditable depuis l'admin (en base, chiffrée).** Rejeté lors du brainstorming : aucun bénéfice opérationnel (rotation rare), introduit un second secret à gérer (`APP_SECRETS_KEY`) et ramène toute la complexité de chiffrement qu'on cherche à retirer.
- **C. Garder SMTP + Resend en parallèle (deux providers).** Rejeté : YAGNI, surface de bug doublée, et le besoin n'a jamais été exprimé.
- **D. Autre provider (Mailgun, SendGrid, Postmark, AWS SES).** Out of scope : Resend est déjà provisionné côté Railway, déliverabilité native et SDK Java officiel. Le coût de switch est nul pour notre volume.
- **E. Plain HTTP client (RestClient/HttpClient) au lieu du SDK.** Le SDK officiel encapsule retries + parsing d'erreur + types ; le gain de complexité est mineur, le coût en dépendance aussi (artifact unique). Préférer le SDK.

## Risques

- **Domaine Resend non vérifié** : si l'admin essaie d'envoyer depuis un `from_address` dont le domaine n'est pas vérifié dans le dashboard Resend, l'envoi échoue avec un message clair de Resend qui remonte dans `MailTestResult.error`. À documenter dans l'aide contextuelle du formulaire (déjà inclus dans le mockup).
- **`RESEND_API_KEY` rotée sans redémarrage** : Spring lit la valeur au boot. Si tu changes la clé sur Railway, le redéploiement automatique du service prend le relais (~1 min). Pas de cache à invalider.
- **Resend API down** : `send(...)` retourne `false`, la demande de contact est persistée avec `mail_sent = false`. L'admin la voit toujours via la table `contact_request`. Pas de retry automatique pour l'instant (out of scope, à voir si le besoin se présente).
- **Migration 017 sur prod avec données** : peu probable (la ligne `default` a très probablement `host` à `null` partout), mais même si ce n'est pas le cas, `dropColumn` est destructif et définitif. Le rollback consiste à restaurer un snapshot Postgres. Documenter dans la PR de prod.

## Acceptance criteria

1. Backend démarre sans crash sur Railway, même si `RESEND_API_KEY` est absente ou malformée (mode dégradé, WARN au log).
2. `GET /api/admin/mail-settings` (avec JWT) renvoie `{ fromAddress, toAddress, apiKeyConfigured, updatedAt }` — pas de `host`, `port`, `username`, `hasPassword`, `encryption`.
3. `PUT /api/admin/mail-settings` (avec JWT) accepte `{ fromAddress, toAddress }` et persiste — refuse les emails malformés (400).
4. `POST /api/admin/mail-settings/test` envoie un mail via Resend si tout est configuré, renvoie 409 si une pièce manque, 200 avec body d'erreur si Resend refuse.
5. Une demande postée sur `/contact` persiste dans `contact_request` et déclenche un envoi Resend ; `mail_sent` reflète le succès ou l'échec.
6. La page admin `/admin > Email` charge le formulaire pré-rempli, affiche l'état `apiKeyConfigured`, sauvegarde, teste — tout fonctionne sans `host`/`port`/`password` à l'écran.
7. `APP_SECRETS_KEY` n'est plus référencée dans le code, l'application.properties, le compose, ou la doc.
8. Tous les tests passent (backend + frontend), `SecretCipherTest` supprimé, `ResendMailServiceTest` ajouté.
