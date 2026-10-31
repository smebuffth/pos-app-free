#!/usr/bin/env bash
# Local PostgreSQL for the PWA, in Docker.
#   1. Find a PostgreSQL container on this machine and reuse it.
#   2. If none exists, create one (name: PG_NEW_NAME, default local-postgres).
#   3. Create the project database inside that container, if it is missing.
#   4. Write DATABASE_URL to <project_dir>/.dev.vars and <project_dir>/.env.local.
#
# Usage: scripts/db-up.sh <database_name> [project_dir]
#   database_name  database.database in project.config.json (lowercase letters, digits, _)
#   project_dir    default: current directory
#
# Optional env:
#   PG_USE       name of the container to use when several exist
#   PG_NEW_NAME  name for a new container (default: local-postgres)
#   PG_IMAGE     image for a new container (default: postgres:17)
#
# Exit codes: 0 done, 1 error, 2 several containers and no single choice (ask the user, re-run with PG_USE=<name>).
# Never prints the password. Never removes or recreates an existing container or volume.
set -euo pipefail

DB_NAME="${1:?usage: db-up.sh <database_name> [project_dir]}"
PROJECT_DIR="${2:-.}"
PG_IMAGE="${PG_IMAGE:-postgres:17}"
PG_NEW_NAME="${PG_NEW_NAME:-local-postgres}"
PG_USER="postgres"

if [[ ! "$DB_NAME" =~ ^[a-z][a-z0-9_]{0,62}$ ]]; then
  echo "Invalid database name '$DB_NAME'. Use lowercase letters, digits and _, starting with a letter." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop, wait until it is ready, then run this again." >&2
  exit 1
fi

# PostgreSQL containers as "rank|name|image|state". rank 0 = running, 1 = stopped. Running first.
list_postgres() {
  docker ps -a --format '{{.Names}}|{{.Image}}|{{.State}}' \
    | awk -F'|' 'tolower($2) ~ /postgres/ { rank = ($3 == "running") ? 0 : 1; print rank "|" $1 "|" $2 "|" $3 }' \
    | sort
}

LIST="$(list_postgres || true)"
TOTAL="$(printf '%s\n' "$LIST" | grep -c . || true)"
RUNNING="$(printf '%s\n' "$LIST" | grep -c '^0|' || true)"

if [[ -n "${PG_USE:-}" ]]; then
  CONTAINER="$PG_USE"
elif [[ "$TOTAL" -eq 0 ]]; then
  CONTAINER=""
elif [[ "$RUNNING" -eq 1 ]]; then
  CONTAINER="$(printf '%s\n' "$LIST" | awk -F'|' '$1 == 0 { print $2 }')"
elif [[ "$TOTAL" -eq 1 ]]; then
  CONTAINER="$(printf '%s\n' "$LIST" | cut -d'|' -f2)"
else
  echo "Found $TOTAL PostgreSQL containers and cannot pick one automatically:" >&2
  printf '%s\n' "$LIST" | awk -F'|' 'NF { print "  " $2 "  (image " $3 ", " $4 ")" }' >&2
  echo "Ask the user which one to use, then run again with PG_USE=<name>." >&2
  exit 2
fi

if [[ -z "$CONTAINER" ]]; then
  # Nothing to reuse. Create one, published on 127.0.0.1 only, on the first free port from 5432.
  PORT=5432
  while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT + 1)); done
  PASSWORD="$(openssl rand -hex 24)"
  CONTAINER="$PG_NEW_NAME"
  docker image inspect "$PG_IMAGE" >/dev/null 2>&1 || docker pull "$PG_IMAGE" >/dev/null
  docker run -d --name "$CONTAINER" --restart unless-stopped \
    -e POSTGRES_PASSWORD="$PASSWORD" \
    -p "127.0.0.1:$PORT:5432" \
    -v "$CONTAINER-data:/var/lib/postgresql/data" \
    "$PG_IMAGE" >/dev/null
  HOST_PORT="$PORT"
  echo "Created container '$CONTAINER' from $PG_IMAGE on 127.0.0.1:$HOST_PORT."
else
  docker container inspect "$CONTAINER" >/dev/null 2>&1 || { echo "No container named '$CONTAINER'." >&2; exit 1; }
  if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" != "true" ]]; then
    docker start "$CONTAINER" >/dev/null
    echo "Started existing container '$CONTAINER'."
  else
    echo "Using running container '$CONTAINER'."
  fi
  ENV_LINES="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER")"
  PASSWORD="$(printf '%s\n' "$ENV_LINES" | sed -n 's/^POSTGRES_PASSWORD=//p')"
  PG_USER="$(printf '%s\n' "$ENV_LINES" | sed -n 's/^POSTGRES_USER=//p')"
  PG_USER="${PG_USER:-postgres}"
  HOST_PORT="$(docker port "$CONTAINER" 5432/tcp 2>/dev/null | head -n1 | sed -E 's/.*:([0-9]+)$/\1/' || true)"
fi

if [[ -z "${HOST_PORT:-}" ]]; then
  echo "'$CONTAINER' does not publish PostgreSQL port 5432 on this Mac. Publish it, or pick another container with PG_USE=<name>." >&2
  exit 1
fi
if [[ ! "${PASSWORD:-}" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "Could not read a URL-safe POSTGRES_PASSWORD from '$CONTAINER'. Set DATABASE_URL in .dev.vars by hand." >&2
  exit 1
fi

ready=0
for _ in $(seq 1 30); do
  # Check over TCP inside the container. During first-time init only the socket is up, and that is not ready.
  if docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -p 5432 -U "$PG_USER" >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "PostgreSQL in '$CONTAINER' is not ready after 30 s. Check: docker logs $CONTAINER" >&2
  exit 1
fi

EXISTS="$(docker exec "$CONTAINER" psql -U "$PG_USER" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")"
if [[ "$EXISTS" == "1" ]]; then
  echo "Database '$DB_NAME' already exists in '$CONTAINER'."
else
  docker exec "$CONTAINER" psql -U "$PG_USER" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\"" >/dev/null
  echo "Created database '$DB_NAME' in '$CONTAINER'."
fi

# .dev.vars: wrangler and `cf:preview`. .env.local: `next dev`. Both get the same URL.
for ENV_FILE in "$PROJECT_DIR/.dev.vars" "$PROJECT_DIR/.env.local"; do
  touch "$ENV_FILE"
  grep -v '^DATABASE_URL=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
  printf 'DATABASE_URL=postgres://%s:%s@127.0.0.1:%s/%s\n' "$PG_USER" "$PASSWORD" "$HOST_PORT" "$DB_NAME" >> "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
done
# Only read when wrangler.jsonc declares a HYPERDRIVE binding; harmless otherwise. Wrangler reads .env.local, not .dev.vars.
HD_VAR=CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
grep -v "^$HD_VAR=" "$PROJECT_DIR/.env.local" > "$PROJECT_DIR/.env.local.tmp" || true
printf '%s=postgres://%s:%s@127.0.0.1:%s/%s\n' "$HD_VAR" "$PG_USER" "$PASSWORD" "$HOST_PORT" "$DB_NAME" >> "$PROJECT_DIR/.env.local.tmp"
mv "$PROJECT_DIR/.env.local.tmp" "$PROJECT_DIR/.env.local"
chmod 600 "$PROJECT_DIR/.env.local"

GITIGNORE="$PROJECT_DIR/.gitignore"
touch "$GITIGNORE"
for PATTERN in '.dev.vars' '.env.local'; do
  grep -qxF "$PATTERN" "$GITIGNORE" || echo "$PATTERN" >> "$GITIGNORE"
done

echo "DATABASE_URL written to .dev.vars and .env.local (password not shown)."
echo "Open a shell: docker exec -it $CONTAINER psql -U $PG_USER -d $DB_NAME"
