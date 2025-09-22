# Common Issues & Solutions

This guide provides solutions to frequently encountered issues when deploying and operating the Canvas AI Orchestration Platform.

## 🚨 Quick Diagnostic Commands

### System Health Check
```bash
# Overall health check
make health

# Kubernetes health check
make k8s-health ENV=production

# Service status
kubectl get pods -n canvas-orchestration
docker-compose ps

# Resource usage
kubectl top nodes
kubectl top pods -n canvas-orchestration
```

### Log Analysis
```bash
# Application logs
kubectl logs deployment/canvas-app -n canvas-orchestration --tail=100
docker-compose logs canvas-app --tail=100

# Database logs
kubectl logs statefulset/canvas-mongodb -n canvas-orchestration
docker-compose logs mongodb

# System events
kubectl get events -n canvas-orchestration --sort-by='.lastTimestamp'
```

## 🔧 Application Issues

### Application Won't Start

#### Symptoms
- Pods stuck in `CrashLoopBackOff` or `Error` state
- Container exits immediately after startup
- Health check failures

#### Diagnosis
```bash
# Check pod status and events
kubectl describe pod <pod-name> -n canvas-orchestration

# Check logs for startup errors
kubectl logs <pod-name> -n canvas-orchestration --previous

# Check resource constraints
kubectl describe node <node-name>
kubectl top pods -n canvas-orchestration
```

#### Common Causes & Solutions

**1. Environment Variable Issues**
```bash
# Check if secrets are properly mounted
kubectl get secret canvas-secrets -n canvas-orchestration -o yaml

# Verify configuration
kubectl get configmap canvas-config -n canvas-orchestration -o yaml

# Fix: Update environment variables
kubectl edit secret canvas-secrets -n canvas-orchestration
```

**2. Database Connection Issues**
```bash
# Test MongoDB connectivity
kubectl run -it --rm debug --image=mongo:7.0 --restart=Never -- \
  mongosh mongodb://admin:password@canvas-mongodb.canvas-orchestration:27017

# Fix: Check MongoDB service and credentials
kubectl get service canvas-mongodb-service -n canvas-orchestration
kubectl describe statefulset canvas-mongodb -n canvas-orchestration
```

**3. Resource Constraints**
```bash
# Check resource requests/limits
kubectl describe pod <pod-name> -n canvas-orchestration | grep -A 10 "Limits:\|Requests:"

# Fix: Adjust resource allocations
kubectl patch deployment canvas-app -n canvas-orchestration -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "canvas-app",
          "resources": {
            "requests": {"memory": "1Gi", "cpu": "500m"},
            "limits": {"memory": "2Gi", "cpu": "1000m"}
          }
        }]
      }
    }
  }
}'
```

### High Response Times

#### Symptoms
- API responses taking > 5 seconds
- Timeouts in frontend applications
- High CPU/memory usage

#### Diagnosis
```bash
# Check application metrics
curl -s http://canvas-app/metrics | grep http_request_duration

# Monitor resource usage
kubectl top pods -n canvas-orchestration --sort-by=cpu
kubectl top pods -n canvas-orchestration --sort-by=memory

# Check database performance
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh --eval "db.runCommand({serverStatus: 1}).opcounters"
```

#### Solutions

**1. Scale Application**
```bash
# Horizontal scaling
kubectl scale deployment canvas-app --replicas=10 -n canvas-orchestration

# Adjust HPA settings
kubectl patch hpa canvas-app-hpa -n canvas-orchestration -p '
{
  "spec": {
    "maxReplicas": 20,
    "targetCPUUtilizationPercentage": 60
  }
}'
```

**2. Database Optimization**
```bash
# Add MongoDB indexes
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh canvas_orchestration --eval "
db.canvas_content.createIndex({embedding_vector: '2dsphere'});
db.canvas_content.createIndex({created_at: -1});
db.canvas_content.createIndex({user_id: 1, created_at: -1});
"

# Check slow queries
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh canvas_orchestration --eval "
db.setProfilingLevel(2, {slowms: 100});
db.system.profile.find().sort({ts: -1}).limit(5);
"
```

**3. Cache Optimization**
```bash
# Check Redis performance
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli info stats

# Clear cache if needed
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli flushdb

# Adjust cache TTL
kubectl patch configmap canvas-config -n canvas-orchestration -p '
{
  "data": {
    "CACHE_TTL": "600"
  }
}'
```

### Memory Leaks

#### Symptoms
- Gradually increasing memory usage
- Out of Memory (OOM) kills
- Performance degradation over time

#### Diagnosis
```bash
# Monitor memory trends
kubectl top pods -n canvas-orchestration --sort-by=memory

# Check for OOM kills
kubectl describe pod <pod-name> -n canvas-orchestration | grep -A 5 "Last State"

# Node.js heap analysis
kubectl exec -it <pod-name> -n canvas-orchestration -- node --expose-gc -e "
setInterval(() => {
  const used = process.memoryUsage();
  console.log(JSON.stringify(used));
  global.gc();
}, 10000);
"
```

#### Solutions

**1. Increase Memory Limits**
```bash
kubectl patch deployment canvas-app -n canvas-orchestration -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "canvas-app",
          "resources": {
            "limits": {"memory": "4Gi"}
          }
        }]
      }
    }
  }
}'
```

**2. Node.js Optimization**
```yaml
# Add environment variables to deployment
env:
  - name: NODE_OPTIONS
    value: "--max-old-space-size=3072 --gc-interval=100"
  - name: UV_THREADPOOL_SIZE
    value: "128"
```

**3. Application Code Review**
```typescript
// Check for common memory leak patterns
// 1. Event listeners not removed
// 2. Timers not cleared
// 3. Large objects not dereferenced
// 4. Database connections not closed
```

## 🗄️ Database Issues

### MongoDB Connection Issues

#### Symptoms
- "Connection refused" errors
- Authentication failures
- Slow query responses

#### Diagnosis
```bash
# Check MongoDB pod status
kubectl get pods -l app=canvas-mongodb -n canvas-orchestration

# Check MongoDB logs
kubectl logs canvas-mongodb-0 -n canvas-orchestration

# Test connection
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh --eval "db.adminCommand('ping')"
```

#### Solutions

**1. Authentication Issues**
```bash
# Check credentials
kubectl get secret mongodb-auth -n canvas-orchestration -o yaml

# Reset password if needed
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh admin --eval "
db.changeUserPassword('admin', 'new-secure-password');
"

# Update secret
kubectl patch secret canvas-secrets -n canvas-orchestration -p '
{
  "stringData": {
    "MONGODB_ROOT_PASSWORD": "new-secure-password"
  }
}'
```

**2. Replica Set Issues**
```bash
# Check replica set status
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh --eval "rs.status()"

# Re-initialize replica set if needed
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- mongosh --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    {_id: 0, host: 'canvas-mongodb-0.canvas-mongodb-service:27017'},
    {_id: 1, host: 'canvas-mongodb-1.canvas-mongodb-service:27017'},
    {_id: 2, host: 'canvas-mongodb-2.canvas-mongodb-service:27017'}
  ]
});
"
```

**3. Storage Issues**
```bash
# Check storage capacity
kubectl get pvc -n canvas-orchestration

# Resize PVC if needed
kubectl patch pvc mongodb-data-canvas-mongodb-0 -n canvas-orchestration -p '
{
  "spec": {
    "resources": {
      "requests": {
        "storage": "200Gi"
      }
    }
  }
}'
```

### Redis Connection Issues

#### Symptoms
- Cache misses increasing
- Connection timeout errors
- Memory warnings

#### Diagnosis
```bash
# Check Redis status
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli ping

# Check memory usage
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli info memory

# Check connection count
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli info clients
```

#### Solutions

**1. Memory Issues**
```bash
# Increase memory limit
kubectl patch statefulset canvas-redis -n canvas-orchestration -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "redis",
          "resources": {
            "limits": {"memory": "2Gi"}
          }
        }]
      }
    }
  }
}'

# Configure memory policy
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- redis-cli config set maxmemory-policy allkeys-lru
```

**2. Connection Pool Issues**
```bash
# Check application connection pool
kubectl logs deployment/canvas-app -n canvas-orchestration | grep "redis.*connection"

# Adjust pool settings in application
kubectl patch configmap canvas-config -n canvas-orchestration -p '
{
  "data": {
    "REDIS_MAX_CONNECTIONS": "50",
    "REDIS_MIN_CONNECTIONS": "5"
  }
}'
```

### OpenSearch Issues

#### Symptoms
- Search queries failing
- Cluster yellow/red status
- High memory usage

#### Diagnosis
```bash
# Check cluster health
kubectl exec -it canvas-opensearch-0 -n canvas-orchestration -- \
  curl -u admin:password "localhost:9200/_cluster/health?pretty"

# Check node status
kubectl exec -it canvas-opensearch-0 -n canvas-orchestration -- \
  curl -u admin:password "localhost:9200/_cat/nodes?v"

# Check indices
kubectl exec -it canvas-opensearch-0 -n canvas-orchestration -- \
  curl -u admin:password "localhost:9200/_cat/indices?v"
```

#### Solutions

**1. Cluster Recovery**
```bash
# Force allocation of unassigned shards
kubectl exec -it canvas-opensearch-0 -n canvas-orchestration -- \
  curl -X POST -u admin:password "localhost:9200/_cluster/reroute?retry_failed=true"

# Increase replica count if needed
kubectl exec -it canvas-opensearch-0 -n canvas-orchestration -- \
  curl -X PUT -u admin:password "localhost:9200/_settings" -H 'Content-Type: application/json' -d '
{
  "index": {
    "number_of_replicas": 2
  }
}'
```

**2. Memory Issues**
```bash
# Clear cache
kubectl exec -it canvas-opensearch-0 -n canvas-orchestration -- \
  curl -X POST -u admin:password "localhost:9200/_cache/clear"

# Increase heap size
kubectl patch statefulset canvas-opensearch -n canvas-orchestration -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "opensearch",
          "env": [{
            "name": "OPENSEARCH_JAVA_OPTS",
            "value": "-Xms2g -Xmx2g"
          }]
        }]
      }
    }
  }
}'
```

## 🌐 Network Issues

### Service Discovery Issues

#### Symptoms
- Services can't reach each other
- DNS resolution failures
- Connection timeouts

#### Diagnosis
```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup canvas-mongodb-service.canvas-orchestration.svc.cluster.local

# Check service endpoints
kubectl get endpoints -n canvas-orchestration

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- telnet canvas-mongodb-service.canvas-orchestration.svc.cluster.local 27017
```

#### Solutions

**1. DNS Issues**
```bash
# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Restart CoreDNS if needed
kubectl rollout restart deployment/coredns -n kube-system

# Check DNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

**2. Service Configuration**
```bash
# Check service selectors
kubectl describe service canvas-mongodb-service -n canvas-orchestration

# Verify pod labels
kubectl get pods -n canvas-orchestration --show-labels

# Fix selector mismatch
kubectl patch service canvas-mongodb-service -n canvas-orchestration -p '
{
  "spec": {
    "selector": {
      "app": "canvas-mongodb"
    }
  }
}'
```

### Ingress Issues

#### Symptoms
- External traffic can't reach services
- SSL certificate issues
- 502/503 errors

#### Diagnosis
```bash
# Check ingress status
kubectl get ingress -n canvas-orchestration

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check SSL certificates
kubectl get certificate -n canvas-orchestration
```

#### Solutions

**1. Ingress Controller Issues**
```bash
# Restart ingress controller
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx

# Check ingress configuration
kubectl describe ingress canvas-ingress -n canvas-orchestration
```

**2. SSL Certificate Issues**
```bash
# Check cert-manager
kubectl get pods -n cert-manager

# Manually trigger certificate renewal
kubectl annotate certificate canvas-tls-certificate -n canvas-orchestration cert-manager.io/issue-temporary-certificate="true"

# Check certificate status
kubectl describe certificate canvas-tls-certificate -n canvas-orchestration
```

## 🔧 Storage Issues

### Persistent Volume Issues

#### Symptoms
- Pods stuck in `Pending` state
- Mount failures
- Out of disk space

#### Diagnosis
```bash
# Check PVC status
kubectl get pvc -n canvas-orchestration

# Check storage classes
kubectl get storageclass

# Check node disk space
kubectl describe node <node-name> | grep -A 10 "Allocatable"
```

#### Solutions

**1. PVC Binding Issues**
```bash
# Check available PVs
kubectl get pv

# Create storage class if missing
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: canvas-ssd-storage
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
EOF
```

**2. Disk Space Issues**
```bash
# Check disk usage in pods
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- df -h

# Resize PVC
kubectl patch pvc mongodb-data-canvas-mongodb-0 -n canvas-orchestration -p '
{
  "spec": {
    "resources": {
      "requests": {
        "storage": "200Gi"
      }
    }
  }
}'
```

### Backup/Restore Issues

#### Symptoms
- Backup jobs failing
- Restore operations incomplete
- Data corruption

#### Diagnosis
```bash
# Check backup job status
kubectl get jobs -n canvas-orchestration

# Check backup logs
kubectl logs job/mongodb-backup -n canvas-orchestration

# Verify backup files
kubectl exec -it backup-pod -n canvas-orchestration -- ls -la /backups/
```

#### Solutions

**1. Backup Job Fixes**
```bash
# Restart failed backup job
kubectl delete job mongodb-backup -n canvas-orchestration
kubectl apply -f k8s/base/mongodb/backup-cronjob.yaml

# Manual backup
kubectl run manual-backup --image=mongo:7.0 --restart=Never --rm -i -- \
  mongodump --host canvas-mongodb-service.canvas-orchestration:27017 \
           --username admin \
           --password password \
           --archive --gzip > /backup/manual-backup.gz
```

**2. Restore Operations**
```bash
# Restore from backup
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongorestore --host localhost:27017 \
              --username admin \
              --password password \
              --archive --gzip < /backup/mongodb-backup.gz
```

## 🚀 Performance Issues

### High CPU Usage

#### Symptoms
- CPU utilization > 80%
- Application slowness
- Request timeouts

#### Diagnosis
```bash
# Check CPU usage
kubectl top pods -n canvas-orchestration --sort-by=cpu

# Profile application
kubectl exec -it <pod-name> -n canvas-orchestration -- npm run profile

# Check system load
kubectl describe node <node-name> | grep -A 5 "System Info"
```

#### Solutions

**1. Scale Resources**
```bash
# Horizontal scaling
kubectl scale deployment canvas-app --replicas=10 -n canvas-orchestration

# Vertical scaling
kubectl patch deployment canvas-app -n canvas-orchestration -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "canvas-app",
          "resources": {
            "requests": {"cpu": "1000m"},
            "limits": {"cpu": "2000m"}
          }
        }]
      }
    }
  }
}'
```

**2. Code Optimization**
```typescript
// Optimize expensive operations
// 1. Add caching
// 2. Optimize database queries
// 3. Use connection pooling
// 4. Implement pagination
```

### AI Model Performance Issues

#### Symptoms
- Slow AI model responses
- High model costs
- Model failures

#### Diagnosis
```bash
# Check AI model metrics
curl -s http://canvas-app/metrics | grep ai_model

# Check AWS Bedrock limits
aws bedrock-runtime get-model-invocation-job --region ap-northeast-2

# Monitor costs
aws ce get-cost-and-usage --time-period Start=2023-12-01,End=2023-12-02 --granularity DAILY --metrics BlendedCost
```

#### Solutions

**1. Model Optimization**
```bash
# Switch to faster models
kubectl patch configmap canvas-config -n canvas-orchestration -p '
{
  "data": {
    "BEDROCK_TEXT_MODEL_ID": "anthropic.claude-3-haiku-20240307-v1:0"
  }
}'

# Implement request batching
kubectl patch configmap canvas-config -n canvas-orchestration -p '
{
  "data": {
    "AI_BATCH_SIZE": "5",
    "AI_BATCH_TIMEOUT": "30000"
  }
}'
```

**2. Cost Control**
```bash
# Set budget limits
kubectl patch configmap canvas-config -n canvas-orchestration -p '
{
  "data": {
    "DAILY_BUDGET_LIMIT": "50.00",
    "MONTHLY_BUDGET_LIMIT": "1000.00"
  }
}'
```

## 🚨 Emergency Procedures

### Complete System Failure

#### Immediate Steps
```bash
# 1. Check overall system status
kubectl get nodes
kubectl get pods -A | grep -v Running

# 2. Check critical services
kubectl get pods -n kube-system

# 3. Collect diagnostic information
kubectl describe nodes
kubectl get events -A --sort-by='.lastTimestamp' | tail -20

# 4. Attempt service recovery
kubectl rollout restart deployment/canvas-app -n canvas-orchestration
```

### Data Corruption

#### Recovery Steps
```bash
# 1. Stop all write operations
kubectl scale deployment canvas-app --replicas=0 -n canvas-orchestration

# 2. Create emergency backup
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongodump --archive --gzip > /emergency-backup/mongodb-$(date +%Y%m%d_%H%M%S).gz

# 3. Restore from known good backup
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongorestore --drop --archive --gzip < /backups/mongodb-latest-good.gz

# 4. Verify data integrity
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh canvas_orchestration --eval "db.canvas_content.countDocuments()"

# 5. Restart application
kubectl scale deployment canvas-app --replicas=3 -n canvas-orchestration
```

### Security Incident

#### Immediate Response
```bash
# 1. Isolate affected systems
kubectl patch networkpolicy default-deny -n canvas-orchestration -p '
{
  "spec": {
    "podSelector": {},
    "policyTypes": ["Ingress", "Egress"]
  }
}'

# 2. Collect forensic evidence
kubectl logs deployment/canvas-app -n canvas-orchestration --since=1h > incident-logs.txt
kubectl get events -n canvas-orchestration --sort-by='.lastTimestamp' > incident-events.txt

# 3. Block suspicious IPs
# (Implementation depends on your firewall/WAF)

# 4. Rotate credentials
kubectl delete secret canvas-secrets -n canvas-orchestration
kubectl create secret generic canvas-secrets --from-env-file=new-secrets.env -n canvas-orchestration

# 5. Restart all services
kubectl rollout restart deployment/canvas-app -n canvas-orchestration
```

## 📞 Getting Help

### Support Escalation

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Review application logs and metrics
3. **Level 3**: Contact development team with:
   - Detailed error descriptions
   - Log excerpts
   - System configuration
   - Steps to reproduce

### Useful Debug Commands

```bash
# Complete system overview
kubectl get all -A

# Resource usage summary
kubectl top nodes
kubectl top pods -A

# Recent events
kubectl get events -A --sort-by='.lastTimestamp' | tail -20

# Network connectivity test
kubectl run -it --rm debug --image=busybox --restart=Never -- /bin/sh
```

This troubleshooting guide covers the most common issues encountered with the Canvas AI Orchestration Platform. For issues not covered here, refer to the specific component documentation or escalate to the development team.