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
| `RESEND_API_KEY` | recommandé | Clé API du compte Resend (commence par `re_`). Sans cette clé : le backend démarre quand même, mais les envois de mail sont désactivés (WARN au démarrage). Voir [ADR-0014](../docs/adr/0014-bascule-vers-resend.md). |
| `APP_CORS_ALLOWED_ORIGINS` | non | Liste d'origines CORS séparées par des virgules, supporte les motifs `*`. Défaut : voir [`SecurityConfig.java`](src/main/java/com/atelier/portfolio/config/SecurityConfig.java). |
| `UPLOAD_DIR` | recommandé | Chemin du dossier où sont écrits les uploads de la médiathèque admin. Défaut : `./uploads` (éphémère). En conteneur Railway, monter un volume persistant à `/data/uploads` et fixer `UPLOAD_DIR=/data/uploads`. Voir [deploy/README.md](../deploy/README.md). |

### Postgres

Le backend accepte deux formats :

- **Variables discrètes** : `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- **URL Heroku/Railway** : `DATABASE_URL=postgres://user:pass@host:port/db`. Le script [`entrypoint.sh`](entrypoint.sh) et le [`DatabaseUrlEnvironmentPostProcessor`](src/main/java/com/atelier/portfolio/config/DatabaseUrlEnvironmentPostProcessor.java) la traduisent en propriétés Spring `SPRING_DATASOURCE_*`.

## Configuration email (Resend)

La configuration mail est désormais minimale : seule la clé API Resend est requise (`RESEND_API_KEY`). Les adresses expéditeur/destinataire se règlent depuis `/admin > onglet Email`. Voir [ADR-0014](../docs/adr/0014-bascule-vers-resend.md).
