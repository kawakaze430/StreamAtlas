-- Checkpoint 23: optional PostgreSQL parity migration.
-- This does not switch the active Node/SQLite application to PostgreSQL.
BEGIN;
CREATE TABLE IF NOT EXISTS watch_queue (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position BIGINT NOT NULL CHECK (position >= 0),
  added_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(user_id, video_id)
);
CREATE INDEX IF NOT EXISTS ix_pg_watch_queue_owner_position ON watch_queue(user_id,position);
ALTER TABLE playlist_videos ADD COLUMN IF NOT EXISTS position BIGINT NOT NULL DEFAULT 0;
WITH numbered AS (
  SELECT playlist_id,video_id,ROW_NUMBER() OVER (PARTITION BY playlist_id ORDER BY added_at NULLS LAST,video_id) AS ordinal
  FROM playlist_videos
)
UPDATE playlist_videos pv SET position=numbered.ordinal
FROM numbered WHERE pv.playlist_id=numbered.playlist_id AND pv.video_id=numbered.video_id AND pv.position=0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notify BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS ix_pg_playlist_order ON playlist_videos(playlist_id,position);
COMMIT;
