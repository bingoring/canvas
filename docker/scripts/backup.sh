#!/bin/bash
# Backup script for Canvas AI Orchestration Platform

set -e

echo "💾 Canvas AI Orchestration Platform - Backup"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📅 Backup timestamp: $TIMESTAMP"
echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Backup MongoDB
echo "🗄️  Backing up MongoDB..."
if docker-compose ps mongodb | grep -q "Up"; then
    docker-compose exec -T mongodb mongodump \
        --host localhost:27017 \
        --authenticationDatabase admin \
        --username admin \
        --password password \
        --out /tmp/mongodump

    docker cp $(docker-compose ps -q mongodb):/tmp/mongodump "$BACKUP_DIR/mongodb"
    echo -e "${GREEN}✅ MongoDB backup completed${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB not running, skipping...${NC}"
fi

# Backup Redis
echo "🔴 Backing up Redis..."
if docker-compose ps redis | grep -q "Up"; then
    # Trigger Redis save
    docker-compose exec -T redis redis-cli BGSAVE

    # Wait for background save to complete
    while [ "$(docker-compose exec -T redis redis-cli LASTSAVE)" = "$(docker-compose exec -T redis redis-cli LASTSAVE)" ]; do
        sleep 1
    done

    # Copy RDB file
    docker cp $(docker-compose ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_dump.rdb"
    echo -e "${GREEN}✅ Redis backup completed${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not running, skipping...${NC}"
fi

# Backup OpenSearch indices
echo "🔍 Backing up OpenSearch indices..."
if docker-compose ps opensearch | grep -q "Up"; then
    # Create snapshot repository (if not exists)
    curl -s -X PUT "localhost:9200/_snapshot/backup_repository" \
        -u admin:OpenSearch123! \
        -H "Content-Type: application/json" \
        -d '{
            "type": "fs",
            "settings": {
                "location": "/tmp/opensearch_backup"
            }
        }' || true

    # Create snapshot
    SNAPSHOT_NAME="snapshot_$TIMESTAMP"
    curl -s -X PUT "localhost:9200/_snapshot/backup_repository/$SNAPSHOT_NAME" \
        -u admin:OpenSearch123! \
        -H "Content-Type: application/json" \
        -d '{
            "indices": "*",
            "ignore_unavailable": true,
            "include_global_state": false
        }'

    # Wait for snapshot to complete
    sleep 10

    # Copy snapshot files
    docker cp $(docker-compose ps -q opensearch):/tmp/opensearch_backup "$BACKUP_DIR/opensearch" || true
    echo -e "${GREEN}✅ OpenSearch backup completed${NC}"
else
    echo -e "${YELLOW}⚠️  OpenSearch not running, skipping...${NC}"
fi

# Backup application files
echo "📂 Backing up application files..."
cp -r plugins-external "$BACKUP_DIR/" 2>/dev/null || mkdir -p "$BACKUP_DIR/plugins-external"
cp -r uploads "$BACKUP_DIR/" 2>/dev/null || mkdir -p "$BACKUP_DIR/uploads"
cp -r logs "$BACKUP_DIR/" 2>/dev/null || mkdir -p "$BACKUP_DIR/logs"
echo -e "${GREEN}✅ Application files backup completed${NC}"

# Backup configuration
echo "⚙️  Backing up configuration..."
cp .env* "$BACKUP_DIR/" 2>/dev/null || true
cp docker-compose*.yml "$BACKUP_DIR/" 2>/dev/null || true
cp -r docker/ "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✅ Configuration backup completed${NC}"

# Create backup manifest
echo "📋 Creating backup manifest..."
cat > "$BACKUP_DIR/backup_manifest.txt" << EOF
Canvas AI Orchestration Platform Backup
=======================================

Backup Date: $(date)
Backup Directory: $BACKUP_DIR
Hostname: $(hostname)
Docker Compose Version: $(docker-compose --version)

Contents:
---------
EOF

if [ -d "$BACKUP_DIR/mongodb" ]; then
    echo "✅ MongoDB database dump" >> "$BACKUP_DIR/backup_manifest.txt"
fi

if [ -f "$BACKUP_DIR/redis_dump.rdb" ]; then
    echo "✅ Redis data dump" >> "$BACKUP_DIR/backup_manifest.txt"
fi

if [ -d "$BACKUP_DIR/opensearch" ]; then
    echo "✅ OpenSearch indices snapshot" >> "$BACKUP_DIR/backup_manifest.txt"
fi

echo "✅ Application files (plugins, uploads, logs)" >> "$BACKUP_DIR/backup_manifest.txt"
echo "✅ Configuration files (.env, docker-compose.yml)" >> "$BACKUP_DIR/backup_manifest.txt"

# Compress backup
echo "🗜️  Compressing backup..."
cd "$BACKUP_BASE_DIR"
tar -czf "${TIMESTAMP}.tar.gz" "$TIMESTAMP/"
BACKUP_SIZE=$(du -h "${TIMESTAMP}.tar.gz" | cut -f1)
echo -e "${GREEN}✅ Backup compressed: ${TIMESTAMP}.tar.gz ($BACKUP_SIZE)${NC}"

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_BASE_DIR" -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo "📁 Backup location: $BACKUP_BASE_DIR/${TIMESTAMP}.tar.gz"
echo "📋 Manifest: $BACKUP_DIR/backup_manifest.txt"
echo ""
echo "🔧 To restore from this backup:"
echo "   ./docker/scripts/restore.sh ${TIMESTAMP}.tar.gz"