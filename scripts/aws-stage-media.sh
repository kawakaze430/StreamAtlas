#!/usr/bin/env bash
# Explicit operator action only; requires AWS CLI configured with least-privilege credentials.
# Uploads only previously staged, verified, approved assets. NOT a runtime storage adapter.
set -euo pipefail
[[ $# == 3 ]] || { echo 'Usage: scripts/aws-stage-media.sh /ABSOLUTE/STAGE s3://PRIVATE-BUCKET/PREFIX arn:aws:kms:REGION:ACCOUNT:key/ID' >&2; exit 2; }
STAGE="$1"; TARGET="$2"; KEY="$3"
[[ "$STAGE" = /* ]] || { echo 'Absolute staging path required' >&2; exit 2; }
[[ "$TARGET" =~ ^s3://[A-Za-z0-9._-]+/[A-Za-z0-9/._-]+$ ]] || { echo 'Use a private s3://bucket/prefix destination' >&2; exit 2; }
[[ "$KEY" == arn:aws:kms:*:key/* ]] || { echo 'An AWS KMS key ARN is required' >&2; exit 2; }
command -v aws >/dev/null || { echo 'AWS CLI required' >&2; exit 2; }
node "$(dirname "$0")/verify-media-export.js" "$STAGE"
read -r -p "Type STAGE to upload approved media to $TARGET: " ACK
[[ "$ACK" == STAGE ]] || exit 3
aws s3 sync "$STAGE/media/" "$TARGET/" --sse aws:kms --sse-kms-key-id "$KEY" --no-follow-symlinks --only-show-errors
printf 'Upload complete. Check bucket policy, object access, counts and independent checksum/restore separately.\n'
