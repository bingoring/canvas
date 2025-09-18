# Canvas AI Orchestration Platform - Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the Canvas AI Orchestration Platform on Kubernetes with production-ready configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Environment Setup](#environment-setup)
5. [Deployment Methods](#deployment-methods)
6. [Configuration](#configuration)
7. [Monitoring](#monitoring)
8. [Security](#security)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance](#maintenance)

## Prerequisites

### Required Tools

- `kubectl` (v1.28+)
- `helm` (v3.12+)
- `kustomize` (v5.0+)
- `docker` (for local builds)
- Cloud CLI tools (AWS CLI, gcloud, or Azure CLI)

### Kubernetes Cluster Requirements

- Kubernetes v1.28+
- Minimum 3 worker nodes
- 16 CPU cores total
- 32GB RAM total
- 500GB storage capacity
- Load balancer support
- Ingress controller support

### Cloud Provider Setup

#### AWS (Recommended)
```bash
# Install AWS CLI and configure credentials
aws configure

# Create EKS cluster using our setup script
./k8s/scripts/setup-cluster.sh --cluster-name canvas-prod --region us-east-1
```

#### Google Cloud Platform
```bash
# Create GKE cluster
gcloud container clusters create canvas-cluster \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --disk-size=50GB \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10
```

#### Azure
```bash
# Create AKS cluster
az aks create \
  --resource-group canvas-rg \
  --name canvas-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring
```

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd canvas-orchestration
```

### 2. Configure Environment

```bash
# Copy environment template
cp k8s/overlays/production/secrets.env.example k8s/overlays/production/secrets.env

# Edit secrets with your actual values
nano k8s/overlays/production/secrets.env
```

### 3. Deploy to Development

```bash
# Deploy to development environment
./k8s/scripts/deploy.sh development deploy

# Check status
./k8s/scripts/deploy.sh development status
```

### 4. Deploy to Production

```bash
# Deploy using Helm (recommended for production)
./k8s/scripts/deploy.sh production deploy

# Or using Kustomize
kubectl apply -k k8s/overlays/production
```

## Architecture Overview

### Component Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ingress       │    │   Canvas App    │    │   Monitoring    │
│   Controller    │───▶│   (NestJS)      │───▶│   Stack         │
│   (NGINX)       │    │   3 replicas    │    │   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌────────┼────────┐
                       │        │        │
                       ▼        ▼        ▼
              ┌─────────────┐ ┌──────┐ ┌──────────┐
              │   MongoDB   │ │Redis │ │OpenSearch│
              │ Replica Set │ │Cluster│ │ Cluster  │
              │ 3 replicas  │ │3 nodes│ │ 3 nodes  │
              └─────────────┘ └──────┘ └──────────┘
```

### Network Architecture

- **Ingress Layer**: NGINX Ingress Controller with SSL termination
- **Application Layer**: Canvas NestJS application with auto-scaling
- **Data Layer**: MongoDB replica set, Redis cluster, OpenSearch cluster
- **Storage Layer**: Persistent volumes for data persistence
- **Monitoring Layer**: Prometheus, Grafana, AlertManager

## Environment Setup

### Development Environment

```bash
# Minimal resources for development
kubectl apply -k k8s/overlays/development

# Features:
# - Single replica for each service
# - Reduced resource limits
# - Development-friendly configurations
# - Swagger UI enabled
```

### Staging Environment

```bash
# Mirror production with reduced resources
kubectl apply -k k8s/overlays/staging

# Features:
# - Multi-replica setup
# - Production-like configuration
# - SSL certificates
# - Monitoring enabled
```

### Production Environment

```bash
# Full production deployment
helm install canvas-orchestration k8s/helm/canvas-orchestration \
  --namespace canvas-orchestration \
  --create-namespace \
  --values k8s/helm/canvas-orchestration/values-prod.yaml

# Features:
# - High availability
# - Auto-scaling
# - Resource quotas
# - Network policies
# - Security hardening
```

## Deployment Methods

### Method 1: Kustomize (Recommended for Dev/Staging)

```bash
# Deploy using Kustomize
kubectl apply -k k8s/overlays/production

# Update image tag
cd k8s/overlays/production
kustomize edit set image canvas-orchestration=your-registry/canvas:v1.2.3
kubectl apply -k .
```

### Method 2: Helm Charts (Recommended for Production)

```bash
# Install with Helm
helm install canvas-orchestration k8s/helm/canvas-orchestration \
  --namespace canvas-orchestration \
  --create-namespace \
  --set app.image.tag=v1.2.3 \
  --set app.replicaCount=5

# Upgrade deployment
helm upgrade canvas-orchestration k8s/helm/canvas-orchestration \
  --set app.image.tag=v1.2.4
```

### Method 3: Deployment Script (Easiest)

```bash
# Use our deployment script
./k8s/scripts/deploy.sh production deploy

# With custom image tag
IMAGE_TAG=v1.2.3 ./k8s/scripts/deploy.sh production deploy
```

## Configuration

### Application Configuration

Edit `k8s/base/app/configmap.yaml`:

```yaml
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  enable-swagger: "false"
  rate-limit-limit: "100"
  max-file-size: "10485760"
```

### Secrets Management

1. **Development**: Use default secrets
2. **Production**: Update `k8s/overlays/production/secrets.env`

```bash
# Generate secure passwords
openssl rand -base64 32  # For JWT secret
openssl rand -base64 16  # For database passwords
```

### Resource Limits

Adjust in environment-specific patches:

```yaml
# k8s/overlays/production/app-patches.yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

### Storage Configuration

Configure storage classes based on your cloud provider:

```yaml
# AWS EBS (High Performance)
storageClassName: canvas-ssd-storage

# Shared storage (EFS/NFS)
storageClassName: canvas-shared-storage
```

## Monitoring

### Prometheus Setup

```bash
# Deploy monitoring stack
kubectl apply -k k8s/monitoring

# Access Prometheus
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090
```

### Grafana Dashboards

```bash
# Access Grafana
kubectl port-forward -n monitoring svc/grafana-service 3000:3000

# Default credentials: admin/admin123
# Dashboards are pre-configured for Canvas metrics
```

### Alerting Rules

Key alerts configured:

- Application health and response time
- Database connectivity and performance
- Resource utilization (CPU, memory, disk)
- Pod restart frequency
- Error rate thresholds

### Logs

```bash
# View application logs
kubectl logs -f deployment/canvas-app -n canvas-orchestration

# View logs from all pods
kubectl logs -f -l app=canvas-app -n canvas-orchestration

# Structured log analysis
kubectl logs deployment/canvas-app -n canvas-orchestration | jq '.'
```

## Security

### Network Policies

Network isolation is enforced through policies:

```bash
# Apply network policies
kubectl apply -f k8s/base/network-policy.yaml

# Verify policy enforcement
kubectl get networkpolicy -n canvas-orchestration
```

### RBAC Configuration

Service accounts with minimal permissions:

```bash
# View service account permissions
kubectl auth can-i --list --as=system:serviceaccount:canvas-orchestration:canvas-app
```

### Security Scanning

```bash
# Scan images for vulnerabilities
trivy image canvas-orchestration:latest

# Scan Kubernetes configurations
kube-score score k8s/base/app/deployment.yaml
```

### SSL/TLS Configuration

Automatic SSL certificates via cert-manager:

```bash
# Check certificate status
kubectl get certificate -n canvas-orchestration

# View certificate details
kubectl describe certificate canvas-tls-certificate -n canvas-orchestration
```

## Scaling

### Horizontal Pod Autoscaling

```bash
# View HPA status
kubectl get hpa -n canvas-orchestration

# Manual scaling
kubectl scale deployment canvas-app --replicas=5 -n canvas-orchestration
```

### Vertical Pod Autoscaling

```bash
# Install VPA (if available)
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-0.13.0/vpa-release-0.13.0.yaml

# Apply VPA to Canvas app
kubectl apply -f k8s/base/app/vpa.yaml
```

### Cluster Scaling

```bash
# AWS EKS cluster scaling
aws eks update-nodegroup-config \
  --cluster-name canvas-cluster \
  --nodegroup-name canvas-nodes \
  --scaling-config minSize=3,maxSize=20,desiredSize=5
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n canvas-orchestration

# Describe problematic pod
kubectl describe pod <pod-name> -n canvas-orchestration

# Check events
kubectl get events -n canvas-orchestration --sort-by='.lastTimestamp'
```

#### Database Connection Issues

```bash
# Test MongoDB connectivity
kubectl run -it --rm debug --image=mongo:7.0 --restart=Never -- mongosh mongodb://canvas-mongodb-service:27017

# Test Redis connectivity
kubectl run -it --rm debug --image=redis:7.2-alpine --restart=Never -- redis-cli -h canvas-redis-service
```

#### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n canvas-orchestration

# Check storage class
kubectl get storageclass

# View persistent volume details
kubectl describe pv <pv-name>
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n canvas-orchestration
kubectl top nodes

# Analyze metrics
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090
# Open http://localhost:9090
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n canvas-orchestration

# Check resource quotas
kubectl describe quota -n canvas-orchestration

# View network policies
kubectl get networkpolicy -n canvas-orchestration

# Check service endpoints
kubectl get endpoints -n canvas-orchestration
```

## Maintenance

### Updates and Upgrades

#### Application Updates

```bash
# Rolling update with zero downtime
kubectl set image deployment/canvas-app canvas-app=canvas-orchestration:v1.2.3 -n canvas-orchestration

# Monitor rollout
kubectl rollout status deployment/canvas-app -n canvas-orchestration

# Rollback if needed
kubectl rollout undo deployment/canvas-app -n canvas-orchestration
```

#### Database Maintenance

```bash
# MongoDB replica set status
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh --eval "rs.status()"

# Redis cluster status
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli cluster info

# Backup MongoDB
kubectl exec canvas-mongodb-0 -n canvas-orchestration -- mongodump --archive --gzip | gzip > backup-$(date +%Y%m%d).gz
```

#### Security Updates

```bash
# Update base images
docker pull mongo:7.0
docker pull redis:7.2-alpine
docker pull opensearchproject/opensearch:2.11.1

# Rebuild and deploy
docker build -t canvas-orchestration:latest .
kubectl set image deployment/canvas-app canvas-app=canvas-orchestration:latest -n canvas-orchestration
```

### Backup Strategy

#### Database Backups

```bash
# Automated MongoDB backup (cronjob)
kubectl apply -f k8s/base/mongodb/backup-cronjob.yaml

# Manual backup
kubectl exec canvas-mongodb-0 -n canvas-orchestration -- mongodump --archive --gzip > mongodb-backup.gz
```

#### Configuration Backups

```bash
# Backup all configurations
kubectl get all,configmap,secret,pvc -n canvas-orchestration -o yaml > canvas-backup.yaml

# Backup specific resources
kubectl get configmap,secret -n canvas-orchestration -o yaml > config-backup.yaml
```

### Health Checks

```bash
# Application health
curl -f http://canvas-api.yourdomain.com/health

# Component health checks
./k8s/scripts/deploy.sh production health

# Comprehensive system check
kubectl get nodes,pods,services,pvc -o wide
```

## Performance Tuning

### Resource Optimization

```yaml
# Optimize resource requests/limits
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

### Database Optimization

```yaml
# MongoDB configuration tuning
command:
  - mongod
  - --wiredTigerCacheSizeGB=2
  - --replSet=rs0
  - --bind_ip_all
```

### Caching Strategy

```yaml
# Redis cluster optimization
env:
  - name: REDIS_MAXMEMORY
    value: "512mb"
  - name: REDIS_MAXMEMORY_POLICY
    value: "allkeys-lru"
```

## Cost Optimization

### Resource Monitoring

```bash
# Monitor resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# Use resource recommendations
kubectl describe vpa canvas-app-vpa -n canvas-orchestration
```

### Storage Optimization

```bash
# Monitor storage usage
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- df -h
kubectl get pvc -n canvas-orchestration

# Cleanup unused volumes
kubectl delete pvc --all -n canvas-orchestration-dev
```

This comprehensive guide provides everything needed to deploy and maintain the Canvas AI Orchestration Platform on Kubernetes in production environments. For additional support, refer to the troubleshooting section or contact the development team.