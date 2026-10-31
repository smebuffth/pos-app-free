#!/usr/bin/env bash
# Saves a hosted database's connection string for local development (Supabase, Neon, MySQL, or any other).
# The USER runs this in their own terminal and pastes the string at the hidden prompt. The agent never
# sees, types, or prints it, because it holds a password.
#
# Usage: scripts/db-set-url.sh <family> [project_dir]
#   family       postgres | mysql   (Supabase, Neon and other Postgres hosts use postgres)
#   project_dir  default: current directory
#
# Writes DATABASE_URL to .dev.vars and .env.local, and the Hyperdrive local connection string to .env.local
# (wrangler reads that file, not .dev.vars). Files get mode 600 and are added to .gitignore.
#
# Use a development database, never production: development runs migrations and seeds against it.
#   Supabase  a separate dev project. Use its "Direct connection" string (host db.<ref>.supabase.co, port 5432).
#   Neon      a dev branch. Use the unpooled string (host without -pooler).
#   MySQL     a dev database on your server.
set -euo pipefail

FAMILY="${1:?usage: db-set-url.sh <postgres|mysql> [project_dir]}"
PROJECT_DIR="${2:-.}"

case "$FAMILY" in
  postgres) SCHEMES='^postgres(ql)?://' ;;
  mysql)    SCHEMES='^mysql://' ;;
  *) echo "Family must be postgres or mysql." >&2; exit 1 ;;
esac

if [[ ! -t 0 ]] && [[ -z "${DB_SET_URL_FROM_STDIN:-}" ]]; then
  echo "Run this in your own terminal so the hidden prompt works." >&2
  exit 1
fi

printf 'Paste the %s connection string (input is hidden): ' "$FAMILY" >&2
IFS= read -r -s URL
printf '\n' >&2

if [[ ! "$URL" =~ $SCHEMES ]]; then
  echo "That does not start with the $FAMILY scheme. Nothing was saved." >&2
  exit 1
fi
if [[ "$URL" == *[[:space:]]* || "$URL" == *\"* || "$URL" == *\'* || "$URL" == *\`* || "$URL" == *\$* || "$URL" == *\#* ]]; then
  echo "The string contains a space, quote, \$, \` or #. URL-encode the password (\$ is %24, # is %23) and try again. Nothing was saved." >&2
  exit 1
fi

write_var() { # file name value
  touch "$1"
  grep -v "^$2=" "$1" > "$1.tmp" || true
  printf '%s=%s\n' "$2" "$3" >> "$1.tmp"
  mv "$1.tmp" "$1"
  chmod 600 "$1"
}
write_var "$PROJECT_DIR/.dev.vars" DATABASE_URL "$URL"
write_var "$PROJECT_DIR/.env.local" DATABASE_URL "$URL"
write_var "$PROJECT_DIR/.env.local" CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE "$URL"

GITIGNORE="$PROJECT_DIR/.gitignore"
touch "$GITIGNORE"
for PATTERN in '.dev.vars' '.env.local'; do
  grep -qxF "$PATTERN" "$GITIGNORE" || echo "$PATTERN" >> "$GITIGNORE"
done

echo "Saved DATABASE_URL to .dev.vars and .env.local (mode 600). It was not printed."
