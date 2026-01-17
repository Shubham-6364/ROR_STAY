#!/bin/bash

# ROR STAY - Automated Deployment Script
# This script sets up ROR STAY on any Linux server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for services
wait_for_services() {
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check if services are healthy
    for i in {1..12}; do
        if curl -s http://localhost/api/health >/dev/null 2>&1; then
            print_success "All services are healthy!"
            return 0
        fi
        print_status "Waiting for services... ($i/12)"
        sleep 10
    done
    
    print_error "Services failed to start properly"
    return 1
}

# Main deployment function
deploy_ror_stay() {
    print_status "🏠 Starting ROR STAY deployment..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is not recommended for production."
    fi
    
    # Update system
    print_status "📦 Updating system packages..."
    if command_exists apt; then
        sudo apt update && sudo apt upgrade -y
    elif command_exists yum; then
        sudo yum update -y
    else
        print_warning "Unknown package manager. Please update your system manually."
    fi
    
    # Install Docker if not present
    if ! command_exists docker; then
        print_status "🐳 Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        print_success "Docker installed successfully"
    else
        print_success "Docker is already installed"
    fi
    
    # Install Docker Compose if not present
    if ! command_exists docker-compose; then
        print_status "🔧 Installing Docker Compose..."
        if command_exists apt; then
            sudo apt install docker-compose -y
        elif command_exists yum; then
            sudo yum install docker-compose -y
        else
            # Install via pip as fallback
            sudo pip3 install docker-compose
        fi
        print_success "Docker Compose installed successfully"
    else
        print_success "Docker Compose is already installed"
    fi
    
    # Start Docker service
    print_status "🚀 Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Stop any conflicting services
    print_status "🛑 Stopping conflicting services..."
    if systemctl is-active --quiet nginx; then
        sudo systemctl stop nginx
        print_status "Stopped system nginx"
    fi
    
    if systemctl is-active --quiet apache2; then
        sudo systemctl stop apache2
        print_status "Stopped Apache"
    fi
    
    # Kill any processes using port 80
    if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_status "Killing processes using port 80..."
        sudo lsof -ti:80 | xargs sudo kill -9 2>/dev/null || true
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "docker-compose.yml" ]]; then
        print_error "docker-compose.yml not found. Please run this script from the ROR STAY project directory."
        exit 1
    fi
    
    # Initialize database with current data
    print_status "🗄️ Initializing database..."
    if [[ -f "database-init/init-database.js" ]]; then
        if command_exists node; then
            node database-init/init-database.js || print_warning "Database initialization failed, will use default data"
        else
            print_warning "Node.js not found. Skipping database initialization."
        fi
    fi
    
    # Build and start services
    print_status "🏗️ Building and starting ROR STAY services..."
    docker-compose down 2>/dev/null || true
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for services to be ready
    if wait_for_services; then
        print_success "🎉 ROR STAY deployed successfully!"
        echo
        print_status "📊 Deployment Summary:"
        echo "  🌐 Website: http://localhost"
        echo "  🔐 Admin Panel: http://localhost/admin/listings"
        echo "  👤 Admin Login: admin@rorstay.com / admin123"
        echo "  📧 Contact Management: http://localhost/admin/submissions"
        echo
        print_status "🔧 Useful Commands:"
        echo "  Check status: docker-compose ps"
        echo "  View logs: docker-compose logs"
        echo "  Restart: docker-compose restart"
        echo "  Stop: docker-compose down"
        echo
        print_success "Happy Property Renting! 🏠✨"
    else
        print_error "Deployment failed. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "ROR STAY Deployment Script"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  deploy    Deploy ROR STAY (default)"
    echo "  status    Check deployment status"
    echo "  restart   Restart all services"
    echo "  stop      Stop all services"
    echo "  logs      Show service logs"
    echo "  help      Show this help message"
    echo
}

# Function to check status
check_status() {
    print_status "🔍 Checking ROR STAY status..."
    
    if docker-compose ps | grep -q "Up"; then
        print_success "Services are running"
        docker-compose ps
        echo
        
        if curl -s http://localhost/api/health >/dev/null 2>&1; then
            print_success "Application is healthy"
            echo "🌐 Website: http://localhost"
        else
            print_warning "Application is not responding"
        fi
    else
        print_error "Services are not running"
        echo "Run: $0 deploy"
    fi
}

# Function to restart services
restart_services() {
    print_status "🔄 Restarting ROR STAY services..."
    docker-compose restart
    
    if wait_for_services; then
        print_success "Services restarted successfully"
    else
        print_error "Failed to restart services"
    fi
}

# Function to stop services
stop_services() {
    print_status "🛑 Stopping ROR STAY services..."
    docker-compose down
    print_success "Services stopped"
}

# Function to show logs
show_logs() {
    print_status "📋 Showing ROR STAY logs..."
    docker-compose logs --tail=50 -f
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy_ror_stay
        ;;
    status)
        check_status
        ;;
    restart)
        restart_services
        ;;
    stop)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
