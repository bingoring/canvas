# Canvas AI Orchestration Platform - Kubernetes Infrastructure

This directory contains production-ready Kubernetes manifests and Helm charts for deploying the Canvas AI Orchestration Platform.

## 🏗️ Architecture Overview

```
📁 k8s/
├── 📁 base/                     # Base Kubernetes manifests
│   ├── 📁 app/                  # Canvas application resources
│   ├── 📁 mongodb/              # MongoDB cluster configuration
│   ├── 📁 redis/                # Redis cluster configuration
│   ├── 📁 opensearch/           # OpenSearch cluster configuration
│   └── 📄 *.yaml               # Shared resources (networking, RBAC, etc.)
├── 📁 overlays/                 # Environment-specific configurations
│   ├── 📁 development/          # Development environment
│   ├── 📁 staging/              # Staging environment
│   └── 📁 production/           # Production environment
├── 📁 helm/                     # Helm charts
│   └── 📁 canvas-orchestration/ # Main Helm chart
├── 📁 monitoring/               # Prometheus, Grafana, AlertManager
├── 📁 ingress/                  # Ingress controllers and SSL certificates
├── 📁 scripts/                  # Deployment and utility scripts
└── 📁 ci-cd/                    # CI/CD pipeline configurations
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
kubectl --version  # v1.28+
helm version      # v3.12+
kustomize version # v5.0+
```

### 1. Development Deployment

```bash
# Deploy to development environment
./scripts/deploy.sh development deploy

# Check status
kubectl get pods -n canvas-orchestration-dev
```

### 2. Production Deployment

```bash
# Setup production secrets
cp overlays/production/secrets.env.example overlays/production/secrets.env
# Edit secrets.env with actual values

# Deploy to production
./scripts/deploy.sh production deploy

# Monitor deployment
kubectl rollout status deployment/canvas-app -n canvas-orchestration
```

## 📋 Component Details

### Application Stack

| Component | Purpose | Replicas | Resources |
|-----------|---------|----------|-----------|
| **Canvas App** | NestJS API Server | 3 | 0.5 CPU, 1GB RAM |
| **MongoDB** | Primary Database | 3 | 1 CPU, 2GB RAM |
| **Redis** | Cache & Sessions | 3 | 0.25 CPU, 512MB RAM |
| **OpenSearch** | Search & Analytics | 3 | 2 CPU, 4GB RAM |

### Infrastructure Services

- **NGINX Ingress**: External traffic routing with SSL termination
- **cert-manager**: Automatic SSL certificate management
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Monitoring dashboards
- **HPA**: Horizontal Pod Autoscaling (3-20 replicas)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `production` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `MONGODB_URI` | MongoDB connection string | From secret |
| `REDIS_URL` | Redis connection string | From secret |
| `AWS_ACCESS_KEY_ID` | AWS credentials | From secret |

### Resource Requirements

#### Minimum Cluster Resources
- **Nodes**: 3 worker nodes
- **CPU**: 16 cores total
- **Memory**: 32GB total
- **Storage**: 500GB total

#### Per Environment
| Environment | CPU Requests | Memory Requests | Storage |
|-------------|--------------|-----------------|---------|
| Development | 2 cores | 4GB | 50GB |
| Staging | 6 cores | 12GB | 200GB |
| Production | 12 cores | 24GB | 500GB |

## 🛡️ Security Features

### Network Security
- **Network Policies**: Micro-segmentation between components
- **Pod Security Standards**: Restricted security contexts
- **RBAC**: Least-privilege service accounts

### Data Security
- **Encryption at Rest**: All persistent volumes encrypted
- **Encryption in Transit**: TLS 1.3 for all communications
- **Secret Management**: Kubernetes secrets with external secret management

### Application Security
- **Security Context**: Non-root containers with read-only filesystem
- **Resource Limits**: CPU and memory limits prevent resource exhaustion
- **Health Checks**: Liveness and readiness probes

## 📊 Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Custom business metrics
- **Infrastructure Metrics**: Node, pod, and cluster metrics
- **Database Metrics**: MongoDB, Redis, OpenSearch performance

### Dashboards
- **Canvas Overview**: Application health and performance
- **Infrastructure**: Cluster resource utilization
- **Database**: Database-specific metrics and alerts

### Alerting Rules
- Application downtime > 5 minutes
- Error rate > 10% for 5 minutes
- CPU utilization > 80% for 10 minutes
- Memory utilization > 85% for 10 minutes
- Disk space < 20%

## 🔄 Deployment Strategies

### Rolling Updates (Default)
```bash
# Zero-downtime deployments
kubectl set image deployment/canvas-app canvas-app=new-image:tag
```

### Blue-Green Deployments
```bash
# Use Helm for blue-green deployments
helm install canvas-blue ./helm/canvas-orchestration
# Test and switch traffic
helm install canvas-green ./helm/canvas-orchestration
```

### Canary Deployments
```bash
# Gradual traffic shifting with Istio (optional)
kubectl apply -f istio/canary-deployment.yaml
```

## 🔧 Operations

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment canvas-app --replicas=5

# Update HPA thresholds
kubectl patch hpa canvas-app-hpa -p '{"spec":{"targetCPUUtilizationPercentage":60}}'
```

### Backup Operations

```bash
# Database backup
kubectl exec canvas-mongodb-0 -- mongodump --archive --gzip > backup.gz

# Configuration backup
kubectl get configmap,secret -o yaml > config-backup.yaml
```

### Update Operations

```bash
# Application update
IMAGE_TAG=v1.2.3 ./scripts/deploy.sh production deploy

# Database maintenance mode
kubectl scale deployment canvas-app --replicas=0
# Perform maintenance
kubectl scale deployment canvas-app --replicas=3
```

## 🚨 Troubleshooting

### Common Issues

#### Pod Startup Issues
```bash
# Check pod status
kubectl describe pod <pod-name> -n canvas-orchestration

# View logs
kubectl logs <pod-name> -n canvas-orchestration

# Check events
kubectl get events -n canvas-orchestration --sort-by=.lastTimestamp
```

#### Database Connection Issues
```bash
# Test MongoDB connection
kubectl run debug --image=mongo:7.0 --rm -it -- mongosh mongodb://canvas-mongodb-service:27017

# Test Redis connection
kubectl run debug --image=redis:7.2-alpine --rm -it -- redis-cli -h canvas-redis-service
```

#### Performance Issues
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n canvas-orchestration

# View metrics in Grafana
kubectl port-forward svc/grafana-service 3000:3000 -n monitoring
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n canvas-orchestration

# Check network connectivity
kubectl exec -it canvas-app-xxx -- nslookup canvas-mongodb-service

# Verify storage
kubectl get pvc,pv -n canvas-orchestration
```

## 📈 Performance Tuning

### Application Optimization
- **Resource Requests/Limits**: Fine-tune based on actual usage
- **JVM Settings**: Optimize heap size for better performance
- **Connection Pooling**: Configure optimal database connection pools

### Database Optimization
- **MongoDB**: Enable sharding for large datasets
- **Redis**: Configure appropriate eviction policies
- **OpenSearch**: Optimize index settings and shard allocation

### Network Optimization
- **Service Mesh**: Consider Istio for advanced traffic management
- **Load Balancing**: Use session affinity when needed
- **CDN**: Implement CDN for static assets

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Deploy
      run: ./k8s/scripts/deploy.sh production deploy
```

### GitLab CI
```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - ./k8s/scripts/deploy.sh production deploy
  only:
    - main
```

## 📚 Additional Resources

- [Kubernetes Deployment Guide](../K8S_DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [Docker Setup](../DOCKER_README.md) - Local development with Docker
- [API Documentation](../docs/api.md) - Canvas API reference
- [Architecture Overview](../docs/architecture.md) - System architecture details

## 🆘 Support

For deployment issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [GitHub Issues](https://github.com/your-org/canvas-orchestration/issues)
3. Contact the DevOps team: devops@yourdomain.com

---

**Canvas AI Orchestration Platform** - Production-ready Kubernetes deployment for AI workflow orchestration.