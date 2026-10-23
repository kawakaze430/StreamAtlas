# StreamAtlas private AWS demo deployment (Checkpoints 10–13)

> **This configuration is ONLY a password-gated development demo with synthetic media. It does not implement effective viewer age assurance, consent verification, content licensing, or a legal public adult-service launch. Never point a public adult-content audience at this deployment. Obtain jurisdiction-specific legal and service-provider approval first.**

## A. What this deployment does

- Node.js application + separate FFmpeg media worker in Linux Docker containers, with a persistent named Docker volume for **SQLite AND media**.
- Caddy reverse proxy on TCP ports 80, 443 and UDP 443, automatic HTTPS for a configured real domain, password authentication on ALL routes including video segments; Node app is **not** directly published.
- Docker health check (SQLite `/api/ready`), no worker network, read-only roots, memory / CPU limits and non-root application user.
- Optional **offline** encrypted application+media backup and upload to a private S3 bucket using an operator-provided AWS KMS key.

A single Lightsail/EC2 host with SQLite is not HA. Loss of the Docker volume loses your data unless backups exist. Docker worker container hardening reduces attack surface, but is not a reviewed sandbox or malware scan.

## B. Prerequisites / policy checks

1. Confirm AWS's current Acceptable Use Policy, your selected services' specific terms, and local law. For real adult content, obtain AWS confirmation where necessary; this repo contains synthetic demonstration content only.
2. Create an AWS account with MFA on the root account, an admin IAM identity, no permanent access keys on the instance, and AWS Budgets alerts. Choose a region close to your own testing audience.
3. Register your own domain with Route 53 or a separate registrar. Domains are a **separate annual purchase** and AWS promotional credits cannot be used for domain registration. A Route 53 hosted zone adds a monthly cost. Domain availability cannot be guaranteed until you check the registrar.
4. Create a Linux Ubuntu instance on Lightsail (or EC2) with suitable memory, persistent storage and a **static public IP**; open TCP 80/443, UDP 443, and SSH 22 restricted to your own IP. Turn on snapshots and budget alerts.
5. Create DNS **A** record `preview.your-domain.com` pointing to that static IP. Wait for DNS resolution before starting Caddy/Let's Encrypt. Do not enable CloudFront caching of private paths.
6. Install maintained Docker Engine and the Compose plugin using Docker's official Ubuntu instructions. Avoid obsolete third-party OS image blueprints. Install AWS CLI v2 only when actually using offsite backups.

## C. Copy the project and configure

Extract `streamatlas-checkpoint-13.zip` on your computer. Move the entire project to your private instance using `scp`, `rsync -a`, or a private GitHub repo without credentials, database files or actual uploads. On the instance:

```bash
cd streamatlas-checkpoint-13/deployment/aws
cp .env.runtime.example .env.runtime
chmod 600 .env.runtime
openssl rand -hex 48  # save output as SA_CSRF_SECRET
openssl rand -hex 32  # save output as SA_MFA_KEY; store separately for recovery
# Generate a unique authentication hash; do not reuse your AWS password:
docker run --rm caddy:2.10.2-alpine caddy hash-password --plaintext 'REPLACE_WITH_NEW_UNIQUE_PASSWORD'
# Paste that hash in SA_DEMO_AUTH_HASH surrounded by SINGLE QUOTES.
# Change SA_DEMO_DOMAIN and SA_PUBLIC_ORIGIN to the actual preview hostname.
cd ../..
npm run deploy:check
```

Do not run `.env.runtime.example` in production and never commit `.env.runtime` or transmit its contents to support chats. Don't use the example DNS name `preview.example.com` as an actual address.

## D. Start the private demo

```bash
cd deployment/aws
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs --tail 60 app gateway worker
```

Visit `https://preview.your-domain.com/` (use **your** domain). Browser should require the configured `preview` username and unique password. The site must then show the seeded, non-explicit sample catalog.

Useful checks:

```bash
curl -I https://preview.your-domain.com/
# 401 without credentials is EXPECTED for the private gateway.
curl --user preview https://preview.your-domain.com/api/ready
# This may prompt for the gateway password; expect {"ready":true,"version":"0.13.0"}.
```

Never open port 3000 in the instance firewall. Verify it is absent from Docker host published-port mappings. Caddy's HTTPS certificate issuance requires port 80/443 reachability and correct DNS.

## E. Initial admin, MFA, worker, logs

`node scripts/create-admin.js` in the container creates the administrator with `SA_ADMIN_EMAIL` and `SA_ADMIN_PASSWORD` provided **only when invoking the command** from a secure terminal/secret source. Do not keep those passwords in `.env.runtime` once admin creation finishes. The app requires admin authenticator MFA in production; enroll it through the account screen before using admin endpoints. There is no live production mail sender here, so email verification/password reset delivery will NOT work over the public internet. All account testing should use disposable test accounts.

```bash
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs -f app worker
```

Upgrades: save an offline encrypted backup, tag source/releases, run `npm test` locally, then rebuild and restart after checking migrations. Do not erase Docker named volumes (`docker compose down -v` DELETES them).

## F. Backups and recovery

Stop `app` and `worker` for consistent offline snapshots. Create a private backup directory writable by container UID 1000. Provide `SA_BACKUP_KEY` **outside** the host source tree. For optional S3 transfer, configure instance role credentials with minimal S3 PutObject and KMS Encrypt rights, a private versioned S3 bucket, a KMS key and retention/lifecycle controls.

```bash
cd deployment/aws
docker compose -f compose.yaml stop app worker
mkdir -p backups
sudo chown 1000:1000 backups
# key supplied securely and privately; do not type secrets into shell history
export SA_BACKUP_S3_URI=s3://YOUR-PRIVATE-BUCKET/streamatlas/
export SA_BACKUP_KMS_KEY_ID=YOUR-KMS-KEY-ARN
./offsite-backup.sh
docker compose -f compose.yaml up -d app worker
```

`offsite-backup.sh` refuses to run while app or worker reports running. It NEVER schedules itself. Test restores **separately**: download an encrypted snapshot, run `secure:restore` into a new empty directory (never overwrite production), verify SQLite integrity and sample media, and record proof of restoration. Never store `SA_BACKUP_KEY` inside the snapshot or the same S3 bucket.

## G. Domain and HTTPS FAQ

- **Do I need to buy a domain?** Yes for a lasting custom `.com` or similar. Your hosting plan does not grant ownership of one automatically. Check registration, renewal and premium pricing before purchasing.
- **Can I start without a domain?** The app runs privately on `localhost:3000`. For this Caddy automatic HTTPS configuration you need an owned DNS name; one can be added later. An IP-only HTTP preview is not a safe place for account secrets.
- **Should I use CloudFront now?** Not for this small private preview. Later, a private CloudFront distribution can be considered only after legal/provider review and proper signed-media/age/rights authorization. CloudFront requires a certificate for your custom domain, and a Route 53 Alias record can map it.
- **Do I get AWS free credits toward the domain?** Route 53 registration charges are not covered by AWS promotional credits. Hosting and transfer can still incur charges even if a trial has credits.
- **Is this a worldwide public launch?** No. This is a private infrastructure proof of concept, not a legally cleared adult-content service. Viewer-age validation, partner rights, privacy, moderation staffing, and verified compliant CDN/payment vendors remain launch gates.

## H. Production architecture after the prototype

For a production service, prefer external, managed PostgreSQL, durable S3-compatible media storage with private access, a horizontally scalable queue/worker fleet, distinct identity/age-assurance and rights providers, a monitored API tier, CloudFront or an eligible CDN with signed authorization, zero-trust operator access, KMS-managed secrets, legal geo controls, and regularly tested offsite backup/restore. None of those are automatically provisioned by this single-host Compose file.

See `docs/STATUS.md`, `docs/ROADMAP_10_13.md`, and `docs/POSTGRES_MIGRATION.md` for unfinished work.
