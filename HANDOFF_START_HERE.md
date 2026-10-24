# StreamAtlas v0.42.0 cumulative handoff

Start with `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_42/START_HERE.md`, then `docs/MEDIA_EXPORT_42.md` and `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_42/117_TASKS.csv`.

Checkpoint 42 hardens offline export of every local HLS rendition/segment, captions, thumbnails, and rendition metadata. It checks a per-video HLS dependency graph, rejects symlinks and unsafe references, produces a checksum-bound v2 manifest, and excludes active holds or explicitly invalid license reviews. The primary app still uses Node.js/SQLite; this is not an AWS migration or public release.

Main-branch policy: no branch, worktree, PR, tag, or force-push. Local source and the final remote GitHub HEAD must be hash-compared before claiming exact synchronization. Never upload actual user media or secrets.
