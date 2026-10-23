# Checkpoint 07 — HLS player adapter and MP4 fallback

- Uploaded, approved videos already generate protected HLS master/high/low manifests in the media worker.
- This release adds a browser adapter with ABR via optional **hls.js v1.7.3**, network/media error recovery, clean teardown during navigation, preserved playback time after switching, and fallback to MP4 when no HLS library is installed.
- Native HLS works where browsers expose `canPlayType('application/vnd.apple.mpegurl')`.
- **The hls.js binary is not bundled** because npm registry access failed here. This keeps the prototype dependency-free and avoids an unpinned CDN script. To enable it on your machine:

```sh
npm install --no-save --package-lock=false hls.js@1.7.3
npm run vendor:hls
```

The local vendor script validates the exact package version, copies its UMD browser build to `public/assets/vendor/` and includes Apache-2.0 license text. No script is loaded from a remote domain at runtime. The HLS adapter probes the local file before attempting to load; without it, users retain working MP4 qualities.

**Unverified:** real Chrome/Firefox/Safari HLS playback, load/retry behavior, and quality switch correctness. Chromium still timed out in this environment. Run optional Playwright browser smoke tests and media fixture tests on a desktop system with a working browser.
