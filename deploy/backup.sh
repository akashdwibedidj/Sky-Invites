#!/usr/bin/env bash
set -euo pipefail

# Nightly backup of PostgreSQL database and local media directory.
# Writes outside the repo to /var/backups/sky-invites with 7-day retention.

BACKUP_DIR="/var/backups/sky-invites"
MEDIA_SRC="/opt/sky-invites/media"
ENV_FILE="/etc/sky-invites/backend.env"
RETENTION_DAYS=7
STAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL is not set." >&2
    exit 1
fi

# Strip SQLAlchemy driver prefix (+psycopg) for pg_dump
PG_URL="${DATABASE_URL/postgresql+psycopg:/postgresql:}"

DB_DUMP_FILE="${BACKUP_DIR}/db_${STAMP}.dump"
MEDIA_TAR_FILE="${BACKUP_DIR}/media_${STAMP}.tar.gz"

pg_dump "$PG_URL" --format=custom --no-owner --no-privileges -f "$DB_DUMP_FILE"

if [ -d "$MEDIA_SRC" ]; then
    tar -czf "$MEDIA_TAR_FILE" -C "$(dirname "$MEDIA_SRC")" "$(basename "$MEDIA_SRC")"
fi

# 7-day retention cleanup
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "db_*.dump" -o -name "media_*.tar.gz" \) -mtime +"$RETENTION_DAYS" -delete

# Off-server copy step:
# Sync $BACKUP_DIR (e.g., "$DB_DUMP_FILE" and "$MEDIA_TAR_FILE") to your off-site
# backup destination here (for example via rsync/rclone/scp over SSH).
