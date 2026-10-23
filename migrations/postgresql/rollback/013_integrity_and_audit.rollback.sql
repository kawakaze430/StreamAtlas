-- DISPOSABLE TEST ONLY. Manual rollback of migration 013 schema changes.
-- NEVER automatically remove integrity controls in production.
BEGIN;
DROP TRIGGER IF EXISTS sa_moderation_audit_append_only ON moderation_audit;
DROP TRIGGER IF EXISTS sa_compliance_events_append_only ON compliance_case_events;
DROP TRIGGER IF EXISTS sa_license_events_append_only ON license_review_events;
DROP TRIGGER IF EXISTS sa_auth_events_append_only ON auth_security_events;
DROP FUNCTION IF EXISTS sa_reject_audit_mutation();
ALTER TABLE videos DROP CONSTRAINT IF EXISTS sa_videos_nonnegative_metrics;
ALTER TABLE watch_progress DROP CONSTRAINT IF EXISTS sa_watch_progress_nonnegative;
ALTER TABLE watch_queue DROP CONSTRAINT IF EXISTS sa_watch_queue_nonnegative;
ALTER TABLE playlist_videos DROP CONSTRAINT IF EXISTS sa_playlist_position_nonnegative;
ALTER TABLE upload_sessions DROP CONSTRAINT IF EXISTS sa_upload_size_bounds;
DROP INDEX IF EXISTS ix_pg_sessions_user_expiry;
DROP INDEX IF EXISTS ix_pg_favorites_video;
DROP INDEX IF EXISTS ix_pg_watch_later_video;
DROP INDEX IF EXISTS ix_pg_subscriptions_channel;
DROP INDEX IF EXISTS ix_pg_reports_status_time;
DROP INDEX IF EXISTS ix_pg_moderation_audit_object;
-- The migration ledger is NOT changed here; operator must restore a database
-- snapshot or perform a reviewed ledger reconciliation before reapplying.
COMMIT;
