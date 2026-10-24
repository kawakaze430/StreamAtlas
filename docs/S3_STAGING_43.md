# Checkpoint 43 — verified private S3 staging (not production deployment)

For synthetic, non-explicit media only, first create and verify the complete private v2 HLS export (`docs/MEDIA_EXPORT_42.md`). The following command **does not contact AWS**, does not request credentials and changes no cloud resources:

```
node scripts/stage-private-s3.js /absolute/stage s3://private-bucket/unique-prefix arn:aws:kms:ap-south-1:123456789012:key/example-uuid
```

The offline dry run verifies all staged SHA-256 digests, HLS dependency graphs, caption/preview assets, no extra/symlinked stage objects, valid S3 bucket/prefix and KMS key ARN syntax. Default output always has `productionApproval:false`.

**Operator-authorized private AWS calls (not performed or approved here):** set credentials through approved IAM/role mechanisms, and only after owner/provider budget approval set `SA_AWS_MEDIA_STAGE_APPROVED=YES_SYNTHETIC_PRIVATE_ONLY`. Read-only verification additionally requires `SA_AWS_MEDIA_VERIFY_ACK=YES` and `--verify`; real upload additionally requires `SA_AWS_MEDIA_COPY_ACK=YES` and `--upload`. No cloud calls are made before all approval guards pass. The legacy `scripts/aws-stage-media.sh` is now an explicit confirmation wrapper around the same per-object uploader (not `aws s3 sync`).

Cloud object `put-object` requests include an explicit base64 SHA-256 checksum, SSE-KMS key ARN and content type. Every object is independently queried with `head-object --checksum-mode ENABLED`; checksum, ContentLength, `aws:kms` and exact KMS key must match. Existing matching objects are skipped; existing mismatches fail closed and are **never overwritten**. Provider 403/timeout/errors are never treated as missing objects. This is a serial, bounded staging tool for small approved synthetic datasets, not a global-scale resumable ingest service.

**Still missing:** real AWS IAM/KMS and CloudFront OAC denial tests; provider-side checksum compatibility and metadata consistency; signed CDN/geo controls; complete emergency takedown, cache invalidation, cross-region restore and disaster drills; legitimate jurisdiction/age/consent/rights/vendor/moderation/security acceptance. Never use private staging results to imply public launch approval.
