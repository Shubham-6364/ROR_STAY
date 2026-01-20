# 🚀 AWS EC2 Deployment Guide - ROR-STAY

Complete step-by-step guide to deploy ROR-STAY property rental platform on AWS EC2 Ubuntu instance with persistent volumes and production-ready configuration.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS EC2 Setup](#step-1-aws-ec2-setup)
3. [Server Preparation](#step-2-server-preparation)
4. [Install Docker & Docker Compose](#step-3-install-docker--docker-compose)
5. [Deploy ROR-STAY](#step-4-deploy-ror-stay)
6. [Persistent Volumes Setup](#step-5-persistent-volumes-setup)
7. [Verify Deployment](#step-6-verify-deployment)
8. [Domain & SSL Setup (Optional)](#step-7-domain--ssl-setup-optional)
9. [Monitoring & Maintenance](#step-8-monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS Account with billing enabled
- Basic knowledge of SSH and Linux commands
- Domain name (optional, for SSL/HTTPS)
- 30-45 minutes for complete setup

---

## Step 1: AWS EC2 Setup

### 1.1 Launch EC2 Instance

1. **Login to AWS Console** → Navigate to EC2 Dashboard

2. **Click "Launch Instance"**

3. **Configure Instance:**

   **Name:**
   ```
   ror-stay-production
   ```

   **Application and OS Images (AMI):**
   - Choose: **Ubuntu Server 22.04 LTS (HVM)**
   - Architecture: **64-bit (x86)**

   **Instance Type:**
   - **t3.medium** (2 vCPU, 4 GB RAM) - **Recommended**
   - Minimum: t3.small (2 vCPU, 2 GB RAM)
   - For high traffic: t3.large (2 vCPU, 8 GB RAM)

   **Key Pair:**
   - Create new key pair or select existing
   - Name: `ror-stay-key`
   - Type: RSA
   - Format: .pem (for Linux/Mac) or .ppk (for Windows/PuTTY)
   - **Download and save securely**

   **Network Settings:**
   - ✅ Allow SSH traffic from: My IP (or 0.0.0.0/0 for any IP)
   - ✅ Allow HTTP traffic from the internet
   - ✅ Allow HTTPS traffic from the internet

   **Configure Storage:**
   - **Root Volume**: 30 GB (minimum 20 GB)
   - Volume Type: gp3 (General Purpose SSD)
   - ✅ Delete on Termination: checked

4. **Advanced Details (Optional but Recommended):**

   **User data** (paste this script to auto-install Docker):
   ```bash
   #!/bin/bash
   apt-get update
   apt-get upgrade -y
   
   # Install basic tools
   apt-get install -y curl git wget htop net-tools
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt-get install -y docker-compose-plugin
   ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
   
   # Add ubuntu user to docker group
   usermod -aG docker ubuntu
   
   # Enable Docker to start on boot
   systemctl enable docker
   systemctl start docker
   ```

5. **Review and Launch** → Click **"Launch Instance"**

6. **Wait** for instance state to show "Running" (2-3 minutes)

### 1.2 Configure Security Group

After instance is running, configure Security Group:

1. **Select your instance** → Click on **Security** tab
2. **Click on Security Group** link
3. **Edit Inbound Rules** → Add the following:

| Type  | Protocol | Port Range | Source    | Description          |
|-------|----------|------------|-----------|----------------------|
| SSH   | TCP      | 22         | My IP     | SSH Access           |
| HTTP  | TCP      | 80         | 0.0.0.0/0 | HTTP Traffic         |
| HTTPS | TCP      | 443        | 0.0.0.0/0 | HTTPS Traffic (SSL)  |

4. **Save rules**

### 1.3 Allocate Elastic IP (Recommended for Production)

1. **EC2 Dashboard** → **Elastic IPs** (left menu)
2. **Allocate Elastic IP address** → **Allocate**
3. **Select the new IP** → **Actions** → **Associate Elastic IP address**
4. **Select your instance** → **Associate**

✅ **Your instance now has a fixed public IP that won't change on restart**

---

## Step 2: Server Preparation

### 2.1 Connect to EC2 Instance

**For Linux/Mac:**
```bash
# Set correct permissions for key file
chmod 400 ror-stay-key.pem

# Connect via SSH (replace with your instance IP)
ssh -i ror-stay-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**For Windows (using PuTTY):**
1. Convert .pem to .ppk using PuTTYgen
2. Use PuTTY to connect with .ppk key

### 2.2 Verify System

Once connected, verify the system:

```bash
# Check system info
uname -a
lsb_release -a

# Check available disk space (should show ~30GB)
df -h

# Check memory (should show 4GB for t3.medium)
free -h
```

Expected output:
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/root        30G  2.1G   28G   7% /
```

### 2.3 Update System

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential tools (if not using user data script)
sudo apt install -y curl git wget htop net-tools vim
```

---

## Step 3: Install Docker & Docker Compose

### 3.1 Install Docker (if not using user data script)

```bash
# Download Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh

# Run installation script
sudo sh get-docker.sh

# Add current user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# IMPORTANT: Logout and login again for group changes to take effect
exit
```

**Reconnect to EC2:**
```bash
ssh -i ror-stay-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3.2 Install Docker Compose

```bash
# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Create symlink for compatibility
sudo ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Verify Docker installation
docker --version
docker compose version
```

Expected output:
```
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.0
```

### 3.3 Enable Docker Service

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Start Docker service
sudo systemctl start docker

# Verify Docker is running
sudo systemctl status docker

# Test Docker without sudo
docker ps
```

---

## Step 4: Deploy ROR-STAY

### 4.1 Clone Project Repository

```bash
# Navigate to home directory
cd ~

# Create project directory
sudo mkdir -p /opt/ror-stay
sudo chown -R $USER:$USER /opt/ror-stay

# Clone repository (replace with your repo URL)
git clone <YOUR_REPOSITORY_URL> /opt/ror-stay

# OR if you have the project as a zip file, upload and extract:
# scp -i ror-stay-key.pem ror-stay.zip ubuntu@YOUR_EC2_IP:~/
# unzip ror-stay.zip -d /opt/ror-stay
```

### 4.2 Navigate to Project Directory

```bash
cd /opt/ror-stay
ls -la
```

You should see:
```
backend/
frontend/
database-init/
mongodb/
nginx/
scripts/
docker-compose.yml
docker-compose.prod.yml
.env
README.md
```

### 4.3 Configure Environment Variables

```bash
# Copy example .env (if exists) or create new
cp .env.example .env 2>/dev/null || touch .env

# Edit .env file
nano .env
```

**Paste and configure this .env content:**

```bash
# ROR STAY - Production Environment Configuration

# DATABASE CONFIGURATION
MONGO_URL=mongodb://mongodb:27017
DB_NAME=ror_stay

# MongoDB Root Credentials (Production - CHANGE THESE!)
MONGO_INITDB_ROOT_USERNAME=roradmin
MONGO_INITDB_ROOT_PASSWORD=YourStrongPassword123!ChangeME

# APPLICATION SETTINGS
ENVIRONMENT=production
DEBUG=false
RESTART_POLICY=unless-stopped
NETWORK_NAME=ror-stay-network

# SECURITY SETTINGS (GENERATE NEW JWT SECRET!)
# Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=YOUR_NEW_JWT_SECRET_HERE_64_CHARACTERS_LONG
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# API SETTINGS (Replace with your domain or IP)
CORS_ORIGINS=["http://YOUR_EC2_IP", "http://YOUR_DOMAIN", "https://YOUR_DOMAIN"]

# FRONTEND SETTINGS
REACT_APP_API_BASE_URL=/api
REACT_APP_ENABLE_ADMIN=1
GENERATE_SOURCEMAP=false

# SSL/HTTPS (if using domain)
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
```

**Generate New JWT Secret:**
```bash
# Generate secure JWT secret
python3 -c "import secrets; print(secrets.token_hex(32))"

# Copy the output and paste it in .env as JWT_SECRET_KEY
```

**Important:** Replace these values:
- `YourStrongPassword123!ChangeME` → Strong MongoDB password
- `YOUR_NEW_JWT_SECRET_HERE_64_CHARACTERS_LONG` → Generated JWT secret
- `YOUR_EC2_IP` → Your EC2 public IP or Elastic IP
- `YOUR_DOMAIN` → Your domain name (if using)

**Save the file:** Press `Ctrl+X`, then `Y`, then `Enter`

### 4.4 Set Correct Permissions

```bash
# Set restrictive permissions for .env (contains secrets)
chmod 600 .env

# Make scripts executable
chmod +x scripts/*.sh
chmod +x start-ror-stay.sh stop-ror-stay.sh 2>/dev/null || true
```

---

## Step 5: Persistent Volumes Setup

Docker volumes are defined in `docker-compose.yml` and will persist data even if containers are removed.

### 5.1 Verify Volume Configuration

```bash
# Check defined volumes in docker-compose.yml
grep -A 5 "^volumes:" docker-compose.yml
```

You should see:
```yaml
volumes:
  mongodb_data:      # Database data (CRITICAL - must persist)
    driver: local
  backend_logs:      # Application logs
    driver: local
  nginx_logs:        # Web server logs
    driver: local
```

### 5.2 Create Backup Directory

```bash
# Create directory for manual backups
sudo mkdir -p /opt/ror-stay/backups
sudo chown -R $USER:$USER /opt/ror-stay/backups

# Create backup script
cat > /opt/ror-stay/scripts/backup-db.sh << 'EOF'
#!/bin/bash
# Backup MongoDB database
BACKUP_DIR="/opt/ror-stay/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mongodb_backup_${TIMESTAMP}.tar.gz"

echo "📦 Creating backup..."
docker exec ror-stay-mongodb mongodump --archive=/tmp/backup.tar.gz --gzip
docker cp ror-stay-mongodb:/tmp/backup.tar.gz ${BACKUP_DIR}/${BACKUP_FILE}
echo "✅ Backup created: ${BACKUP_FILE}"
EOF

chmod +x /opt/ror-stay/scripts/backup-db.sh
```

### 5.3 Understanding Data Persistence

| Volume Name      | Container Path | Stores                          | Critical? |
|------------------|----------------|---------------------------------|-----------|
| `mongodb_data`   | `/data/db`     | Database collections & indexes  | ✅ YES    |
| `backend_logs`   | `/app/logs`    | API logs                        | No        |
| `nginx_logs`     | `/var/log/nginx` | Web server access/error logs  | No        |

**Data Location on Host:**
```bash
# Docker stores volumes in:
/var/lib/docker/volumes/

# List all volumes
docker volume ls

# Inspect volume location
docker volume inspect ror-stay_mongodb_data
```

---

## Step 6: Verify Deployment

### 6.1 Build and Start Containers

```bash
# Navigate to project directory
cd /opt/ror-stay

# Build images and start containers (first time will take 5-10 minutes)
docker compose up -d --build
```

You should see:
```
[+] Building 45.3s (32/32) FINISHED
[+] Running 5/5
 ✔ Network ror-stay-network    Created
 ✔ Volume "ror-stay_mongodb_data" Created
 ✔ Container ror-stay-mongodb  Started
 ✔ Container ror-stay-backend  Started
 ✔ Container ror-stay-frontend Started
 ✔ Container ror-stay-nginx    Started
```

### 6.2 Wait for Services to Initialize

```bash
# Wait 60 seconds for all services to start
echo "⏳ Waiting for services to initialize (60 seconds)..."
sleep 60
```

### 6.3 Check Container Status

```bash
# Check all containers are running and healthy
docker compose ps
```

Expected output (all should show "Up" and "healthy"):
```
NAME                   STATUS                    PORTS
ror-stay-mongodb       Up 2 minutes (healthy)    27017/tcp
ror-stay-backend       Up 2 minutes (healthy)    8000/tcp
ror-stay-frontend      Up 2 minutes (healthy)    3000/tcp, 80/tcp
ror-stay-nginx         Up 2 minutes (healthy)    0.0.0.0:80->80/tcp
```

**If any container shows "unhealthy":**
```bash
# Check logs for the unhealthy container
docker compose logs [container-name]

# Example: docker compose logs backend
```

### 6.4 Verify Network Connectivity

```bash
# Check network is created
docker network ls | grep ror-stay

# Inspect network
docker network inspect ror-stay-network
```

### 6.5 Test Health Endpoints

```bash
# Test backend API health
curl http://localhost/api/health

# Expected response:
# {"status":"healthy","database":"connected","timestamp":"..."}

# Test frontend
curl -I http://localhost/

# Expected: HTTP/1.1 200 OK
```

### 6.6 Test from Browser

**From your local computer:**

1. Open browser and navigate to:
   ```
   http://YOUR_EC2_PUBLIC_IP
   ```

2. You should see the ROR-STAY homepage

3. Test admin panel:
   ```
   http://YOUR_EC2_PUBLIC_IP/admin/listings
   ```
   
4. **Default Admin Credentials:**
   - Email: `admin@rorstay.com`
   - Password: `admin123`

✅ **If you can see the homepage and login to admin, deployment is successful!**

---

## Step 7: Domain & SSL Setup (Optional)

### 7.1 Point Domain to EC2

In your domain registrar (GoDaddy, Namecheap, etc.):

1. **Add A Records:**
   ```
   Type: A
   Name: @
   Value: YOUR_EC2_ELASTIC_IP
   TTL: 1 Hour

   Type: A
   Name: www
   Value: YOUR_EC2_ELASTIC_IP
   TTL: 1 Hour
   ```

2. **Wait for DNS propagation** (5-30 minutes)

3. **Verify DNS:**
   ```bash
   # From local computer or EC2
   dig yourdomain.com +short
   
   # Should return your EC2 IP
   ```

### 7.2 Install Certbot for SSL

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
docker compose stop nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms (Y)
# - Share email (N or Y)

# Restart nginx
docker compose start nginx
```

### 7.3 Configure Nginx for HTTPS

Update `nginx/nginx.conf` to add SSL configuration (or use `docker-compose.prod.yml` which includes SSL support).

---

## Step 8: Monitoring & Maintenance

### 8.1 View Logs

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View specific service logs
docker compose logs backend
docker compose logs mongodb

# Last 100 lines
docker compose logs --tail=100
```

### 8.2 Monitor Resources

```bash
# Real-time container stats
docker stats

# Disk usage
docker system df

# Volume sizes
docker volume ls
du -sh /var/lib/docker/volumes/ror-stay_*
```

### 8.3 Backup Database

```bash
# Manual backup
/opt/ror-stay/scripts/backup-db.sh

# List backups
ls -lh /opt/ror-stay/backups/
```

### 8.4 Automated Backups (Cron Job)

```bash
# Open crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/ror-stay/scripts/backup-db.sh >> /opt/ror-stay/backups/backup.log 2>&1

# Save and exit
```

### 8.5 Update Application

```bash
cd /opt/ror-stay

# Pull latest code
git pull origin main

# Rebuild and restart containers
docker compose down
docker compose up -d --build

# Wait for services
sleep 60

# Verify
docker compose ps
```

### 8.6 Container Management Commands

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ DELETES DATA!)
docker compose down -v

# View running containers
docker ps

# Access container shell
docker exec -it ror-stay-backend bash
docker exec -it ror-stay-mongodb mongosh
```

---

## Troubleshooting

### Issue 1: Containers Not Starting

```bash
# Check Docker service
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check logs
docker compose logs
```

### Issue 2: Port 80 Already in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop system nginx if installed
sudo systemctl stop nginx
sudo systemctl disable nginx

# Restart ROR-STAY
docker compose restart nginx
```

### Issue 3: Database Connection Failed

```bash
# Check MongoDB container
docker compose logs mongodb

# Restart MongoDB
docker compose restart mongodb

# Wait 30 seconds
sleep 30

# Check backend logs
docker compose logs backend
```

### Issue 4: Cannot Access from Browser

```bash
# 1. Check EC2 Security Group allows HTTP (port 80)
# 2. Verify nginx is running
docker compose ps nginx

# 3. Test locally on EC2
curl http://localhost

# 4. Check nginx logs
docker compose logs nginx

# 5. Verify firewall (UFW)
sudo ufw status
```

### Issue 5: Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a

# Remove old images
docker image prune -a

# Remove stopped containers
docker container prune
```

### Issue 6: Containers Unhealthy

```bash
# Check health status
docker inspect ror-stay-backend | grep -A 10 Health

# Increase health check timeout in docker-compose.yml
# Then restart
docker compose down
docker compose up -d
```

### Issue 7: Memory Issues (t3.small with 2GB RAM)

```bash
# Check memory usage
free -h
docker stats

# Create swap file (on t3.small instances)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Changed default MongoDB password in `.env`
- [ ] Generated new `JWT_SECRET_KEY`
- [ ] Configured firewall (Security Group) to allow only necessary ports
- [ ] SSH access restricted to your IP only
- [ ] `.env` file has correct permissions (`chmod 600`)
- [ ] Enabled HTTPS with SSL certificate
- [ ] Regular database backups configured (cron job)
- [ ] Disabled DEBUG mode (`DEBUG=false` in `.env`)
- [ ] Updated default admin password in application
- [ ] Configured proper CORS_ORIGINS in `.env`

---

## 📊 Performance Optimization

### For High Traffic

```bash
# Edit docker-compose.prod.yml
# Increase backend replicas:
    deploy:
      replicas: 3  # Scale backend to 3 instances

# Restart with prod config
docker compose -f docker-compose.prod.yml up -d
```

### Enable Docker Logging Limits

```bash
# Edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json

# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

---

## 🎯 Quick Reference Commands

```bash
# Start application
cd /opt/ror-stay && docker compose up -d

# Stop application
docker compose down

# View status
docker compose ps

# View logs
docker compose logs -f

# Restart service
docker compose restart [service-name]

# Backup database
/opt/ror-stay/scripts/backup-db.sh

# Update application
git pull && docker compose up -d --build

# Clean Docker
docker system prune -a
```

---

## 📞 Support

If you encounter issues:

1. Check logs: `docker compose logs -f`
2. Verify all containers are healthy: `docker compose ps`
3. Check disk space: `df -h`
4. Review security group rules in AWS
5. Check the TROUBLESHOOTING.md file in project

---

## ✅ Deployment Checklist

- [ ] EC2 instance launched (t3.medium or higher)
- [ ] Security Group configured (ports 22, 80, 443)
- [ ] Elastic IP allocated and associated
- [ ] Docker and Docker Compose installed
- [ ] Project cloned to `/opt/ror-stay`
- [ ] `.env` file configured with secure secrets
- [ ] All 4 containers running and healthy
- [ ] Database data persisted in volumes
- [ ] Application accessible via browser
- [ ] Admin login working
- [ ] Backup script tested
- [ ] Automated backups scheduled (cron)
- [ ] SSL certificate installed (if using domain)
- [ ] Monitoring setup (optional)

---

**🎉 Congratulations! Your ROR-STAY application is now running on AWS EC2!**

**Access your application at:** `http://YOUR_EC2_IP` or `https://yourdomain.com`

**Admin Panel:** `http://YOUR_EC2_IP/admin/listings`
