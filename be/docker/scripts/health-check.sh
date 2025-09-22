#!/bin/bash
# Health check script for Canvas AI Orchestration Platform

set -e

echo "🏥 Canvas AI Orchestration Platform - Health Check"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local service_name=$1
    local health_url=$2
    local timeout=${3:-10}

    echo -n "Checking $service_name... "

    if timeout $timeout curl -s -f "$health_url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Function to check Docker service status
check_docker_service() {
    local service_name=$1
    echo -n "Checking Docker service $service_name... "

    local status=$(docker-compose ps -q $service_name 2>/dev/null)
    if [ -n "$status" ]; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' $(docker-compose ps -q $service_name) 2>/dev/null || echo "unknown")
        case $health in
            "healthy")
                echo -e "${GREEN}✅ Healthy${NC}"
                return 0
                ;;
            "unhealthy")
                echo -e "${RED}❌ Unhealthy${NC}"
                return 1
                ;;
            "starting")
                echo -e "${YELLOW}⏳ Starting${NC}"
                return 1
                ;;
            *)
                if docker-compose ps $service_name | grep -q "Up"; then
                    echo -e "${GREEN}✅ Running${NC}"
                    return 0
                else
                    echo -e "${RED}❌ Down${NC}"
                    return 1
                fi
                ;;
        esac
    else
        echo -e "${RED}❌ Not found${NC}"
        return 1
    fi
}

# Main health checks
echo "🔍 Checking Docker services..."
echo "------------------------------"

services_healthy=0
total_services=0

# Check Canvas application
total_services=$((total_services + 1))
if check_docker_service "canvas-app"; then
    services_healthy=$((services_healthy + 1))
    # Additional application health check
    if check_service "Canvas App Health Endpoint" "http://localhost:3000/health" 10; then
        echo "   └─ Application endpoint responding"
    else
        echo "   └─ ⚠️  Application endpoint not responding"
    fi
fi

# Check MongoDB
total_services=$((total_services + 1))
if check_docker_service "mongodb"; then
    services_healthy=$((services_healthy + 1))
fi

# Check Redis
total_services=$((total_services + 1))
if check_docker_service "redis"; then
    services_healthy=$((services_healthy + 1))
    # Additional Redis check
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo "   └─ Redis responding to ping"
    else
        echo "   └─ ⚠️  Redis not responding to ping"
    fi
fi

# Check OpenSearch
total_services=$((total_services + 1))
if check_docker_service "opensearch"; then
    services_healthy=$((services_healthy + 1))
    # Additional OpenSearch check
    if check_service "OpenSearch API" "https://localhost:9200/_cluster/health" 15; then
        echo "   └─ OpenSearch API responding"
    else
        echo "   └─ ⚠️  OpenSearch API not responding"
    fi
fi

echo ""
echo "📊 Health Summary"
echo "=================="
echo "Services healthy: $services_healthy/$total_services"

if [ $services_healthy -eq $total_services ]; then
    echo -e "${GREEN}✅ All services are healthy!${NC}"
    exit 0
elif [ $services_healthy -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some services are unhealthy${NC}"
    exit 1
else
    echo -e "${RED}❌ All services are unhealthy${NC}"
    exit 2
fi