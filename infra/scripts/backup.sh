#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/eigdo/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== eigdo Database Backup - $TIMESTAMP ==="

pg_dump -Fc eigdo_production > "$BACKUP_DIR/db-$TIMESTAMP.dump"

# Keep last 30 days
find "$BACKUP_DIR" -name "db-*.dump" -mtime +30 -delete

echo "Backup complete: $BACKUP_DIR/db-$TIMESTAMP.dump"
echo "Size: $(du -h "$BACKUP_DIR/db-$TIMESTAMP.dump" | cut -f1)"
