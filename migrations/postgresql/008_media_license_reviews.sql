BEGIN;
CREATE TABLE IF NOT EXISTS media_license_reviews (
 upload_id UUID PRIMARY KEY,
 reference TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('VERIFIED','REVOKED','EXPIRED')),
 reviewed_by BIGINT NOT NULL REFERENCES users(id),
 reviewed_at TIMESTAMPTZ NOT NULL,
 decision_note TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_media_license_expiry ON media_license_reviews(status,expires_at);
COMMIT;
