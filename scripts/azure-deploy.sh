#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Azure VM Deployment Script
# This script deploys ROR-STAY on Azure VM with best practices

log() { echo "[azure-deploy] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "🚀 Starting ROR-STAY Azure VM deployment..."

# Check if running on Azure VM
if ! curl -s --connect-timeout 2 -H "Metadata: true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" >/dev/null 2>&1; then
    log "⚠️  Azure VM metadata not detected, but continuing with deployment..."
fi

# Get Azure VM metadata (if available)
if curl -s --connect-timeout 2 -H "Metadata: true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" >/dev/null 2>&1; then
    AZURE_METADATA=$(curl -s -H "Metadata: true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01")
    VM_NAME=$(echo "$AZURE_METADATA" | jq -r '.compute.name // "unknown"')
    RESOURCE_GROUP=$(echo "$AZURE_METADATA" | jq -r '.compute.resourceGroupName // "unknown"')
    LOCATION=$(echo "$AZURE_METADATA" | jq -r '.compute.location // "unknown"')
    VM_SIZE=$(echo "$AZURE_METADATA" | jq -r '.compute.vmSize // "unknown"')
    
    log "📍 Azure VM Details:"
    log "   VM Name: $VM_NAME"
    log "   Resource Group: $RESOURCE_GROUP"
    log "   Location: $LOCATION"
    log "   VM Size: $VM_SIZE"
fi

# Get public IP
PUBLIC_IP=$(curl -s --connect-timeout 5 ifconfig.me || curl -s --connect-timeout 5 ipinfo.io/ip || echo "unknown")
log "🌐 Public IP: $PUBLIC_IP"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    if ! command -v sudo >/dev/null 2>&1; then
        error "This script needs to be run as root or with sudo access"
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# Update system packages
log "📦 Updating system packages..."
$SUDO apt-get update
$SUDO apt-get upgrade -y

# Install Docker if not present
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

# Install Docker Compose if not present
if ! command -v docker-compose >/dev/null 2>&1; then
    log "🔧 Installing Docker Compose..."
    $SUDO curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    log "✅ Docker Compose installed"
else
    log "✅ Docker Compose already installed"
fi

# Install Azure CLI if not present
if ! command -v az >/dev/null 2>&1; then
    log "☁️ Installing Azure CLI..."
    curl -sL https://aka.ms/InstallAzureCLIDeb | $SUDO bash
    log "✅ Azure CLI installed"
else
    log "✅ Azure CLI already installed"
fi

# Install additional tools
log "🛠️ Installing additional tools..."
$SUDO apt-get install -y \
    jq \
    htop \
    nginx-extras \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw \
    unattended-upgrades \
    curl \
    wget \
    git

# Configure automatic security updates
log "🔒 Configuring automatic security updates..."
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | $SUDO tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# Configure fail2ban
log "🛡️ Configuring fail2ban..."
$SUDO systemctl enable fail2ban
$SUDO systemctl start fail2ban

# Configure firewall (UFW)
log "🔥 Configuring UFW firewall..."
$SUDO ufw --force enable
$SUDO ufw default deny incoming
$SUDO ufw default allow outgoing
$SUDO ufw allow 22/tcp comment "SSH"
$SUDO ufw allow 80/tcp comment "HTTP"
$SUDO ufw allow 443/tcp comment "HTTPS"
$SUDO ufw status

PROJECT_DIR="/opt/ror-stay"
log "📁 Creating project directory: $PROJECT_DIR"
$SUDO mkdir -p "$PROJECT_DIR"
$SUDO chown -R $USER:$USER "$PROJECT_DIR"

# Determine source directory and copy project files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"

log "📋 Copying project files from $SOURCE_DIR to $PROJECT_DIR..."

if [ -f "$SOURCE_DIR/docker-compose.yml" ] && [ -d "$SOURCE_DIR/scripts" ]; then
    # Copy all files from source to project directory
    cp -r "$SOURCE_DIR"/* "$PROJECT_DIR/" 2>/dev/null || true
    cp -r "$SOURCE_DIR"/.env.example "$PROJECT_DIR/" 2>/dev/null || true
    log "✅ Project files copied successfully"
else
    error "Source files not found in $SOURCE_DIR. Please ensure ROR-STAY-DOCKER structure is complete."
fi

cd "$PROJECT_DIR"

# Create Azure-specific .env file if it doesn't exist
if [ ! -f ".env" ]; then
    log "📝 Creating Azure-specific .env file..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        # Update .env with Azure-specific settings
        sed -i "s/yourdomain.com/$PUBLIC_IP/g" .env
        sed -i "s/your-email@example.com/admin@$PUBLIC_IP/g" .env
        sed -i "s/SSL_ENABLED=true/SSL_ENABLED=false/g" .env
        sed -i "s/ENVIRONMENT=production/ENVIRONMENT=development/g" .env
        log "✅ .env file created from template with Azure settings"
    else
        log "⚠️  .env.example not found, creating basic .env"
    
    # For initial deployment, disable SSL (can be enabled later with domain)
    sed -i "s/SSL_ENABLED=true/SSL_ENABLED=false/g" .env
    sed -i "s/AUTO_SSL=true/AUTO_SSL=false/g" .env
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -hex 32)
    MONGO_PASSWORD=$(openssl rand -base64 32)
    
    sed -i "s/your-super-secure-jwt-secret-key-change-this-in-production/$JWT_SECRET/g" .env
    sed -i "s/your-secure-mongo-password-here/$MONGO_PASSWORD/g" .env
    
    log "✅ Azure .env file created with secure secrets"
fi

# Create Azure-specific directories
log "📁 Creating Azure-specific directories..."
$SUDO mkdir -p /opt/ror-stay-data/{mongodb,backups,logs}
$SUDO chown -R $USER:$USER /opt/ror-stay-data

# Setup Azure Monitor integration (if Azure CLI is configured)
log "📊 Setting up Azure monitoring..."
if az account show >/dev/null 2>&1; then
    log "✅ Azure CLI is authenticated"
    
    # Create log analytics workspace (optional)
    if [ -n "${RESOURCE_GROUP:-}" ]; then
        log "📊 Creating Log Analytics workspace..."
        az monitor log-analytics workspace create \
            --resource-group "$RESOURCE_GROUP" \
            --workspace-name "ror-stay-logs" \
            --location "$LOCATION" \
            --sku "PerGB2018" \
            --retention-time 30 \
            2>/dev/null || log "⚠️  Log Analytics workspace creation skipped (may already exist)"
    fi
else
    log "⚠️  Azure CLI not authenticated. Run 'az login' for full Azure integration"
fi

# Deploy the application
log "🚀 Deploying ROR-STAY application..."
chmod +x scripts/*.sh

# Use development deployment for initial setup
./scripts/deploy-dev.sh

# Setup Azure-specific monitoring
log "📊 Setting up Azure-specific monitoring..."
cat > /tmp/azure-monitor-ror-stay.sh << 'EOF'
#!/bin/bash
# Azure-specific monitoring script for ROR-STAY

cd /opt/ror-stay

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "$(date): Some containers are down, restarting..." >> /var/log/ror-stay-monitor.log
    docker-compose restart
    
    # Send to Azure Monitor (if configured)
    if command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1; then
        az monitor metrics alert create \
            --name "ROR-STAY-Container-Down" \
            --description "ROR-STAY containers are down" \
            --severity 2 \
            --condition "count > 0" \
            2>/dev/null || true
    fi
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$(date): Disk usage is ${DISK_USAGE}%, cleaning up..." >> /var/log/ror-stay-monitor.log
    docker system prune -f
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "$(date): Memory usage is ${MEMORY_USAGE}%, restarting services..." >> /var/log/ror-stay-monitor.log
    docker-compose restart
fi

# Azure-specific health check
if command -v curl >/dev/null 2>&1; then
    if ! curl -f -s http://localhost/health >/dev/null 2>&1; then
        echo "$(date): Application health check failed" >> /var/log/ror-stay-monitor.log
        docker-compose restart
    fi
fi
EOF

$SUDO mv /tmp/azure-monitor-ror-stay.sh /usr/local/bin/azure-monitor-ror-stay.sh
$SUDO chmod +x /usr/local/bin/azure-monitor-ror-stay.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/azure-monitor-ror-stay.sh") | crontab -

# Create Azure-specific backup script
log "💾 Setting up Azure Blob Storage backups..."
cat > /tmp/azure-backup.sh << EOF
#!/bin/bash
# Azure Blob Storage backup script for ROR-STAY

BACKUP_DIR="/opt/ror-stay-data/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ror-stay-backup-\$DATE.tar.gz"

# Create backup
cd /opt/ror-stay
docker-compose exec -T mongodb mongodump --archive --gzip > "\$BACKUP_DIR/\$BACKUP_FILE"

# Upload to Azure Blob Storage (if configured)
if command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1; then
    # Check if storage account exists
    if [ -n "\${AZURE_STORAGE_ACCOUNT:-}" ]; then
        az storage blob upload \\
            --account-name "\$AZURE_STORAGE_ACCOUNT" \\
            --container-name "ror-stay-backups" \\
            --name "\$BACKUP_FILE" \\
            --file "\$BACKUP_DIR/\$BACKUP_FILE" \\
            --auth-mode login 2>/dev/null || echo "Azure backup upload failed"
        
        # Clean up local backup after successful upload
        if [ \$? -eq 0 ]; then
            rm "\$BACKUP_DIR/\$BACKUP_FILE"
        fi
    fi
fi

# Clean up old backups (keep last 7 days)
find "\$BACKUP_DIR" -name "ror-stay-backup-*.tar.gz" -mtime +7 -delete
EOF

$SUDO mv /tmp/azure-backup.sh /usr/local/bin/azure-backup.sh
$SUDO chmod +x /usr/local/bin/azure-backup.sh

# Add backup to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/azure-backup.sh") | crontab -

# Setup log forwarding to Azure Monitor (if configured)
if command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1; then
    log "📊 Setting up Azure Monitor log forwarding..."
    
    # Install Azure Monitor agent (optional)
    wget https://raw.githubusercontent.com/Microsoft/OMS-Agent-for-Linux/master/installer/scripts/onboard_agent.sh
    chmod +x onboard_agent.sh
    # Note: This requires workspace ID and key - would need to be configured separately
    log "⚠️  Azure Monitor agent installation requires workspace credentials"
    rm -f onboard_agent.sh
fi

# Show final status
log ""
log "🎉 Azure VM deployment completed successfully!"
log ""
log "📊 Azure VM Information:"
if [ -n "${VM_NAME:-}" ]; then
    log "   VM Name: $VM_NAME"
    log "   Resource Group: $RESOURCE_GROUP"
    log "   Location: $LOCATION"
    log "   VM Size: $VM_SIZE"
fi
log "   Public IP: $PUBLIC_IP"
log ""
log "🌐 Access URLs:"
log "   Application: http://$PUBLIC_IP"
log "   API Health:  http://$PUBLIC_IP/api/health"
log "   API Docs:    http://$PUBLIC_IP/api/docs"
log ""
log "📝 Azure-Specific Next Steps:"
log "   1. Configure Network Security Group in Azure Portal:"
log "      - Allow inbound rules for ports 80, 443, 22"
log "   2. Set up Azure DNS (optional):"
log "      - Create DNS zone for your domain"
log "      - Point domain to $PUBLIC_IP"
log "   3. Enable SSL with domain:"
log "      - Update DOMAIN in .env file"
log "      - Run: ./scripts/deploy-prod.sh"
log "   4. Configure Azure Monitor (optional):"
log "      - Run: az login"
log "      - Set up Log Analytics workspace"
log "   5. Configure Azure Blob Storage for backups (optional):"
log "      - Create storage account"
log "      - Set AZURE_STORAGE_ACCOUNT environment variable"
log ""
log "🔒 Azure Security Features Enabled:"
log "   ✅ UFW firewall configured"
log "   ✅ Fail2ban intrusion detection"
log "   ✅ Automatic security updates"
log "   ✅ Container health monitoring"
log "   ✅ Automatic backups"
log ""
log "📊 Monitoring:"
log "   - Container health checks every 5 minutes"
log "   - Daily database backups at 2 AM"
log "   - Logs available in /var/log/ror-stay-monitor.log"
log ""
log "⚠️  Azure Network Security Group Requirements:"
log "   - Port 22 (SSH) - Your IP only"
log "   - Port 80 (HTTP) - 0.0.0.0/0"
log "   - Port 443 (HTTPS) - 0.0.0.0/0"
log ""
log "🔧 Azure CLI Commands for NSG setup:"
log "   az network nsg rule create --resource-group $RESOURCE_GROUP --nsg-name <nsg-name> --name AllowHTTP --protocol Tcp --priority 1000 --destination-port-range 80 --access Allow"
log "   az network nsg rule create --resource-group $RESOURCE_GROUP --nsg-name <nsg-name> --name AllowHTTPS --protocol Tcp --priority 1001 --destination-port-range 443 --access Allow"
