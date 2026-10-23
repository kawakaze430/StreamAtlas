#!/usr/bin/env bash
# Offline encrypted backup of BOTH the SQLite DB and uploaded/private media.
# Requires Docker Compose plugin, AWS CLI, and a bucket with a reviewed KMS policy.
# Do not schedule this without automation for pausing app/worker and restore drills.
set -euo pipefail
: "${SA_BACKUP_KEY:?Supply encryption key securely via secret manager}"
: "${SA_BACKUP_S3_URI:?Set e.g. s3://my-private-backup-bucket/streamatlas/}"
: "${SA_BACKUP_KMS_KEY_ID:?Set a KMS key ARN for SSE-KMS}"
[[ "$SA_BACKUP_S3_URI" == s3://* ]] || { echo 'Invalid s3 URI' >&2; exit 2; }
command -v aws >/dev/null || { echo 'aws CLI is required' >&2; exit 2; }
command -v docker >/dev/null || { echo 'Docker is required' >&2; exit 2; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
# This script does not automatically stop services to avoid surprising downtime.
if docker compose --env-file .env.runtime -f compose.yaml ps --status running --services | grep -Eq '^(app|worker)$'; then
  echo 'Stop the app AND worker before running an offline snapshot: docker compose -f compose.yaml stop app worker' >&2
  exit 3
fi
mkdir -p "${SA_LOCAL_BACKUP_PATH:-$SCRIPT_DIR/backups}"
backup_dir="$(cd "${SA_LOCAL_BACKUP_PATH:-$SCRIPT_DIR/backups}" && pwd)"
# App Docker UID is the node user (1000), which must have access to the destination.
[[ -w "$backup_dir" ]] || { echo "Cannot write backups to $backup_dir (grant UID 1000 access)" >&2;exit 2; }
docker compose -f compose.yaml run --rm --no-deps \
  -e SA_BACKUP_OFFLINE=1 -e SA_BACKUP_KEY \
  -v "$backup_dir:/offline-backups:rw" \
  app node scripts/secure-backup.js /offline-backups
# Double encryption: AES-GCM client-side, SSE-KMS server-side. Requires configured AWS identity.
aws s3 cp "$backup_dir/" "$SA_BACKUP_S3_URI" --recursive \
  --sse aws:kms --sse-kms-key-id "$SA_BACKUP_KMS_KEY_ID"
echo 'Encrypted offline backup uploaded. Keep SA_BACKUP_KEY outside the instance and test a full restore separately.'
