#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Database Backup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ror-stay-backup-$DATE.tar.gz"

log() { echo "[backup] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "💾 Starting ROR-STAY database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Check if MongoDB container is running
if ! docker-compose ps mongodb | grep -q "Up"; then
    error "MongoDB container is not running"
fi

# Create database backup
log "📦 Creating database backup..."
docker-compose exec -T mongodb mongodump --archive --gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "✅ Backup created successfully: $BACKUP_FILE"
    log "📍 Location: $BACKUP_DIR/$BACKUP_FILE"
    log "📊 Size: $(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)"
else
    error "Failed to create backup"
fi

# Clean up old backups (keep last 30 days)
log "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "ror-stay-backup-*.tar.gz" -mtime +30 -delete

# Show backup statistics
log ""
log "📊 Backup Statistics:"
log "   Total backups: $(ls -1 "$BACKUP_DIR"/ror-stay-backup-*.tar.gz 2>/dev/null | wc -l)"
log "   Backup directory size: $(du -sh "$BACKUP_DIR" | cut -f1)"
log "   Latest backup: $BACKUP_FILE"

log ""
log "✅ Backup completed successfully!"
