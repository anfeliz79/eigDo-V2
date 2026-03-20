# eigdo v2 — Deployment Guide

## Target Environment

| Component | Version | Notes |
|-----------|---------|-------|
| OS | Ubuntu 22.04+ | LiquidWeb VPS |
| .NET | 8.0 Runtime | aspnetcore-runtime-8.0 (NO SDK in prod) |
| Node.js | 20 LTS | For Next.js frontends |
| PostgreSQL | 16 | Database: `eigdo_production` |
| Redis | 7 | Locks, cache, sessions |
| Nginx | Latest | Reverse proxy + SSL termination |
| Certbot | Latest | Let's Encrypt SSL certificates |

## VPS: 69.167.167.18

### DNS Records Required

All A records pointing to VPS IP:

```
eigdo.com         →  69.167.167.18
www.eigdo.com     →  69.167.167.18
api.eigdo.com     →  69.167.167.18
app.eigdo.com     →  69.167.167.18
admin.eigdo.com   →  69.167.167.18
```

---

## Step 1: Initial Server Setup

Run as root on fresh VPS:

```bash
bash infra/scripts/setup-server.sh
```

This installs:
- .NET 8 ASP.NET Core Runtime
- Node.js 20 LTS
- PostgreSQL 16 (creates `eigdo` user + `eigdo_production` database)
- Redis 7
- Nginx
- Certbot (Let's Encrypt)
- UFW firewall (ports 22, 80, 443)
- `eigdo` system user
- Directory structure at `/opt/eigdo/`

---

## Step 2: Directory Structure

Created by setup script:

```
/opt/eigdo/
├── api/                     # .NET API published output
├── worker/                  # .NET Worker published output
├── frontend/
│   ├── landing/             # Next.js landing (port 3000)
│   ├── app/                 # Next.js empresa app (port 3002)
│   └── admin/               # Next.js admin panel (port 3001)
├── config/
│   ├── .env                 # Backend environment variables
│   ├── .env.landing         # Landing NEXT_PUBLIC_* vars
│   ├── .env.app             # App NEXT_PUBLIC_* vars
│   └── .env.admin           # Admin NEXT_PUBLIC_* vars
├── backups/                 # DB dumps + previous releases
├── logs/                    # Backup logs
└── scripts/
    └── backup.sh            # Daily pg_dump cron
```

---

## Step 3: Configure Environment Variables

### Backend `.env` (`/opt/eigdo/config/.env`)

```bash
# Database
DATABASE_CONNECTION=Host=localhost;Port=5432;Database=eigdo_production;Username=eigdo;Password=<SECURE_PASSWORD>

# Redis
REDIS_CONNECTION=localhost:6379

# JWT
JWT_SECRET=<64+ character random string>
JWT_ISSUER=eigdo
JWT_AUDIENCE=eigdo-clients
JWT_ACCESS_TOKEN_MINUTES=60
JWT_REFRESH_TOKEN_DAYS=30

# Encryption (for QBO tokens, certificates)
ENCRYPTION_KEY=<32-byte base64 key>

# Alanube (fiscal provider)
ALANUBE_BASE_URL=https://sandbox.alanube.co/dom/v1    # Change to production URL when certified
ALANUBE_JWT_TOKEN=<your_alanube_token>

# QuickBooks Online
QBO_CLIENT_ID=<intuit_client_id>
QBO_CLIENT_SECRET=<intuit_client_secret>
QBO_REDIRECT_URI=https://api.eigdo.com/api/qbo/callback
QBO_ENVIRONMENT=production    # or "sandbox"
QBO_WEBHOOK_VERIFIER_TOKEN=<intuit_webhook_token>

# Stripe
STRIPE_SECRET_KEY=sk_live_<key>
STRIPE_PUBLISHABLE_KEY=pk_live_<key>
STRIPE_WEBHOOK_SECRET=whsec_<key>

# Azul (Dominican payment gateway)
AZUL_MERCHANT_ID=<merchant_id>
AZUL_AUTH_KEY=<auth_key>
AZUL_BASE_URL=https://pagos.azul.com.do/webservices/JSON/default.aspx

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=noreply@eigdo.com
SMTP_PASSWORD=<password>
SMTP_FROM_EMAIL=noreply@eigdo.com
SMTP_FROM_NAME=eigdo

# Application
ALLOWED_ORIGINS=https://eigdo.com,https://app.eigdo.com,https://admin.eigdo.com
APP_BASE_URL=https://api.eigdo.com
```

### Frontend `.env` files

**`/opt/eigdo/config/.env.app`**:
```bash
NEXT_PUBLIC_API_URL=https://api.eigdo.com/api
```

**`/opt/eigdo/config/.env.admin`**:
```bash
NEXT_PUBLIC_API_URL=https://api.eigdo.com/api
```

**`/opt/eigdo/config/.env.landing`**:
```bash
NEXT_PUBLIC_API_URL=https://api.eigdo.com/api
NEXT_PUBLIC_STRIPE_KEY=pk_live_<key>
```

> **IMPORTANT**: `NEXT_PUBLIC_*` variables must exist at **build time**. The deploy script copies these to `.env.production.local` before running `npm run build`.

---

## Step 4: Install Systemd Services

```bash
# Copy service files
cp infra/systemd/*.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable all services
systemctl enable eigdo-api eigdo-worker eigdo-landing eigdo-app eigdo-admin
```

### Service Details

| Service | Binary | Port | User | Env File |
|---------|--------|------|------|----------|
| eigdo-api | `dotnet Eigdo.Api.dll` | 5000 | eigdo | `/opt/eigdo/config/.env` |
| eigdo-worker | `dotnet Eigdo.Worker.dll` | — | eigdo | `/opt/eigdo/config/.env` |
| eigdo-landing | `node server.js` | 3000 | eigdo | `/opt/eigdo/config/.env.landing` |
| eigdo-app | `node server.js` | 3002 | eigdo | `/opt/eigdo/config/.env.app` |
| eigdo-admin | `node server.js` | 3001 | eigdo | `/opt/eigdo/config/.env.admin` |

All services auto-restart on failure (RestartSec=10).

---

## Step 5: Install Nginx Configs

```bash
# Copy configs
cp infra/nginx/*.conf /etc/nginx/sites-available/

# Create symlinks
ln -sf /etc/nginx/sites-available/eigdo-api.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/eigdo-app.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/eigdo-admin.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/eigdo-landing.conf /etc/nginx/sites-enabled/

# Remove default
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
```

### Nginx Routing

| Domain | Upstream | Notes |
|--------|----------|-------|
| `api.eigdo.com` | `127.0.0.1:5000` | API + webhooks, client_max_body_size 10M |
| `eigdo.com` / `www.eigdo.com` | `127.0.0.1:3000` | Public landing page |
| `app.eigdo.com` | `127.0.0.1:3002` | Company app (authenticated) |
| `admin.eigdo.com` | `127.0.0.1:3001` | SuperAdmin panel (IP restrict recommended) |

All HTTP (port 80) redirects to HTTPS (port 443).

---

## Step 6: SSL Certificates

**IMPORTANT**: DNS must be pointing to VPS IP before running certbot.

```bash
# Get certificates for all domains at once
certbot --nginx \
  -d eigdo.com \
  -d www.eigdo.com \
  -d api.eigdo.com \
  -d app.eigdo.com \
  -d admin.eigdo.com

# Auto-renewal is configured automatically by certbot
```

---

## Step 7: Deploy Application

### Full Deploy (first time)

```bash
bash infra/scripts/deploy.sh all
```

### Selective Deploy (updates)

```bash
bash infra/scripts/deploy.sh backend    # API + Worker only
bash infra/scripts/deploy.sh frontend   # All 3 frontends
bash infra/scripts/deploy.sh app        # Just the empresa app
bash infra/scripts/deploy.sh api        # Just the API
```

### What the deploy script does:

1. **Backend**: `dotnet publish -c Release` → stops services → copies to `/opt/eigdo/api/` and `/opt/eigdo/worker/` → starts services → health check
2. **Frontend**: Copies `.env.$NAME` for build-time vars → `npm ci` → `npm run build` → stops service → copies `.next/`, `public/`, `package.json` → `npm ci --production` → starts service

### Deploy Script Variables

| Variable | Value |
|----------|-------|
| `DEPLOY_DIR` | `/opt/eigdo` |
| `BUILD_DIR` | `/tmp/eigdo-build` |
| `BACKUP_DIR` | `/opt/eigdo/backups` |

---

## Step 8: Database Migration

After first deploy, run EF Core migrations:

```bash
# On the server, from the API directory
cd /opt/eigdo/api
dotnet Eigdo.Api.dll --migrate  # If migration on startup is configured

# OR manually with dotnet-ef tool (requires SDK)
# Better: run migrations from dev machine against production DB via connection string
```

---

## Step 9: Verify Deployment

```bash
# API health check
curl https://api.eigdo.com/health
# Expected: "Healthy"

# Check all services
systemctl status eigdo-api eigdo-worker eigdo-landing eigdo-app eigdo-admin

# Check logs
journalctl -u eigdo-api --since "10 minutes ago" --no-pager
journalctl -u eigdo-app --since "10 minutes ago" --no-pager
```

---

## Backups

### Automatic (cron)
- **Schedule**: Daily at 2:00 AM
- **Script**: `/opt/eigdo/scripts/backup.sh`
- **Output**: `/opt/eigdo/backups/db-YYYYMMDD_HHMMSS.dump`
- **Retention**: 30 days
- **Log**: `/opt/eigdo/logs/backup.log`

### Manual Backup
```bash
pg_dump -Fc eigdo_production > /opt/eigdo/backups/db-manual-$(date +%Y%m%d).dump
```

### Restore
```bash
pg_restore -d eigdo_production /opt/eigdo/backups/db-YYYYMMDD_HHMMSS.dump
```

---

## Monitoring & Troubleshooting

### View Logs
```bash
# API logs
journalctl -u eigdo-api -f

# Worker logs
journalctl -u eigdo-worker -f

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo systemctl restart eigdo-api
sudo systemctl restart eigdo-worker
sudo systemctl restart eigdo-app
sudo systemctl restart eigdo-admin
sudo systemctl restart eigdo-landing
```

### Common Issues

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Service not running: `systemctl start eigdo-api` |
| SSL cert expired | `certbot renew` |
| DB connection refused | `systemctl start postgresql` |
| Redis down | `systemctl start redis-server` |
| Disk full | Clean old backups: `ls -la /opt/eigdo/backups/` |
| Port conflict | `ss -tlnp \| grep :5000` to find conflict |

---

## Security Checklist

- [ ] Change PostgreSQL `eigdo` user password from default
- [ ] Set strong JWT_SECRET (64+ characters)
- [ ] Generate ENCRYPTION_KEY (`openssl rand -base64 32`)
- [ ] Restrict admin panel to specific IPs (uncomment in `eigdo-admin.conf`)
- [ ] Disable SSH password auth after adding SSH keys
- [ ] Configure fail2ban for SSH protection
- [ ] Set up external backup copy (weekly to S3 or similar)
- [ ] Enable PostgreSQL connection logging
- [ ] Review CORS ALLOWED_ORIGINS matches production domains only
