-- Optional parity draft; requires an actual PostgreSQL migration run before acceptance.
-- Do not claim PostgreSQL cutover from existence of this file.
BEGIN;
CREATE INDEX IF NOT EXISTS ix_videos_status_views ON videos(status, views DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_videos_status_duration ON videos(status, duration DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_videos_status_publish_keyset ON videos(status, published_at DESC, id DESC);
COMMIT;
