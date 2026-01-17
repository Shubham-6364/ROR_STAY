# 🔧 ROR STAY - Complete Troubleshooting Guide

## 📋 Table of Contents
- [Quick Fixes](#quick-fixes)
- [Command History](#command-history)
- [Service-Specific Issues](#service-specific-issues)
- [Development Commands Used](#development-commands-used)
- [Database Issues](#database-issues)
- [Network Problems](#network-problems)
- [Performance Issues](#performance-issues)

## ⚡ Quick Fixes

### 🚨 Emergency Commands (Try These First)

```bash
# 1. Full system restart
docker-compose down
docker-compose up -d
sleep 30

# 2. Check all services
docker-compose ps

# 3. Check application health
curl http://localhost/api/health

# 4. View all logs
docker-compose logs --tail=50
```

### 🔄 Common Issues & Solutions

#### Issue: "Port 80 already in use"
```bash
# Solution 1: Stop system nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# Solution 2: Kill process using port 80
sudo lsof -ti:80 | xargs sudo kill -9

# Solution 3: Use different port (edit docker-compose.yml)
# Change "80:80" to "8080:80" in nginx service
```

#### Issue: "Cannot connect to Docker daemon"
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, then test
docker --version
```

#### Issue: "Database connection failed"
```bash
# Check MongoDB container
docker-compose logs mongodb

# Restart database
docker-compose restart mongodb

# Wait and test
sleep 10
curl http://localhost/api/health
```

## 📚 Command History

### 🏗️ Initial Project Setup Commands

```bash
# 1. Project structure creation
mkdir -p /root/{backend,frontend,nginx}
mkdir -p /root/backend/{src,requirements.txt}
mkdir -p /root/frontend/{src,public,package.json}

# 2. Docker setup
docker-compose up -d mongodb
docker-compose build backend
docker-compose build frontend
docker-compose up -d
```

### 🎨 Logo Implementation Commands

```bash
# Logo file creation
mkdir -p /root/frontend/public/images
mkdir -p /root/frontend/public/icons

# Logo optimization and compression
# Created multiple SVG versions for different sizes
# Updated HTML head with favicon links
# Modified Header.jsx and Footer.jsx components

# Frontend rebuild after logo changes
docker-compose down frontend
docker-compose build frontend
docker-compose up -d frontend
sleep 10
docker-compose restart nginx
```

### 💰 Currency Change Commands

```bash
# Updated currency from USD to INR
# Modified Listings.jsx: 'en-US' -> 'en-IN', 'USD' -> 'INR'
# AdminListings.jsx already had INR formatting
# AdminNewListing.jsx already had "Price (Rupees)" label

# Rebuild after currency changes
docker-compose down frontend
docker-compose build frontend
docker-compose up -d frontend
docker-compose restart nginx
```

### 🖼️ Image Upload Implementation

```bash
# Backend image service creation
# Created /root/backend/src/image_service.py
# Created /root/backend/src/routes/image_routes.py
# Added Pillow==10.1.0 to requirements.txt

# Frontend image upload UI
# Updated AdminNewListing.jsx with image upload
# Updated AdminListings.jsx with image management
# Added image carousel to main Listings.jsx

# Backend rebuild with image support
docker-compose down backend
docker-compose build backend
docker-compose up -d backend

# Frontend rebuild with image UI
docker-compose down frontend
docker-compose build frontend
docker-compose up -d frontend
docker-compose restart nginx
```

### 🗑️ Delete Functionality Commands

```bash
# Backend delete endpoints
# Added delete routes to contact_routes.py
# Both authenticated and public development endpoints

# Frontend delete UI
# Updated AdminContacts.jsx with delete buttons
# Added confirmation dialog and loading states

# Rebuild after delete functionality
docker-compose down backend
docker-compose build backend
docker-compose up -d backend

docker-compose down frontend
docker-compose build frontend
docker-compose up -d frontend
docker-compose restart nginx
```

### 🎯 Multiple Image Display Commands

```bash
# Image carousel implementation
# Updated Listings.jsx with image navigation
# Added prev/next buttons and dot indicators
# Updated AdminListings.jsx with image gallery

# State management for image carousels
# Added currentImageIndex state
# Created navigation functions

# Rebuild for carousel features
docker-compose down frontend
docker-compose build frontend
docker-compose up -d frontend
docker-compose restart nginx
```

## 🔧 Service-Specific Issues

### 🐳 Docker Issues

```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker service
sudo systemctl restart docker

# Clean up Docker resources
docker system prune -f
docker volume prune -f

# Check Docker disk usage
docker system df
```

### 🌐 Nginx Issues

```bash
# Check nginx container logs
docker-compose logs nginx

# Test nginx configuration
docker-compose exec nginx nginx -t

# Restart nginx
docker-compose restart nginx

# Check nginx status
curl -I http://localhost
```

### 🗄️ MongoDB Issues

```bash
# Check MongoDB logs
docker-compose logs mongodb

# Connect to MongoDB shell
docker-compose exec mongodb mongosh

# Check database status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ismaster')"

# Backup database
docker-compose exec mongodb mongodump --out /backup

# Restore database
docker-compose exec mongodb mongorestore /backup
```

### ⚡ Backend (FastAPI) Issues

```bash
# Check backend logs
docker-compose logs backend

# Check backend health
curl http://localhost/api/health

# Test specific endpoints
curl http://localhost/api/properties/
curl http://localhost/api/contact/submissions/public

# Check backend container
docker-compose exec backend python --version
```

### ⚛️ Frontend (React) Issues

```bash
# Check frontend logs
docker-compose logs frontend

# Check frontend build
docker-compose exec frontend npm run build

# Test frontend directly
curl -I http://localhost:3000

# Check frontend container
docker-compose exec frontend node --version
```

## 🗄️ Database Issues

### MongoDB Connection Problems

```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check MongoDB health
docker-compose exec mongodb mongosh --eval "db.runCommand({ping: 1})"

# Check database collections
docker-compose exec mongodb mongosh ror_stay --eval "show collections"

# Count documents in collections
docker-compose exec mongodb mongosh ror_stay --eval "db.properties.countDocuments()"
docker-compose exec mongodb mongosh ror_stay --eval "db.contact_submissions.countDocuments()"
```

### Data Initialization Issues

```bash
# Re-initialize database with current data
cd /root
node database-init/init-database.js

# Check if data was loaded
curl http://localhost/api/properties/ | jq length
curl http://localhost/api/contact/submissions/public | jq length

# Manual data insertion (if needed)
docker-compose exec mongodb mongosh ror_stay
# Then use MongoDB commands to insert data
```

## 🌐 Network Problems

### Port Conflicts

```bash
# Check what's using port 80
sudo lsof -i :80

# Check what's using port 3000
sudo lsof -i :3000

# Check what's using port 8000
sudo lsof -i :8000

# Kill processes using specific ports
sudo kill -9 $(sudo lsof -t -i:80)
```

### DNS and Connectivity

```bash
# Test local connectivity
ping localhost
curl http://localhost

# Test external connectivity
ping google.com
curl https://google.com

# Check Docker network
docker network ls
docker network inspect ror-stay-network
```

## 🚀 Performance Issues

### Resource Monitoring

```bash
# Check system resources
htop
free -h
df -h

# Check Docker container resources
docker stats

# Check container resource usage
docker-compose exec backend ps aux
docker-compose exec frontend ps aux
```

### Optimization Commands

```bash
# Clean up unused Docker resources
docker system prune -a -f

# Restart services to free memory
docker-compose restart

# Check logs for memory issues
docker-compose logs | grep -i "memory\|oom"
```

## 🔍 Debugging Commands

### Log Analysis

```bash
# View all logs with timestamps
docker-compose logs -t

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs backend --tail=100
docker-compose logs frontend --tail=100
docker-compose logs nginx --tail=100
docker-compose logs mongodb --tail=100

# Search logs for errors
docker-compose logs | grep -i error
docker-compose logs | grep -i warning
```

### Container Inspection

```bash
# Check container status
docker-compose ps

# Inspect specific container
docker inspect ror-stay-backend
docker inspect ror-stay-frontend
docker inspect ror-stay-mongodb
docker inspect ror-stay-nginx

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh
docker-compose exec mongodb mongosh
docker-compose exec nginx sh
```

### Health Checks

```bash
# Application health check
curl http://localhost/api/health | jq

# Database health check
curl http://localhost/api/properties/ | jq 'length'

# Frontend health check
curl -I http://localhost

# All services health check
docker-compose ps
```

## 🛠️ Development Commands Used

### Backend Development

```bash
# Created FastAPI application structure
# Added routes for properties, contacts, auth, images
# Implemented image upload with Pillow
# Added delete functionality for contacts
# Created database models and validation

# Key files created/modified:
# - /root/backend/src/server.py
# - /root/backend/src/routes/*.py
# - /root/backend/src/image_service.py
# - /root/backend/requirements.txt
```

### Frontend Development

```bash
# Created React application with modern UI
# Implemented responsive design with Tailwind CSS
# Added image upload and carousel functionality
# Created admin panels for management
# Implemented Indian Rupee currency formatting

# Key files created/modified:
# - /root/frontend/src/components/*.jsx
# - /root/frontend/public/index.html
# - /root/frontend/public/images/*
```

### Docker Configuration

```bash
# Created multi-service Docker setup
# Configured nginx reverse proxy
# Set up MongoDB with persistence
# Implemented health checks for all services

# Key files:
# - /root/docker-compose.yml
# - /root/backend/Dockerfile
# - /root/frontend/Dockerfile
# - /root/nginx/nginx.conf
```

## 🆘 Emergency Recovery

### Complete System Reset

```bash
# Stop everything
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# Clean up Docker system
docker system prune -a -f

# Rebuild everything from scratch
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
sleep 60

# Initialize database
node database-init/init-database.js

# Test everything
curl http://localhost/api/health
```

### Backup Current State

```bash
# Backup database
docker-compose exec mongodb mongodump --out /backup

# Backup uploaded images
docker cp ror-stay-backend:/app/uploads ./uploads-backup

# Backup configuration
cp docker-compose.yml docker-compose.yml.backup
```

### Restore from Backup

```bash
# Restore database
docker-compose exec mongodb mongorestore /backup

# Restore images
docker cp ./uploads-backup ror-stay-backend:/app/uploads

# Restart services
docker-compose restart
```

---

## 📞 Getting Additional Help

### Log Collection for Support

```bash
# Collect all logs
docker-compose logs > ror-stay-logs.txt

# Collect system information
docker --version > system-info.txt
docker-compose --version >> system-info.txt
uname -a >> system-info.txt
free -h >> system-info.txt
df -h >> system-info.txt
```

### Useful Debugging URLs

- **Application Health**: http://localhost/api/health
- **Properties API**: http://localhost/api/properties/
- **Contacts API**: http://localhost/api/contact/submissions/public
- **Admin Panel**: http://localhost/admin/listings
- **Main Website**: http://localhost

Remember: Most issues can be resolved by restarting services with `docker-compose restart` or doing a full restart with `docker-compose down && docker-compose up -d`.

**Happy Troubleshooting! 🔧✨**
