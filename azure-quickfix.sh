#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Containerized Quick Setup Script
# One-command setup for containerized ROR-STAY deployment

log() { echo "[quick-setup] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "🚀 ROR-STAY Containerized Quick Setup"
log "======================================"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    if ! command -v sudo >/dev/null 2>&1; then
        error "This script needs to be run as root or with sudo access"
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# Get deployment type
DEPLOYMENT_TYPE="${1:-}"
if [ -z "$DEPLOYMENT_TYPE" ]; then
    log ""
    log "📋 Available deployment options:"
    log "   dev      - Development deployment (HTTP only)"
    log "   prod     - Production deployment (HTTPS with SSL)"
    log "   aws      - AWS EC2 optimized deployment"
    log ""
    read -p "Select deployment type [dev/prod/aws]: " DEPLOYMENT_TYPE
fi

case "$DEPLOYMENT_TYPE" in
    dev|development)
        DEPLOYMENT_TYPE="dev"
        ;;
    prod|production)
        DEPLOYMENT_TYPE="prod"
        ;;
    aws)
        DEPLOYMENT_TYPE="aws"
        ;;
    *)
        error "Invalid deployment type. Use: dev, prod, or aws"
        ;;
esac

log "📋 Selected deployment type: $DEPLOYMENT_TYPE"

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    log "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    $SUDO sh get-docker.sh
    $SUDO usermod -aG docker $USER
    rm get-docker.sh
    log "✅ Docker installed"
else
    log "✅ Docker already installed"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose >/dev/null 2>&1; then
    log "🔧 Installing Docker Compose..."
    $SUDO curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    log "✅ Docker Compose installed"
else
    log "✅ Docker Compose already installed"
fi

# Copy source code if original project exists
if [ -d "/root/ROR-STAY" ]; then
    log "📁 Copying source code from original project..."
    chmod +x scripts/copy-source.sh
    ./scripts/copy-source.sh /root/ROR-STAY
else
    log "⚠️  Original ROR-STAY project not found at /root/ROR-STAY"
    log "   Please ensure your source code is in the correct directories:"
    log "   - backend/src/ (FastAPI backend code)"
    log "   - frontend/src/ (React frontend code)"
fi

# Configure environment
if [ ! -f ".env" ]; then
    log "⚙️ Configuring environment..."
    cp .env.example .env
    
    if [ "$DEPLOYMENT_TYPE" = "dev" ]; then
        # Development configuration
        sed -i 's/DOMAIN=yourdomain.com/DOMAIN=localhost/' .env
        sed -i 's/SSL_ENABLED=true/SSL_ENABLED=false/' .env
        sed -i 's/ENVIRONMENT=production/ENVIRONMENT=development/' .env
    elif [ "$DEPLOYMENT_TYPE" = "aws" ]; then
        # AWS configuration
        if curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/ >/dev/null 2>&1; then
            PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
            sed -i "s/DOMAIN=yourdomain.com/DOMAIN=$PUBLIC_IP/" .env
            sed -i 's/SSL_ENABLED=true/SSL_ENABLED=false/' .env
        fi
    fi
    
    log "✅ Environment configured"
else
    log "✅ Environment file already exists"
fi

# Generate secure secrets
log "🔐 Generating secure secrets..."
JWT_SECRET=$(openssl rand -hex 32)
MONGO_PASSWORD=$(openssl rand -base64 32)

sed -i "s/your-super-secure-jwt-secret-key-change-this-in-production/$JWT_SECRET/" .env
sed -i "s/your-secure-mongo-password-here/$MONGO_PASSWORD/" .env

log "✅ Secure secrets generated"

# Deploy based on type
log "🚀 Starting deployment..."
case "$DEPLOYMENT_TYPE" in
    dev)
        ./scripts/deploy-dev.sh
        ;;
    prod)
        log "⚠️  For production deployment, please:"
        log "   1. Configure your domain in .env file"
        log "   2. Point your DNS to this server"
        log "   3. Run: ./scripts/deploy-prod.sh"
        exit 0
        ;;
    aws)
        ./scripts/aws-deploy.sh
        ;;
esac

# Run health check
log "🏥 Running health check..."
sleep 10
./scripts/health-check.sh

log ""
log "🎉 ROR-STAY containerized deployment completed successfully!"
log ""

case "$DEPLOYMENT_TYPE" in
    dev)
        log "🌐 Access your application at:"
        log "   Application: http://localhost"
        log "   API Health:  http://localhost/api/health"
        log "   API Docs:    http://localhost/api/docs"
        ;;
    aws)
        PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "your-server-ip")
        log "🌐 Access your application at:"
        log "   Application: http://$PUBLIC_IP"
        log "   API Health:  http://$PUBLIC_IP/api/health"
        log "   API Docs:    http://$PUBLIC_IP/api/docs"
        ;;
esac

log ""
log "📝 Useful commands:"
log "   View logs:     ./scripts/logs.sh [service]"
log "   Health check:  ./scripts/health-check.sh"
log "   Backup DB:     ./scripts/backup.sh"
log "   Stop services: docker-compose down"
log ""
log "🔒 Security: All services are running in isolated containers with security best practices applied."

