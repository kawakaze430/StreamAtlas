# Checkpoint 08 — local isolated FFmpeg worker deployment starter

The **API and database are still the Node/SQLite prototype**. This Compose file runs *only the worker* without network access, with non-root UID, dropped Linux capabilities, a read-only root filesystem, memory/CPU/process limits and a bounded tmpfs. It is not an independent security audit. FFmpeg remains complex and this setup does not include malware/content scanning or hardened seccomp/AppArmor profiles.

1. Install Docker/Compose and ensure `data/` is readable and writable by UID/GID `10001`; e.g. carefully `chown -R 10001:10001 data` on a dedicated development host (this may prevent the API running as your own UID). Prefer a shared group/managed volume in a real deployment.
2. Run API with `SA_DISABLE_WORKER=1 npm start` so it does not spawn an unisolated worker.
3. From the project root, run `docker compose -f deployment/worker/compose.yaml up --build --scale transcoder=1`.
4. Set `DB_PATH` and `PRIVATE_PATH` consistently for both processes. Do not bind-mount secrets or untrusted host paths into this container.

### Important limitations

- **One worker only.** SQLite recovery and job claiming are not safe for an arbitrary fleet of independently restarting workers.
- Both processes must see the same SQLite database and media directory, including WAL files.
- Requires Docker and network access at image-build time; not executed in this environment.
- The local prototype still accepts test uploads. Untrusted/public uploads require more isolation and independent security review before deployment.
