#!/usr/bin/env bash
set -euo pipefail

# ROR-STAY Source Code Copy Script
# This script copies your existing ROR-STAY source code into the containerized structure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="${1:-/root/ROR-STAY}"

log() { echo "[copy-source] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

log "📁 Copying ROR-STAY source code to containerized structure..."

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    error "Source directory not found: $SOURCE_DIR"
fi

# Create necessary directories
log "📁 Creating directory structure..."
mkdir -p "$PROJECT_DIR/backend/src"
mkdir -p "$PROJECT_DIR/frontend/src"
mkdir -p "$PROJECT_DIR/frontend/public"
mkdir -p "$PROJECT_DIR/mongodb/init"

# Copy backend source code
log "📦 Copying backend source code..."
if [ -d "$SOURCE_DIR/backend" ]; then
    cp -r "$SOURCE_DIR/backend"/* "$PROJECT_DIR/backend/src/" 2>/dev/null || true
    log "✅ Backend code copied"
else
    log "⚠️  Backend directory not found in source"
fi

# Copy frontend source code
log "📦 Copying frontend source code..."
if [ -d "$SOURCE_DIR/frontend" ]; then
    # Copy source files
    cp -r "$SOURCE_DIR/frontend/src"/* "$PROJECT_DIR/frontend/src/" 2>/dev/null || true
    
    # Copy public files
    if [ -d "$SOURCE_DIR/frontend/public" ]; then
        cp -r "$SOURCE_DIR/frontend/public"/* "$PROJECT_DIR/frontend/public/" 2>/dev/null || true
    fi
    
    # Copy configuration files
    for file in craco.config.js tailwind.config.js postcss.config.js; do
        if [ -f "$SOURCE_DIR/frontend/$file" ]; then
            cp "$SOURCE_DIR/frontend/$file" "$PROJECT_DIR/frontend/"
        fi
    done
    
    log "✅ Frontend code copied"
else
    log "⚠️  Frontend directory not found in source"
fi

# Copy database initialization scripts
log "📦 Copying database initialization scripts..."
if [ -d "$SOURCE_DIR/backend" ]; then
    # Look for database initialization scripts
    find "$SOURCE_DIR/backend" -name "*sample*" -o -name "*init*" -o -name "*seed*" | while read -r file; do
        if [[ "$file" == *.py ]]; then
            cp "$file" "$PROJECT_DIR/mongodb/init/" 2>/dev/null || true
        fi
    done
    log "✅ Database scripts copied"
fi

# Update package.json to remove proxy (not needed in containerized version)
log "🔧 Updating frontend package.json..."
if [ -f "$PROJECT_DIR/frontend/package.json" ]; then
    # Remove proxy line if it exists
    sed -i '/"proxy":/d' "$PROJECT_DIR/frontend/package.json" 2>/dev/null || true
    log "✅ Package.json updated"
fi

# Create a simple database initialization script
log "📝 Creating database initialization script..."
cat > "$PROJECT_DIR/mongodb/init/init-db.js" << 'EOF'
// MongoDB initialization script for ROR-STAY
// This script runs when the MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('ror_stay_database');

// Create collections with indexes
db.createCollection('properties');
db.createCollection('contacts');
db.createCollection('users');

// Create indexes for better performance
db.properties.createIndex({ "status": 1 });
db.properties.createIndex({ "property_type": 1 });
db.properties.createIndex({ "price": 1 });
db.properties.createIndex({ "address.city": 1 });
db.properties.createIndex({ "created_at": -1 });

db.contacts.createIndex({ "created_at": -1 });
db.contacts.createIndex({ "email": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });

print('Database initialized successfully');
EOF

# Show summary
log ""
log "📊 Copy Summary:"
log "   Backend files: $(find "$PROJECT_DIR/backend/src" -type f 2>/dev/null | wc -l)"
log "   Frontend files: $(find "$PROJECT_DIR/frontend/src" -type f 2>/dev/null | wc -l)"
log "   Public files: $(find "$PROJECT_DIR/frontend/public" -type f 2>/dev/null | wc -l)"
log "   Init scripts: $(find "$PROJECT_DIR/mongodb/init" -type f 2>/dev/null | wc -l)"

log ""
log "✅ Source code copy completed successfully!"
log ""
log "📝 Next steps:"
log "   1. Review copied files in $PROJECT_DIR"
log "   2. Configure .env file: cp .env.example .env"
log "   3. Deploy: ./scripts/deploy-dev.sh or ./scripts/deploy-prod.sh"
