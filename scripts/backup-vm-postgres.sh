#!/usr/bin/env bash
set -euo pipefail

backup_bucket="${BACKUP_BUCKET:?BACKUP_BUCKET must be set, for example gs://onewiki-backups}"
compose_file="${COMPOSE_FILE:-docker-compose.vm.yml}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT

docker compose -f "$compose_file" exec -T postgres pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --username "${POSTGRES_USER:-onewiki}" \
  --dbname "${POSTGRES_DB:-onewiki}" > "$temporary_dir/onewiki-$timestamp.dump"

gcloud storage cp "$temporary_dir/onewiki-$timestamp.dump" "$backup_bucket/onewiki-$timestamp.dump"
