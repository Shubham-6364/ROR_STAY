#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Logs Viewer Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log() { echo "[logs] $*"; }

# Change to project directory
cd "$PROJECT_DIR"

# Check if service is specified
SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
    log "📋 Available services:"
    docker-compose ps --services
    log ""
    log "Usage: $0 [service_name]"
    log "   $0 backend    # View backend logs"
    log "   $0 frontend   # View frontend logs"
    log "   $0 mongodb    # View MongoDB logs"
    log "   $0 nginx      # View Nginx logs"
    log ""
    log "📊 All services status:"
    docker-compose ps
    log ""
    log "🔄 To follow all logs: docker-compose logs -f"
    exit 0
fi

# Check if service exists
if ! docker-compose ps --services | grep -q "^$SERVICE$"; then
    log "❌ Service '$SERVICE' not found"
    log "Available services:"
    docker-compose ps --services
    exit 1
fi

# Show logs for specified service
log "📋 Showing logs for service: $SERVICE"
log "Press Ctrl+C to exit"
log ""

docker-compose logs -f "$SERVICE"
