#!/bin/bash
# ROR-STAY Stop Script
set -e

echo "🛑 Stopping ROR-STAY..."
cd /home/azureuser/ror/ROR-STAY
sudo docker-compose down
echo "✅ ROR-STAY stopped successfully"
