# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Canvas AI Orchestration Platform to production environments with high availability, security, and performance.

## 🎯 Production Deployment Overview

### Deployment Options
1. **Docker Compose** - Single-node production deployment
2. **Kubernetes** - Multi-node orchestrated deployment (recommended)
3. **Cloud Managed** - Fully managed cloud services

### Production Characteristics
- **High Availability**: 99.9% uptime target
- **Auto-scaling**: 3-20 application replicas
- **Security**: Full security hardening
- **Monitoring**: Comprehensive observability
- **Backup**: Automated data protection

## 🏗️ Infrastructure Requirements

### Minimum Production Requirements
- **CPU**: 16 cores (32 cores recommended)
- **Memory**: 32GB RAM (64GB recommended)
- **Storage**: 500GB SSD (1TB recommended)
- **Network**: 1Gbps bandwidth
- **Load Balancer**: Layer 7 load balancing support

### Recommended Cloud Resources

#### AWS (Recommended)
```yaml
Application Tier:
  - Instance Type: c5.2xlarge or larger
  - Auto Scaling Group: 3-20 instances
  - Load Balancer: Application Load Balancer
  - VPC: Dedicated VPC with public/private subnets

Database Tier:
  - MongoDB: DocumentDB cluster or self-managed
  - Redis: ElastiCache cluster
  - OpenSearch: Amazon OpenSearch cluster

Storage:
  - S3: Standard storage class
  - EBS: gp3 volumes for databases
```

#### Google Cloud Platform
```yaml
Application Tier:
  - Machine Type: c2-standard-8 or larger
  - Managed Instance Group: 3-20 instances
  - Load Balancer: Global Load Balancer

Database Tier:
  - MongoDB: Cloud Firestore or self-managed
  - Redis: Memorystore for Redis
  - Search: Elasticsearch Service
```

#### Azure
```yaml
Application Tier:
  - VM Size: Standard_D8s_v3 or larger
  - Virtual Machine Scale Set: 3-20 instances
  - Load Balancer: Azure Load Balancer

Database Tier:
  - MongoDB: Cosmos DB or self-managed
  - Redis: Azure Cache for Redis
  - Search: Azure Cognitive Search
```

## 🚀 Kubernetes Production Deployment

### Prerequisites Setup

1. **Kubernetes Cluster Preparation**
```bash
# Verify cluster requirements
kubectl version --client --output=yaml
kubectl cluster-info

# Check node resources
kubectl top nodes

# Verify storage classes
kubectl get storageclass
```

2. **Install Required Components**
```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Install Prometheus monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

3. **Configure Storage**
```bash
# Apply storage classes
kubectl apply -f k8s/base/storage-class.yaml

# Verify storage is available
kubectl get storageclass
```

### Production Deployment Steps

1. **Environment Configuration**
```bash
# Create production secrets
cp k8s/overlays/production/secrets.env.example k8s/overlays/production/secrets.env

# Update with production values
vim k8s/overlays/production/secrets.env
```

2. **Security Hardening**
```bash
# Generate secure passwords
export MONGODB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)
export OPENSEARCH_PASSWORD=$(openssl rand -base64 32)

# Update secrets file
echo "MONGODB_ROOT_PASSWORD=$MONGODB_PASSWORD" >> k8s/overlays/production/secrets.env
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> k8s/overlays/production/secrets.env
echo "JWT_SECRET=$JWT_SECRET" >> k8s/overlays/production/secrets.env
echo "OPENSEARCH_PASSWORD=$OPENSEARCH_PASSWORD" >> k8s/overlays/production/secrets.env
```

3. **Deploy Application**
```bash
# Deploy using Helm (recommended)
helm install canvas-orchestration k8s/helm/canvas-orchestration \
  --namespace canvas-orchestration \
  --create-namespace \
  --values k8s/helm/canvas-orchestration/values-prod.yaml

# Or deploy using Kustomize
kubectl apply -k k8s/overlays/production

# Verify deployment
kubectl get pods -n canvas-orchestration
kubectl get services -n canvas-orchestration
kubectl get ingress -n canvas-orchestration
```

4. **SSL Certificate Setup**
```bash
# Check certificate status
kubectl get certificate -n canvas-orchestration

# If using Let's Encrypt, verify cert-manager is working
kubectl describe certificate canvas-tls-certificate -n canvas-orchestration
```

5. **Monitoring Setup**
```bash
# Deploy monitoring stack
kubectl apply -k k8s/monitoring

# Access Grafana (create port-forward temporarily)
kubectl port-forward -n monitoring svc/grafana-service 3000:3000

# Default credentials: admin/admin123
# Import Canvas dashboards from k8s/monitoring/grafana/dashboards/
```

### Production Validation

1. **Health Checks**
```bash
# Check all components
make k8s-health ENV=production

# Verify specific services
kubectl get pods -n canvas-orchestration
kubectl describe deployment canvas-app -n canvas-orchestration
```

2. **Performance Testing**
```bash
# Load test the application
kubectl run -it --rm load-test --image=httpd:alpine --restart=Never -- \
  ab -n 1000 -c 10 https://your-domain.com/health

# Monitor metrics during load test
kubectl port-forward -n monitoring svc/prometheus-service 9090:9090
```

3. **Security Validation**
```bash
# Run security scan
kube-score score k8s/overlays/production/app-patches.yaml

# Check network policies
kubectl get networkpolicy -n canvas-orchestration

# Verify RBAC
kubectl auth can-i --list --as=system:serviceaccount:canvas-orchestration:canvas-app
```

## 🐳 Docker Compose Production Deployment

### Single-Node Production Setup

1. **Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Application Deployment**
```bash
# Clone repository
git clone <repository-url>
cd canvas

# Configure production environment
cp .env.example .env.production

# Update production configuration
vim .env.production
```

3. **Security Configuration**
```bash
# Generate secure passwords
export MONGODB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# Update .env.production with secure values
sed -i "s/MONGODB_ROOT_PASSWORD=.*/MONGODB_ROOT_PASSWORD=$MONGODB_PASSWORD/" .env.production
sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env.production
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
```

4. **Deploy Production**
```bash
# Deploy production stack
make prod

# Verify deployment
make health

# Check logs
make prod-logs
```

5. **SSL Setup with Let's Encrypt**
```bash
# Install certbot
sudo apt install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx configuration to use SSL
# (Configure reverse proxy separately)
```

## ⚙️ Production Configuration

### Environment Variables

#### Critical Production Settings
```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Security
JWT_SECRET=<64-character-random-string>
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-domain.com

# Performance
THROTTLE_TTL=60
THROTTLE_LIMIT=100
MAX_FILE_SIZE=10485760

# AWS (use IAM roles when possible)
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
```

#### Database Configuration
```bash
# MongoDB (use connection string for Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/canvas_orchestration

# Redis (use connection string for managed Redis)
REDIS_HOST=your-redis-cluster.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=<secure-password>

# OpenSearch (use managed OpenSearch)
OPENSEARCH_ENDPOINT=https://your-opensearch-domain.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=<secure-password>
```

### Resource Limits

#### Container Resources
```yaml
# Application container
resources:
  limits:
    memory: "2Gi"
    cpu: "1000m"
  requests:
    memory: "1Gi"
    cpu: "500m"

# Database containers
mongodb:
  limits:
    memory: "4Gi"
    cpu: "2000m"
  requests:
    memory: "2Gi"
    cpu: "1000m"
```

#### Auto-scaling Configuration
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: canvas-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: canvas-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔒 Production Security

### Security Checklist

#### Network Security
- [ ] VPC with private/public subnets configured
- [ ] Security groups restricting access
- [ ] Network policies applied (Kubernetes)
- [ ] WAF configured for web application firewall
- [ ] DDoS protection enabled

#### Application Security
- [ ] All default passwords changed
- [ ] JWT secrets are cryptographically secure
- [ ] HTTPS/TLS enabled everywhere
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Input validation active

#### Data Security
- [ ] Database encryption at rest enabled
- [ ] Database encryption in transit enabled
- [ ] Regular backup verification
- [ ] Access logging enabled
- [ ] Audit trails configured

### SSL/TLS Configuration

#### Certificate Management
```bash
# Using cert-manager (Kubernetes)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: canvas-tls-certificate
spec:
  secretName: canvas-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - your-domain.com
  - api.your-domain.com
```

#### NGINX SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://canvas-app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring & Observability

### Monitoring Stack Setup

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'canvas-app'
    static_configs:
      - targets: ['canvas-app:3000']
    metrics_path: '/metrics'

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### Grafana Dashboards
- **Application Metrics**: Request rate, response time, error rate
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Database Metrics**: Connection pools, query performance
- **Business Metrics**: User activity, AI model usage, costs

### Alert Configuration

#### Critical Alerts
```yaml
# alertmanager.yml
groups:
  - name: canvas-critical
    rules:
      - alert: ApplicationDown
        expr: up{job="canvas-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Canvas application is down"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
```

## 🔄 Backup & Recovery

### Automated Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# backup-mongodb.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

# Create MongoDB backup
kubectl exec -n canvas-orchestration canvas-mongodb-0 -- \
  mongodump --archive --gzip | \
  gzip > $BACKUP_DIR/mongodb-backup-$DATE.gz

# Retain last 30 days
find $BACKUP_DIR -name "mongodb-backup-*.gz" -mtime +30 -delete
```

#### Application Configuration Backup
```bash
#!/bin/bash
# backup-configs.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/configs"

# Backup Kubernetes configurations
kubectl get all,configmap,secret,pvc -n canvas-orchestration -o yaml > \
  $BACKUP_DIR/k8s-config-$DATE.yaml

# Backup Docker configurations
tar -czf $BACKUP_DIR/docker-config-$DATE.tar.gz \
  docker-compose.yml .env.production docker/
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore MongoDB from backup
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongorestore --archive --gzip < mongodb-backup-20231201_120000.gz

# Verify restoration
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh --eval "db.canvas_content.countDocuments()"
```

#### Application Recovery
```bash
# Rollback Kubernetes deployment
kubectl rollout undo deployment/canvas-app -n canvas-orchestration

# Restore from configuration backup
kubectl apply -f k8s-config-20231201_120000.yaml
```

## 🚀 Performance Optimization

### Application Tuning

#### Node.js Optimization
```bash
# Environment variables for production
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=2048"
UV_THREADPOOL_SIZE=128
```

#### Database Optimization
```javascript
// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  compressors: ['snappy', 'zlib']
};
```

### Infrastructure Tuning

#### Kubernetes Resource Optimization
```yaml
# Optimized resource requests/limits
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

#### Load Balancer Configuration
```yaml
# NGINX Ingress optimization
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
```

## 🔧 Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

# Update application (rolling update)
make k8s-prod

# Verify health
make k8s-health ENV=production

# Check resource usage
kubectl top nodes
kubectl top pods -n canvas-orchestration

# Review logs for errors
kubectl logs deployment/canvas-app -n canvas-orchestration --since=7d | grep ERROR
```

#### Monthly Tasks
```bash
#!/bin/bash
# monthly-maintenance.sh

# Update base images
docker pull mongo:7.0
docker pull redis:7.2-alpine
docker pull opensearchproject/opensearch:2.11.1

# Security scan
trivy image canvas-orchestration:latest

# Certificate renewal check
kubectl get certificate -n canvas-orchestration

# Backup verification
./scripts/verify-backups.sh
```

### Scaling Procedures

#### Scale Application
```bash
# Scale up for high traffic
kubectl scale deployment canvas-app --replicas=10 -n canvas-orchestration

# Auto-scaling adjustment
kubectl patch hpa canvas-app-hpa -n canvas-orchestration -p '{"spec":{"maxReplicas":30}}'
```

#### Database Scaling
```bash
# MongoDB read replicas
kubectl scale statefulset canvas-mongodb --replicas=5 -n canvas-orchestration

# Redis cluster scaling
kubectl scale statefulset canvas-redis --replicas=6 -n canvas-orchestration
```

This production deployment guide ensures a robust, secure, and scalable deployment of the Canvas AI Orchestration Platform suitable for production workloads.