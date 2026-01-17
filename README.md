# 🏠 ROR STAY - Property Rental Platform

## 📋 Table of Contents
- [About ROR STAY](#about-ror-stay)
- [Quick Start Guide](#quick-start-guide)
- [System Requirements](#system-requirements)
- [Installation Steps](#installation-steps)
- [Running the Application](#running-the-application)
- [Admin Access](#admin-access)
- [Troubleshooting](#troubleshooting)
- [Cloud Deployment](#cloud-deployment)
- [Support](#support)

## 🎯 About ROR STAY

ROR STAY is a modern property rental platform that helps users find verified rooms, apartments, and PG accommodations across India. The platform features:

- 🏠 **Property Listings** with multiple images and detailed information
- 💰 **Indian Rupee (₹) Pricing** with proper formatting
- 📱 **Responsive Design** that works on all devices
- 🔐 **Admin Panel** for managing properties and contacts
- 📧 **Contact Management** system for inquiries
- 🖼️ **Image Upload** support (up to 10 images per property)
- 🎨 **Professional Logo** and branding

## 🚀 Quick Start Guide

**For Non-Technical Users**: This guide will help you run ROR STAY on any server without technical knowledge.

### Prerequisites (What You Need)
1. A computer or server with internet connection
2. 30 minutes of your time
3. Basic ability to copy and paste commands

## 💻 System Requirements

### Minimum Requirements:
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 5GB free space
- **OS**: Linux (Ubuntu 20.04+), Windows 10+, or macOS
- **Internet**: Stable connection for downloading

### Supported Cloud Platforms:
- ✅ **AWS** (Amazon Web Services)
- ✅ **Azure** (Microsoft Azure)
- ✅ **GCP** (Google Cloud Platform)
- ✅ **DigitalOcean**
- ✅ **Linode**
- ✅ **Any Linux VPS**

## 📦 Installation Steps

### Step 1: Install Docker (One-Time Setup)

**For Ubuntu/Linux:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add your user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

**For Windows:**
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop
2. Install and restart your computer
3. Open Docker Desktop and wait for it to start

**For macOS:**
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop
2. Install the .dmg file
3. Open Docker Desktop from Applications

### Step 2: Download ROR STAY Project

```bash
# Clone or download the project
git clone <your-repository-url>
cd ror-stay

# OR if you have the project files, navigate to the folder
cd /path/to/ror-stay
```

### Step 3: Initialize Database with Your Data

```bash
# Make sure you're in the project directory
cd /root

# Initialize database with current data
node database-init/init-database.js
```

## 🏃‍♂️ Running the Application

### Start Everything (Simple One Command)

```bash
# Start all services
docker-compose up -d

# Wait 30 seconds for everything to start
sleep 30

# Check if everything is running
docker-compose ps
```

### Access Your Application

1. **Main Website**: Open http://localhost in your browser
2. **Admin Panel**: Go to http://localhost/admin/listings
3. **Admin Login**: 
   - Email: `admin@rorstay.com`
   - Password: `admin123`

## 🔐 Admin Access

### Default Admin Credentials:
- **Email**: `admin@rorstay.com`
- **Password**: `admin123`

### Admin Features:
- ✅ **Manage Properties**: Add, edit, delete property listings
- ✅ **Upload Images**: Add up to 10 images per property
- ✅ **Contact Management**: View and manage contact submissions
- ✅ **Status Updates**: Change property and contact status
- ✅ **Delete Functions**: Remove unwanted entries

### Admin URLs:
- **Properties Management**: http://localhost/admin/listings
- **Add New Property**: http://localhost/admin/listings/new
- **Contact Submissions**: http://localhost/admin/submissions
## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Port 80 already in use"
```bash
# Stop system nginx if running
sudo systemctl stop nginx

# Or kill any process using port 80
sudo lsof -ti:80 | xargs sudo kill -9

# Then restart ROR STAY
docker-compose up -d
```

#### Issue 2: "Cannot connect to Docker daemon"
```bash
# Start Docker service
sudo systemctl start docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Logout and login again, then try
docker-compose up -d
```

#### Issue 3: "Database connection failed"
```bash
# Check if MongoDB is running
docker-compose ps

# Restart all services
docker-compose down
docker-compose up -d

# Wait 30 seconds and check again
sleep 30 && curl http://localhost/api/health
```

#### Issue 4: "Images not loading"
```bash
# Check if all containers are healthy
docker-compose ps

# Restart nginx
docker-compose restart nginx

# Check nginx logs
docker-compose logs nginx
```

### Health Check Commands

```bash
# Check all services status
docker-compose ps

# Check application health
curl http://localhost/api/health

# Check logs for any service
docker-compose logs [service-name]
# Example: docker-compose logs backend
```

## ☁️ Cloud Deployment

### AWS EC2 Deployment

1. **Launch EC2 Instance**:
   - Choose Ubuntu 20.04 LTS
   - Instance type: t3.medium (2 vCPU, 4GB RAM)
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Connect and Setup**:
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose -y
sudo usermod -aG docker ubuntu

# Upload your project files
scp -i your-key.pem -r /path/to/ror-stay ubuntu@your-ec2-ip:~/

# Run the application
cd ror-stay
docker-compose up -d
```

3. **Access Your Site**: http://your-ec2-ip

### Azure VM Deployment

1. **Create VM**:
   - OS: Ubuntu 20.04
   - Size: Standard_B2s (2 vCPUs, 4GB RAM)
   - Networking: Allow HTTP, HTTPS, SSH

2. **Setup Process**: Same as AWS (use Azure VM IP)

### Google Cloud Platform (GCP)

1. **Create Compute Engine VM**:
   - Machine type: e2-medium (2 vCPU, 4GB RAM)
   - Boot disk: Ubuntu 20.04 LTS
   - Firewall: Allow HTTP and HTTPS traffic

2. **Setup Process**: Same as AWS (use GCP VM IP)

### DigitalOcean Droplet

1. **Create Droplet**:
   - Image: Ubuntu 20.04
   - Plan: Basic ($20/month - 2GB RAM, 1 vCPU)
   - Add your SSH key

2. **Setup Process**: Same as AWS (use Droplet IP)

## 🌐 Domain Setup (Optional)

### Point Your Domain to the Server

1. **Update DNS Records**:
   - A Record: `@` → `your-server-ip`
   - A Record: `www` → `your-server-ip`

2. **Update Nginx Configuration** (for custom domain):
```bash
# Edit nginx config to use your domain
# This step requires technical knowledge
```

## 📊 Current Data Included

Your ROR STAY installation comes pre-loaded with:

- ✅ **9 Property Listings** with images and details
- ✅ **5 Contact Submissions** for testing
- ✅ **Admin User Account** (admin@rorstay.com)
- ✅ **Professional Logo** and branding
- ✅ **Indian Rupee (₹) Pricing** format
- ✅ **Image Upload System** ready to use

## 🆘 Support

### Getting Help

1. **Check Logs**: `docker-compose logs [service-name]`
2. **Restart Services**: `docker-compose restart`
3. **Full Reset**: `docker-compose down && docker-compose up -d`

### Contact Information

- **Technical Issues**: Check the `TROUBLESHOOTING.md` file
- **Feature Requests**: Document in project issues
- **Deployment Help**: Follow this README step by step

## 📝 Important Notes

### Security Recommendations

1. **Change Admin Password**: After first login, change the default password
2. **Use HTTPS**: Set up SSL certificate for production
3. **Firewall**: Configure proper firewall rules
4. **Backups**: Regular database backups recommended

### Performance Tips

1. **Server Resources**: 4GB RAM recommended for smooth operation
2. **Image Optimization**: Images are automatically compressed
3. **Database Indexing**: Already configured for optimal performance
4. **Caching**: Nginx caching configured for static files

---

## 🎉 Congratulations!

You now have a fully functional ROR STAY property rental platform running! 

**Next Steps**:
1. Access http://localhost (or your server IP)
2. Login to admin panel: http://localhost/admin/listings
3. Start adding your own properties
4. Customize the platform as needed

**Happy Property Renting! 🏠✨**
```

## 🔒 Security Features

- ✅ **SSL/TLS Encryption** - Automatic HTTPS with Let's Encrypt
- ✅ **Reverse Proxy** - Nginx handles all external traffic
- ✅ **Private Network** - Backend and database isolated from internet
- ✅ **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- ✅ **Rate Limiting** - Protection against DDoS and abuse
- ✅ **Container Isolation** - Each service runs in isolated containers
- ✅ **Environment Secrets** - Secure environment variable management
- ✅ **Health Checks** - Automatic service monitoring and restart

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Domain name pointing to your server (for SSL)
- Ubuntu 20.04+ or similar Linux distribution

### 1️⃣ Clone and Setup
```bash
# Clone this containerized version
git clone <your-repo> /opt/ror-stay-docker
cd /opt/ror-stay-docker

# Make scripts executable
chmod +x scripts/*.sh
```

### 2️⃣ Configure Environment
```bash
# Copy and edit environment file
cp .env.example .env
nano .env

# Set your domain and email for SSL
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
```

### 3️⃣ Deploy
```bash
# For development
./scripts/deploy-dev.sh

# For production with SSL
./scripts/deploy-prod.sh
```

### 4️⃣ Access Your Application
- **Production**: https://yourdomain.com
- **Development**: http://localhost

## 📁 Project Structure

```
ror-stay-docker/
├── README.md                 # This file
├── .env.example             # Environment template
├── docker-compose.yml       # Development compose
├── docker-compose.prod.yml  # Production compose
├── scripts/
│   ├── deploy-dev.sh        # Development deployment
│   ├── deploy-prod.sh       # Production deployment
│   ├── backup.sh            # Database backup
│   ├── restore.sh           # Database restore
│   └── logs.sh              # View logs
├── nginx/
│   ├── nginx.conf           # Nginx configuration
│   ├── ssl.conf             # SSL configuration
│   └── security.conf        # Security headers
├── backend/
│   ├── Dockerfile           # Backend container
│   ├── requirements.txt     # Python dependencies
│   └── src/                 # Backend source code
├── frontend/
│   ├── Dockerfile           # Frontend container
│   ├── package.json         # Node.js dependencies
│   └── src/                 # Frontend source code
└── mongodb/
    └── init/                # Database initialization
```

## 🌍 Cloud Provider Deployment

### AWS EC2 Deployment
```bash
# Launch EC2 instance (Ubuntu 22.04)
# Configure Security Groups (ports 80, 443, 22)
# Run deployment script
./scripts/aws-deploy.sh
```

### Google Cloud Platform
```bash
# Create VM instance
# Configure firewall rules
# Run deployment script
./scripts/gcp-deploy.sh
```

### Microsoft Azure
```bash
# Create VM
# Configure Network Security Group
# Run deployment script
./scripts/azure-deploy.sh
```

## 🔧 Management Commands

```bash
# View logs
./scripts/logs.sh [service]

# Backup database
./scripts/backup.sh

# Restore database
./scripts/restore.sh backup-file.tar.gz

# Update application
./scripts/update.sh

# Scale services
docker-compose up -d --scale backend=3

# Monitor resources
docker stats
```

## 📊 Monitoring & Health Checks

- **Application Health**: `/api/health`
- **Nginx Status**: `/nginx-status` (internal)
- **Container Stats**: `docker stats`
- **Logs**: `./scripts/logs.sh`

## 🔒 Security Best Practices

### Implemented
- ✅ Non-root containers
- ✅ Read-only filesystems where possible
- ✅ Security headers (HSTS, CSP, etc.)
- ✅ Rate limiting
- ✅ SSL/TLS encryption
- ✅ Private networks
- ✅ Secret management

### Additional Recommendations
- 🔹 Use AWS Secrets Manager / Azure Key Vault
- 🔹 Implement log aggregation (ELK stack)
- 🔹 Set up monitoring (Prometheus + Grafana)
- 🔹 Use container scanning tools
- 🔹 Implement backup strategies

## 🚨 Troubleshooting

### Common Issues

**SSL Certificate Issues**
```bash
# Check certificate status
docker-compose exec nginx certbot certificates

# Renew certificates
docker-compose exec nginx certbot renew
```

**Database Connection Issues**
```bash
# Check MongoDB logs
./scripts/logs.sh mongodb

# Test connection
docker-compose exec backend python -c "from pymongo import MongoClient; print(MongoClient('mongodb://mongodb:27017').admin.command('ping'))"
```

**Performance Issues**
```bash
# Check resource usage
docker stats

# Scale backend
docker-compose up -d --scale backend=2
```

## 📈 Performance Optimization

- **Frontend**: Built with production optimizations
- **Backend**: Gunicorn with multiple workers
- **Database**: MongoDB with proper indexing
- **Nginx**: Gzip compression, caching headers
- **Docker**: Multi-stage builds for smaller images

## 🔄 CI/CD Integration

Example GitHub Actions workflow included for:
- Automated testing
- Docker image building
- Deployment to cloud providers
- Security scanning

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs: `./scripts/logs.sh`
3. Check container health: `docker ps`
4. Review environment configuration

---

**🎯 This containerized deployment ensures your ROR-STAY application runs securely and reliably in any cloud environment!**
