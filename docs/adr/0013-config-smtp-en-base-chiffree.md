# ADR-0013 : Configuration SMTP en base, password chiffré au repos

- **Statut** : Accepted
- **Date** : 2026-05-23
- **Décideurs** : Maxime Guillaume
- **Tags** : backend, sécurité, configuration, smtp

## Contexte

La configuration SMTP (host, port, credentials, expéditeur, destinataire) du formulaire de contact était fournie exclusivement par variables d'environnement (`SPRING_MAIL_*`, `APP_CONTACT_MAIL_*`). Toute modification — changer de relai, faire tourner un mot de passe applicatif, corriger une adresse de destination — exigeait un redéploiement Railway.

Contraintes :

- Un seul opérateur administre l'instance ; le coût opérationnel d'un redéploiement pour une simple rotation de mot de passe SMTP est disproportionné.
- Le password SMTP ne doit pas finir en clair dans un dump SQL ou dans une sauvegarde de base partagée.
- La perte de configuration ne doit pas empêcher l'application de démarrer (le formulaire de contact n'est pas un service critique du portfolio).
- Cohérence avec ADR-0011 : l'authentification admin existe déjà, l'édition se fait depuis la console `/admin`.

## Décision

Migrer la configuration SMTP de variables d'environnement vers une table dédiée en base, éditable depuis la console admin, avec le password chiffré au repos.

### Stockage

- Table `mail_settings` single-row (id technique `'default'`) — migration Liquibase numérotée.
- Champs : `host`, `port`, `username`, `password_encrypted`, `from_address`, `to_address`, `tls_enabled`, timestamps.
- Le password est chiffré avec **AES-256-GCM** ; la clé provient de la variable d'environnement `APP_SECRETS_KEY` (base64, 32 octets).

### Édition

- Onglet « Email » dans la console `/admin` existante (route protégée par `authGuard`, voir ADR-0011).
- API admin : `GET /api/admin/mail-settings` (renvoie tout **sauf** le password en clair) et `PUT /api/admin/mail-settings` (le password n'est mis à jour que s'il est explicitement fourni — un champ vide laisse l'existant intact).

### Mode dégradé

- En l'absence de `APP_SECRETS_KEY` au démarrage : **pas de crash**, l'application démarre normalement, les envois sont **silencieusement désactivés** avec un `WARN` dans les logs.
- En l'absence de configuration en base : même comportement (mode dégradé, WARN, pas de 5xx côté API publique du formulaire de contact).

### Câblage Spring

- L'auto-configuration Spring Mail (properties `spring.mail.*`) **n'est plus utilisée**.
- `ContactRequestService` ne dépend plus d'un `JavaMailSender` injecté ; il appelle `MailSettingsService.buildSender()` qui construit un `JavaMailSenderImpl` à la volée à chaque envoi (pas de cache — la table change rarement, le surcoût est négligeable, et cela évite tout problème de cohérence après une modification depuis l'admin).

## Conséquences

### Positives

- L'admin peut faire tourner le compte SMTP ou changer de relai sans redéploiement Railway.
- Le password SMTP reste chiffré au repos : un dump SQL exposé ne compromet pas immédiatement les credentials.
- Une seule source de vérité pour la configuration mail (la base), au lieu d'un mix env + DB.
- Pas de couplage à `spring.mail.*` : le sender se reconstruit à partir de l'état courant de la table, sans redémarrage.

### Négatives / compromis

- La perte de `APP_SECRETS_KEY` rend les passwords stockés indéchiffrables → l'admin doit ressaisir le password depuis le formulaire. **Mitigation** : documenter la sauvegarde de la clé côté infra (Railway > variables, sauvegarde hors-bande).
- Pas de rotation automatique de la clé. Si rotation nécessaire, procédure manuelle : déchiffrer avec l'ancienne clé, rechiffrer avec la nouvelle, mettre à jour `APP_SECRETS_KEY` et redéployer. À documenter le jour où le besoin se présente.
- Reconstruction du `JavaMailSender` à chaque envoi : surcoût négligeable au volume du portfolio, mais à garder en tête si le formulaire de contact devenait massivement utilisé.

### Neutres

- Les anciennes variables `SPRING_MAIL_*` et `APP_CONTACT_MAIL_*` deviennent inertes (peuvent rester définies sans effet pendant la transition, puis être nettoyées).
- L'admin restant unique (voir ADR-0011), aucun audit log multi-utilisateurs n'est introduit sur cette table.

## Alternatives envisagées

### Option A — Garder les variables d'environnement comme fallback de la table

Charger la configuration depuis la table, et retomber sur `SPRING_MAIL_*` si la table est vide.

**Écartée** : double source de configuration coûteuse à tester (matrice de cas DB-vide vs DB-pleine × ENV-présent vs ENV-absent) et à documenter, pour une seule installation à migrer. Le mode dégradé silencieux + un seed initial via Liquibase couvre le besoin sans cette complexité.

### Option B — Stocker le password en clair en base

**Écartée** : un dump SQL exposé (sauvegarde mal protégée, accès console Postgres partagé) compromettrait immédiatement les credentials SMTP du compte applicatif. Le chiffrement au repos est un standard minimal pour ce type de secret.

### Option C — KMS externe / Vault (HashiCorp, AWS KMS, etc.)

**Écartée** : hors de portée pour la taille actuelle du projet — introduit un service supplémentaire à provisionner, monitorer, et facturer, pour un seul secret. AES-256-GCM avec clé en variable d'environnement est suffisant à cette échelle. Réévaluable si d'autres secrets applicatifs viennent s'accumuler.

### Option D — Edition par fichier de config (YAML) versionné

**Écartée** : implique un redéploiement à chaque changement (le problème qu'on cherche justement à supprimer), et un secret en clair dans un fichier commit serait pire que le statu quo.

## Références

- [`docs/superpowers/plans/2026-05-23-config-smtp-admin.md`](../superpowers/plans/2026-05-23-config-smtp-admin.md) — plan d'implémentation détaillé (Task 7 : bascule de `ContactRequestService`)
- ADR-0011 — authentification JWT admin (les routes `/api/admin/mail-settings` sont protégées par le même mécanisme)
- [NIST SP 800-38D — Galois/Counter Mode (GCM)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP — Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
