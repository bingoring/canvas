#!/bin/bash
# Cleanup script for Canvas AI Orchestration Platform

set -e

echo "🧹 Canvas AI Orchestration Platform - Cleanup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to ask for confirmation
confirm() {
    read -p "$1 [y/N]: " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

echo "This script will help you clean up Docker resources for Canvas AI platform."
echo ""

# Stop and remove containers
if confirm "Stop and remove all Canvas containers?"; then
    echo "🛑 Stopping containers..."
    docker-compose down
    echo -e "${GREEN}✅ Containers stopped and removed${NC}"
fi

# Remove images
if confirm "Remove Canvas Docker images?"; then
    echo "🗑️  Removing images..."

    # Remove Canvas app images
    docker images | grep canvas | awk '{print $3}' | xargs -r docker rmi -f

    # Remove dangling images
    docker image prune -f

    echo -e "${GREEN}✅ Images removed${NC}"
fi

# Remove volumes
if confirm "Remove all Docker volumes (⚠️  This will delete all data!)?"; then
    echo -e "${RED}⚠️  Removing volumes...${NC}"
    docker-compose down -v

    # Remove named volumes
    docker volume ls | grep canvas | awk '{print $2}' | xargs -r docker volume rm

    echo -e "${GREEN}✅ Volumes removed${NC}"
    echo -e "${YELLOW}⚠️  All persistent data has been deleted!${NC}"
fi

# Remove networks
if confirm "Remove Canvas Docker networks?"; then
    echo "🌐 Removing networks..."
    docker network ls | grep canvas | awk '{print $1}' | xargs -r docker network rm
    echo -e "${GREEN}✅ Networks removed${NC}"
fi

# Clean up system
if confirm "Perform system cleanup (remove unused containers, networks, images)?"; then
    echo "🧹 Performing system cleanup..."
    docker system prune -f
    echo -e "${GREEN}✅ System cleanup completed${NC}"
fi

# Clean up logs
if confirm "Clean up application logs?"; then
    echo "📝 Cleaning up logs..."
    rm -rf logs/*
    mkdir -p logs
    echo -e "${GREEN}✅ Logs cleaned${NC}"
fi

# Clean up uploads
if confirm "Clean up uploaded files?"; then
    echo "📁 Cleaning up uploads..."
    rm -rf uploads/*
    mkdir -p uploads
    echo -e "${GREEN}✅ Uploads cleaned${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cleanup completed!${NC}"
echo ""
echo "To start fresh:"
echo "  - Development: ./docker/scripts/dev-start.sh"
echo "  - Production: ./docker/scripts/prod-deploy.sh"