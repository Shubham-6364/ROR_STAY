#!/bin/bash
# ROR-STAY Quick Start Script
set -e

echo "🚀 Starting ROR-STAY Application..."
echo "===================================="
echo ""

if ! sudo docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

cd /home/azureuser/ror/ROR-STAY

echo "📦 Starting Docker containers..."
sudo docker-compose up -d

echo "⏳ Waiting for services (30 seconds)..."
sleep 30

echo ""
echo "📊 Container Status:"
sudo docker-compose ps

echo ""
echo "🎉 ROR-STAY is running!"
echo ""
echo "🌐 Access URLs:"
echo "   Main Website:  http://localhost"
echo "   Admin Panel:   http://localhost/admin/listings"
echo ""
echo "🔐 Admin Login:"
echo "   Email:    admin@rorstay.com"
echo "   Password: admin123"
echo ""
