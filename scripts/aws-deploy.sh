#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY AWS EC2 Deployment Script
# This script deploys ROR-STAY on AWS EC2 with best practices

log() { echo "[aws-deploy] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "🚀 Starting ROR-STAY AWS EC2 deployment..."

# Check if running on EC2
if ! curl -s --connect-timeout 2 http://169.254.169.254/latest/meta-data/ >/dev/null 2>&1; then
    error "This script should be run on an AWS EC2 instance"
fi

# Get EC2 metadata
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

log "📍 EC2 Instance Details:"
log "   Instance ID: $INSTANCE_ID"
log "   Region: $REGION"
log "   Public IP: $PUBLIC_IP"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
    if ! command -v sudo >/dev/null 2>&1; then
        error "This script needs to be run as root or with sudo access"
    fi
    SUDO="sudo"
else
    SUDO=""
fi

# Update system
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
fi

# Install Docker Compose if not present
if ! command -v docker-compose >/dev/null 2>&1; then
    log "🔧 Installing Docker Compose..."
    $SUDO curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
fi

# Install AWS CLI if not present
if ! command -v aws >/dev/null 2>&1; then
    log "☁️ Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    $SUDO ./aws/install
    rm -rf aws awscliv2.zip
fi

# Install other useful tools
log "🛠️ Installing additional tools..."
$SUDO apt-get install -y \
    htop \
    nginx-extras \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    ufw \
    unattended-upgrades

# Configure automatic security updates
log "🔒 Configuring automatic security updates..."
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | $SUDO tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# Configure fail2ban
log "🛡️ Configuring fail2ban..."
$SUDO systemctl enable fail2ban
$SUDO systemctl start fail2ban

# Configure firewall
log "🔥 Configuring UFW firewall..."
$SUDO ufw --force enable
$SUDO ufw default deny incoming
$SUDO ufw default allow outgoing
$SUDO ufw allow 22/tcp
$SUDO ufw allow 80/tcp
$SUDO ufw allow 443/tcp

# Create project directory
PROJECT_DIR="/opt/ror-stay"
log "📁 Creating project directory: $PROJECT_DIR"
$SUDO mkdir -p "$PROJECT_DIR"
$SUDO chown -R $USER:$USER "$PROJECT_DIR"

# Clone or copy project files (assuming they're already present)
cd "$PROJECT_DIR"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    log "📝 Creating .env file..."
    cp .env.example .env
    
    # Update .env with AWS-specific settings
    sed -i "s/yourdomain.com/$PUBLIC_IP/g" .env
    sed -i "s/your-email@example.com/admin@$PUBLIC_IP/g" .env
    sed -i "s/SSL_ENABLED=true/SSL_ENABLED=false/g" .env
    
    log "⚠️  .env file created with basic settings. Please review and update:"
    log "   nano $PROJECT_DIR/.env"
fi

# Create AWS-specific directories
log "📁 Creating AWS-specific directories..."
$SUDO mkdir -p /opt/ror-stay-data/{mongodb,backups,logs}
$SUDO chown -R $USER:$USER /opt/ror-stay-data

# Setup CloudWatch logs (if IAM role allows)
log "📊 Setting up CloudWatch logs..."
if aws logs describe-log-groups --region "$REGION" >/dev/null 2>&1; then
    # Create log groups
    aws logs create-log-group --log-group-name "/aws/ec2/ror-stay/nginx" --region "$REGION" || true
    aws logs create-log-group --log-group-name "/aws/ec2/ror-stay/backend" --region "$REGION" || true
    aws logs create-log-group --log-group-name "/aws/ec2/ror-stay/frontend" --region "$REGION" || true
    
    log "✅ CloudWatch log groups created"
else
    log "⚠️  CloudWatch logs not configured (IAM permissions may be missing)"
fi

# Deploy the application
log "🚀 Deploying ROR-STAY application..."
chmod +x scripts/*.sh

# Choose deployment type based on domain configuration
if grep -q "yourdomain.com" .env || grep -q "$PUBLIC_IP" .env; then
    log "📍 Deploying in development mode (no SSL)"
    ./scripts/deploy-dev.sh
else
    log "🔒 Deploying in production mode with SSL"
    ./scripts/deploy-prod.sh
fi

# Setup monitoring
log "📊 Setting up basic monitoring..."
cat > /tmp/monitor-ror-stay.sh << 'EOF'
#!/bin/bash
# Simple monitoring script for ROR-STAY

cd /opt/ror-stay

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "$(date): Some containers are down, restarting..." >> /var/log/ror-stay-monitor.log
    docker-compose restart
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
EOF

$SUDO mv /tmp/monitor-ror-stay.sh /usr/local/bin/monitor-ror-stay.sh
$SUDO chmod +x /usr/local/bin/monitor-ror-stay.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-ror-stay.sh") | crontab -

# Create AWS-specific backup script
log "💾 Setting up AWS S3 backups..."
cat > /tmp/aws-backup.sh << EOF
#!/bin/bash
# AWS S3 backup script for ROR-STAY

BACKUP_DIR="/opt/ror-stay-data/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="ror-stay-backup-\$DATE.tar.gz"

# Create backup
cd /opt/ror-stay
docker-compose exec -T mongodb mongodump --archive --gzip > "\$BACKUP_DIR/\$BACKUP_FILE"

# Upload to S3 (if configured)
if [ -n "\${AWS_S3_BUCKET:-}" ]; then
    aws s3 cp "\$BACKUP_DIR/\$BACKUP_FILE" "s3://\$AWS_S3_BUCKET/ror-stay-backups/" --region "$REGION"
    
    # Clean up local backup after successful upload
    if [ \$? -eq 0 ]; then
        rm "\$BACKUP_DIR/\$BACKUP_FILE"
    fi
fi

# Clean up old backups (keep last 7 days)
find "\$BACKUP_DIR" -name "ror-stay-backup-*.tar.gz" -mtime +7 -delete
EOF

$SUDO mv /tmp/aws-backup.sh /usr/local/bin/aws-backup.sh
$SUDO chmod +x /usr/local/bin/aws-backup.sh

# Add backup to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/aws-backup.sh") | crontab -

# Show final status
log ""
log "🎉 AWS EC2 deployment completed successfully!"
log ""
log "📊 Instance Information:"
log "   Instance ID: $INSTANCE_ID"
log "   Region: $REGION"
log "   Public IP: $PUBLIC_IP"
log ""
log "🌐 Access URLs:"
log "   Application: http://$PUBLIC_IP"
log "   API Health:  http://$PUBLIC_IP/api/health"
log "   API Docs:    http://$PUBLIC_IP/api/docs"
log ""
log "📝 Next Steps:"
log "   1. Configure your domain DNS to point to $PUBLIC_IP"
log "   2. Update .env file with your domain name"
log "   3. Run ./scripts/deploy-prod.sh for SSL setup"
log "   4. Configure AWS S3 bucket for backups (optional)"
log ""
log "🔒 Security Features Enabled:"
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
log "⚠️  AWS Security Group Requirements:"
log "   - Port 22 (SSH) - Your IP only"
log "   - Port 80 (HTTP) - 0.0.0.0/0"
log "   - Port 443 (HTTPS) - 0.0.0.0/0"
