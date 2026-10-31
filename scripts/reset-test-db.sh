#!/usr/bin/env bash
# Recreates the scratch database used by scripts/pos-check.mts, then applies the migrations and the seed.
# Only a database whose name contains _test is ever dropped. Usage: scripts/reset-test-db.sh <container>
set -euo pipefail
CONTAINER="${1:?usage: reset-test-db.sh <container>}"
DB_URL="${DATABASE_URL:?DATABASE_URL must point at the dev database}"
TEST_URL="${DB_URL/nisia_pos/nisia_pos_test}"
TEST_DB="${TEST_URL##*/}"
TEST_DB="${TEST_DB%%\?*}"
if [[ "$TEST_DB" != *_test ]]; then echo "refused: $TEST_DB is not a _test database" >&2; exit 2; fi
docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -qc "DROP DATABASE IF EXISTS $TEST_DB" -c "CREATE DATABASE $TEST_DB"
DATABASE_URL="$TEST_URL" node scripts/migrate.mjs
DATABASE_URL="$TEST_URL" node scripts/migrate.mjs --run seed/seed.sql
echo "scratch database $TEST_DB is ready"
