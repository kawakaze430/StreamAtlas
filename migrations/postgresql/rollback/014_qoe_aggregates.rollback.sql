-- Only for disposable test schema or approved rollback with snapshot.
BEGIN;
DROP TABLE IF EXISTS video_qoe_daily;
COMMIT;
