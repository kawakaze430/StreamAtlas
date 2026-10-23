# Checkpoint 28 — proposed SLOs (NOT accepted production SLOs)

The following are **engineering targets for a private synthetic evaluation**; owners, legal/provider approvals, telemetry pipelines, regions, burn-rate policies, and alert routing have not been signed off.

| Signal | Draft objective | Source required for actual acceptance |
|---|---|---|
| API availability | >=99.5% of eligible API requests are not 5xx (28-day rolling window) | Real request counters, exclusions and uptime probes |
| API latency | p95 <= 500ms for ordinary catalog GETs | Route-normalized server histogram (not available yet) |
| Startup latency | p95 <= 2,500ms | Real playback client events in approved regions |
| Page load | p95 <= 3,000ms | RUM/lab page load, device/network segments |
| Rebuffering | p95 ratio <=2% | Playback rebuffer seconds / viewing seconds |
| CDN cache hit rate | >=80% of cache-eligible requests | Provider response logs and cache headers |
| Job completion | >=99% of eligible jobs complete within 30min | Durable queue and job lifecycle metrics |
| Recovery | RTO/RPO must be negotiated with operators | Independently observed restore/failover drill |

`src/metrics.js` exposes basic local server counters but does not distinguish endpoint families, p95 per route, edge geography, video QoE, or durable job success rates. `scripts/edge-readiness.js` and `scripts/slo-evaluate.js` evaluate **operator-provided aggregates only**, reject inconsistent counters, and mark insufficient samples; they do not make network requests. No global, production, or provider SLO has been measured.

Operational requirements before signoff: agreed eligible-request definitions, at least 28 days of representative traffic, region/ISP sampling, alert owners, burn-rate alerts, paging and incident drill, privacy-safe aggregation, and documented false-positive handling.
