# eigdo v2 — Environments Reference

## Server

| Parameter | Value |
|-----------|-------|
| Provider | LiquidWeb VPS |
| IP | 69.167.167.18 |
| Hostname | repulsive-yaks.metalseed.io |
| OS | Ubuntu 24.04.4 LTS |
| CPU / RAM / Disk | 4 vCPU / 8 GB / 235 GB |
| SSH | `root@69.167.167.18` port 22 |

## Monitoring

| Panel | URL | Credentials |
|-------|-----|-------------|
| Cockpit (server admin) | `https://69.167.167.18:9090` | `root` / server password |
| Netdata (real-time metrics) | `https://monitor.eigdo.com` | `admin` / server password |

---

## Staging Environment

### URLs

| Service | URL | Internal Port |
|---------|-----|---------------|
| App (empresa) | `https://staging.eigdo.com` | 3102 |
| API | `https://staging-api.eigdo.com` | 5100 |
| Admin (superadmin) | `https://staging-admin.eigdo.com` | 3101 |
| Landing | `https://eigdo.com` | 3100 |

### Systemd Services

| Service Name | Description |
|-------------|-------------|
| `eigdo-staging-api` | .NET 8 backend API |
| `eigdo-staging-app` | Next.js empresa app |
| `eigdo-staging-admin` | Next.js admin panel |
| `eigdo-staging-landing` | Next.js landing page |

### Database

| Parameter | Value |
|-----------|-------|
| Host | localhost |
| Port | 5432 |
| Database | `eigdo_staging` |
| User | `eigdo` |
| Connection String | `Host=localhost;Port=5432;Database=eigdo_staging;Username=eigdo;Password=<password>` |

### Environment Variables (staging.env)

| Variable | Value | Notes |
|----------|-------|-------|
| `ASPNETCORE_ENVIRONMENT` | `Staging` | |
| `ASPNETCORE_URLS` | `http://0.0.0.0:5100` | |
| `DATABASE_CONNECTION` | `Host=localhost;Port=5432;Database=eigdo_staging;...` | |
| `REDIS_CONNECTION` | `localhost:6379` | |
| `JWT_SECRET` | `eigdo-staging-jwt-secret-key-2024-...` | Change in production |
| `JWT_ISSUER` | `eigdo` | |
| `JWT_AUDIENCE` | `eigdo-clients` | |
| `JWT_EXPIRY_MINUTES` | `1440` | 24 hours |
| `ALLOWED_ORIGINS` | `https://staging.eigdo.com,https://staging-admin.eigdo.com,https://eigdo.com,...` | |
| `QBO_REDIRECT_URI` | `https://staging-api.eigdo.com/api/qbo/callback` | Must match QBO app config |
| `QBO_ENVIRONMENT` | `Sandbox` | |
| `ALANUBE_ENVIRONMENT` | `Sandbox` | |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Test mode |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Test mode |
| `STRIPE_SUCCESS_URL` | `https://staging.eigdo.com/billing/success?session_id={CHECKOUT_SESSION_ID}` | |
| `STRIPE_CANCEL_URL` | `https://staging.eigdo.com/billing/cancelled` | |
| `APP_URL` | `https://staging.eigdo.com` | |
| `ADMIN_URL` | `https://staging-admin.eigdo.com` | |
| `LANDING_URL` | `https://eigdo.com` | |

### Frontend Build-time Variables

| App | Variable | Value |
|-----|----------|-------|
| app | `NEXT_PUBLIC_API_URL` | `https://staging-api.eigdo.com/api` |
| admin | `NEXT_PUBLIC_API_URL` | `https://staging-api.eigdo.com/api` |
| landing | `NEXT_PUBLIC_API_URL` | `https://staging-api.eigdo.com/api` |
| landing | `NEXT_PUBLIC_APP_URL` | `https://staging.eigdo.com` |

### SuperAdmin Credentials

| Field | Value |
|-------|-------|
| Email | `argenis1989@gmail.com` |
| Password | `Anfeliz112322` |

---

## Production Environment (future)

### URLs

| Service | URL | Internal Port |
|---------|-----|---------------|
| App (empresa) | `https://app.eigdo.com` | 3002 |
| API | `https://api.eigdo.com` | 5000 |
| Admin (superadmin) | `https://admin.eigdo.com` | 3001 |
| Landing | `https://eigdo.com` | 3000 (shared) |

### Systemd Services

| Service Name | Description |
|-------------|-------------|
| `eigdo-prod-api` | .NET 8 backend API |
| `eigdo-prod-app` | Next.js empresa app |
| `eigdo-prod-admin` | Next.js admin panel |

### Database

| Parameter | Value |
|-----------|-------|
| Host | localhost |
| Port | 5432 |
| Database | `eigdo_production` |
| User | `eigdo` |

### Environment Variables (production.env)

| Variable | Value | Notes |
|----------|-------|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | |
| `ASPNETCORE_URLS` | `http://0.0.0.0:5000` | |
| `DATABASE_CONNECTION` | `Host=localhost;Port=5432;Database=eigdo_production;...` | |
| `REDIS_CONNECTION` | `localhost:6379` | |
| `JWT_SECRET` | *generate unique secret* | Must be different from staging |
| `ALLOWED_ORIGINS` | `https://app.eigdo.com,https://admin.eigdo.com,https://eigdo.com` | |
| `QBO_REDIRECT_URI` | `https://api.eigdo.com/api/qbo/callback` | |
| `QBO_ENVIRONMENT` | `Production` | |
| `ALANUBE_ENVIRONMENT` | `Production` | |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Live mode |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Live mode |
| `STRIPE_SUCCESS_URL` | `https://app.eigdo.com/billing/success?session_id={CHECKOUT_SESSION_ID}` | |
| `STRIPE_CANCEL_URL` | `https://app.eigdo.com/billing/cancelled` | |
| `APP_URL` | `https://app.eigdo.com` | |
| `ADMIN_URL` | `https://admin.eigdo.com` | |
| `LANDING_URL` | `https://eigdo.com` | |

### Frontend Build-time Variables

| App | Variable | Value |
|-----|----------|-------|
| app | `NEXT_PUBLIC_API_URL` | `https://api.eigdo.com/api` |
| admin | `NEXT_PUBLIC_API_URL` | `https://api.eigdo.com/api` |
| landing | `NEXT_PUBLIC_API_URL` | `https://api.eigdo.com/api` |
| landing | `NEXT_PUBLIC_APP_URL` | `https://app.eigdo.com` |

---

## Directory Structure

```
/opt/eigdo/
├── staging/
│   ├── api/          .NET 8 published output
│   ├── app/          Next.js standalone (port 3102)
│   ├── admin/        Next.js standalone (port 3101)
│   ├── landing/      Next.js standalone (port 3100)
│   └── worker/       Background job processor (future)
├── production/
│   ├── api/          (empty — deploy when ready)
│   ├── app/
│   ├── admin/
│   ├── landing/
│   └── worker/
└── shared/
    ├── config/       staging.env, production.env
    ├── backups/      Database dumps
    ├── logs/         Per-service log dirs
    ├── scripts/      Deploy scripts, cron jobs
    └── ssl/          Certificate files (managed by certbot)
```

## SSL Certificates

| Domains | Expires | Auto-Renew |
|---------|---------|------------|
| eigdo.com, www.eigdo.com, staging.eigdo.com, api.eigdo.com, admin.eigdo.com | June 21, 2026 | Yes (certbot timer) |
| staging-api.eigdo.com, staging-admin.eigdo.com | June 21, 2026 | Yes |
| monitor.eigdo.com | June 21, 2026 | Yes |

## DNS Records Required

| Type | Name | Value |
|------|------|-------|
| A | eigdo.com | 69.167.167.18 |
| A | staging.eigdo.com | 69.167.167.18 |
| A | api.eigdo.com | 69.167.167.18 |
| A | admin.eigdo.com | 69.167.167.18 |
| CNAME | www.eigdo.com | eigdo.com |
| CNAME | *.eigdo.com | eigdo.com |
| CNAME | staging-api.eigdo.com | eigdo.com |
| CNAME | staging-admin.eigdo.com | eigdo.com |
| CNAME | monitor.eigdo.com | eigdo.com |

## Nginx Port Map

| Port | Environment | Service |
|------|-------------|---------|
| 80/443 | — | Nginx (reverse proxy) |
| 3100 | Staging | Landing |
| 3101 | Staging | Admin |
| 3102 | Staging | App |
| 5100 | Staging | API |
| 3000 | Production | Landing (shared) |
| 3001 | Production | Admin |
| 3002 | Production | App |
| 5000 | Production | API |
| 9090 | — | Cockpit |
| 19999 | — | Netdata (via Nginx) |

## Deploy Commands (Staging)

```bash
# Build
cd backend/src/Eigdo.Api && dotnet publish -c Release -o /tmp/eigdo-staging-api

cd frontend/app && rm -rf .next && NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api npm run build
cd frontend/admin && rm -rf .next && NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api npm run build
cd frontend/landing && rm -rf .next && NEXT_PUBLIC_API_URL=https://staging-api.eigdo.com/api NEXT_PUBLIC_APP_URL=https://staging.eigdo.com npm run build

# Package (standalone)
cp -r frontend/<app>/.next/standalone /tmp/pkg && cp -r frontend/<app>/.next/static /tmp/pkg/.next/static
tar czf /tmp/<app>.tar.gz -C /tmp/pkg .

# Deploy
scp /tmp/<app>.tar.gz root@69.167.167.18:/tmp/
ssh root@69.167.167.18 'systemctl stop eigdo-staging-<svc> && rm -rf /opt/eigdo/staging/<svc> && mkdir -p /opt/eigdo/staging/<svc> && tar xzf /tmp/<app>.tar.gz -C /opt/eigdo/staging/<svc>/ && chown -R eigdo:eigdo /opt/eigdo/staging/<svc> && systemctl start eigdo-staging-<svc>'
```

## Important: Build Cache

**Always `rm -rf .next` before building frontends** to prevent stale chunks with old URLs from mixing with new builds. The `NEXT_PUBLIC_*` variables are baked at build time into the JS chunks.
