#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Brioright — PostgreSQL Backup Script
# Dumps the production DB, keeps 7 local copies, uploads to Cloudflare R2
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DB_NAME="taskflow_db"
DB_USER="taskflow_user"
DB_HOST="localhost"
DB_PORT="5432"

BACKUP_DIR="/var/backups/brioright"
KEEP_DAYS=7

# R2 (S3-compatible) — fill from .env.production
R2_ACCOUNT_ID="fc98b54622ffa7d53e477182a69e0f3f"
R2_ACCESS_KEY_ID="76305cfc73883b0ccda1b1c19ee74539"
R2_SECRET_ACCESS_KEY="ef5615382d6759fc0bd499017c47c2648aef7a371778b1cb2a796ea654b64d52"
R2_BUCKET_NAME="project-management"
R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%dT%H-%M-%S")
FILENAME="brioright_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# ── Dump ──────────────────────────────────────────────────────────────────────
echo "[Backup] Starting dump: $FILENAME"

PGPASSWORD=$(grep 'DATABASE_URL' /var/www/brioright/server/.env.production \
  | grep -oP '(?<=:)[^:@]+(?=@)') \
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=custom \
  --compress=9 \
  | gzip > "$FILEPATH"

echo "[Backup] Dump complete: $(du -sh "$FILEPATH" | cut -f1)"

# ── Upload to R2 ──────────────────────────────────────────────────────────────
echo "[Backup] Uploading to R2..."

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
aws s3 cp "$FILEPATH" \
  "s3://${R2_BUCKET_NAME}/backups/${FILENAME}" \
  --endpoint-url "$R2_ENDPOINT" \
  --region auto \
  --no-progress

echo "[Backup] Upload complete → s3://${R2_BUCKET_NAME}/backups/${FILENAME}"

# ── Local rotation: delete backups older than KEEP_DAYS ──────────────────────
DELETED=$(find "$BACKUP_DIR" -name "brioright_*.sql.gz" -mtime +${KEEP_DAYS} -print -delete | wc -l)
echo "[Backup] Rotated $DELETED old backup(s) (keeping ${KEEP_DAYS} days)"

echo "[Backup] ✅ Done — $(date)"
