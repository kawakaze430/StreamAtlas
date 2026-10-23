-- Checkpoint 27 additive constraints and audit mutation guard (POSTGRESQL DRAFT).
-- Execute ONLY on disposable PostgreSQL 16+ with migrations 001-012 applied.
-- Constraints use NOT VALID so existing rows require separate remediation/VALIDATE.
-- DB owner/superuser can bypass triggers: external immutable audit storage still required.
BEGIN;
ALTER TABLE videos ADD CONSTRAINT sa_videos_nonnegative_metrics CHECK (views >= 0 AND likes >= 0 AND dislikes >= 0) NOT VALID;
ALTER TABLE watch_progress ADD CONSTRAINT sa_watch_progress_nonnegative CHECK (position >= 0) NOT VALID;
ALTER TABLE watch_queue ADD CONSTRAINT sa_watch_queue_nonnegative CHECK (position >= 0) NOT VALID;
ALTER TABLE playlist_videos ADD CONSTRAINT sa_playlist_position_nonnegative CHECK (position >= 0) NOT VALID;
ALTER TABLE upload_sessions ADD CONSTRAINT sa_upload_size_bounds CHECK (received_bytes >= 0 AND received_bytes <= expected_bytes) NOT VALID;
CREATE INDEX IF NOT EXISTS ix_pg_sessions_user_expiry ON sessions(user_id,expires_at);
CREATE INDEX IF NOT EXISTS ix_pg_favorites_video ON favorites(video_id);
CREATE INDEX IF NOT EXISTS ix_pg_watch_later_video ON watch_later(video_id);
CREATE INDEX IF NOT EXISTS ix_pg_subscriptions_channel ON subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS ix_pg_reports_status_time ON reports(status,created_at DESC);
CREATE INDEX IF NOT EXISTS ix_pg_moderation_audit_object ON moderation_audit(object_type,object_id,created_at DESC);
CREATE OR REPLACE FUNCTION sa_reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Append-only audit table: % is prohibited', TG_OP USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER sa_moderation_audit_append_only BEFORE UPDATE OR DELETE ON moderation_audit FOR EACH ROW EXECUTE FUNCTION sa_reject_audit_mutation();
CREATE TRIGGER sa_compliance_events_append_only BEFORE UPDATE OR DELETE ON compliance_case_events FOR EACH ROW EXECUTE FUNCTION sa_reject_audit_mutation();
CREATE TRIGGER sa_license_events_append_only BEFORE UPDATE OR DELETE ON license_review_events FOR EACH ROW EXECUTE FUNCTION sa_reject_audit_mutation();
CREATE TRIGGER sa_auth_events_append_only BEFORE UPDATE OR DELETE ON auth_security_events FOR EACH ROW EXECUTE FUNCTION sa_reject_audit_mutation();
COMMIT;
