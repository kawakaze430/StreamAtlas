# StreamAtlas v0.22.0 — B01–B16 completion matrix

| ID | Outcome | Status |
|---|---|---|
| B01 | Sample media HLS manifests and reproducible FFmpeg fixtures | Implemented; FFprobe decoded streams |
| B02 | Reviewed pinned hls.js browser engine | Optional vendor script prepared; binary unavailable / Chrome ABR **not accepted** |
| B03 | Native HLS when supported + MP4 fallback | Implemented; Safari/iOS browser untested |
| B04 | Manual standard vs data-saver MP4, adaptive selector when supported | Implemented, integration and UI tested |
| B05 | Buffering/startup status | Implemented; offline Chromium tested |
| B06 | Bounded HLS retry, native failure fallback, time preservation | Implemented; network failure matrix pending |
| B07 | Seek thumbnail previews and accessible range control | Implemented for all demo media and processed uploads |
| B08 | Skip, speed, mute, volume, fullscreen, theater, PiP | Available; volume/seek/speed tested in Chromium |
| B09 | WebVTT descriptive captions + caption selector | Implemented; Chromium WebVTT cues loaded/parsed in offline browser; Safari pending |
| B10 | Video chapters | Preserved from earlier checkpoints |
| B11 | Picture-in-picture | Preserved, platform support dependent |
| B12 | Keyboard shortcuts (K/Space J/L M F C) | Implemented; comprehensive assistive testing open |
| B13 | Resume playback, opt-in next-video autoplay, countdown/cancel | Implemented; cross-device resume already supported for signed-in users |
| B14 | Mobile double-tap seeking | Implemented; actual iOS/Android touch-testing open |
| B15 | Session-only startup, rebuffer and quality-change metrics | Implemented; no external analytics or sensitive viewing-history export |
| B16 | Casting/AirPlay/offline downloads | Not implemented; future work |

## Release evidence

- Full Node suite and additional video-player tests: see test output in release report; use `npm test`.
- Synthetic HLS profiles can be decoded with FFprobe from both disk and local HTTP.
- Browser audit: 1440/820/390px with real MP4 decoding, sample seek, volume/speed and captions-toggle controls. Offline renderer cannot prove browser HLS or subtitle cue display.
- Existing private-media and content review gates preserved. Uploaded preview frames only use authorized media paths and inherit publication state checks.
- Registry access prevents hls.js bundling; external network/multi-browser validation remains a mandatory release gate.

No public adult-content launch, AWS account mutation, vendor age/rights verification or production infrastructure cutover occurred in this checkpoint.
