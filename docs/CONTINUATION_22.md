# StreamAtlas next development checkpoint (23)

The latest cumulative release is StreamAtlas v0.22.0. Continue from its ZIP; do not use older checkpoint archives.

1. On an internet-connected CI runner, install and verify the pinned hls.js bundle, run Playwright desktop Chromium + Firefox + WebKit and mobile emulation with actual network HLS, captions, slow-link/offline-recovery and signed entitlement tests. Treat failures as gating.
2. Improve the YouTube-style queue/library UX, playlists, subscription notifications and watch-page recommendation behavior (C01–C10) without discarding existing moderation or privacy controls.
3. Add HTTP ABR and privacy metrics to opt-in synthetic staging tests; test device-specific accessibility and caption visibility.
4. Publish test matrix/results and only then claim B02/B03/B09 complete. Maintain the complete cumulative source ZIP, checksum and upgrade/rollback plan.
