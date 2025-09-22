#!/bin/bash
# Production update script for Canvas AI Orchestration Platform

set -e

echo "🔄 Updating Canvas AI Orchestration Platform (Production Mode)"

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ No services are currently running. Use prod-deploy.sh instead."
    exit 1
fi

# Create backup of current state
echo "💾 Creating backup of current deployment..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Export current environment
docker-compose config > "$BACKUP_DIR/docker-compose.backup.yml"
cp .env.production "$BACKUP_DIR/.env.production.backup"

echo "✅ Backup created in $BACKUP_DIR"

# Build new image
echo "🔨 Building updated image..."
docker-compose \
    --env-file .env.production \
    build canvas-app

# Perform rolling update
echo "🔄 Performing rolling update..."

# Scale up new instance
docker-compose \
    --env-file .env.production \
    up -d --scale canvas-app=2 canvas-app

# Wait for new instance to be healthy
echo "⏳ Waiting for new instance to be healthy..."
sleep 30

# Check if new instances are healthy
healthy_instances=$(docker-compose ps canvas-app | grep "Up (healthy)" | wc -l)
if [ "$healthy_instances" -lt 1 ]; then
    echo "❌ New instance is not healthy. Rolling back..."
    docker-compose \
        --env-file .env.production \
        up -d --scale canvas-app=1 canvas-app
    exit 1
fi

# Scale down to single instance (removes old container)
echo "⬇️ Scaling down to single instance..."
docker-compose \
    --env-file .env.production \
    up -d --scale canvas-app=1 canvas-app

# Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Production update completed successfully!"
echo "📊 Application running at: http://localhost:3000"
echo "💾 Backup available at: $BACKUP_DIR"
echo ""
echo "🔧 Post-update checklist:"
echo "   - Check health: curl http://localhost:3000/health"
echo "   - Monitor logs: docker-compose logs -f canvas-app"
echo "   - Verify functionality with test requests"