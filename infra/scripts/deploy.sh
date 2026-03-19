#!/bin/bash
set -euo pipefail

# eigdo v2 — Full Deployment Script
# Usage: ./deploy.sh [all|backend|frontend|api|worker|landing|app|admin]

DEPLOY_DIR="/opt/eigdo"
BUILD_DIR="/tmp/eigdo-build"
BACKUP_DIR="$DEPLOY_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMPONENT="${1:-all}"

echo "=== eigdo Deployment ($COMPONENT) - $TIMESTAMP ==="

# ─── Clone/pull source ──────────────────────────────────────────
if [ ! -d "$BUILD_DIR" ]; then
    echo "Cloning repository..."
    git clone https://github.com/YOUR_ORG/eigdo-v2.git "$BUILD_DIR"
else
    echo "Pulling latest..."
    cd "$BUILD_DIR" && git pull
fi

# ─── Backend deployment ─────────────────────────────────────────
deploy_backend() {
    echo "--- Building Backend ---"
    cd "$BUILD_DIR/backend"

    echo "Building API..."
    dotnet publish src/Eigdo.Api/Eigdo.Api.csproj -c Release -o "$BUILD_DIR/publish/api" --no-restore

    echo "Building Worker..."
    dotnet publish src/Eigdo.Worker/Eigdo.Worker.csproj -c Release -o "$BUILD_DIR/publish/worker" --no-restore

    echo "Backing up database..."
    pg_dump -Fc eigdo_production > "$BACKUP_DIR/db-$TIMESTAMP.dump" 2>/dev/null || true

    echo "Stopping backend services..."
    sudo systemctl stop eigdo-worker 2>/dev/null || true
    sudo systemctl stop eigdo-api 2>/dev/null || true

    echo "Deploying API..."
    [ -d "$DEPLOY_DIR/api" ] && cp -r "$DEPLOY_DIR/api" "$BACKUP_DIR/api-$TIMESTAMP"
    rm -rf "$DEPLOY_DIR/api"/*
    cp -r "$BUILD_DIR/publish/api/"* "$DEPLOY_DIR/api/"

    echo "Deploying Worker..."
    [ -d "$DEPLOY_DIR/worker" ] && cp -r "$DEPLOY_DIR/worker" "$BACKUP_DIR/worker-$TIMESTAMP"
    rm -rf "$DEPLOY_DIR/worker"/*
    cp -r "$BUILD_DIR/publish/worker/"* "$DEPLOY_DIR/worker/"

    echo "Starting backend services..."
    sudo systemctl start eigdo-api
    sudo systemctl start eigdo-worker

    # Health check
    sleep 3
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" == "200" ]; then
        echo "API health check: OK"
    else
        echo "WARNING: API health check returned $HTTP_CODE"
        journalctl -u eigdo-api --since "30 seconds ago" --no-pager | tail -10
    fi
}

# ─── Frontend deployment (generic) ──────────────────────────────
deploy_frontend() {
    local NAME="$1"
    local PORT="$2"
    local SERVICE="eigdo-$NAME"
    local SRC="$BUILD_DIR/frontend/$NAME"
    local DEST="$DEPLOY_DIR/frontend/$NAME"

    echo "--- Building Frontend: $NAME (port $PORT) ---"
    cd "$SRC"
    npm ci --production=false
    npm run build

    echo "Stopping $SERVICE..."
    sudo systemctl stop "$SERVICE" 2>/dev/null || true

    echo "Deploying $NAME..."
    rm -rf "$DEST"/*
    cp -r "$SRC/.next" "$DEST/.next"
    cp -r "$SRC/public" "$DEST/public" 2>/dev/null || true
    cp "$SRC/package.json" "$DEST/"
    cp "$SRC/next.config.ts" "$DEST/" 2>/dev/null || cp "$SRC/next.config.js" "$DEST/" 2>/dev/null || true

    # Install production dependencies only
    cd "$DEST"
    npm ci --production

    echo "Starting $SERVICE..."
    sudo systemctl start "$SERVICE"
    echo "$NAME deployed"
}

# ─── Execute deployment ─────────────────────────────────────────
case "$COMPONENT" in
    all)
        deploy_backend
        deploy_frontend "landing" 3000
        deploy_frontend "app" 3002
        deploy_frontend "admin" 3001
        ;;
    backend)
        deploy_backend
        ;;
    api)
        deploy_backend
        ;;
    worker)
        deploy_backend
        ;;
    frontend)
        deploy_frontend "landing" 3000
        deploy_frontend "app" 3002
        deploy_frontend "admin" 3001
        ;;
    landing)
        deploy_frontend "landing" 3000
        ;;
    app)
        deploy_frontend "app" 3002
        ;;
    admin)
        deploy_frontend "admin" 3001
        ;;
    *)
        echo "Usage: $0 [all|backend|frontend|api|worker|landing|app|admin]"
        exit 1
        ;;
esac

# ─── Cleanup old backups (keep 10) ──────────────────────────────
ls -dt "$BACKUP_DIR"/api-* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
ls -dt "$BACKUP_DIR"/worker-* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
ls -dt "$BACKUP_DIR"/db-*.dump 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "=== Deployment Complete ==="
