#!/bin/bash

# ROR STAY - Database Setup Script
# This script installs dependencies and initializes the database

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_status "🗄️ Setting up ROR STAY database..."

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    print_status "📦 Installing Node.js..."
    
    # Install Node.js based on the system
    if command -v apt >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum >/dev/null 2>&1; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    else
        print_status "Please install Node.js manually from https://nodejs.org/"
        exit 1
    fi
fi

# Navigate to database-init directory
cd database-init

# Install dependencies
print_status "📦 Installing database dependencies..."
npm install

# Run database initialization
print_status "🚀 Initializing database with current data..."
node init-database.js

print_success "✅ Database setup completed!"
print_status "You can now start ROR STAY with: docker-compose up -d"
