# Configuration SMTP éditable depuis la console d'administration

Date : 2026-05-17
Statut : Validé (en attente de plan d'implémentation)

## Contexte

Le formulaire public `/contact` (page Angular + endpoint `POST /api/contact`) persiste déjà chaque demande dans la table `contact_request`, et `ContactRequestService` tente de relayer un mail via `JavaMailSender` quand Spring l'auto-configure (properties `spring.mail.*` + `app.contact.mail-to` + `app.contact.mail-from`). Aujourd'hui, modifier la cible ou les identifiants SMTP exige un redéploiement.

Objectif : exposer cette configuration dans `/admin` pour qu'elle soit éditable sans redéploiement, tout en gardant le secret SMTP protégé.

## Périmètre

Inclus :
- Une table dédiée `mail_settings` (single-row).
- Chiffrement symétrique du mot de passe SMTP avec une clé d'environnement.
- Endpoints admin protégés par JWT : `GET`, `PUT`, `POST /test`.
- Page admin Angular avec formulaire et bouton « Envoyer un mail de test ».
- Migration : suppression des `@Value` SMTP dans `ContactRequestService`, suppression des sections correspondantes des `application*.yml` si présentes.
- ADR consignant la décision.

Exclus :
- Pas de gestion multi-destinataires ni de CC/BCC.
- Pas d'historique des envois (la table `contact_request` couvre déjà la traçabilité côté demandes).
- Pas de rotation automatique de clé de chiffrement.
- Pas de support DKIM/SPF côté backend (relève de la configuration DNS, hors de portée).

## Architecture retenue (Approche A)

- Une table `mail_settings`, single-row identifiée par `id = 'default'`.
- `MailSettingsService` lit la ligne, déchiffre le mot de passe et construit un `JavaMailSenderImpl` à la demande. Cache mémoire invalidé à chaque `save`.
- `ContactRequestService` n'utilise plus l'auto-config Spring Mail mais demande son sender à `MailSettingsService`. Les properties `spring.mail.*` et `app.contact.mail-*` deviennent inutiles et sont retirées.
- Comportement « pas de mail » conservé : si aucune ligne n'est encore enregistrée, ou si la clé de chiffrement n'est pas fournie, `buildSender()` renvoie `null`, le service journalise et persiste la demande sans tenter d'envoyer (statut `mail_sent = false`, comme aujourd'hui).

### Pourquoi pas B (fallback env vars) ?
Une seule install à migrer, un seul administrateur : maintenir deux sources de configuration coûte plus en complexité de test qu'il ne rapporte. La bascule se fait en une étape (renseigner le formulaire après déploiement).

## Modèle de données

Migration `016-create-mail-settings.yaml` :

| Colonne              | Type          | Contraintes             | Notes                                     |
|----------------------|---------------|-------------------------|-------------------------------------------|
| `id`                 | varchar(20)   | PK, NOT NULL            | Valeur fixe `'default'`                   |
| `host`               | varchar(200)  | nullable                | Vide ⇒ envoi désactivé                    |
| `port`               | int           | nullable                |                                           |
| `username`           | varchar(200)  | nullable                | Vide ⇒ envoi sans auth                    |
| `password_encrypted` | varchar(500)  | nullable                | AES-GCM, base64 IV puis base64 ciphertext+tag, séparés par `:` |
| `encryption`         | varchar(20)   | NOT NULL, default `NONE`| `NONE`, `STARTTLS`, `SSL`                 |
| `from_address`       | varchar(300)  | nullable                | Adresse expéditeur (en-tête `From`)       |
| `to_address`         | varchar(300)  | nullable                | Adresse destinataire des demandes contact |
| `updated_at`         | varchar(50)   | NOT NULL                | ISO instant, comme les autres entités     |

Une ligne `'default'` est insérée par la migration avec toutes les valeurs nullables à `null`, `encryption = NONE` et `updated_at` à un timestamp constant (`2026-05-17T00:00:00Z`) pour offrir un état initial cohérent.

## Chiffrement

Composant `SecretCipher` (`com.atelier.portfolio.security`) :
- Algo : AES-256-GCM, IV aléatoire 12 octets, tag 128 bits.
- Clé fournie via la variable d'environnement `APP_SECRETS_KEY` (base64 de 32 octets).
- Format stocké : `base64(iv) + ':' + base64(ciphertext+tag)`.
- API : `String encrypt(String clear)` et `String decrypt(String stored)`.
- Si `APP_SECRETS_KEY` est absente au démarrage : log WARN, le composant entre en mode dégradé qui jette `IllegalStateException` à tout appel ; `MailSettingsService.buildSender()` capture l'exception, journalise et retourne `null`.

Un utilitaire CLI minimal de génération de clé (`openssl rand -base64 32`) est documenté dans le README backend ; pas de tooling Java spécifique.

## Endpoints

Tous sous `/api/admin/mail-settings`, exigent le JWT existant (couvert par la règle `/api/admin/**` de `SecurityConfig`).

### `GET /api/admin/mail-settings`
Retourne un `MailSettingsView` :
```json
{
  "host": "smtp.example.com",
  "port": 587,
  "username": "no-reply@example.com",
  "hasPassword": true,
  "encryption": "STARTTLS",
  "fromAddress": "no-reply@example.com",
  "toAddress": "studio@example.com",
  "updatedAt": "2026-05-17T10:12:30Z"
}
```
Le mot de passe n'est jamais renvoyé en clair ; seul `hasPassword` indique s'il est défini.

### `PUT /api/admin/mail-settings`
Reçoit un `MailSettingsInput` :
```json
{
  "host": "smtp.example.com",
  "port": 587,
  "username": "no-reply@example.com",
  "password": "secret_or_null",
  "encryption": "STARTTLS",
  "fromAddress": "no-reply@example.com",
  "toAddress": "studio@example.com"
}
```
Règles :
- Si `password` est absent (`null`) ou égal à la chaîne vide, on **conserve** le password en base (pas d'écrasement).
- Si `password` est non vide, on chiffre et on écrase.
- `encryption` doit être l'une des trois valeurs autorisées (validation `@Pattern`).
- `port` doit être dans `[1, 65535]` si non null.
- `fromAddress` et `toAddress` validés par `@Email` quand non vides.
- Réponse : la même structure que `GET`.

### `POST /api/admin/mail-settings/test`
Envoie un mail de test depuis `fromAddress` vers `toAddress` en utilisant la conf actuellement enregistrée (pas le contenu du formulaire — l'admin doit avoir sauvegardé avant).

Sujet : « Test de configuration mail — Atelier ».
Corps : court texte indiquant la date/heure d'envoi.

Réponse :
- `200 { "success": true }` si le SMTP a accepté le message.
- `200 { "success": false, "error": "..." }` si une exception est levée ; le message d'erreur est tronqué à 500 caractères et ne contient pas le mot de passe.
- `409 { "success": false, "error": "Configuration incomplète" }` si `host`, `port`, `fromAddress` ou `toAddress` ne sont pas tous renseignés.

## Backend — composants et fichiers

| Fichier                                                                                     | Rôle                                              |
|---------------------------------------------------------------------------------------------|---------------------------------------------------|
| `db/changelog/changes/016-create-mail-settings.yaml`                                        | Migration                                         |
| `entity/MailSettingsEntity.java`                                                            | JPA entity                                        |
| `repository/MailSettingsRepository.java`                                                    | `JpaRepository<MailSettingsEntity, String>`       |
| `model/MailSettingsView.java`                                                               | DTO record (réponse GET/PUT)                      |
| `model/MailSettingsInput.java`                                                              | DTO record (corps PUT)                            |
| `model/MailTestResult.java`                                                                 | DTO record (`success`, `error`)                   |
| `security/SecretCipher.java`                                                                | AES-GCM                                           |
| `service/MailSettingsService.java`                                                          | `get()`, `save()`, `buildSender()`, `sendTest()`  |
| `controller/AdminMailSettingsController.java`                                               | Endpoints admin                                   |
| `service/ContactRequestService.java` *(modifié)*                                            | Bascule sur `MailSettingsService`                 |
| `test/.../MailSettingsServiceTest.java`                                                     | Tests unitaires (chiffrement, masquage, save)     |
| `test/.../AdminMailSettingsControllerTest.java`                                             | Tests MVC (auth, masquage password, validation)   |
| `test/.../ContactRequestServiceTest.java` *(modifié)*                                       | Adapter aux nouveaux collaborateurs               |

Le `JavaMailSenderImpl` construit à la volée applique :
- `host`, `port`, `username`, `password` (déchiffré).
- Propriétés `mail.smtp.auth = (username non vide)`, `mail.smtp.starttls.enable = (encryption == STARTTLS)`, `mail.smtp.ssl.enable = (encryption == SSL)`.

## Frontend — composants et fichiers

| Fichier                                                                                | Rôle                                                          |
|----------------------------------------------------------------------------------------|---------------------------------------------------------------|
| `frontend/src/app/pages/admin/mail-settings/mail-settings.component.ts`                | Standalone, signals, reactive forms                           |
| `frontend/src/app/pages/admin/mail-settings/mail-settings.component.spec.ts`           | Karma spec                                                    |
| `frontend/src/app/services/portfolio.service.ts` *(modifié)*                           | Méthodes `getMailSettings`, `saveMailSettings`, `testMail()`  |
| Menu admin (composant existant — fichier à confirmer lors du plan)                     | Nouvelle entrée « Email »                                     |
| `frontend/src/app/app.routes.ts`                                                       | Route `/admin/parametres/email` (lazy `loadComponent`)        |

Champs du formulaire :
- Hôte SMTP (text, requis pour activer).
- Port (number, 1–65535).
- Chiffrement (select : `Aucun`, `STARTTLS`, `SSL`).
- Identifiant (text).
- Mot de passe (input type password) — placeholder « ••••• défini » quand `hasPassword === true` et que le champ est vide ; si l'admin le laisse vide on n'envoie pas la clé `password` dans le PUT.
- Adresse expéditeur (email).
- Adresse destinataire (email).

Boutons :
- **Enregistrer** — POST PUT puis recharge l'état affiché.
- **Envoyer un mail de test** — désactivé tant que le formulaire est `dirty` (l'admin doit sauvegarder d'abord) ou tant qu'un des quatre champs requis (`host`, `port`, `fromAddress`, `toAddress`) est vide.

Retour utilisateur :
- Toast inline « Configuration enregistrée » / message d'erreur.
- Pour le test : bloc résultat affichant succès ou message d'erreur SMTP.

## Sécurité

- Endpoints couverts par le `JwtAuthenticationFilter` existant (préfixe `/api/admin/**`).
- Le `password` n'est jamais sérialisé vers le frontend (DTO `MailSettingsView` ne le contient pas).
- Logs : le service journalise host/port/encryption/from/to mais jamais le password ni le password chiffré.
- CSP/CORS inchangés.
- Mode dégradé si `APP_SECRETS_KEY` absente : pas de crash au démarrage, mais aucun envoi tenté et un WARN explicite dans les logs.

## Tests

Backend :
- `SecretCipherTest` : round-trip, IV différent à chaque chiffrement, refus d'une clé invalide.
- `MailSettingsServiceTest` : save crée la ligne si absente, save sans password garde l'ancien, save avec password chiffre, `buildSender()` retourne `null` quand conf incomplète, cache invalidé après save.
- `AdminMailSettingsControllerTest` : 401 sans JWT, GET masque le password, PUT valide les enums et l'email, POST /test renvoie 409 sur conf incomplète.
- `ContactRequestServiceTest` : ajusté pour mocker `MailSettingsService` au lieu de `JavaMailSender`.

Frontend :
- Spec composant : formulaire pré-rempli depuis `GET`, soumission appelle `PUT`, bouton test désactivé tant que `dirty`.
- Spec service : sérialisation correcte du payload (omission du `password` si vide).

## Migration de l'existant

1. Liquibase applique `016-create-mail-settings.yaml` (insère la ligne `'default'` vide).
2. Au premier déploiement, `APP_SECRETS_KEY` doit être ajoutée à l'environnement Railway/Rancher (procédure documentée dans le README backend).
3. L'admin renseigne la conf via `/admin/parametres/email`.
4. Les variables d'environnement `SPRING_MAIL_*`, `APP_CONTACT_MAIL_TO`, `APP_CONTACT_MAIL_FROM` peuvent être retirées des environnements après bascule (non bloquant — elles ne sont simplement plus lues).

## Documentation

- ADR `0013-config-smtp-en-base-chiffree.md` consignant la décision et l'alternative rejetée (B).
- Mise à jour du README backend : variable `APP_SECRETS_KEY` requise, suppression des mentions `SPRING_MAIL_*` / `APP_CONTACT_MAIL_*`.

## Risques

- **Perte de la clé `APP_SECRETS_KEY`** : impossible de déchiffrer le password SMTP existant. Mitigation : documenter explicitement que la clé doit être sauvegardée côté infra ; en cas de perte l'admin ressaisit le password.
- **Conf invalide enregistrée** : le bouton « Tester » et le statut `mail_sent` sur les demandes permettent de détecter rapidement.
