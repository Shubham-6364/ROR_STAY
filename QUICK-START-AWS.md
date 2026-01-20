# 🚀 Quick Start - AWS EC2 Deployment

**For complete guide, see:** [AWS-EC2-DEPLOYMENT.md](./AWS-EC2-DEPLOYMENT.md)

---

## 📋 Prerequisites
- AWS EC2 Ubuntu 22.04 instance (t3.medium recommended)
- Security Group: Ports 22, 80, 443 open
- SSH key pair downloaded

---

## ⚡ Quick Deploy (5 Commands)

```bash
# 1. Connect to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
exit # Logout and login again

# 3. Reconnect and clone project
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
sudo mkdir -p /opt/ror-stay && sudo chown -R $USER:$USER /opt/ror-stay
git clone YOUR_REPO_URL /opt/ror-stay
cd /opt/ror-stay

# 4. Configure environment
nano .env
# Set: MONGO password, JWT_SECRET_KEY, CORS_ORIGINS

# 5. Deploy!
docker compose up -d --build
sleep 60 && docker compose ps
```

**Access:** `http://YOUR_EC2_IP`

**Admin:** `http://YOUR_EC2_IP/admin/listings`
- Email: admin@rorstay.com
- Password: admin123

---

## 📦 Persistent Volumes

Automatically created, data survives container restarts:

| Volume           | Stores              | Location                    |
|------------------|---------------------|-----------------------------|
| `mongodb_data`   | Database ✅         | `/var/lib/docker/volumes/`  |
| `backend_logs`   | API logs            | `/var/lib/docker/volumes/`  |
| `nginx_logs`     | Web server logs     | `/var/lib/docker/volumes/`  |

**Backup database:**
```bash
/opt/ror-stay/scripts/backup-db.sh
```

---

## 🔧 Essential Commands

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f

# Restart service
docker compose restart [service-name]

# Stop all
docker compose down

# Start all
docker compose up -d

# Update application
git pull && docker compose up -d --build
```

---

## ⚠️ Security Checklist

Before production:
- [ ] Change MongoDB password in `.env`
- [ ] Generate new JWT_SECRET_KEY: `python3 -c "import secrets; print(secrets.token_hex(32))"`
- [ ] Update CORS_ORIGINS in `.env`
- [ ] Set `.env` permissions: `chmod 600 .env`
- [ ] Configure automated backups
- [ ] Setup SSL certificate (if using domain)
- [ ] Change default admin password

---

## 🐛 Troubleshooting

**Containers not starting?**
```bash
docker compose logs
sudo systemctl restart docker
```

**Port 80 in use?**
```bash
sudo lsof -i :80
sudo systemctl stop nginx  # If system nginx running
```

**Can't access from browser?**
1. Check EC2 Security Group (port 80 open)
2. Check container status: `docker compose ps`
3. Test locally: `curl http://localhost`

---

**Full documentation:** [AWS-EC2-DEPLOYMENT.md](./AWS-EC2-DEPLOYMENT.md)
