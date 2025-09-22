#!/bin/bash
# Development startup script for Canvas AI Orchestration Platform

set -e

echo "🚀 Starting Canvas AI Orchestration Platform (Development Mode)"

# Check if .env.development exists
if [ ! -f .env.development ]; then
    echo "❌ .env.development file not found. Copying from .env.example..."
    cp .env.example .env.development
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p plugins-external uploads logs

# Start development services
echo "🐳 Starting development services..."
docker-compose \
    --env-file .env.development \
    --profile development \
    up -d mongodb redis opensearch

echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

# Initialize MongoDB replica set (required for transactions)
echo "🔧 Initializing MongoDB replica set..."
docker-compose exec mongodb mongosh --eval "
try {
    rs.initiate({
        _id: 'rs0',
        members: [{ _id: 0, host: 'localhost:27017' }]
    });
    print('Replica set initialized successfully');
} catch (e) {
    if (e.message.includes('already initialized')) {
        print('Replica set already initialized');
    } else {
        throw e;
    }
}"

# Start the application
echo "🎯 Starting Canvas application..."
docker-compose \
    --env-file .env.development \
    --profile development \
    up canvas-app

echo "✅ Development environment started successfully!"
echo "📊 Access points:"
echo "   - Application: http://localhost:3000"
echo "   - MongoDB Express: http://localhost:8081"
echo "   - Redis Commander: http://localhost:8082"
echo "   - OpenSearch Dashboards: http://localhost:5601"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f canvas-app"
echo "   - Stop services: docker-compose down"
echo "   - Rebuild app: docker-compose build canvas-app"