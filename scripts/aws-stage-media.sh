#!/usr/bin/env bash
# Explicit operator action only. Offline by default. No public media deployment.
# Performs v2 HLS graph verification, uploads objects with SHA-256 checksums and
# SSE-KMS using s3api, re-checks each object and refuses to overwrite mismatches.
set -euo pipefail
[[ $# == 3 ]] || { echo 'Usage: scripts/aws-stage-media.sh /ABSOLUTE/STAGE s3://PRIVATE-BUCKET/PREFIX arn:aws:kms:REGION:ACCOUNT:key/ID' >&2; exit 2; }
STAGE="$1"; TARGET="$2"; KEY="$3"
[[ "$STAGE" = /* ]] || { echo 'Absolute staging path required' >&2; exit 2; }
node "$(dirname "$0")/stage-private-s3.js" "$STAGE" "$TARGET" "$KEY"
read -r -p 'This calls AWS and may cost money. For PRIVATE approved synthetic fixtures only, type STAGE: ' ACK
[[ "$ACK" == STAGE ]] || exit 3
[[ "${SA_AWS_MEDIA_STAGE_APPROVED:-}" == YES_SYNTHETIC_PRIVATE_ONLY && "${SA_AWS_MEDIA_COPY_ACK:-}" == YES ]] || {
 echo 'Set SA_AWS_MEDIA_STAGE_APPROVED=YES_SYNTHETIC_PRIVATE_ONLY and SA_AWS_MEDIA_COPY_ACK=YES after provider/owner approval' >&2
 exit 2
}
node "$(dirname "$0")/stage-private-s3.js" "$STAGE" "$TARGET" "$KEY" --upload
printf 'Private staging copy complete. No CDN/public release, legal approval, or revocation guarantee is implied.\n'
