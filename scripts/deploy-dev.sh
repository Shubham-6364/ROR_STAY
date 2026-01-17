#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Development Deployment Script
# This script deploys ROR-STAY in development mode (HTTP only)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log() { echo "[deploy-dev] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "🚀 Starting ROR-STAY development deployment..."

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    error "Docker is not installed. Please install Docker first."
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log "📝 Creating .env file from template..."
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    log "⚠️  Please edit .env file with your configuration before continuing"
    log "   nano $PROJECT_DIR/.env"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

# Stop any existing containers
log "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Pull latest images
log "📥 Pulling latest base images..."
docker-compose pull

# Build and start services
log "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
log "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
log "🏥 Checking service health..."
for service in mongodb backend frontend nginx; do
    if docker-compose ps "$service" | grep -q "Up (healthy)"; then
        log "✅ $service is healthy"
    else
        log "⚠️  $service is not healthy yet, checking logs..."
        docker-compose logs --tail=10 "$service"
    fi
done

# Show status
log ""
log "📊 Deployment Status:"
docker-compose ps

log ""
log "🌐 Access URLs:"
log "   Application: http://localhost"
log "   API Health:  http://localhost/api/health"
log "   API Docs:    http://localhost/api/docs"

log ""
log "📝 Useful Commands:"
log "   View logs:     docker-compose logs -f [service]"
log "   Stop services: docker-compose down"
log "   Restart:       docker-compose restart [service]"
log "   Shell access:  docker-compose exec [service] /bin/bash"

log ""
log "✅ Development deployment completed successfully!"
log "🎉 Your ROR-STAY application is now running at http://localhost"
