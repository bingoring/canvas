# Canvas AI Orchestration Platform - Docker Infrastructure

This document provides comprehensive guidance for deploying and managing the Canvas AI Orchestration Platform using Docker.

## 🏗️ Architecture Overview

The platform consists of the following services:

- **Canvas App**: NestJS application (Port 3000)
- **MongoDB**: Primary database with vector search (Port 27017)
- **Redis**: Caching layer (Port 6379)
- **OpenSearch**: Search and vector capabilities (Port 9200)
- **OpenSearch Dashboards**: Search UI (Port 5601) - Development only
- **MongoDB Express**: Database UI (Port 8081) - Development only
- **Redis Commander**: Redis UI (Port 8082) - Development only

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Make (optional, for convenience commands)

### Development Setup

1. **Setup environment**:
   ```bash
   make setup-env
   # or manually: cp .env.example .env.development
   ```

2. **Start development environment**:
   ```bash
   make dev
   # or: ./docker/scripts/dev-start.sh
   ```

3. **Access the application**:
   - Application: http://localhost:3000
   - Health check: http://localhost:3000/health
   - MongoDB Express: http://localhost:8081
   - Redis Commander: http://localhost:8082
   - OpenSearch Dashboards: http://localhost:5601

### Production Deployment

1. **Create production environment file**:
   ```bash
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Deploy to production**:
   ```bash
   make prod
   # or: ./docker/scripts/prod-deploy.sh
   ```

## 📁 File Structure

```
├── docker/
│   ├── mongodb/
│   │   └── init-scripts/
│   │       └── init.js              # MongoDB initialization
│   ├── redis/
│   │   └── redis.conf               # Redis configuration
│   ├── opensearch/
│   │   ├── opensearch.yml           # OpenSearch configuration
│   │   └── opensearch_dashboards.yml # Dashboards configuration
│   └── scripts/
│       ├── dev-start.sh             # Development startup
│       ├── prod-deploy.sh           # Production deployment
│       ├── prod-update.sh           # Rolling updates
│       ├── health-check.sh          # Health monitoring
│       ├── backup.sh                # Data backup
│       └── cleanup.sh               # Resource cleanup
├── docker-compose.yml               # Main compose file
├── docker-compose.override.yml      # Development overrides
├── Dockerfile                       # Multi-stage build
├── .dockerignore                    # Build optimization
├── .env.example                     # Environment template
├── .env.development                 # Development config
├── .env.production                  # Production config
└── Makefile                         # Convenience commands
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Application port | `3000` |
| `DOCKER_TARGET` | Docker build target | `development` |
| `AWS_REGION` | AWS region | `ap-northeast-2` |
| `MONGODB_URI` | MongoDB connection string | Local connection |
| `REDIS_HOST` | Redis hostname | `redis` |
| `OPENSEARCH_ENDPOINT` | OpenSearch endpoint | `https://opensearch:9200` |

### Docker Profiles

Use profiles to control which services are started:

```bash
# Development with tools
docker-compose --profile development up

# Full development environment
docker-compose --profile full up

# Production (default)
docker-compose up
```

## 🛠️ Development Workflow

### Hot Reload Development

The development setup supports hot reload:

```bash
# Start with hot reload
make dev

# View logs
make dev-logs

# Access container shell
make dev-shell
```

### Running Tests

```bash
# Unit tests
make test

# E2E tests
make test-e2e

# Build test image
make test-build
```

### Database Operations

```bash
# Access MongoDB shell
make db-shell

# Reset database (development)
make db-reset

# Seed with sample data
make db-seed

# Access Redis CLI
make redis-cli
```

## 🏭 Production Operations

### Deployment

```bash
# Initial deployment
make prod

# Rolling update
make prod-update

# View production logs
make prod-logs
```

### Monitoring

```bash
# Health check all services
make health

# View container stats
make stats

# Show running containers
make ps
```

### Backup and Recovery

```bash
# Create backup
make backup

# The backup script creates:
# - MongoDB dump
# - Redis snapshot
# - OpenSearch indices
# - Application files
# - Configuration files
```

## 🔒 Security Considerations

### Development Security

- Default passwords in development files
- Self-signed certificates for OpenSearch
- Relaxed CORS settings
- Debug logging enabled

### Production Security

- Change all default passwords
- Use proper SSL certificates
- Configure proper firewall rules
- Enable audit logging
- Use secrets management for sensitive data

### Required Changes for Production

1. **Update passwords**:
   ```bash
   # Generate secure passwords
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 16  # For database passwords
   ```

2. **Configure SSL**:
   - Replace OpenSearch demo certificates
   - Configure proper TLS for MongoDB
   - Use HTTPS for the application

3. **AWS Configuration**:
   - Use IAM roles instead of access keys when possible
   - Configure proper S3 bucket policies
   - Set up VPC for network isolation

## 📊 Monitoring and Logging

### Application Logs

```bash
# View application logs
docker-compose logs -f canvas-app

# View all service logs
make logs

# Container stats
make stats
```

### Health Checks

The platform includes comprehensive health checks:

- Application health endpoint: `/health`
- MongoDB replica set status
- Redis connectivity
- OpenSearch cluster health

```bash
# Manual health check
make health

# Automated monitoring (add to cron)
0 */5 * * * /path/to/canvas/docker/scripts/health-check.sh
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Canvas Platform
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          chmod +x docker/scripts/prod-deploy.sh
          ./docker/scripts/prod-deploy.sh
```

### Build Optimization

The Dockerfile uses multi-stage builds:

- **base**: Common dependencies
- **development**: Dev dependencies + source mounting
- **build**: Compile TypeScript and prune dependencies
- **production**: Optimized runtime image
- **test**: Testing environment

## 🚨 Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   # Check logs
   docker-compose logs [service-name]

   # Check health
   make health
   ```

2. **Port conflicts**:
   ```bash
   # Check what's using ports
   lsof -i :3000
   netstat -tulpn | grep :3000
   ```

3. **Memory issues**:
   ```bash
   # Check container stats
   make stats

   # Adjust memory limits in docker-compose.yml
   ```

4. **MongoDB replica set**:
   ```bash
   # Initialize replica set manually
   docker-compose exec mongodb mongosh --eval "rs.initiate()"
   ```

### Reset Everything

```bash
# Complete cleanup
make clean

# Start fresh
make dev
```

## 📈 Performance Tuning

### Development

- Use volume mounts for hot reload
- Increase memory limits if needed
- Enable TypeScript incremental builds

### Production

- Multi-stage builds reduce image size
- Resource limits prevent resource exhaustion
- Proper logging configuration
- Connection pooling for databases

## 🔗 External Dependencies

### AWS Services Required

- **Bedrock**: AI model access
- **S3**: File storage
- **OpenSearch**: (Optional) Managed search service

### Optional Cloud Services

- **MongoDB Atlas**: Managed MongoDB
- **Redis Cloud**: Managed Redis
- **AWS OpenSearch**: Managed search service

## 📞 Support

For issues with the Docker infrastructure:

1. Check this documentation
2. Review logs: `make logs`
3. Run health check: `make health`
4. Check container stats: `make stats`

## 🚀 Advanced Usage

### Custom Configurations

1. **Override Docker Compose**:
   ```yaml
   # docker-compose.local.yml
   version: '3.8'
   services:
     canvas-app:
       ports:
         - "3001:3000"  # Custom port
   ```

2. **Custom Environment**:
   ```bash
   # .env.staging
   NODE_ENV=staging
   # ... staging-specific config
   ```

   ```bash
   # Use custom environment
   docker-compose --env-file .env.staging up
   ```

### Scaling Services

```bash
# Scale application instances
docker-compose up -d --scale canvas-app=3

# Use load balancer (nginx example)
# Add nginx service to docker-compose.yml
```

### Development Tools Integration

```bash
# VS Code development container
# Add .devcontainer/devcontainer.json

# Debugging
# Expose debug port in development
```

This Docker infrastructure provides a robust, scalable foundation for the Canvas AI Orchestration Platform with comprehensive tooling for development, testing, and production deployment.