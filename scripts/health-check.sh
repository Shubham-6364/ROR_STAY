#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Health Check Script
# Comprehensive health monitoring for all services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log() { echo "[health-check] $*"; }
error() { echo "[ERROR] $*" >&2; }
success() { echo "[SUCCESS] $*"; }

# Change to project directory
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log "🏥 Starting ROR-STAY health check..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running"
    exit 1
fi

# Check if containers are running
log "📊 Checking container status..."
CONTAINERS_STATUS=0

for service in mongodb backend frontend nginx; do
    if docker-compose ps "$service" | grep -q "Up"; then
        echo -e "  ✅ ${GREEN}$service${NC}: Running"
    else
        echo -e "  ❌ ${RED}$service${NC}: Not running"
        CONTAINERS_STATUS=1
    fi
done

# Check container health
log "🔍 Checking container health..."
HEALTH_STATUS=0

for service in mongodb backend frontend nginx; do
    HEALTH=$(docker-compose ps "$service" | grep "Up" | grep -o "(healthy)" || echo "(unhealthy)")
    if [[ "$HEALTH" == "(healthy)" ]]; then
        echo -e "  ✅ ${GREEN}$service${NC}: Healthy"
    else
        echo -e "  ⚠️  ${YELLOW}$service${NC}: $HEALTH"
        HEALTH_STATUS=1
    fi
done

# Check HTTP endpoints
log "🌐 Checking HTTP endpoints..."
HTTP_STATUS=0

# Check main application
if curl -f -s http://localhost/health >/dev/null 2>&1; then
    echo -e "  ✅ ${GREEN}Main application${NC}: Responding"
else
    echo -e "  ❌ ${RED}Main application${NC}: Not responding"
    HTTP_STATUS=1
fi

# Check API health
if curl -f -s http://localhost/api/health >/dev/null 2>&1; then
    echo -e "  ✅ ${GREEN}API health${NC}: Responding"
else
    echo -e "  ❌ ${RED}API health${NC}: Not responding"
    HTTP_STATUS=1
fi

# Check database connectivity
log "💾 Checking database connectivity..."
DB_STATUS=0

if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo -e "  ✅ ${GREEN}MongoDB${NC}: Connected"
else
    echo -e "  ❌ ${RED}MongoDB${NC}: Connection failed"
    DB_STATUS=1
fi

# Check disk space
log "💽 Checking disk space..."
DISK_STATUS=0
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "  ✅ ${GREEN}Disk space${NC}: ${DISK_USAGE}% used"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "  ⚠️  ${YELLOW}Disk space${NC}: ${DISK_USAGE}% used (warning)"
    DISK_STATUS=1
else
    echo -e "  ❌ ${RED}Disk space${NC}: ${DISK_USAGE}% used (critical)"
    DISK_STATUS=2
fi

# Check memory usage
log "🧠 Checking memory usage..."
MEMORY_STATUS=0
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')

if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo -e "  ✅ ${GREEN}Memory usage${NC}: ${MEMORY_USAGE}%"
elif [ "$MEMORY_USAGE" -lt 90 ]; then
    echo -e "  ⚠️  ${YELLOW}Memory usage${NC}: ${MEMORY_USAGE}% (warning)"
    MEMORY_STATUS=1
else
    echo -e "  ❌ ${RED}Memory usage${NC}: ${MEMORY_USAGE}% (critical)"
    MEMORY_STATUS=2
fi

# Check SSL certificates (if enabled)
if [ -f ".env" ] && grep -q "SSL_ENABLED=true" .env; then
    log "🔒 Checking SSL certificates..."
    SSL_STATUS=0
    
    DOMAIN=$(grep "DOMAIN=" .env | cut -d'=' -f2)
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "yourdomain.com" ]; then
        if docker-compose exec nginx ls /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem >/dev/null 2>&1; then
            # Check certificate expiry
            CERT_EXPIRY=$(docker-compose exec nginx openssl x509 -enddate -noout -in /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem | cut -d= -f2)
            EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
            CURRENT_DATE=$(date +%s)
            DAYS_LEFT=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))
            
            if [ "$DAYS_LEFT" -gt 30 ]; then
                echo -e "  ✅ ${GREEN}SSL certificate${NC}: Valid ($DAYS_LEFT days left)"
            elif [ "$DAYS_LEFT" -gt 7 ]; then
                echo -e "  ⚠️  ${YELLOW}SSL certificate${NC}: Expires in $DAYS_LEFT days"
                SSL_STATUS=1
            else
                echo -e "  ❌ ${RED}SSL certificate${NC}: Expires in $DAYS_LEFT days (critical)"
                SSL_STATUS=2
            fi
        else
            echo -e "  ❌ ${RED}SSL certificate${NC}: Not found"
            SSL_STATUS=2
        fi
    else
        echo -e "  ⚠️  ${YELLOW}SSL certificate${NC}: Domain not configured"
        SSL_STATUS=1
    fi
fi

# Overall status
log ""
log "📋 Health Check Summary:"

OVERALL_STATUS=0
if [ $CONTAINERS_STATUS -eq 0 ] && [ $HEALTH_STATUS -eq 0 ] && [ $HTTP_STATUS -eq 0 ] && [ $DB_STATUS -eq 0 ]; then
    if [ $DISK_STATUS -lt 2 ] && [ $MEMORY_STATUS -lt 2 ]; then
        echo -e "  🎉 ${GREEN}Overall Status: HEALTHY${NC}"
        OVERALL_STATUS=0
    else
        echo -e "  ⚠️  ${YELLOW}Overall Status: WARNING${NC}"
        OVERALL_STATUS=1
    fi
else
    echo -e "  ❌ ${RED}Overall Status: UNHEALTHY${NC}"
    OVERALL_STATUS=2
fi

# Show resource usage
log ""
log "📊 Resource Usage:"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "  Memory: ${MEMORY_USAGE}%"
echo "  Disk: ${DISK_USAGE}%"
echo "  Load: $(uptime | awk -F'load average:' '{print $2}')"

# Show container resource usage
log ""
log "🐳 Container Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

log ""
if [ $OVERALL_STATUS -eq 0 ]; then
    success "Health check completed - All systems operational! 🎉"
elif [ $OVERALL_STATUS -eq 1 ]; then
    log "Health check completed - Some warnings detected ⚠️"
else
    error "Health check completed - Issues detected ❌"
fi

exit $OVERALL_STATUS
