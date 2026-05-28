#!/bin/sh
# If DATABASE_URL is provided in Heroku/Railway form
#   postgres(ql)://user:password@host:port/database[?params]
# translate it into the JDBC properties Spring Boot expects, BEFORE the JVM
# starts. This avoids any ordering issue with EnvironmentPostProcessors and
# works whether DATABASE_URL is the only thing the platform exposes or
# alongside the discrete PGHOST/PGPORT/... variables.
set -eu

if [ -n "${DATABASE_URL:-}" ] && echo "$DATABASE_URL" | grep -qiE '^postgres(ql)?://'; then
  rest=$(echo "$DATABASE_URL" | sed -E 's|^postgres(ql)?://||')

  case "$rest" in
    *@*)
      userinfo=${rest%%@*}
      hostpart=${rest#*@}
      DB_USER=${userinfo%%:*}
      case "$userinfo" in
        *:*) DB_PASSWORD=${userinfo#*:} ;;
        *)   DB_PASSWORD="" ;;
      esac
      ;;
    *)
      hostpart=$rest
      DB_USER=""
      DB_PASSWORD=""
      ;;
  esac

  hostport_db=${hostpart%%\?*}
  host_port=${hostport_db%%/*}
  db=${hostport_db#*/}

  JDBC_URL="jdbc:postgresql://${host_port}/${db}"

  export SPRING_DATASOURCE_URL="$JDBC_URL"
  export SPRING_LIQUIBASE_URL="$JDBC_URL"
  if [ -n "$DB_USER" ]; then
    export SPRING_DATASOURCE_USERNAME="$DB_USER"
    export SPRING_LIQUIBASE_USER="$DB_USER"
  fi
  if [ -n "$DB_PASSWORD" ]; then
    export SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD"
    export SPRING_LIQUIBASE_PASSWORD="$DB_PASSWORD"
  fi

  echo "[entrypoint] Translated DATABASE_URL -> ${JDBC_URL} (user=${DB_USER})"
fi

# Repertoire d'upload : sur Railway/K8s le volume monte est root-owned et masque
# le dossier chown'e dans l'image, rendant l'ecriture impossible pour `app`.
# Si on tourne en root, on (re)cree et chown le point de montage, puis on
# redescend vers l'utilisateur non privilegie `app` pour lancer la JVM.
UPLOAD_DIR_PATH="${UPLOAD_DIR:-/data/uploads}"
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR_PATH"
  chown -R app:app "$UPLOAD_DIR_PATH"
  exec su-exec app:app "$@"
fi

exec "$@"
