# Local worker sandbox starter. Build requires network access to Debian packages.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN groupadd -g 10001 media && useradd --uid 10001 --gid 10001 --no-create-home --shell /usr/sbin/nologin media
USER 10001:10001
ENV NODE_ENV=production DB_PATH=/app/data/streamatlas.db PRIVATE_PATH=/app/data/private SA_MEDIA_WORKER=1
CMD ["node", "src/media-worker.js"]
