# Focused security assessment: local checks only

| Surface | Threat | Mitigation added/verified | Still missing |
|---|---|---|---|
| Complaints | Unauthenticated/unauthorized case decisions | Login + admin RBAC, scoped case list, audit entries, negative tests | Human workflow and legal counsel |
| Appeals | Anyone contests unrelated uploads | Authorize uploaded-video owner only, case must have initial outcome | Identity/provenance assurance, appeal abuse controls |
| Content holds | Closing a case makes removed content public | No implicit visibility changes; existing active holds still block publish | CDN purge, external replica cleanup |
| Age callback | Forged, stale, duplicated vendor events | Timestamped HMAC, timing-safe compare, single-use event IDs and expiration | Verified actual vendor schema, vendor IP/auth controls, rate limits, event ordering |
| CDN signer | Forged/overbroad media path tokens | Cryptographic signature, strict UUID/path/host/domain/TTL | Actual entitlement middleware and AWS verification |
| Metrics | PII leakage / anonymous disclosure | Bearer token of >=32 chars, constant-time compare; only aggregate labels | TLS/network boundary, alerts, SLO review |
| Public launch | Operator flips a feature flag prematurely | Explicit application startup refusal when `SA_PUBLIC_CONTENT_MODE=1` | Independent launch review, licensed deployment |
| Backup | Media lost despite DB snapshot | Offline encrypted DB + media restore, SHA checks and clean output path | Real KMS/S3 restore on separate AWS host |
| Load | Third-party target misuse | Load command restricted to loopback, bounded request/concurrency | Real host staging load test and traffic model |

This is not penetration testing and is not evidence of the legal status of a
public adult-content service. A third party must conduct an independent audit.
