#!/bin/bash
# Production deployment script for Canvas AI Orchestration Platform

set -e

echo "🚀 Deploying Canvas AI Orchestration Platform (Production Mode)"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found. Please create it from .env.example"
    exit 1
fi

# Validate required environment variables
echo "🔍 Validating environment variables..."
source .env.production

required_vars=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "MONGODB_ATLAS_URI"
    "REDIS_HOST"
    "REDIS_PASSWORD"
    "OPENSEARCH_ENDPOINT"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment validation passed"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p plugins-external uploads logs

# Build production image
echo "🔨 Building production image..."
docker-compose \
    --env-file .env.production \
    build canvas-app

# Run security scan (optional)
if command -v trivy &> /dev/null; then
    echo "🔒 Running security scan..."
    trivy image canvas-orchestration-app:latest
fi

# Start production services (only local ones, assuming cloud services for others)
echo "🐳 Starting production services..."
docker-compose \
    --env-file .env.production \
    up -d canvas-app

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
timeout=300
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        echo "✅ Application is ready!"
        break
    fi
    echo "Waiting for application... ($counter/$timeout)"
    sleep 5
    counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Application failed to start within $timeout seconds"
    docker-compose logs canvas-app
    exit 1
fi

echo "✅ Production deployment completed successfully!"
echo "📊 Application running at: http://localhost:3000"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose logs -f canvas-app"
echo "   - Check health: curl http://localhost:3000/health"
echo "   - Stop services: docker-compose down"
echo "   - Update deployment: ./docker/scripts/prod-update.sh"