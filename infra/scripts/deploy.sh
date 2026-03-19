#!/bin/bash
set -euo pipefail

# eigdo deployment script
DEPLOY_DIR="/opt/eigdo"
API_DIR="$DEPLOY_DIR/api"
WORKER_DIR="$DEPLOY_DIR/worker"
BACKUP_DIR="$DEPLOY_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== eigdo Deployment - $TIMESTAMP ==="

# 1. Build
echo "Building API..."
cd /tmp/eigdo-build/backend
dotnet publish src/Eigdo.Api/Eigdo.Api.csproj -c Release -o /tmp/eigdo-build/api-publish

echo "Building Worker..."
dotnet publish src/Eigdo.Worker/Eigdo.Worker.csproj -c Release -o /tmp/eigdo-build/worker-publish

# 2. Backup current
echo "Backing up current deployment..."
if [ -d "$API_DIR" ]; then
    cp -r "$API_DIR" "$BACKUP_DIR/api-$TIMESTAMP"
fi

# 3. Database backup
echo "Backing up database..."
pg_dump -Fc eigdo_production > "$BACKUP_DIR/db-$TIMESTAMP.dump"

# 4. Stop services
echo "Stopping services..."
sudo systemctl stop eigdo-worker
sudo systemctl stop eigdo-api

# 5. Deploy
echo "Deploying API..."
rm -rf "$API_DIR"/*
cp -r /tmp/eigdo-build/api-publish/* "$API_DIR/"

echo "Deploying Worker..."
rm -rf "$WORKER_DIR"/*
cp -r /tmp/eigdo-build/worker-publish/* "$WORKER_DIR/"

# 6. Run migrations
echo "Running database migrations..."
cd "$API_DIR"
dotnet Eigdo.Api.dll --migrate-only 2>/dev/null || true

# 7. Start services
echo "Starting services..."
sudo systemctl start eigdo-api
sudo systemctl start eigdo-worker

# 8. Health check
echo "Waiting for health check..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo "=== Deployment successful! ==="
else
    echo "=== WARNING: Health check returned $HTTP_CODE ==="
    echo "Checking logs..."
    journalctl -u eigdo-api --since "1 minute ago" --no-pager
fi

# 9. Cleanup old backups (keep 10)
ls -dt "$BACKUP_DIR"/api-* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
ls -dt "$BACKUP_DIR"/db-*.dump 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "=== Done ==="
