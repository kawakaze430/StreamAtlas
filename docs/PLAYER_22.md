# Checkpoint 22 — YouTube-style player engineering

This project is a **local synthetic-media demonstration**. No third-party/adult media is bundled, and nothing here authorizes a public-content launch. All previous QA/security gates remain.

## Delivered now

1. **Reproducible media fixtures**: `python scripts/generate-player-fixtures.py` produces original 8s media profiles (MP4 standard + 320p data saver), a two-rendition HLS VOD manifest, `.ts` segments, WebVTT descriptive captions, and four storyboard thumbnails for each of the four local non-explicit MP4 samples. Only bundled sample media is eligible for public static hosting.
2. **Real HTTP HLS smoke**: FFprobe fetches `.m3u8` plus `.ts` segments from the local HTTP server and confirms playable duration. Both local HLS renditions are independently decodable.
3. **Video response metadata**: Authorized watch API returns `qualityOptions`, `hlsUrl`, `captionTracks`, `captionsUrl`, `previewFrames`, and for sample media `trueMediaDuration`. Upload-derived preview assets continue to use authorized `/api/media/{upload}/...`, NEVER the public asset path.
4. **Watch UI**: Scrubber and thumbnail preview with current time, caption enable/disable, volume control, keyboard `K/space`, `J`, `L`, `M`, `F`, and `C`, skip buttons, speed, picture-in-picture, loop, theater, optional autoplay-next countdown with cancellation, mobile double-tap seek, session-only QoE readout.
5. **Error recovery**: bounded hls.js network/media retries (when hls.js is installed) and fallback to MP4. Native-HLS failure also falls back to MP4. Source switches attempt to preserve time, speed and loop.
6. **Uploader previews**: transcoder produces four private 192px frames. API gives preview paths only for approved uploads; hidden/unapproved videos cannot access those frames.
7. **Regression coverage**: HTTP MIME, public/private path checks, sample-vs-private separation, HLS playlist integrity, ffprobe file/HTTP decoding, upload preview authorization, browser control interactions, and existing application tests.

## HLS.js installation — optional, NOT bundled here

Network registry access is restricted in this environment. The existing `scripts/vendor-hls.js` expects **hls.js@1.7.3** and verifies exact version. Install from a trusted environment, review its license/dependencies, and run:

```sh
npm install --no-save --package-lock=false hls.js@1.7.3
npm run vendor:hls
```

The app serves the reviewed bundle locally as `/assets/vendor/hls.min.js`; it never injects a third-party CDN script. Safari/native-HLS browsers may select the adaptive playlist without that dependency. Chromium/Firefox use the MP4 fallback until the reviewed bundle is installed.

> **Important:** FFprobe HTTP HLS success proves that generated streams are valid and accessible, NOT that browser ABR/network throttling, iOS Safari, quality-switch continuity, encrypted media or production CDN authorization have been verified.

## Run tests

```sh
npm test
SA_AUDIT_OUTPUT=/tmp/sa-player-audit npm run qa:browser:offline
# For a real network browser in your CI (the sandbox blocks browser localhost navigation):
npm run qa:browser:network
```

The offline audit renders real app templates and controls at 1440px, 820px and 390px and plays actual locally generated MP4 bytes, but does not substitute for a remote browser HLS matrix. The offline Chromium audit also loads WebVTT cues through a data URI and verifies caption track activation; it does not prove Safari/native network caption rendering.

## Next acceptance gates (still open)

- Bundle and review the optional hls.js package; run real Chrome/Firefox/WebKit/Safari/iOS HLS/ABR tests with HTTP cache throttling, captions switching, stalls, seek, quality switches and revocation.
- Extend the HLS encoder profiles for high-resolution user media, correct audio/subtitle renditions, verified bitrate tags, network variability, and entitlement renewal behavior.
- Perform real end-to-end Playwright against an unrestricted browser environment, accessibility audit, device testing, and track startup/rebuffer performance with opt-in privacy-respecting aggregates where legally permissible.
- Casting/AirPlay and licensed offline downloads were deliberately not added; these require a separate scoped project.
