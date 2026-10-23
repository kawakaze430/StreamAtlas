-- Future PostgreSQL cutover. Transaction-bound privacy-minimized verification.
BEGIN;
CREATE TABLE IF NOT EXISTS verification_challenges (
 challenge_hash TEXT PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 consumed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_verification_challenges_user ON verification_challenges(user_id,expires_at);
COMMIT;
