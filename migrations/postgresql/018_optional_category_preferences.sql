-- Checkpoint 35: account-private, explicitly optional category interest profile.
-- This migration is prepared for disposable PostgreSQL execution only.
BEGIN;
CREATE TABLE IF NOT EXISTS user_category_preferences (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,category_id)
);
CREATE INDEX IF NOT EXISTS ix_user_category_pref_cat ON user_category_preferences(category_id,user_id);
COMMIT;
