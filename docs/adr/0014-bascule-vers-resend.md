# ADR-0014 : Bascule vers Resend pour l'envoi de mails transactionnels

- **Statut** : Accepted
- **Date** : 2026-05-24
- **Décideurs** : Maxime Guillaume
- **Tags** : mail, infra, simplification
- **Supersede** : [ADR-0013](0013-config-smtp-en-base-chiffree.md)

## Contexte

Le travail livré le 2026-05-23 (ADR-0013) intégrait une configuration SMTP générique éditable depuis l'admin, avec chiffrement AES-256-GCM du mot de passe (`SecretCipher`, `APP_SECRETS_KEY`).

Friction observée :
- Crash au démarrage Railway parce que `APP_SECRETS_KEY` est présent mais mal formé côté Railway (la feature ne tourne pas en staging).
- La complexité de chiffrement (cipher + clé + 5 colonnes mail_settings) n'a de valeur que pour protéger un password SMTP qu'on ne peut pas mettre en clair en base. Avec une intégration HTTP qui ne demande qu'une clé API, ce coût n'est plus justifié.

Resend est désormais provisionné sur Railway via l'intégration marketplace et expose `RESEND_API_KEY` comme env var de service.

## Décision

- Remplacer entièrement la couche SMTP par l'API HTTP Resend via le SDK Java officiel `com.resend:resend-java`.
- La clé API vit uniquement en env var (`RESEND_API_KEY`), lue par Spring `@Value("${app.resend.api-key:}")`. Pas de stockage en base.
- L'admin UI continue d'éditer `from` et `to` (en base, dans une `mail_settings` réduite à 4 colonnes). Ces deux adresses changent indépendamment de la clé.
- Comportement dégradé conservé : sans `RESEND_API_KEY`, le backend démarre quand même, WARN au log, demandes de contact persistées avec `mail_sent = false`.

## Conséquences

### Positives

- Une seule env var au lieu de 7 + clé de chiffrement.
- Déliverabilité gérée par Resend (DKIM/SPF/DMARC, suivi, IP réputation) — pas notre problème.
- Pas de password SMTP en base → pas de SecretCipher, pas d'APP_SECRETS_KEY, pas de risque de fuite via dump SQL.
- Le crash actuel sur Railway s'évapore (rien à instancier qui puisse jeter).

### Négatives / compromis

- Lock-in sur Resend. Si on change de provider, refactor du `ResendMailService`. Surface limitée (un seul wrapper).
- Pas de rotation de clé sans redéploiement (lecture au boot uniquement). Acceptable pour notre rythme.
- Pas de fallback transport. Si Resend est down, les demandes s'accumulent dans `contact_request` avec `mail_sent = false` ; l'admin doit consulter la table en attendant.

### Neutres

- Le SDK Resend est un appel HTTP bloquant. Cohérent avec le reste du code synchrone Spring MVC ; aucun changement de modèle de threading.

## Alternatives envisagées

### Option A — Garder SMTP et fixer le bug Railway

Rejeté : la cause racine du crash est `APP_SECRETS_KEY` ; corriger la valeur sur Railway fixait l'immédiat, mais on garde toute la complexité (chiffrement, 7 champs admin, 5 colonnes DB) pour zéro gain opérationnel.

### Option B — Clé API éditable depuis l'admin (en base, chiffrée)

Rejeté : aucune valeur ajoutée (rotation de clé Resend est rare), réintroduit `SecretCipher` qu'on cherche justement à retirer.

### Option C — Plain HTTP client (RestClient/HttpClient) au lieu du SDK Resend

Rejeté : le SDK officiel gère retries, parsing d'erreurs, types des modèles. Le gain en autonomie est marginal, le coût en dépendance aussi (un artifact). Préférer le SDK.

### Option D — Autre provider (Mailgun, SendGrid, Postmark, AWS SES)

Hors scope : Resend est déjà provisionné via l'intégration Railway, SDK Java officiel, gratuit jusqu'à un certain volume.

## Références

- Spec : [docs/superpowers/specs/2026-05-24-bascule-resend-design.md](../superpowers/specs/2026-05-24-bascule-resend-design.md)
- Plan : [docs/superpowers/plans/2026-05-24-bascule-resend.md](../superpowers/plans/2026-05-24-bascule-resend.md)
- ADR-0013 (superseded) : [0013-config-smtp-en-base-chiffree.md](0013-config-smtp-en-base-chiffree.md)
- Resend Java SDK : https://github.com/resend/resend-java
