#!/bin/bash
set -euo pipefail

# eigdo v2 — Ubuntu 22.04 Server Setup Script
# Run as root on a fresh LiquidWeb VPS

echo "=== eigdo Server Setup ==="

# ─── 1. System updates ───────────────────────────────────────────
apt-get update && apt-get upgrade -y

# ─── 2. Create eigdo user ────────────────────────────────────────
if ! id -u eigdo &>/dev/null; then
    useradd -m -s /bin/bash eigdo
    echo "Created user: eigdo"
fi

# ─── 3. Install .NET 8 Runtime ───────────────────────────────────
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
apt-get update
apt-get install -y aspnetcore-runtime-8.0
echo ".NET 8 Runtime installed: $(dotnet --info | head -1)"

# ─── 4. Install Node.js 20 LTS ───────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node.js installed: $(node --version)"

# ─── 5. Install PostgreSQL 16 ────────────────────────────────────
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update
apt-get install -y postgresql-16
systemctl enable postgresql
systemctl start postgresql

# Create DB and user
sudo -u postgres psql -c "CREATE USER eigdo WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE eigdo_production OWNER eigdo;" 2>/dev/null || true
echo "PostgreSQL 16 configured"

# ─── 6. Install Redis 7 ──────────────────────────────────────────
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server
echo "Redis installed: $(redis-server --version)"

# ─── 7. Install Nginx ────────────────────────────────────────────
apt-get install -y nginx
systemctl enable nginx
echo "Nginx installed"

# ─── 8. Install Certbot (Let's Encrypt) ──────────────────────────
apt-get install -y certbot python3-certbot-nginx
echo "Certbot installed"

# ─── 9. Create directory structure ───────────────────────────────
mkdir -p /opt/eigdo/{api,worker,frontend/{landing,app,admin},config,backups,logs}
chown -R eigdo:eigdo /opt/eigdo

# ─── 10. Copy systemd service files ──────────────────────────────
echo "Copy systemd files manually:"
echo "  cp infra/systemd/*.service /etc/systemd/system/"
echo "  systemctl daemon-reload"
echo "  systemctl enable eigdo-api eigdo-worker eigdo-landing eigdo-app eigdo-admin"

# ─── 11. Copy Nginx configs ─────────────────────────────────────
echo "Copy Nginx configs manually:"
echo "  cp infra/nginx/*.conf /etc/nginx/sites-available/"
echo "  ln -s /etc/nginx/sites-available/eigdo-*.conf /etc/nginx/sites-enabled/"
echo "  nginx -t && systemctl reload nginx"

# ─── 12. SSL Certificates ───────────────────────────────────────
echo ""
echo "Run this to get SSL certificates:"
echo "  certbot --nginx -d eigdo.com -d www.eigdo.com -d api.eigdo.com -d app.eigdo.com -d admin.eigdo.com"

# ─── 13. Firewall ───────────────────────────────────────────────
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirect to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw --force enable
echo "Firewall configured (22, 80, 443)"

# ─── 14. Backup cron ────────────────────────────────────────────
CRON_LINE="0 2 * * * /opt/eigdo/scripts/backup.sh >> /opt/eigdo/logs/backup.log 2>&1"
(crontab -u eigdo -l 2>/dev/null; echo "$CRON_LINE") | crontab -u eigdo -
echo "Daily backup cron configured (2 AM)"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy .env to /opt/eigdo/config/.env and configure"
echo "  2. Copy .env.landing, .env.app, .env.admin to /opt/eigdo/config/"
echo "  3. Deploy with: bash infra/scripts/deploy.sh"
echo "  4. Get SSL certs: certbot --nginx -d eigdo.com ..."
echo "  5. Verify: curl https://api.eigdo.com/health"
