# Media export version 2 — private offline staging

**Never use on public or unverified real content.** No cloud calls occur in these commands. A public release requires independent age, rights, consent, jurisdiction, policy and security signoff.

For an authorized synthetic dataset, choose a *new* absolute staging directory separate from the private source:

```
DB_PATH=/absolute/streamatlas.db PRIVATE_PATH=/absolute/private node scripts/prepare-media-export.js /absolute/staging-new
node scripts/verify-media-export.js /absolute/staging-new
```

Every HLS variant and its segments must match an approved local media folder. The exporter includes MP4 quality files, local playlists and all their referenced segments, preview JPEGs, rendition metadata and WEBVTT captions from SQLite. It rejects unsupported external playlist URIs, extra filenames, symlinked directories, malformed or missing variants. The verifier uses SHA-256 for every staged object, rejects unaccounted files or directory redirection, and requires manifest version 2.

This export is a snapshot. Any subsequent consent withdrawal, license expiry, emergency hold, or takedown **must** block or delete the destination objects before any use. The script excludes an active hold and an explicitly invalid license review *at export time* but cannot enforce future changes or independently validate documentary claims. All actual AWS actions need explicit operator consent, private bucket/object policies, exact object checksum verification and takedown/invalidation testing. `aws-stage-media.sh` remains an explicit operator-only path.
