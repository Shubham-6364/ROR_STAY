#!/usr/bin/env bash
set -euo pipefail

# Quick fix for Azure deployment issue
log() { echo "[azure-fix] $*"; }

log "🔧 Fixing Azure deployment setup..."

# Get current directory
CURRENT_DIR="$(pwd)"
log "Current directory: $CURRENT_DIR"

# Check if we're in the right place
if [ ! -f "docker-compose.yml" ] || [ ! -d "scripts" ]; then
    log "❌ Not in ROR-STAY-DOCKER directory. Please run from /root/ROR-STAY-DOCKER"
    exit 1
fi

# Create project directory
PROJECT_DIR="/opt/ror-stay"
sudo mkdir -p "$PROJECT_DIR"
sudo chown -R $USER:$USER "$PROJECT_DIR"

log "📋 Copying all files to $PROJECT_DIR..."

# Copy all files
cp -r . "$PROJECT_DIR/"

# Change to project directory
cd "$PROJECT_DIR"

# Get public IP
PUBLIC_IP=$(curl -s --connect-timeout 5 ifconfig.me || curl -s --connect-timeout 5 ipinfo.io/ip || echo "localhost")
log "🌐 Public IP: $PUBLIC_IP"

# Create .env file
log "📝 Creating .env file..."
if [ -f ".env.example" ]; then
    cp .env.example .env
    
    # Update with Azure settings
    sed -i "s/yourdomain.com/$PUBLIC_IP/g" .env
    sed -i "s/your-email@example.com/admin@$PUBLIC_IP/g" .env
    sed -i "s/SSL_ENABLED=true/SSL_ENABLED=false/g" .env
    sed -i "s/AUTO_SSL=true/AUTO_SSL=false/g" .env
    sed -i "s/ENVIRONMENT=production/ENVIRONMENT=development/g" .env
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -hex 32)
    MONGO_PASSWORD=$(openssl rand -base64 32)
    
    sed -i "s/your-super-secure-jwt-secret-key-change-this-in-production/$JWT_SECRET/g" .env
    sed -i "s/your-secure-mongo-password-here/$MONGO_PASSWORD/g" .env
    
    log "✅ .env file created with Azure settings"
else
    log "❌ .env.example not found"
    exit 1
fi

# Make scripts executable
chmod +x scripts/*.sh

# Deploy
log "🚀 Starting deployment..."
./scripts/deploy-dev.sh

log "✅ Azure deployment fix completed!"
log "🌐 Access your app at: http://$PUBLIC_IP"
