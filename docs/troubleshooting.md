# eigdo v2 — Troubleshooting Guide

## Server Access Issues

### SSH Connection Refused (port 22 closed)

**Symptoms**: `ssh: connect to host 69.167.167.18 port 22: Connection refused`

**Causes & Fixes**:

1. **Server is off**: Boot from LiquidWeb panel (manage.liquidweb.com)
2. **SSH not running**: Use VNC/IPMI console from LiquidWeb panel:
   ```bash
   systemctl status sshd
   systemctl start sshd
   systemctl enable sshd
   ```
3. **Firewall blocking**: From VNC console:
   ```bash
   ufw status
   ufw allow 22/tcp
   # OR if iptables:
   iptables -I INPUT -p tcp --dport 22 -j ACCEPT
   ```
4. **Server booting**: VPS can take 2-5 minutes after reboot. Ping first:
   ```bash
   ping 69.167.167.18  # Wait for responses before trying SSH
   ```

### SSH Password Rejected

**Symptoms**: `Permission denied, please try again`

**Fixes**:
1. Verify password from LiquidWeb panel
2. Reset root password from panel
3. Check if root login is disabled: `PermitRootLogin` in `/etc/ssh/sshd_config`
4. Special characters in password may need escaping

---

## Application Issues

### 502 Bad Gateway

**Cause**: Backend service not running or wrong port

```bash
# Check service status
systemctl status eigdo-api

# Check if port is listening
ss -tlnp | grep 5000

# Check logs
journalctl -u eigdo-api --since "5 minutes ago" --no-pager

# Restart
systemctl restart eigdo-api
```

### Frontend Returns Blank Page or API Errors

**Cause**: `NEXT_PUBLIC_API_URL` not set at build time

```bash
# Verify env file exists
cat /opt/eigdo/config/.env.app

# Rebuild frontend with correct env
cd /tmp/eigdo-build
bash infra/scripts/deploy.sh app
```

### API Returns 404 on Valid Routes

**Possible causes**:
1. **Route casing**: Use PascalCase (`/api/FiscalSettings` not `/api/fiscal-settings`)
2. **Service not restarted after code change**: `systemctl restart eigdo-api`
3. **Wrong base URL**: Check `NEXT_PUBLIC_API_URL` includes `/api` suffix

### QBO Sync Returns 404

**Cause**: Sandbox mode requires special handling

The sync endpoint checks:
```csharp
if (connection == null && !IsSandboxMode) return NotFound();
```

If `QBO_CLIENT_ID` is empty (sandbox), sync works without a QboConnection.
If `QBO_CLIENT_ID` is set (production), a QboConnection must exist first (user must complete OAuth).

### SuperAdmin Login Does Nothing

**Cause**: `NEXT_PUBLIC_API_URL` not set at build time for admin app

```bash
# Check env
cat /opt/eigdo/config/.env.admin
# Should contain: NEXT_PUBLIC_API_URL=https://api.eigdo.com/api

# Rebuild admin
bash infra/scripts/deploy.sh admin
```

### JWT Token Issues

```bash
# Check JWT config in env
grep JWT /opt/eigdo/config/.env

# Ensure JWT_SECRET is set and matches between API instances
# All API instances must share the same JWT_SECRET
```

---

## Database Issues

### Connection Failed

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check connection
sudo -u postgres psql -c "SELECT 1;"

# Check eigdo database exists
sudo -u postgres psql -l | grep eigdo

# Check connection string in env
grep DATABASE_CONNECTION /opt/eigdo/config/.env
```

### Migration Errors

```bash
# Check current migration state
# From dev machine with EF tools:
dotnet ef migrations list --project ../Eigdo.Infrastructure

# Apply pending migrations
dotnet ef database update --project ../Eigdo.Infrastructure
```

---

## Redis Issues

```bash
# Check Redis status
systemctl status redis-server

# Test connection
redis-cli ping  # Should return PONG

# Check memory usage
redis-cli info memory | grep used_memory_human
```

---

## SSL Certificate Issues

### Certificate Expired

```bash
# Check expiration
certbot certificates

# Renew
certbot renew

# Force renew
certbot renew --force-renewal
```

### Certificate Not Found

```bash
# Nginx expects certs at:
# /etc/letsencrypt/live/eigdo.com/fullchain.pem
# /etc/letsencrypt/live/eigdo.com/privkey.pem

# Get new certificate
certbot --nginx -d eigdo.com -d www.eigdo.com -d api.eigdo.com -d app.eigdo.com -d admin.eigdo.com
```

---

## Performance Issues

### High Memory Usage

```bash
# Check memory by process
ps aux --sort=-%mem | head -20

# Check Node.js memory (frontends)
# Each Next.js app uses ~200-400MB

# Check .NET memory
# API typically uses ~150-300MB
```

### Disk Space

```bash
# Check disk usage
df -h /

# Clean old backups (keep last 5)
ls -dt /opt/eigdo/backups/db-*.dump | tail -n +6 | xargs rm -f

# Clean old build artifacts
rm -rf /tmp/eigdo-build

# Clean journal logs older than 7 days
journalctl --vacuum-time=7d
```

### Slow API Responses

```bash
# Check PostgreSQL slow queries
sudo -u postgres psql eigdo_production -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check Redis latency
redis-cli --latency

# Check Nginx error log for upstream timeouts
grep "upstream timed out" /var/log/nginx/error.log
```

---

## Deployment Issues

### Build Fails on Server

```bash
# .NET build fails - check SDK vs Runtime
dotnet --info  # Production should have Runtime only
# Build should happen in /tmp/eigdo-build with full SDK
# OR build on CI and deploy artifacts

# Node build fails - check memory
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build

# Permission issues
chown -R eigdo:eigdo /opt/eigdo/
```

### Service Won't Start After Deploy

```bash
# Check service logs immediately after start attempt
systemctl start eigdo-api
journalctl -u eigdo-api --since "30 seconds ago" --no-pager

# Common causes:
# - Missing DLL: check /opt/eigdo/api/ has all files
# - Wrong .NET version: dotnet --info
# - Port already in use: ss -tlnp | grep 5000
# - Missing env file: ls -la /opt/eigdo/config/.env
```

---

## Useful Commands Cheat Sheet

```bash
# All services status
for svc in eigdo-api eigdo-worker eigdo-landing eigdo-app eigdo-admin; do
  echo "=== $svc ==="
  systemctl is-active $svc
done

# Restart everything
for svc in eigdo-api eigdo-worker eigdo-landing eigdo-app eigdo-admin; do
  systemctl restart $svc
done

# Tail all logs
journalctl -u 'eigdo-*' -f

# Quick health check
curl -s https://api.eigdo.com/health && echo " OK" || echo " FAIL"

# Database size
sudo -u postgres psql eigdo_production -c "SELECT pg_size_pretty(pg_database_size('eigdo_production'));"

# Active connections
sudo -u postgres psql eigdo_production -c "SELECT count(*) FROM pg_stat_activity WHERE datname='eigdo_production';"
```
