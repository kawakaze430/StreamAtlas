# StreamAtlas continuation after v0.25.0

Start from `streamatlas-complete-checkpoints-01-to-25.zip`. Do not restart from an earlier checkpoint. The exact 117-task roadmap is now packaged in `docs/streamatlas-master-development-roadmap.md`; read `docs/STATUS_25.md` before claiming a roadmap task complete.

**Next high-utility engineering batch:** close D02 recording parity with an explicit visual comparison; D04 full indexed multi-facet search and date buckets; D05 cursor support across all sort/filter combinations; D06 near-duplicate review with manual approval and private SEO policy; D07 responsive thumbnail derivatives and synthetic storyboard E2E; D08 source-authorization rules; E01 direct-to-private-object-storage resumable transfer; E02 hardened malware scanner and FFmpeg sandbox; E03 durable queue with dead-letter recovery; E04–E05 fail-closed publication/revocation and end-to-end tests. Defer D09 OpenSearch until representative benchmarks, D10 trained embeddings/experiments until privacy/measurement design exists.

**Commands:** `npm run doctor && npm test && npm run qa:release:verify && npm run qa:browser:offline`. Optional disposable search microbenchmark: `DB_PATH=/tmp/streamatlas-benchmark-unique.sqlite npm run qa:search:benchmark` (never use a real account database). Offline browser test does not substitute for networked CI.

**Blocked without external access:** cloud resources, registrar, production verification vendors, independent legal approval, actual S3/CloudFront invalidation, PostgreSQL/Spring cutover, real-device HLS, OpenSearch and trained recommendation experiments. No public deployment or purchases are authorized by this handoff.
