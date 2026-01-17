# 🚀 ROR STAY - Complete Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying ROR STAY on various cloud platforms. The application is containerized using Docker and includes all necessary components.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Nginx Reverse Proxy                        │
│              (SSL Termination + Security)                  │
│                   Port 80/443                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Private Docker Network                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Frontend      │  │    Backend      │  │  MongoDB    │ │
│  │   (React)       │  │   (FastAPI)     │  │ (Database)  │ │
│  │   Port 3000     │  │   Port 8000     │  │ Port 27017  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Pre-Deployment Checklist

### ✅ Required Files
- [ ] `docker-compose.yml` - Main orchestration file
- [ ] `deploy.sh` - Automated deployment script
- [ ] `README.md` - User documentation
- [ ] `TROUBLESHOOTING.md` - Issue resolution guide
- [ ] `database-init/` - Database initialization scripts
- [ ] `backend/` - FastAPI backend code
- [ ] `frontend/` - React frontend code
- [ ] `nginx/` - Nginx configuration

### ✅ Current Data Preserved
- [ ] 9 Property listings with images
- [ ] 5 Contact submissions
- [ ] Admin user account (admin@rorstay.com)
- [ ] Professional logo and branding
- [ ] Indian Rupee (₹) pricing format

## 🌐 Cloud Platform Deployment

### 🔶 AWS EC2 Deployment

#### Step 1: Launch EC2 Instance
```bash
# Instance Configuration:
# - AMI: Ubuntu Server 20.04 LTS
# - Instance Type: t3.medium (2 vCPU, 4GB RAM)
# - Storage: 20GB GP2 SSD
# - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
```

#### Step 2: Connect and Setup
```bash
# Connect to your instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Upload project files
scp -i your-key.pem -r /path/to/ror-stay ubuntu@your-ec2-ip:~/
```

#### Step 3: Deploy Application
```bash
# Navigate to project directory
cd ror-stay

# Run automated deployment
chmod +x deploy.sh
./deploy.sh deploy

# Check deployment status
./deploy.sh status
```

#### Step 4: Configure Security Group
```bash
# In AWS Console:
# 1. Go to EC2 → Security Groups
# 2. Select your instance's security group
# 3. Add inbound rules:
#    - HTTP (80) from 0.0.0.0/0
#    - HTTPS (443) from 0.0.0.0/0
#    - SSH (22) from your IP only
```

### 🔷 Azure VM Deployment

#### Step 1: Create Virtual Machine
```bash
# VM Configuration:
# - Image: Ubuntu Server 20.04 LTS
# - Size: Standard_B2s (2 vCPUs, 4GB RAM)
# - Disk: 30GB Premium SSD
# - Networking: Allow HTTP, HTTPS, SSH
```

#### Step 2: Setup and Deploy
```bash
# Connect to VM
ssh azureuser@your-vm-public-ip

# Follow same steps as AWS
sudo apt update && sudo apt upgrade -y

# Upload and deploy
scp -r /path/to/ror-stay azureuser@your-vm-ip:~/
cd ror-stay
./deploy.sh deploy
```

### 🟡 Google Cloud Platform (GCP)

#### Step 1: Create Compute Engine VM
```bash
# VM Configuration:
# - Machine type: e2-medium (2 vCPU, 4GB RAM)
# - Boot disk: Ubuntu 20.04 LTS, 20GB
# - Firewall: Allow HTTP and HTTPS traffic
```

#### Step 2: Setup and Deploy
```bash
# Connect via SSH (from GCP Console or gcloud CLI)
gcloud compute ssh your-vm-name

# Follow deployment steps
sudo apt update && sudo apt upgrade -y
# Upload project files and deploy
./deploy.sh deploy
```

### 🌊 DigitalOcean Droplet

#### Step 1: Create Droplet
```bash
# Droplet Configuration:
# - Image: Ubuntu 20.04 LTS
# - Plan: Basic $20/month (2GB RAM, 1 vCPU, 50GB SSD)
# - Region: Choose closest to your users
# - Add SSH key
```

#### Step 2: Deploy
```bash
# Connect to droplet
ssh root@your-droplet-ip

# Deploy application
cd /root
git clone your-repository-url ror-stay
cd ror-stay
./deploy.sh deploy
```

## 🔧 Manual Deployment Steps

### If Automated Script Fails

#### Step 1: Install Dependencies
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Logout and login again
exit
# Reconnect via SSH
```

#### Step 2: Prepare Environment
```bash
# Stop conflicting services
sudo systemctl stop nginx apache2 2>/dev/null || true

# Kill processes using port 80
sudo lsof -ti:80 | xargs sudo kill -9 2>/dev/null || true

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### Step 3: Deploy Services
```bash
# Navigate to project directory
cd ror-stay

# Build and start services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
sleep 30

# Check status
docker-compose ps
curl http://localhost/api/health
```

## 🔐 Production Security Setup

### SSL Certificate (Let's Encrypt)

#### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### Obtain Certificate
```bash
# Stop nginx container temporarily
docker-compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update nginx configuration to use SSL
# Edit nginx/nginx.conf to include SSL settings

# Restart nginx
docker-compose start nginx
```

### Firewall Configuration
```bash
# Install UFW
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Enable firewall
sudo ufw enable
```

### Security Headers
```nginx
# Add to nginx/nginx.conf
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## 📊 Monitoring and Maintenance

### Health Monitoring
```bash
# Create monitoring script
cat > /root/monitor-ror-stay.sh << 'EOF'
#!/bin/bash
if ! curl -s http://localhost/api/health >/dev/null; then
    echo "ROR STAY is down, restarting..."
    cd /root/ror-stay
    docker-compose restart
fi
EOF

chmod +x /root/monitor-ror-stay.sh

# Add to crontab (check every 5 minutes)
echo "*/5 * * * * /root/monitor-ror-stay.sh" | crontab -
```

### Backup Strategy
```bash
# Create backup script
cat > /root/backup-ror-stay.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T mongodb mongodump --out /backup
docker cp ror-stay-mongodb:/backup $BACKUP_DIR/database

# Backup uploaded images
docker cp ror-stay-backend:/app/uploads $BACKUP_DIR/uploads

# Backup configuration
cp -r /root/ror-stay $BACKUP_DIR/config

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /root/backup-ror-stay.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * /root/backup-ror-stay.sh" | crontab -
```

### Log Rotation
```bash
# Configure Docker log rotation
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## 🌍 Domain Configuration

### DNS Setup
```bash
# Point your domain to server IP
# A Record: @ → your-server-ip
# A Record: www → your-server-ip
# CNAME: admin → yourdomain.com
```

### Nginx Domain Configuration
```nginx
# Update nginx/nginx.conf
server_name yourdomain.com www.yourdomain.com;

# Add SSL configuration
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

## 📈 Performance Optimization

### Server Resources
```bash
# Recommended minimum specs:
# - CPU: 2 cores
# - RAM: 4GB
# - Storage: 20GB SSD
# - Bandwidth: 1TB/month
```

### Database Optimization
```javascript
// MongoDB indexes (already configured)
db.properties.createIndex({ id: 1 }, { unique: true });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ property_type: 1 });
db.properties.createIndex({ price: 1 });
db.properties.createIndex({ "address.city": 1 });
```

### Nginx Caching
```nginx
# Static file caching (already configured)
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 Update and Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Check health
./deploy.sh status
```

### Database Maintenance
```bash
# Compact database
docker-compose exec mongodb mongosh ror_stay --eval "db.runCommand({compact: 'properties'})"

# Repair database if needed
docker-compose exec mongodb mongosh ror_stay --eval "db.repairDatabase()"
```

## 🆘 Disaster Recovery

### Complete System Recovery
```bash
# Stop all services
docker-compose down -v

# Clean Docker system
docker system prune -a -f

# Restore from backup
cp -r /root/backups/latest/config/* /root/ror-stay/

# Rebuild and start
docker-compose build --no-cache
docker-compose up -d

# Restore database
docker cp /root/backups/latest/database ror-stay-mongodb:/restore
docker-compose exec mongodb mongorestore /restore

# Restore uploads
docker cp /root/backups/latest/uploads ror-stay-backend:/app/
```

## 📞 Support and Troubleshooting

### Quick Diagnostics
```bash
# Check all services
./deploy.sh status

# View logs
./deploy.sh logs

# Restart services
./deploy.sh restart

# Full system check
curl -I http://localhost
curl http://localhost/api/health
docker-compose ps
```

### Common Issues
1. **Port 80 in use**: Run `sudo lsof -ti:80 | xargs sudo kill -9`
2. **Docker permission denied**: Add user to docker group and logout/login
3. **Services not starting**: Check logs with `docker-compose logs`
4. **Database connection failed**: Restart MongoDB with `docker-compose restart mongodb`

---

## 🎉 Deployment Complete!

Your ROR STAY platform is now deployed and ready for production use!

### Access Points:
- **Main Website**: http://your-server-ip or http://yourdomain.com
- **Admin Panel**: http://your-server-ip/admin/listings
- **Contact Management**: http://your-server-ip/admin/submissions

### Default Credentials:
- **Email**: admin@rorstay.com
- **Password**: admin123

**Remember to change the default password after first login!**

**Happy Property Renting! 🏠✨**
