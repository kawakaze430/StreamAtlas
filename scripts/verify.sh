#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --check src/server.js
node --check src/uploads.js
node --check src/media-worker.js
node --check src/security.js
node --check scripts/media-maintenance.js
node --check src/database.js
node --check src/seed.js
node --check public/app.js
for i in 1 2 3 4; do test -s "public/assets/videos/sample-${i}.mp4"; done
for i in $(seq 1 18); do test -s "public/assets/posters/poster-${i}.jpg"; done
npm test
printf '\nStreamAtlas static assets and automated tests verified.\n'
