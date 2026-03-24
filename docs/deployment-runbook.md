# eigdo v2 — Deployment Runbook

This document contains every step needed to deploy eigdo to staging or production. It serves as the single source of truth for all deployment operations.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Matrix](#environment-matrix)
3. [Pre-deployment Checklist](#pre-deployment-checklist)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Database Operations](#database-operations)
8. [SSL Certificate Management](#ssl-certificate-management)
9. [Monitoring & Logs](#monitoring--logs)
10. [Troubleshooting](#troubleshooting)
11. [Gotchas & Lessons Learned](#gotchas--lessons-learned)

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────┐
                    │              Nginx (ports 80/443)               │
                    │         SSL termination + reverse proxy          │
                    └───────┬──────┬──────┬──────┬──────┬────────────┘
                            │      │      │      │      │
                 ┌──────────┘  ┌───┘  ┌───┘  ┌───┘  ┌───┘
                 ▼             ▼      ▼      ▼      ▼
          staging-api    staging   staging  eigdo  monitor
          :5100          app:3102  admin    .com   .eigdo
                                  :3101    :3100   .com
                 │
                 ▼
          ┌──────────────┐    ┌───────────┐
          │ PostgreSQL   │    │   Redis    │
          │ :5432        │    │   :6379    │
          │ eigdo_staging│    │            │
          │ eigdo_prod   │    └───────────┘
          └──────────────┘
```

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend API | .NET 8 / ASP.NET Core | 8.0.x |
| Frontend (3 apps) | Next.js (standalone) | 16.2.0 |
| Database | PostgreSQL | 16.x |
| Cache | Redis | 7.x |
| Reverse Proxy | Nginx | 1.24.x |
| OS | Ubuntu | 24.04 LTS |
| Process Manager | systemd | — |
| SSL | Let's Encrypt (certbot) | auto-renew |

---

## Environment Matrix

### Staging

| Component | Domain | Port | Systemd Service | Directory |
|-----------|--------|------|-----------------|-----------|
| API | `staging-api.eigdo.com` | 5100 | `eigdo-staging-api` | `/opt/eigdo/staging/api` |
| App | `staging.eigdo.com` | 3102 | `eigdo-staging-app` | `/opt/eigdo/staging/app` |
| Admin | `staging-admin.eigdo.com` | 3101 | `eigdo-staging-admin` | `/opt/eigdo/staging/admin` |
| Landing | `eigdo.com` | 3100 | `eigdo-staging-landing` | `/opt/eigdo/staging/landing` |
| Config | — | — | — | `/opt/eigdo/shared/config/staging.env` |
| Database | — | 5432 | `postgresql` | DB: `eigdo_staging` |

### Production (future)

| Component | Domain | Port | Systemd Service | Directory |
|-----------|--------|------|-----------------|-----------|
| API | `api.eigdo.com` | 5000 | `eigdo-prod-api` | `/opt/eigdo/production/api` |
| App | `app.eigdo.com` | 3002 | `eigdo-prod-app` | `/opt/eigdo/production/app` |
| Admin | `admin.eigdo.com` | 3001 | `eigdo-prod-admin` | `/opt/eigdo/production/admin` |
| Landing | `eigdo.com` | 3000 | `eigdo-prod-landing` | `/opt/eigdo/production/landing` |
| Config | — | — | — | `/opt/eigdo/shared/config/production.env` |
| Database | — | 5432 | `postgresql` | DB: `eigdo_production` |

### Build-time Environment Variables

These are baked into the frontend JS at build time. **Cannot be changed at runtime.**

| Variable | Staging Value | Production Value |
|----------|---------------|------------------|
| `NEXT_PUBLIC_API_URL` (app) | `https://staging-api.eigdo.com/api` | `https://api.eigdo.com/api` |
| `NEXT_PUBLIC_API_URL` (admin) | `https://staging-api.eigdo.com/api` | `https://api.eigdo.com/api` |
| `NEXT_PUBLIC_API_URL` (landing) | `https://staging-api.eigdo.com/api` | `https://api.eigdo.com/api` |
| `NEXT_PUBLIC_APP_URL` (landing) | `https://staging.eigdo.com` | `https://app.eigdo.com` |

### Backend Environment Variables (in .env file)

| Variable | Staging | Production |
|----------|---------|------------|
| `ASPNETCORE_ENVIRONMENT` | `Staging` | `Production` |
| `ASPNETCORE_URLS` | `http://0.0.0.0:5100` | `http://0.0.0.0:5000` |
| `DATABASE_CONNECTION` | `...Database=eigdo_staging...` | `...Database=eigdo_production...` |
| `REDIS_CONNECTION` | `localhost:6379` | `localhost:6379` |
| `JWT_SECRET` | staging key | **different production key** |
| `ENCRYPTION_KEY` | base64 key | **different production key** |
| `ALLOWED_ORIGINS` | staging domains | production domains |
| `QBO_ENVIRONMENT` | `Sandbox` | `Production` |
| `QBO_REDIRECT_URI` | `https://staging-api.eigdo.com/api/qbo/callback` | `https://api.eigdo.com/api/qbo/callback` |
| `ALANUBE_ENVIRONMENT` | `Sandbox` | `Production` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SUCCESS_URL` | `https://staging.eigdo.com/billing/success?...` | `https://app.eigdo.com/billing/success?...` |
| `STRIPE_CANCEL_URL` | `https://staging.eigdo.com/billing/cancelled` | `https://app.eigdo.com/billing/cancelled` |
| `APP_URL` | `https://staging.eigdo.com` | `https://app.eigdo.com` |
| `ADMIN_URL` | `https://staging-admin.eigdo.com` | `https://admin.eigdo.com` |
| `LANDING_URL` | `https://eigdo.com` | `https://eigdo.com` |

---

## Pre-deployment Checklist

Before any deployment:

- [ ] Code compiles locally (`dotnet build`, `npm run build` for each frontend)
- [ ] TypeScript has no errors (`npx tsc --noEmit` in each frontend)
- [ ] All changes committed to `develop` branch (staging) or `main` branch (production)
- [ ] **NEVER merge develop to main without explicit user approval**
- [ ] SSH access to VPS verified: `ssh root@69.167.167.18`

---

## Staging Deployment

### Step 1: Build Backend

```bash
cd backend/src/Eigdo.Api
dotnet publish -c Release -o /tmp/eigdo-staging-api --nologo
```

### Step 2: Build Frontends

**CRITICAL: Always `rm -rf .next` before building to prevent stale chunks.**

```bash
# App
cd frontend/app
rm -rf .next
NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api npm run build

# Admin
cd frontend/admin
rm -rf .next
NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api npm run build

# Landing
cd frontend/landing
rm -rf .next
NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api \
NEXT_PUBLIC_APP_URL=https://staging.eigdo.com \
npm run build
```

### Step 3: Package Frontends (standalone)

Each frontend must be packaged with:
1. The standalone output (contains server.js, node_modules, .next with BUILD_ID)
2. The static assets copied into `.next/static`
3. The public folder if it exists

```bash
# For each frontend (app, admin, landing):
rm -rf /tmp/eigdo-pkg-<name>
cp -r frontend/<name>/.next/standalone /tmp/eigdo-pkg-<name>
cp -r frontend/<name>/.next/static /tmp/eigdo-pkg-<name>/.next/static
[ -d frontend/<name>/public ] && cp -r frontend/<name>/public /tmp/eigdo-pkg-<name>/public
tar czf /tmp/eigdo-staging-<name>.tar.gz -C /tmp/eigdo-pkg-<name> .
```

### Step 4: Package Backend

```bash
tar czf /tmp/eigdo-staging-api.tar.gz -C /tmp/eigdo-staging-api .
```

### Step 5: Upload to VPS

```bash
scp /tmp/eigdo-staging-{api,app,admin,landing}.tar.gz root@69.167.167.18:/tmp/
```

### Step 6: Deploy on VPS

```bash
ssh root@69.167.167.18

# Deploy each component:
for component in api app admin landing; do
  systemctl stop eigdo-staging-$component
  rm -rf /opt/eigdo/staging/$component
  mkdir -p /opt/eigdo/staging/$component
  tar xzf /tmp/eigdo-staging-$component.tar.gz -C /opt/eigdo/staging/$component/
  chown -R eigdo:eigdo /opt/eigdo/staging/$component
  systemctl start eigdo-staging-$component
done
```

### Step 7: Verify

```bash
# Check all services
for svc in api app admin landing; do
  echo "eigdo-staging-$svc: $(systemctl is-active eigdo-staging-$svc)"
done

# Check HTTP
curl -sk -o /dev/null -w "%{http_code}" https://staging-api.eigdo.com/api/health
curl -sk -o /dev/null -w "%{http_code}" https://staging.eigdo.com/
curl -sk -o /dev/null -w "%{http_code}" https://staging-admin.eigdo.com/
curl -sk -o /dev/null -w "%{http_code}" https://eigdo.com/
```

### Deploy Single Component

To deploy only one component (e.g., just the app after a frontend change):

```bash
# Build locally
cd frontend/app && rm -rf .next && NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api npm run build

# Package
rm -rf /tmp/eigdo-pkg-app
cp -r .next/standalone /tmp/eigdo-pkg-app
cp -r .next/static /tmp/eigdo-pkg-app/.next/static
[ -d public ] && cp -r public /tmp/eigdo-pkg-app/public
tar czf /tmp/eigdo-staging-app.tar.gz -C /tmp/eigdo-pkg-app .

# Upload & deploy
scp /tmp/eigdo-staging-app.tar.gz root@69.167.167.18:/tmp/
ssh root@69.167.167.18 'systemctl stop eigdo-staging-app && rm -rf /opt/eigdo/staging/app && mkdir -p /opt/eigdo/staging/app && tar xzf /tmp/eigdo-staging-app.tar.gz -C /opt/eigdo/staging/app/ && chown -R eigdo:eigdo /opt/eigdo/staging/app && systemctl start eigdo-staging-app'
```

---

## Production Deployment

### Prerequisites

- [ ] User has explicitly approved the merge from `develop` to `main`
- [ ] All staging tests pass
- [ ] `/opt/eigdo/shared/config/production.env` is configured with production values
- [ ] Production systemd services are created
- [ ] Nginx virtual hosts for production domains are configured
- [ ] SSL certificates for production domains are provisioned

### Build Commands (Production)

```bash
# Backend
cd backend/src/Eigdo.Api
dotnet publish -c Release -o /tmp/eigdo-prod-api --nologo

# App
cd frontend/app && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.eigdo.com/api npm run build

# Admin
cd frontend/admin && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.eigdo.com/api npm run build

# Landing (shared — same build for both environments if domain is eigdo.com)
cd frontend/landing && rm -rf .next
NEXT_PUBLIC_API_URL=https://api.eigdo.com/api \
NEXT_PUBLIC_APP_URL=https://app.eigdo.com \
npm run build
```

### Package & Deploy (same pattern as staging)

```bash
# Package each frontend same way as staging
# Upload to VPS
scp /tmp/eigdo-prod-{api,app,admin,landing}.tar.gz root@69.167.167.18:/tmp/

# Deploy
ssh root@69.167.167.18
for component in api app admin landing; do
  systemctl stop eigdo-prod-$component
  rm -rf /opt/eigdo/production/$component
  mkdir -p /opt/eigdo/production/$component
  tar xzf /tmp/eigdo-prod-$component.tar.gz -C /opt/eigdo/production/$component/
  chown -R eigdo:eigdo /opt/eigdo/production/$component
  systemctl start eigdo-prod-$component
done
```

### Production Nginx Virtual Hosts (to be created)

```nginx
# api.eigdo.com
server {
    listen 80;
    server_name api.eigdo.com;
    location / { proxy_pass http://127.0.0.1:5000; ... }
}

# app.eigdo.com
server {
    listen 80;
    server_name app.eigdo.com;
    location / { proxy_pass http://127.0.0.1:3002; ... }
}

# admin.eigdo.com
server {
    listen 80;
    server_name admin.eigdo.com;
    location / { proxy_pass http://127.0.0.1:3001; ... }
}
```

Then run `certbot --nginx -d api.eigdo.com -d app.eigdo.com -d admin.eigdo.com` for SSL.

### Production Systemd Services (to be created)

Same pattern as staging but with different ports and env file:

```ini
# /etc/systemd/system/eigdo-prod-api.service
[Service]
WorkingDirectory=/opt/eigdo/production/api
ExecStart=/usr/bin/dotnet Eigdo.Api.dll
EnvironmentFile=/opt/eigdo/shared/config/production.env

# /etc/systemd/system/eigdo-prod-app.service
[Service]
WorkingDirectory=/opt/eigdo/production/app
ExecStart=/usr/bin/node server.js
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
```

---

## Rollback Procedures

### Quick Rollback (revert to previous tarball)

```bash
# If you kept the previous tarball:
ssh root@69.167.167.18
systemctl stop eigdo-staging-<component>
rm -rf /opt/eigdo/staging/<component>
mkdir -p /opt/eigdo/staging/<component>
tar xzf /tmp/eigdo-staging-<component>-previous.tar.gz -C /opt/eigdo/staging/<component>/
chown -R eigdo:eigdo /opt/eigdo/staging/<component>
systemctl start eigdo-staging-<component>
```

### Database Rollback

EF Core migrations run automatically on API startup. To rollback a migration:

```bash
# On your local machine:
cd backend/src/Eigdo.Infrastructure
dotnet ef migrations list --startup-project ../Eigdo.Api/Eigdo.Api.csproj

# Revert to specific migration:
dotnet ef database update <PreviousMigrationName> --startup-project ../Eigdo.Api/Eigdo.Api.csproj
```

---

## Database Operations

### Backup

```bash
ssh root@69.167.167.18
PGPASSWORD=eigdo_db_2024 pg_dump -h localhost -U eigdo eigdo_staging > /opt/eigdo/shared/backups/eigdo_staging_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
PGPASSWORD=eigdo_db_2024 psql -h localhost -U eigdo eigdo_staging < /opt/eigdo/shared/backups/eigdo_staging_YYYYMMDD_HHMMSS.sql
```

### Connect to DB

```bash
ssh root@69.167.167.18
PGPASSWORD=eigdo_db_2024 psql -h localhost -U eigdo -d eigdo_staging
```

### Check Tables

```sql
\dt                          -- list all tables
SELECT count(*) FROM plans;  -- count plans
SELECT count(*) FROM users;  -- count users
```

---

## SSL Certificate Management

### Check Certificate Status

```bash
ssh root@69.167.167.18
certbot certificates
```

### Renew Certificates (manual)

```bash
certbot renew --dry-run  # test first
certbot renew            # actual renewal
```

### Add SSL to New Domain

```bash
certbot --nginx --non-interactive -d newdomain.eigdo.com
```

### Auto-renewal

Certbot installs a systemd timer automatically. Verify:

```bash
systemctl status certbot.timer
```

---

## Monitoring & Logs

### Service Logs

```bash
# Real-time logs
journalctl -u eigdo-staging-api -f

# Last 50 lines
journalctl -u eigdo-staging-api --no-pager -n 50

# Errors only
journalctl -u eigdo-staging-api --no-pager | grep -i error | tail -20

# Since specific time
journalctl -u eigdo-staging-api --since "10 min ago"
```

### Quick Health Check

```bash
for url in \
  "https://staging-api.eigdo.com/api/health" \
  "https://staging.eigdo.com/" \
  "https://staging-admin.eigdo.com/" \
  "https://eigdo.com/"; do
  echo "$url → $(curl -sk -o /dev/null -w '%{http_code}' $url)"
done
```

### Monitoring Panels

| Panel | URL | What it shows |
|-------|-----|---------------|
| Cockpit | `https://69.167.167.18:9090` | Server admin: services, logs, terminal, storage, network |
| Netdata | `https://monitor.eigdo.com` | Real-time: CPU, RAM, disk, network, PostgreSQL, Redis, Nginx |

### Restart a Service

```bash
systemctl restart eigdo-staging-api
systemctl restart eigdo-staging-app
# etc.
```

### Check All Services at Once

```bash
for svc in eigdo-staging-api eigdo-staging-app eigdo-staging-admin eigdo-staging-landing; do
  printf "%-35s %s\n" "$svc" "$(systemctl is-active $svc)"
done
```

---

## Troubleshooting

### 404 on HTTPS but works on HTTP

Certbot didn't add SSL block to Nginx config. Fix:

```bash
certbot --nginx --non-interactive -d <domain>
```

### API crashes with "ENCRYPTION_KEY not configured"

Add to the .env file:

```bash
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

Must be valid Base64. Restart API after.

### API crashes with "password authentication failed"

Check env var name is `DATABASE_CONNECTION` (not `DATABASE_URL`). Verify password:

```bash
PGPASSWORD=<password> psql -h localhost -U eigdo -d <dbname> -c "SELECT 1;"
```

### Frontend shows old content after deploy

Stale `.next` cache. Always `rm -rf .next` before building. On server, always `rm -rf /opt/eigdo/staging/<component>` before extracting tarball.

### Frontend 404 on /login or other routes

Next.js standalone needs `.next/BUILD_ID` and `.next/server/` directory. Verify:

```bash
ls /opt/eigdo/staging/app/.next/BUILD_ID
ls /opt/eigdo/staging/app/.next/server/
```

If missing, the tarball was created wrong. Must copy from `.next/standalone` (which includes `.next/` inside it), NOT just `.next/static`.

### CORS errors in browser console

Check `ALLOWED_ORIGINS` in the env file includes the requesting domain with correct protocol (https/http).

### Plans don't show in landing/admin

1. Check API responds: `curl https://staging-api.eigdo.com/api/billing/plans`
2. Check baked URL in frontend: `grep -roh 'https.*api.*eigdo' /opt/eigdo/staging/<fe>/.next/static/chunks/*.js | sort -u`
3. Check CORS: domain must be in `ALLOWED_ORIGINS`

### macOS tar warnings on Linux

`LIBARCHIVE.xattr.com.apple.provenance` — harmless, ignore.

---

## Gotchas & Lessons Learned

1. **`rm -rf .next` before every build** — Next.js caches chunks. Old chunks with old `NEXT_PUBLIC_*` URLs persist and get deployed alongside new ones.

2. **Frontend standalone packaging** — Must copy from `.next/standalone/` (contains server.js + .next/BUILD_ID + .next/server/), then overlay `.next/static` into `.next/standalone/.next/static`. Missing BUILD_ID = "Could not find production build" error.

3. **`DATABASE_CONNECTION` not `DATABASE_URL`** — The .NET app reads `DATABASE_CONNECTION` from env. Using wrong var name = silent fallback to dev DB or crash.

4. **`ENCRYPTION_KEY` must be Base64** — Generate with `openssl rand -base64 32`. Plain text strings cause `FormatException`.

5. **EF Core auto-migration** — Runs on every API startup. New tables/columns applied automatically. No manual migration step needed.

6. **DataSeeder** — Seeds 3 default plans and SuperAdmin user on first run. Plans exist in both staging and production DBs automatically.

7. **Certbot + Nginx** — After rewriting an Nginx config, re-run `certbot --nginx -d <domain>` to re-add the SSL block. Certbot's changes get lost when you overwrite the file.

8. **CORS for landing** — Landing lives at `eigdo.com` but calls `staging-api.eigdo.com`. Cross-origin! Must include `https://eigdo.com` in `ALLOWED_ORIGINS`.

9. **Git branching** — `develop` = staging, `main` = production. **NEVER merge develop → main without explicit user approval.**

10. **Ownership** — All files in `/opt/eigdo/` must be owned by `eigdo:eigdo` user. Services run as this user. After extracting tarballs, always `chown -R eigdo:eigdo`.
