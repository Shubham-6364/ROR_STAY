# 🚀 ROR-STAY Containerized Setup Instructions

## 📋 Prerequisites

Before deploying ROR-STAY, ensure you have:

- **Ubuntu 20.04+ or 22.04+** (recommended)
- **Docker & Docker Compose** installed
- **Domain name** (for production with SSL)
- **Cloud provider account** (AWS/GCP/Azure)

## 🏗️ Project Structure Setup

### 1️⃣ Copy Source Code

You need to copy your ROR-STAY source code into the containerized structure:

```bash
# Create the containerized project directory
mkdir -p /opt/ror-stay-docker
cd /opt/ror-stay-docker

# Copy the containerized files (this directory structure)
# Then copy your source code:

# Backend source code
cp -r /root/ROR-STAY/backend/src/* ./backend/src/

# Frontend source code  
cp -r /root/ROR-STAY/frontend/src/* ./frontend/src/
cp /root/ROR-STAY/frontend/public/* ./frontend/public/
cp /root/ROR-STAY/frontend/craco.config.js ./frontend/
cp /root/ROR-STAY/frontend/tailwind.config.js ./frontend/
cp /root/ROR-STAY/frontend/postcss.config.js ./frontend/
```

### 2️⃣ Directory Structure

Your final structure should look like:

```
/opt/ror-stay-docker/
├── README.md
├── .env.example
├── docker-compose.yml
├── docker-compose.prod.yml
├── scripts/
│   ├── deploy-dev.sh
│   ├── deploy-prod.sh
│   ├── aws-deploy.sh
│   ├── backup.sh
│   └── logs.sh
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── server.py
│       ├── routes/
│       ├── models/
│       └── ... (your backend code)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── nginx.conf
│   ├── public/
│   └── src/
│       ├── components/
│       ├── lib/
│       └── ... (your frontend code)
└── mongodb/
    └── init/
```

## 🌍 Deployment Options

### Option 1: Local Development
```bash
cd /opt/ror-stay-docker
cp .env.example .env
# Edit .env for local development
./scripts/deploy-dev.sh
```

### Option 2: AWS EC2 Production
```bash
# On your AWS EC2 instance
cd /opt/ror-stay-docker
cp .env.example .env
# Edit .env with your domain and email
./scripts/aws-deploy.sh
```

### Option 3: Manual Production
```bash
cd /opt/ror-stay-docker
cp .env.example .env
# Edit .env with your configuration
./scripts/deploy-prod.sh
```

## ⚙️ Environment Configuration

### Required Environment Variables

Edit `.env` file with your settings:

```bash
# Domain & SSL
DOMAIN=yourdomain.com
EMAIL=your-email@example.com

# Database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your-secure-password

# Backend
JWT_SECRET_KEY=your-super-secure-jwt-secret
CORS_ORIGINS=https://yourdomain.com

# Security
SSL_ENABLED=true
AUTO_SSL=true
```

## 🔒 Security Features

### ✅ Implemented Security
- **SSL/TLS encryption** with automatic Let's Encrypt certificates
- **Reverse proxy** with Nginx handling all external traffic
- **Private Docker network** - backend and database isolated
- **Non-root containers** - all services run as non-root users
- **Security headers** - HSTS, CSP, X-Frame-Options, etc.
- **Rate limiting** - protection against abuse
- **Firewall configuration** - UFW with minimal open ports
- **Container health checks** - automatic restart on failure

### 🛡️ Additional Security (Production)
- **Fail2ban** - intrusion detection and prevention
- **Automatic security updates** - unattended-upgrades
- **Log monitoring** - centralized logging
- **Backup encryption** - encrypted database backups
- **Secret management** - environment-based secrets

## 📊 Monitoring & Management

### Health Checks
```bash
# Check all services
docker-compose ps

# Check specific service health
curl http://localhost/health
curl http://localhost/api/health
```

### View Logs
```bash
# View all logs
./scripts/logs.sh

# View specific service logs
./scripts/logs.sh backend
./scripts/logs.sh frontend
./scripts/logs.sh nginx
```

### Database Management
```bash
# Create backup
./scripts/backup.sh

# View backup status
ls -la backups/

# Access MongoDB shell
docker-compose exec mongodb mongosh
```

## 🌐 Cloud Provider Specific Setup

### AWS EC2
1. **Launch Instance**: Ubuntu 22.04, t3.medium or larger
2. **Security Group**: Ports 22, 80, 443
3. **Elastic IP**: Assign static IP (optional)
4. **Domain**: Point DNS to instance IP
5. **Run**: `./scripts/aws-deploy.sh`

### Google Cloud Platform
1. **Create VM**: Ubuntu 22.04, e2-medium or larger
2. **Firewall Rules**: Allow HTTP/HTTPS traffic
3. **Static IP**: Reserve external IP (optional)
4. **Domain**: Point DNS to instance IP
5. **Run**: `./scripts/deploy-prod.sh`

### Microsoft Azure
1. **Create VM**: Ubuntu 22.04, Standard_B2s or larger
2. **Network Security Group**: Allow ports 22, 80, 443
3. **Public IP**: Create static public IP (optional)
4. **Domain**: Point DNS to instance IP
5. **Run**: `./scripts/deploy-prod.sh`

## 🔧 Troubleshooting

### Common Issues

**1. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose exec nginx ls -la /etc/letsencrypt/live/

# Manually renew certificates
docker-compose run --rm certbot renew
```

**2. Database Connection Issues**
```bash
# Check MongoDB logs
./scripts/logs.sh mongodb

# Test database connection
docker-compose exec backend python -c "from pymongo import MongoClient; print(MongoClient('mongodb://mongodb:27017').admin.command('ping'))"
```

**3. Container Health Issues**
```bash
# Check container status
docker-compose ps

# Restart unhealthy containers
docker-compose restart [service_name]

# View container resource usage
docker stats
```

**4. Network Issues**
```bash
# Check network connectivity
docker network ls
docker network inspect ror-stay-network

# Test internal connectivity
docker-compose exec frontend curl http://backend:8000/api/health
```

## 📈 Performance Optimization

### Production Optimizations
- **Multi-stage Docker builds** for smaller images
- **Nginx caching** and compression
- **Database indexing** for better query performance
- **Container resource limits** to prevent resource exhaustion
- **Load balancing** with multiple backend replicas

### Scaling Options
```bash
# Scale backend horizontally
docker-compose up -d --scale backend=3

# Monitor resource usage
docker stats

# Adjust resource limits in docker-compose.prod.yml
```

## 🔄 Updates & Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### System Maintenance
```bash
# Clean up unused Docker resources
docker system prune -f

# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services
docker-compose restart
```

## 📞 Support & Resources

### Useful Commands
```bash
# View all containers
docker ps -a

# Access container shell
docker-compose exec [service] /bin/bash

# View Docker logs
docker-compose logs -f [service]

# Monitor resources
docker stats

# Network troubleshooting
docker network inspect ror-stay-network
```

### Log Locations
- **Application logs**: `./scripts/logs.sh`
- **Nginx logs**: `/var/log/nginx/` (inside nginx container)
- **System logs**: `/var/log/syslog`
- **Docker logs**: `docker-compose logs`

---

**🎯 This containerized deployment provides a production-ready, secure, and scalable solution for ROR-STAY that works consistently across all cloud providers!**
