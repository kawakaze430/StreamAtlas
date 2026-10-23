-- Checkpoint 29 parity only. Not executed here against a live PostgreSQL database.
-- Opt-in aggregates contain no viewer account, IP, cookie or session identifiers.
BEGIN;
CREATE TABLE IF NOT EXISTS video_qoe_daily (
 video_id BIGINT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
 day DATE NOT NULL,
 samples BIGINT NOT NULL DEFAULT 0 CHECK(samples >= 0),
 completions BIGINT NOT NULL DEFAULT 0 CHECK(completions >= 0),
 startup_failures BIGINT NOT NULL DEFAULT 0 CHECK(startup_failures >= 0),
 startup_ms_total BIGINT NOT NULL DEFAULT 0 CHECK(startup_ms_total >= 0),
 buffer_ms_total BIGINT NOT NULL DEFAULT 0 CHECK(buffer_ms_total >= 0),
 playback_ms_total BIGINT NOT NULL DEFAULT 0 CHECK(playback_ms_total >= 0),
 errors_total BIGINT NOT NULL DEFAULT 0 CHECK(errors_total >= 0),
 switches_total BIGINT NOT NULL DEFAULT 0 CHECK(switches_total >= 0),
 updated_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(video_id, day)
);
CREATE INDEX IF NOT EXISTS ix_video_qoe_day ON video_qoe_daily(day);
COMMIT;
