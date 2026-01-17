#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Production Deployment Script
# This script deploys ROR-STAY in production mode with SSL

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log() { echo "[deploy-prod] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "🚀 Starting ROR-STAY production deployment..."

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    if ! command -v sudo >/dev/null 2>&1; then
        error "This script needs to be run as root or with sudo access"
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    error "Docker is not installed. Please install Docker first."
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if .env file exists and has required variables
if [ ! -f "$PROJECT_DIR/.env" ]; then
    error ".env file not found. Please copy .env.example to .env and configure it."
fi

# Source environment variables
set -a
source "$PROJECT_DIR/.env"
set +a

# Validate required environment variables
if [ -z "${DOMAIN:-}" ] || [ -z "${EMAIL:-}" ]; then
    error "DOMAIN and EMAIL must be set in .env file for production deployment"
fi

# Change to project directory
cd "$PROJECT_DIR"

# Create necessary directories
log "📁 Creating necessary directories..."
$SUDO mkdir -p /opt/ror-stay-data/{mongodb,backups,logs,ssl}
$SUDO chown -R $USER:$USER /opt/ror-stay-data

# Update system packages
log "📦 Updating system packages..."
$SUDO apt-get update

# Install required packages
log "🔧 Installing required packages..."
$SUDO apt-get install -y curl wget ufw

# Configure firewall
log "🔥 Configuring firewall..."
$SUDO ufw --force enable
$SUDO ufw allow 22/tcp
$SUDO ufw allow 80/tcp
$SUDO ufw allow 443/tcp
$SUDO ufw status

# Stop any existing containers
log "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Pull latest images
log "📥 Pulling latest base images..."
docker-compose -f docker-compose.prod.yml pull

# Build and start services
log "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
log "⏳ Waiting for services to start..."
sleep 15

# Generate SSL certificates
if [ "${SSL_ENABLED:-true}" = "true" ]; then
    log "🔒 Generating SSL certificates..."
    
    # First, start nginx without SSL to handle ACME challenge
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    # Generate certificates
    docker-compose -f docker-compose.prod.yml run --rm certbot
    
    # Reload nginx with SSL configuration
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    log "✅ SSL certificates generated successfully"
fi

# Wait for services to be healthy
log "⏳ Waiting for services to be healthy..."
sleep 20

# Check service health
log "🏥 Checking service health..."
for service in mongodb backend frontend nginx; do
    if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up (healthy)"; then
        log "✅ $service is healthy"
    else
        log "⚠️  $service is not healthy yet, checking logs..."
        docker-compose -f docker-compose.prod.yml logs --tail=10 "$service"
    fi
done

# Setup automatic SSL renewal
log "🔄 Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml run --rm certbot renew && docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload") | crontab -

# Setup automatic backups
log "💾 Setting up automatic backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_DIR && ./scripts/backup.sh") | crontab -

# Show status
log ""
log "📊 Deployment Status:"
docker-compose -f docker-compose.prod.yml ps

log ""
log "🌐 Access URLs:"
if [ "${SSL_ENABLED:-true}" = "true" ]; then
    log "   Application: https://$DOMAIN"
    log "   API Health:  https://$DOMAIN/api/health"
    log "   API Docs:    https://$DOMAIN/api/docs"
else
    log "   Application: http://$DOMAIN"
    log "   API Health:  http://$DOMAIN/api/health"
    log "   API Docs:    http://$DOMAIN/api/docs"
fi

log ""
log "📝 Useful Commands:"
log "   View logs:     docker-compose -f docker-compose.prod.yml logs -f [service]"
log "   Stop services: docker-compose -f docker-compose.prod.yml down"
log "   Restart:       docker-compose -f docker-compose.prod.yml restart [service]"
log "   Backup DB:     ./scripts/backup.sh"
log "   Update app:    ./scripts/update.sh"

log ""
log "🔒 Security Notes:"
log "   - SSL certificates will auto-renew"
log "   - Database backups run daily at 2 AM"
log "   - Firewall is configured for ports 22, 80, 443"
log "   - All services run as non-root users"

log ""
log "✅ Production deployment completed successfully!"
log "🎉 Your ROR-STAY application is now running securely!"
