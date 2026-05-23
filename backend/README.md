# Backend — Atelier Lumen

API REST Spring Boot 4 (Java 25) pour le portfolio. Les commandes de build et de lancement sont documentées dans le [README racine](../README.md) et [CLAUDE.md](../CLAUDE.md).

Ce README documente uniquement les **variables d'environnement** attendues par le backend en exécution.

## Variables d'environnement

| Variable | Obligatoire ? | Description |
|---|---|---|
| `JWT_SECRET` | oui (prod) | Secret HMAC-SHA pour signer les JWT admin. Min 32 caractères aléatoires (HS256 exige ≥ 256 bits). |
| `JWT_EXPIRATION_MS` | non | Durée de vie du token en millisecondes. Défaut : `86400000` (24 h). |
| `ADMIN_USERNAME` | oui | Identifiant de l'unique compte admin. |
| `ADMIN_PASSWORD_HASH` | oui | Hash BCrypt du mot de passe admin. Générer avec : `python3 -c "import bcrypt; print(bcrypt.hashpw(b'monmotdepasse', bcrypt.gensalt(10)).decode())"`. |
| `APP_SECRETS_KEY` | recommandé | Clé AES-256 en base64 (32 octets) utilisée pour chiffrer le mot de passe SMTP stocké en base. Sans cette clé : pas de crash, mais les envois mail sont désactivés (WARN au démarrage). Voir [ADR-0013](../docs/adr/0013-config-smtp-en-base-chiffree.md). Générer avec : `openssl rand -base64 32`. |
| `APP_CORS_ALLOWED_ORIGINS` | non | Liste d'origines CORS séparées par des virgules, supporte les motifs `*`. Défaut : voir [`SecurityConfig.java`](src/main/java/com/atelier/portfolio/config/SecurityConfig.java). |
| `UPLOAD_DIR` | recommandé | Chemin du dossier où sont écrits les uploads de la médiathèque admin. Défaut : `./uploads` (éphémère). En conteneur Railway, monter un volume persistant à `/data/uploads` et fixer `UPLOAD_DIR=/data/uploads`. Voir [deploy/README.md](../deploy/README.md). |

### Postgres

Le backend accepte deux formats :

- **Variables discrètes** : `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- **URL Heroku/Railway** : `DATABASE_URL=postgres://user:pass@host:port/db`. Le script [`entrypoint.sh`](entrypoint.sh) et le [`DatabaseUrlEnvironmentPostProcessor`](src/main/java/com/atelier/portfolio/config/DatabaseUrlEnvironmentPostProcessor.java) la traduisent en propriétés Spring `SPRING_DATASOURCE_*`.

## Configuration SMTP

La configuration SMTP (hôte, port, identifiant, mot de passe, chiffrement, expéditeur, destinataire) **ne se fait plus via variables d'environnement**. Elle se configure depuis `/admin > onglet Email`. La table `mail_settings` stocke la configuration, le mot de passe est chiffré AES-256-GCM avec `APP_SECRETS_KEY`. Voir [ADR-0013](../docs/adr/0013-config-smtp-en-base-chiffree.md).
