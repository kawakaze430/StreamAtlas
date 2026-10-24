# Next engineering work after v0.43

1. Verify complete v0.43 main-branch source and CI; preserve synthetic-media-only tests, 117-task status, and source digest.
2. Integrate direct private S3 multipart upload and SQS distributed workers behind secure IAM after approved private staging. The current Node/SQLite app still uses local spool/worker.
3. Finish full PostgreSQL/Spring authenticated API parity, identity/data import and rollback, then test private AWS RDS/ALB/CloudFront/Cognito or approved identity service.
4. Vendor a reviewed pinned hls.js binary when registry access is available; prove actual ABR and Safari/iOS/Android devices. Test CDN cached asset revocation.
5. Independent legal jurisdiction, viewer/participant age, consent/rights, security, provider and moderation approvals required for any public adult-content launch.
