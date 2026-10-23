# StreamAtlas private evaluation image. Pin to a reviewed digest before any production launch.
FROM node:22.16.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node . /app
RUN mkdir -p /app/data /app/data/private && chown -R node:node /app/data
USER node
ENV PORT=3000 DB_PATH=/app/data/streamatlas.db PRIVATE_PATH=/app/data/private
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","src/server.js"]
