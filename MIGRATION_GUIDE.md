# 🔄 ROR-STAY Migration Guide: From Local to Containerized

## 📋 Overview

This guide helps you migrate from the existing ROR-STAY setup to the new **secure, containerized deployment** that eliminates dependency conflicts and provides production-ready infrastructure.

## 🆚 Comparison: Before vs After

### Before (Local Setup)
```
❌ Manual dependency management
❌ IP address hardcoding issues  
❌ No SSL/HTTPS support
❌ Manual firewall configuration
❌ No container isolation
❌ Single point of failure
❌ Manual backup processes
❌ No health monitoring
```

### After (Containerized Setup)
```
✅ Automated dependency management
✅ Dynamic IP configuration
✅ Automatic SSL/HTTPS with Let's Encrypt
✅ Automated security configuration
✅ Complete container isolation
✅ High availability with health checks
✅ Automated backup and monitoring
✅ Production-ready architecture
```

## 🏗️ Architecture Comparison

### Old Architecture
```
Internet → Server:3000 (Frontend)
         → Server:8000 (Backend)
         → Server:27017 (MongoDB)
```

### New Architecture
```
Internet → Nginx:443/80 (SSL + Reverse Proxy)
         → Private Network:
           ├── Frontend:3000 (Container)
           ├── Backend:8000 (Container)  
           └── MongoDB:27017 (Container)
```

## 🚀 Migration Steps

### Step 1: Prepare Containerized Environment
```bash
# Create containerized project directory
sudo mkdir -p /opt/ror-stay-docker
sudo chown -R $USER:$USER /opt/ror-stay-docker
cd /opt/ror-stay-docker

# Copy all containerized files (from this directory structure)
# Ensure you have all the files created in this session
```

### Step 2: Copy Your Source Code
```bash
# Run the automated copy script
./scripts/copy-source.sh /root/ROR-STAY

# Or manually copy:
cp -r /root/ROR-STAY/backend/* ./backend/src/
cp -r /root/ROR-STAY/frontend/src/* ./frontend/src/
cp -r /root/ROR-STAY/frontend/public/* ./frontend/public/
```

### Step 3: Stop Old Services
```bash
# Stop the old ROR-STAY services
cd /root/ROR-STAY
./stop-services.sh

# Verify ports are free
sudo netstat -tlnp | grep -E ":(3000|8000|27017)"
```

### Step 4: Quick Containerized Setup
```bash
cd /opt/ror-stay-docker

# One-command setup
./quick-setup.sh dev    # For development
# OR
./quick-setup.sh aws    # For AWS deployment
# OR
./quick-setup.sh prod   # For production (requires domain)
```

### Step 5: Verify Migration
```bash
# Run comprehensive health check
./scripts/health-check.sh

# Test all endpoints
curl http://localhost/health
curl http://localhost/api/health
curl http://localhost/api/docs
```

## 🔧 Configuration Migration

### Environment Variables Migration

**Old (.env files in multiple locations):**
```bash
# /root/ROR-STAY/frontend/.env
REACT_APP_API_BASE_URL=http://172.16.0.4:8000/api

# /root/ROR-STAY/dev-config.sh
export CORS_ORIGINS="http://localhost:3000,http://172.16.0.4:3000"
```

**New (Single .env file):**
```bash
# /opt/ror-stay-docker/.env
DOMAIN=yourdomain.com
REACT_APP_API_BASE_URL=/api
CORS_ORIGINS=https://yourdomain.com
SSL_ENABLED=true
```

### Database Migration

**Backup from old system:**
```bash
cd /root/ROR-STAY
docker exec ror-mongo mongodump --archive --gzip > backup.gz
```

**Restore to new system:**
```bash
cd /opt/ror-stay-docker
docker-compose exec -T mongodb mongorestore --archive --gzip < /root/ROR-STAY/backup.gz
```

## 🌍 Cloud Provider Migration

### AWS EC2 Migration

**From old setup:**
1. Stop old services: `./stop-services.sh`
2. Create new directory: `/opt/ror-stay-docker`
3. Run: `./scripts/aws-deploy.sh`

**Security Group Updates:**
- Keep ports 22, 80, 443 open
- Remove any custom port configurations

### GCP/Azure Migration

**Similar process:**
1. Stop old services
2. Setup containerized version
3. Update firewall rules for standard HTTP/HTTPS ports
4. Run production deployment

## 🔒 Security Improvements

### New Security Features
- **SSL/TLS Encryption**: Automatic Let's Encrypt certificates
- **Reverse Proxy**: Nginx handles all external traffic
- **Container Isolation**: Each service runs in isolated containers
- **Non-root Containers**: All services run as non-privileged users
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: Protection against DDoS and abuse
- **Firewall Integration**: Automatic UFW configuration
- **Health Monitoring**: Automatic service restart on failure

### Security Checklist After Migration
- [ ] SSL certificates are working
- [ ] All services run as non-root
- [ ] Firewall is properly configured
- [ ] Security headers are present
- [ ] Rate limiting is active
- [ ] Backup encryption is enabled

## 📊 Performance Improvements

### Optimizations Included
- **Multi-stage Docker builds**: Smaller, more efficient images
- **Nginx caching**: Static asset caching and compression
- **Database indexing**: Optimized MongoDB queries
- **Resource limits**: Prevent resource exhaustion
- **Health checks**: Automatic restart of failed services
- **Load balancing**: Ready for horizontal scaling

### Performance Monitoring
```bash
# Container resource usage
docker stats

# Application health
./scripts/health-check.sh

# System resources
htop
df -h
free -h
```

## 🔄 Rollback Plan

If you need to rollback to the old system:

### Step 1: Stop Containerized Services
```bash
cd /opt/ror-stay-docker
docker-compose down
```

### Step 2: Restore Old Services
```bash
cd /root/ROR-STAY
./quick-start.sh
```

### Step 3: Restore Database (if needed)
```bash
# If you have a backup from before migration
docker exec -i ror-mongo mongorestore --archive --gzip < backup-before-migration.gz
```

## 🆘 Troubleshooting Migration Issues

### Common Issues and Solutions

**1. Port Conflicts**
```bash
# Check what's using ports
sudo netstat -tlnp | grep -E ":(80|443|3000|8000)"

# Kill conflicting processes
sudo pkill -f "nginx\|node\|python"
```

**2. Permission Issues**
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
sudo chown -R $USER:$USER /opt/ror-stay-docker
```

**3. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose exec nginx certbot certificates

# Manually generate certificates
docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email your-email@domain.com --agree-tos -d yourdomain.com
```

**4. Database Connection Issues**
```bash
# Check MongoDB logs
./scripts/logs.sh mongodb

# Test database connection
docker-compose exec backend python -c "from pymongo import MongoClient; print(MongoClient('mongodb://mongodb:27017').admin.command('ping'))"
```

## 📈 Post-Migration Optimization

### Recommended Next Steps

1. **Setup Monitoring**
   ```bash
   # Add to crontab for regular health checks
   echo "*/5 * * * * cd /opt/ror-stay-docker && ./scripts/health-check.sh >> /var/log/ror-stay-health.log 2>&1" | crontab -
   ```

2. **Setup Automated Backups**
   ```bash
   # Daily database backups
   echo "0 2 * * * cd /opt/ror-stay-docker && ./scripts/backup.sh" | crontab -
   ```

3. **Configure Log Rotation**
   ```bash
   # Prevent log files from growing too large
   sudo logrotate -d /etc/logrotate.conf
   ```

4. **Setup Alerts** (Optional)
   - Configure email alerts for health check failures
   - Setup monitoring dashboards
   - Integrate with cloud monitoring services

## ✅ Migration Checklist

- [ ] Containerized environment setup complete
- [ ] Source code copied successfully
- [ ] Old services stopped
- [ ] New services deployed and healthy
- [ ] Database migrated (if needed)
- [ ] SSL certificates working (production)
- [ ] All endpoints responding correctly
- [ ] Health checks passing
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Documentation updated

## 🎉 Migration Complete!

Congratulations! You've successfully migrated to a **secure, containerized, production-ready** ROR-STAY deployment that:

- ✅ **Eliminates dependency conflicts**
- ✅ **Works on any cloud provider**
- ✅ **Provides automatic SSL/HTTPS**
- ✅ **Includes comprehensive security**
- ✅ **Offers high availability**
- ✅ **Supports easy scaling**

Your ROR-STAY application is now enterprise-ready! 🚀
