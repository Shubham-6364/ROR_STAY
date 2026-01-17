# ☁️ ROR-STAY Azure VM Deployment Guide

## 🎯 Complete Azure Deployment Steps

### **Phase 1: Azure VM Setup**

#### 1️⃣ Create Azure VM
```bash
# Using Azure CLI (optional)
az vm create \
  --resource-group myResourceGroup \
  --name ror-stay-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --public-ip-address-allocation static
```

**Or use Azure Portal:**
- **Image**: Ubuntu 22.04 LTS
- **Size**: Standard_B2s (2 vCPUs, 4GB RAM) or larger
- **Authentication**: SSH public key
- **Public IP**: Static (recommended)

#### 2️⃣ Configure Network Security Group
**Required Inbound Rules:**
```
Priority | Name      | Port | Protocol | Source    | Action
---------|-----------|------|----------|-----------|-------
1000     | SSH       | 22   | TCP      | Your IP   | Allow
1010     | HTTP      | 80   | TCP      | Internet  | Allow
1020     | HTTPS     | 443  | TCP      | Internet  | Allow
```

**Azure Portal Steps:**
1. Go to VM → Networking
2. Add inbound port rules:
   - Port 22 (SSH) - restrict to your IP
   - Port 80 (HTTP) - allow from Internet
   - Port 443 (HTTPS) - allow from Internet

#### 3️⃣ Connect to VM
```bash
# SSH to your VM
ssh azureuser@YOUR_VM_PUBLIC_IP

# Or use Azure Cloud Shell
az ssh vm --resource-group myResourceGroup --name ror-stay-vm
```

### **Phase 2: Deploy ROR-STAY**

#### 1️⃣ Copy Project Files
```bash
# Option A: Clone from repository (if you have one)
git clone YOUR_REPO_URL /opt/ror-stay-docker
cd /opt/ror-stay-docker

# Option B: Upload files using SCP
scp -r /local/path/ROR-STAY-DOCKER azureuser@YOUR_VM_IP:/tmp/
sudo mv /tmp/ROR-STAY-DOCKER /opt/ror-stay-docker
sudo chown -R $USER:$USER /opt/ror-stay-docker
cd /opt/ror-stay-docker
```

#### 2️⃣ Run Azure Deployment
```bash
# Make sure you're in the project directory
cd /opt/ror-stay-docker

# Run Azure-specific deployment
./scripts/azure-deploy.sh
```

#### 3️⃣ Verify Deployment
```bash
# Check container status
docker-compose ps

# Run health check
./scripts/health-check.sh

# Test endpoints
curl http://YOUR_VM_IP/health
curl http://YOUR_VM_IP/api/health
```

### **Phase 3: Production Configuration (Optional)**

#### 1️⃣ Configure Domain (For SSL)
```bash
# Edit environment file
nano .env

# Update these values:
DOMAIN=yourdomain.com
EMAIL=your-email@domain.com
SSL_ENABLED=true
AUTO_SSL=true
```

#### 2️⃣ Deploy with SSL
```bash
# Point your domain DNS to VM public IP first
# Then run production deployment
./scripts/deploy-prod.sh
```

## 🔧 Azure-Specific Configuration

### **Environment Variables for Azure**
```bash
# Azure-optimized .env settings
DOMAIN=YOUR_VM_PUBLIC_IP
EMAIL=admin@yourdomain.com
ENVIRONMENT=production
SSL_ENABLED=false  # Set to true if you have a domain

# Azure Storage (optional for backups)
AZURE_STORAGE_ACCOUNT=yourstorageaccount
AZURE_CONTAINER_NAME=backups
```

### **Azure CLI Integration**
```bash
# Login to Azure CLI (optional but recommended)
az login

# This enables:
# - Azure Storage backups
# - VM monitoring integration
# - Advanced Azure features
```

## 📊 Azure Monitoring & Management

### **Built-in Monitoring**
The deployment includes:
- ✅ **Container health checks** every 5 minutes
- ✅ **Automatic service restart** on failure
- ✅ **Daily database backups** at 2 AM
- ✅ **Disk space monitoring** with cleanup
- ✅ **Memory usage monitoring**

### **View Monitoring Logs**
```bash
# Application logs
./scripts/logs.sh [service]

# System monitoring logs
tail -f /var/log/ror-stay-monitor.log

# Container stats
docker stats
```

### **Azure Storage Backups (Optional)**
```bash
# Create storage account
az storage account create \
  --name rorstaybackups \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Standard_LRS

# Create container
az storage container create \
  --name backups \
  --account-name rorstaybackups

# Update .env with storage details
AZURE_STORAGE_ACCOUNT=rorstaybackups
AZURE_CONTAINER_NAME=backups
```

## 🔒 Security Best Practices

### **Implemented Security Features**
- ✅ **UFW Firewall** - Only necessary ports open
- ✅ **Fail2ban** - Intrusion detection and prevention
- ✅ **SSL/TLS** - Automatic HTTPS with Let's Encrypt (if domain configured)
- ✅ **Container Isolation** - All services in private network
- ✅ **Non-root Containers** - Security hardened containers
- ✅ **Security Headers** - HSTS, CSP, X-Frame-Options
- ✅ **Rate Limiting** - DDoS protection
- ✅ **Automatic Updates** - Security patches

### **Additional Azure Security**
```bash
# Enable Azure Security Center (recommended)
az security auto-provisioning-setting update \
  --name default \
  --auto-provision on

# Enable disk encryption (optional)
az vm encryption enable \
  --resource-group myResourceGroup \
  --name ror-stay-vm \
  --disk-encryption-keyvault myKeyVault
```

## 🚀 Scaling & Performance

### **Vertical Scaling (Resize VM)**
```bash
# Stop VM
az vm deallocate --resource-group myResourceGroup --name ror-stay-vm

# Resize VM
az vm resize \
  --resource-group myResourceGroup \
  --name ror-stay-vm \
  --size Standard_B4ms

# Start VM
az vm start --resource-group myResourceGroup --name ror-stay-vm
```

### **Horizontal Scaling (Multiple Containers)**
```bash
# Scale backend containers
docker-compose up -d --scale backend=3

# Monitor resource usage
docker stats
```

### **Performance Optimization**
```bash
# Enable premium SSD (better I/O)
az vm update \
  --resource-group myResourceGroup \
  --name ror-stay-vm \
  --set storageProfile.osDisk.managedDisk.storageAccountType=Premium_LRS
```

## 🔄 Maintenance & Updates

### **Application Updates**
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### **System Updates**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

### **Backup Management**
```bash
# Manual backup
./scripts/backup.sh

# List backups
ls -la /opt/ror-stay-data/backups/

# Restore from backup
docker-compose exec -T mongodb mongorestore --archive --gzip < backup-file.tar.gz
```

## 🆘 Troubleshooting

### **Common Azure Issues**

**1. Network Security Group Blocking Traffic**
```bash
# Check NSG rules
az network nsg rule list \
  --resource-group myResourceGroup \
  --nsg-name ror-stay-vm-nsg \
  --output table

# Add missing rule
az network nsg rule create \
  --resource-group myResourceGroup \
  --nsg-name ror-stay-vm-nsg \
  --name AllowHTTP \
  --priority 1010 \
  --source-address-prefixes Internet \
  --destination-port-ranges 80 \
  --access Allow \
  --protocol Tcp
```

**2. VM Size Too Small**
```bash
# Check current VM size
az vm show \
  --resource-group myResourceGroup \
  --name ror-stay-vm \
  --query hardwareProfile.vmSize

# Recommended: Standard_B2s or larger
```

**3. Disk Space Issues**
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -f

# Resize disk (if needed)
az disk update \
  --resource-group myResourceGroup \
  --name ror-stay-vm_OsDisk_1 \
  --size-gb 64
```

**4. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose exec nginx certbot certificates

# Manual certificate generation
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@domain.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com
```

## 📞 Support Commands

### **Quick Diagnostics**
```bash
# System status
./scripts/health-check.sh

# Container logs
./scripts/logs.sh [service]

# Azure VM info
curl -H "Metadata: true" "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | jq

# Network connectivity
curl -I http://localhost/health
```

### **Emergency Recovery**
```bash
# Restart all services
docker-compose restart

# Full reset (nuclear option)
docker-compose down
docker system prune -f
docker-compose up -d --build
```

## 🎉 Success Checklist

After deployment, verify:

- [ ] VM is accessible via SSH
- [ ] Network Security Group allows HTTP/HTTPS
- [ ] All containers are running: `docker-compose ps`
- [ ] Health check passes: `./scripts/health-check.sh`
- [ ] Application accessible: `http://YOUR_VM_IP`
- [ ] API responding: `http://YOUR_VM_IP/api/health`
- [ ] SSL working (if configured): `https://yourdomain.com`
- [ ] Monitoring active: `tail -f /var/log/ror-stay-monitor.log`
- [ ] Backups configured: `ls /opt/ror-stay-data/backups/`

## 💡 Pro Tips

1. **Use Static Public IP** - Prevents IP changes on VM restart
2. **Configure Custom Domain** - Better for production and SSL
3. **Enable Azure Backup** - VM-level backup for disaster recovery
4. **Use Azure Monitor** - Advanced monitoring and alerting
5. **Set up Azure Storage** - Offsite backup storage
6. **Configure Auto-shutdown** - Save costs during development

---

**🎯 Your ROR-STAY application is now running securely on Azure VM with enterprise-grade features!** 🚀
