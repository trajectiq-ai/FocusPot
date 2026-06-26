#!/bin/sh
# FocusPot — Automated PostgreSQL backup script
# Runs as a Docker sidecar container, creates daily dumps and retains 30 days.

set -e

BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/focuspot_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting FocusPot database backup..."

# Create the dump (compressed)
pg_dump | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] ERROR: Backup file is empty!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Delete backups older than retention period
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "focuspot_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Cleanup complete."

# Sleep until next backup (24 hours)
echo "[$(date)] Next backup in 24 hours..."
sleep 86400
