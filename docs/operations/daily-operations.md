# Daily Operations Manual

This manual provides comprehensive guidance for day-to-day operations and maintenance of the Canvas AI Orchestration Platform.

## 🌅 Daily Operations Checklist

### Morning Health Check (9:00 AM)

```bash
#!/bin/bash
# daily-morning-check.sh

echo "🌅 Canvas Platform - Morning Health Check"
echo "========================================"
echo "Date: $(date)"
echo ""

# 1. Overall System Health
echo "1. 🏥 System Health Check"
echo "------------------------"
make health

# 2. Resource Usage
echo "2. 📊 Resource Usage"
echo "-------------------"
kubectl top nodes
kubectl top pods -n canvas-orchestration --sort-by=memory | head -10

# 3. Application Status
echo "3. 🚀 Application Status"
echo "-----------------------"
kubectl get deployments -n canvas-orchestration
kubectl get statefulsets -n canvas-orchestration

# 4. Storage Health
echo "4. 💾 Storage Health"
echo "-------------------"
kubectl get pvc -n canvas-orchestration
df -h | grep -E "(mongodb|redis|opensearch)"

# 5. Recent Alerts
echo "5. 🚨 Recent Alerts (Last 12 hours)"
echo "----------------------------------"
# Check AlertManager for recent firing alerts
curl -s http://alertmanager:9093/api/v1/alerts | \
  jq '.data[] | select(.status.state == "firing" and (.startsAt | strptime("%Y-%m-%dT%H:%M:%S.%fZ") | mktime) > (now - 43200))'

# 6. Performance Metrics
echo "6. ⚡ Key Performance Metrics"
echo "----------------------------"
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total[5m])' | \
  jq '.data.result[] | select(.metric.job == "canvas-app") | {method: .metric.method, rate: .value[1]}'

echo ""
echo "✅ Morning health check completed"
echo "📧 Report sent to operations team"
```

### Afternoon Monitoring (2:00 PM)

```bash
#!/bin/bash
# daily-afternoon-check.sh

echo "🌞 Canvas Platform - Afternoon Monitoring"
echo "========================================"

# 1. Traffic Analysis
echo "1. 📈 Traffic Analysis"
echo "---------------------"
# Current request rate
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total[5m])' | \
  jq '.data.result[] | select(.metric.job == "canvas-app") | .value[1]' | \
  awk '{sum += $1} END {print "Current RPS:", sum}'

# Error rate
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | \
  jq '.data.result[] | .value[1]' | \
  awk '{sum += $1} END {print "Error Rate:", sum*100 "%"}'

# 2. AI Model Usage
echo "2. 🤖 AI Model Usage & Costs"
echo "---------------------------"
curl -s 'http://prometheus:9090/api/v1/query?query=increase(ai_model_cost_total[1h])' | \
  jq '.data.result[] | {model: .metric.model, cost: .value[1]}'

# 3. Database Performance
echo "3. 🗄️ Database Performance"
echo "-------------------------"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh --quiet --eval "
    db.runCommand({serverStatus: 1}).opcounters;
    db.runCommand({dbStats: 1}).dataSize;
  "

# 4. Cache Hit Rate
echo "4. 🎯 Cache Performance"
echo "----------------------"
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- \
  redis-cli info stats | grep -E "(keyspace_hits|keyspace_misses)"

echo "✅ Afternoon monitoring completed"
```

### Evening Summary (6:00 PM)

```bash
#!/bin/bash
# daily-evening-summary.sh

echo "🌆 Canvas Platform - Evening Summary"
echo "===================================="

# 1. Daily Traffic Summary
echo "1. 📊 Daily Traffic Summary"
echo "--------------------------"
REQUESTS=$(curl -s 'http://prometheus:9090/api/v1/query?query=increase(http_requests_total[24h])' | \
  jq '.data.result[] | select(.metric.job == "canvas-app") | .value[1]' | \
  awk '{sum += $1} END {print sum}')

ERRORS=$(curl -s 'http://prometheus:9090/api/v1/query?query=increase(http_requests_total{status=~"5.."}[24h])' | \
  jq '.data.result[] | .value[1]' | \
  awk '{sum += $1} END {print sum}')

echo "Total Requests: $REQUESTS"
echo "Total Errors: $ERRORS"
echo "Error Rate: $(echo "scale=4; $ERRORS / $REQUESTS * 100" | bc)%"

# 2. Resource Usage Trends
echo "2. 📈 Resource Usage Trends"
echo "--------------------------"
kubectl top pods -n canvas-orchestration --sort-by=memory | head -5

# 3. Cost Analysis
echo "3. 💰 Daily Cost Analysis"
echo "------------------------"
AI_COST=$(curl -s 'http://prometheus:9090/api/v1/query?query=increase(ai_model_cost_total[24h])' | \
  jq '.data.result[] | .value[1]' | \
  awk '{sum += $1} END {print sum}')

echo "AI Model Costs: $${AI_COST}"

# 4. Security Events
echo "4. 🔒 Security Events"
echo "--------------------"
kubectl logs deployment/canvas-app -n canvas-orchestration --since=24h | \
  grep -i "security\|auth\|error" | wc -l | \
  awk '{print "Security Events:", $1}'

echo "✅ Evening summary completed"
```

## 📊 Weekly Operations

### Monday: Infrastructure Review

```bash
#!/bin/bash
# weekly-infrastructure-review.sh

echo "🏗️ Weekly Infrastructure Review"
echo "==============================="

# 1. Node Health Assessment
echo "1. 🖥️ Node Health Assessment"
echo "---------------------------"
kubectl describe nodes | grep -E "(Conditions:|Capacity:|Allocatable:)" -A 5

# 2. Storage Analysis
echo "2. 💾 Storage Analysis"
echo "--------------------"
kubectl get pvc -n canvas-orchestration -o custom-columns="NAME:.metadata.name,STATUS:.status.phase,CAPACITY:.status.capacity.storage,USED:.metadata.annotations.volume\.beta\.kubernetes\.io/storage-provisioner"

# 3. Network Policy Review
echo "3. 🌐 Network Policy Review"
echo "---------------------------"
kubectl get networkpolicy -n canvas-orchestration

# 4. Security Scan
echo "4. 🔒 Security Scan"
echo "------------------"
trivy image canvas-orchestration:latest --severity HIGH,CRITICAL

# 5. Certificate Status
echo "5. 📜 Certificate Status"
echo "-----------------------"
kubectl get certificate -n canvas-orchestration
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | \
  openssl x509 -noout -dates

echo "✅ Infrastructure review completed"
```

### Wednesday: Performance Analysis

```bash
#!/bin/bash
# weekly-performance-analysis.sh

echo "⚡ Weekly Performance Analysis"
echo "============================="

# 1. Response Time Trends
echo "1. 📈 Response Time Trends (7 days)"
echo "----------------------------------"
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[7d]))' | \
  jq '.data.result[] | {percentile: "95th", response_time: .value[1]}'

curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[7d]))' | \
  jq '.data.result[] | {percentile: "50th", response_time: .value[1]}'

# 2. Throughput Analysis
echo "2. 🚀 Throughput Analysis"
echo "------------------------"
curl -s 'http://prometheus:9090/api/v1/query?query=avg_over_time(rate(http_requests_total[5m])[7d:1h])' | \
  jq '.data.result[] | {average_rps: .value[1]}'

# 3. Resource Utilization
echo "3. 📊 Resource Utilization"
echo "-------------------------"
kubectl top nodes
kubectl top pods -n canvas-orchestration

# 4. Database Performance
echo "4. 🗄️ Database Performance"
echo "-------------------------"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh --quiet --eval "
    print('Average Operation Time:', db.runCommand({serverStatus: 1}).opcounters);
    print('Connection Count:', db.runCommand({serverStatus: 1}).connections);
    print('Memory Usage:', db.runCommand({serverStatus: 1}).mem);
  "

# 5. Scaling Recommendations
echo "5. 📈 Scaling Recommendations"
echo "----------------------------"
# Auto-scaling analysis
kubectl get hpa -n canvas-orchestration -o wide

echo "✅ Performance analysis completed"
```

### Friday: Cost Optimization Review

```bash
#!/bin/bash
# weekly-cost-review.sh

echo "💰 Weekly Cost Optimization Review"
echo "================================="

# 1. AI Model Cost Analysis
echo "1. 🤖 AI Model Cost Analysis (7 days)"
echo "------------------------------------"
curl -s 'http://prometheus:9090/api/v1/query?query=increase(ai_model_cost_total[7d])' | \
  jq '.data.result[] | {model: .metric.model, weekly_cost: .value[1]}'

# 2. Resource Usage vs. Requests
echo "2. 📊 Resource Efficiency"
echo "------------------------"
# Calculate cost per request
TOTAL_COST=$(curl -s 'http://prometheus:9090/api/v1/query?query=increase(ai_model_cost_total[7d])' | \
  jq '.data.result[] | .value[1]' | awk '{sum += $1} END {print sum}')

TOTAL_REQUESTS=$(curl -s 'http://prometheus:9090/api/v1/query?query=increase(http_requests_total[7d])' | \
  jq '.data.result[] | .value[1]' | awk '{sum += $1} END {print sum}')

echo "Cost per 1000 requests: \$$(echo "scale=4; $TOTAL_COST / $TOTAL_REQUESTS * 1000" | bc)"

# 3. Storage Costs
echo "3. 💾 Storage Cost Analysis"
echo "--------------------------"
kubectl get pvc -n canvas-orchestration -o json | \
  jq '.items[] | {name: .metadata.name, size: .status.capacity.storage, storageClass: .spec.storageClassName}'

# 4. Optimization Recommendations
echo "4. 💡 Optimization Recommendations"
echo "---------------------------------"
echo "- Review AI model usage patterns"
echo "- Consider cheaper model alternatives for non-critical operations"
echo "- Implement request caching where possible"
echo "- Review and cleanup unused storage"

echo "✅ Cost review completed"
```

## 🔧 Maintenance Operations

### Application Updates

#### Rolling Update Procedure
```bash
#!/bin/bash
# rolling-update.sh

NEW_VERSION=$1
if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <new-version>"
  exit 1
fi

echo "🔄 Rolling Update to Version $NEW_VERSION"
echo "========================================"

# 1. Pre-update health check
echo "1. 🏥 Pre-update Health Check"
make k8s-health ENV=production

# 2. Create backup
echo "2. 💾 Creating Backup"
./scripts/backup-production.sh

# 3. Update image
echo "3. 🚀 Updating Application Image"
kubectl set image deployment/canvas-app canvas-app=canvas-orchestration:$NEW_VERSION -n canvas-orchestration

# 4. Monitor rollout
echo "4. 👀 Monitoring Rollout"
kubectl rollout status deployment/canvas-app -n canvas-orchestration --timeout=600s

# 5. Post-update verification
echo "5. ✅ Post-update Verification"
sleep 30  # Wait for pods to be ready
make k8s-health ENV=production

# 6. Run smoke tests
echo "6. 🧪 Running Smoke Tests"
curl -f http://canvas-api.yourdomain.com/health
curl -f http://canvas-api.yourdomain.com/api/canvas/health

echo "✅ Rolling update completed successfully"
```

#### Rollback Procedure
```bash
#!/bin/bash
# rollback.sh

echo "⏪ Rolling Back Application"
echo "=========================="

# 1. Check rollout history
echo "1. 📜 Rollout History"
kubectl rollout history deployment/canvas-app -n canvas-orchestration

# 2. Rollback to previous version
echo "2. ⏪ Rolling Back"
kubectl rollout undo deployment/canvas-app -n canvas-orchestration

# 3. Monitor rollback
echo "3. 👀 Monitoring Rollback"
kubectl rollout status deployment/canvas-app -n canvas-orchestration

# 4. Verify health
echo "4. 🏥 Health Verification"
make k8s-health ENV=production

echo "✅ Rollback completed"
```

### Database Maintenance

#### MongoDB Maintenance
```bash
#!/bin/bash
# mongodb-maintenance.sh

echo "🗄️ MongoDB Maintenance"
echo "====================="

# 1. Replica Set Status
echo "1. 📊 Replica Set Status"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh --quiet --eval "rs.status()"

# 2. Database Statistics
echo "2. 📈 Database Statistics"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh canvas_orchestration --quiet --eval "
    print('Collections:');
    db.runCommand('listCollections').cursor.firstBatch.forEach(
      function(collection) {
        print('  ' + collection.name + ':', db[collection.name].countDocuments());
      }
    );
    print('Database size:', db.stats().dataSize);
    print('Storage size:', db.stats().storageSize);
  "

# 3. Index Analysis
echo "3. 🔍 Index Analysis"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh canvas_orchestration --quiet --eval "
    db.canvas_content.getIndexes().forEach(function(index) {
      print('Index:', index.name, 'Keys:', JSON.stringify(index.key));
    });
  "

# 4. Performance Tuning
echo "4. ⚡ Performance Tuning"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh canvas_orchestration --quiet --eval "
    // Enable profiling for slow operations (>100ms)
    db.setProfilingLevel(2, {slowms: 100});

    // Show recent slow operations
    db.system.profile.find().sort({ts: -1}).limit(5).forEach(
      function(op) {
        print('Slow operation:', op.command, 'Duration:', op.millis + 'ms');
      }
    );
  "

# 5. Cleanup Operations
echo "5. 🧹 Cleanup Operations"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh canvas_orchestration --quiet --eval "
    // Remove old analytics data (older than 90 days)
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    var result = db.analytics_data.deleteMany({timestamp: {\$lt: cutoffDate}});
    print('Deleted old analytics records:', result.deletedCount);
  "

echo "✅ MongoDB maintenance completed"
```

#### Redis Maintenance
```bash
#!/bin/bash
# redis-maintenance.sh

echo "🎯 Redis Maintenance"
echo "==================="

# 1. Memory Analysis
echo "1. 💾 Memory Analysis"
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- \
  redis-cli info memory

# 2. Key Statistics
echo "2. 🔑 Key Statistics"
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- \
  redis-cli info keyspace

# 3. Performance Metrics
echo "3. ⚡ Performance Metrics"
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- \
  redis-cli info stats | grep -E "(instantaneous_ops_per_sec|total_connections_received|total_commands_processed)"

# 4. Cleanup Expired Keys
echo "4. 🧹 Cleanup Operations"
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- \
  redis-cli eval "return redis.call('scan', 0, 'count', 1000)" 0

# 5. Configuration Review
echo "5. ⚙️ Configuration Review"
kubectl exec -it canvas-redis-0 -n canvas-orchestration -- \
  redis-cli config get "*maxmemory*"

echo "✅ Redis maintenance completed"
```

### Log Management

#### Log Rotation and Cleanup
```bash
#!/bin/bash
# log-management.sh

echo "📝 Log Management"
echo "================"

# 1. Application Log Analysis
echo "1. 📊 Application Log Analysis"
kubectl logs deployment/canvas-app -n canvas-orchestration --since=24h | \
  grep -E "(ERROR|WARN)" | wc -l | \
  awk '{print "Errors/Warnings in last 24h:", $1}'

# 2. Log Size Analysis
echo "2. 📈 Log Size Analysis"
kubectl exec -it canvas-app-0 -n canvas-orchestration -- \
  du -sh /app/logs/*

# 3. Log Rotation
echo "3. 🔄 Log Rotation"
kubectl exec -it canvas-app-0 -n canvas-orchestration -- \
  find /app/logs -name "*.log" -mtime +7 -exec gzip {} \;

kubectl exec -it canvas-app-0 -n canvas-orchestration -- \
  find /app/logs -name "*.log.gz" -mtime +30 -delete

# 4. Database Logs
echo "4. 🗄️ Database Log Analysis"
kubectl logs statefulset/canvas-mongodb -n canvas-orchestration --tail=100 | \
  grep -E "(WARNING|ERROR)" | tail -10

# 5. Export Critical Logs
echo "5. 📤 Export Critical Logs"
kubectl logs deployment/canvas-app -n canvas-orchestration --since=24h | \
  grep -E "(ERROR|CRITICAL)" > /backup/logs/critical-$(date +%Y%m%d).log

echo "✅ Log management completed"
```

## 📈 Monitoring & Alerting Operations

### Alert Management

#### Alert Review Process
```bash
#!/bin/bash
# alert-review.sh

echo "🚨 Alert Review Process"
echo "======================"

# 1. Active Alerts
echo "1. 🔥 Currently Firing Alerts"
curl -s http://alertmanager:9093/api/v1/alerts | \
  jq '.data[] | select(.status.state == "firing") | {alert: .labels.alertname, severity: .labels.severity, since: .startsAt}'

# 2. Recent Resolved Alerts
echo "2. ✅ Recently Resolved Alerts"
curl -s http://alertmanager:9093/api/v1/alerts | \
  jq '.data[] | select(.status.state == "resolved" and (.endsAt | strptime("%Y-%m-%dT%H:%M:%S.%fZ") | mktime) > (now - 86400)) | {alert: .labels.alertname, duration: .endsAt}'

# 3. Alert Frequency Analysis
echo "3. 📊 Alert Frequency (Last 7 days)"
curl -s 'http://prometheus:9090/api/v1/query?query=increase(alertmanager_notifications_total[7d])' | \
  jq '.data.result[] | {integration: .metric.integration, count: .value[1]}'

# 4. Top Alerting Services
echo "4. 🏆 Top Alerting Services"
curl -s 'http://prometheus:9090/api/v1/query?query=topk(5, increase(prometheus_notifications_total[7d]))' | \
  jq '.data.result[] | {service: .metric.job, alerts: .value[1]}'

echo "✅ Alert review completed"
```

#### Alert Tuning
```bash
#!/bin/bash
# alert-tuning.sh

echo "🎛️ Alert Tuning"
echo "==============="

# 1. Review alert thresholds
echo "1. 📏 Current Alert Thresholds"
curl -s http://prometheus:9090/api/v1/rules | \
  jq '.data.groups[].rules[] | select(.type == "alerting") | {alert: .name, expr: .query}'

# 2. Historical performance data
echo "2. 📈 Historical Performance Data"
curl -s 'http://prometheus:9090/api/v1/query_range?query=avg_over_time(up[7d:1h])&start=2023-12-01T00:00:00Z&end=2023-12-08T00:00:00Z&step=1h' | \
  jq '.data.result[] | {service: .metric.job, availability: (.values | map(.[1] | tonumber) | add / length)}'

# 3. False positive analysis
echo "3. 🎯 False Positive Analysis"
# Count alerts that fired but resolved within 5 minutes
curl -s http://alertmanager:9093/api/v1/alerts | \
  jq '.data[] | select(.status.state == "resolved" and ((.endsAt | strptime("%Y-%m-%dT%H:%M:%S.%fZ") | mktime) - (.startsAt | strptime("%Y-%m-%dT%H:%M:%S.%fZ") | mktime)) < 300) | .labels.alertname' | \
  sort | uniq -c

echo "✅ Alert tuning analysis completed"
```

## 🚀 Capacity Planning

### Resource Planning
```bash
#!/bin/bash
# capacity-planning.sh

echo "📊 Capacity Planning Analysis"
echo "============================"

# 1. Current Resource Utilization
echo "1. 📈 Current Resource Utilization"
kubectl top nodes
kubectl top pods -n canvas-orchestration

# 2. Growth Trends (7-day)
echo "2. 📊 Growth Trends"
curl -s 'http://prometheus:9090/api/v1/query?query=increase(http_requests_total[7d])' | \
  jq '.data.result[] | select(.metric.job == "canvas-app") | .value[1]' | \
  awk '{sum += $1} END {print "Weekly Requests:", sum}'

# 3. Database Growth
echo "3. 🗄️ Database Growth"
kubectl exec -it canvas-mongodb-0 -n canvas-orchestration -- \
  mongosh canvas_orchestration --quiet --eval "
    print('Current DB Size:', db.stats().dataSize);
    print('Current Collections:');
    db.runCommand('listCollections').cursor.firstBatch.forEach(
      function(collection) {
        print('  ' + collection.name + ':', db[collection.name].countDocuments());
      }
    );
  "

# 4. Scaling Recommendations
echo "4. 💡 Scaling Recommendations"
CURRENT_REPLICAS=$(kubectl get deployment canvas-app -n canvas-orchestration -o jsonpath='{.status.replicas}')
AVG_CPU=$(kubectl top pods -n canvas-orchestration -l app=canvas-app --no-headers | awk '{sum += $3} END {print sum/NR}' | sed 's/m//')

if [ "$AVG_CPU" -gt 700 ]; then
  echo "⚠️ High CPU usage detected. Consider scaling up."
  echo "Current replicas: $CURRENT_REPLICAS"
  echo "Recommended replicas: $((CURRENT_REPLICAS + 2))"
fi

# 5. Storage Projections
echo "5. 💾 Storage Projections"
CURRENT_STORAGE=$(kubectl get pvc -n canvas-orchestration -o jsonpath='{.items[0].status.capacity.storage}')
echo "Current storage allocation: $CURRENT_STORAGE"
echo "Consider increasing if usage > 80%"

echo "✅ Capacity planning analysis completed"
```

## 🔄 Automation Scripts

### Automated Daily Tasks
```bash
#!/bin/bash
# automated-daily-tasks.sh

echo "🤖 Automated Daily Tasks"
echo "======================="

# 1. Health checks
make health > /tmp/health-check.log 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Health check failed" | mail -s "Canvas Health Check Failed" ops@company.com
fi

# 2. Backup verification
ls -la /backups/mongodb-$(date +%Y%m%d)*.gz > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Backup not found for today" | mail -s "Canvas Backup Missing" ops@company.com
fi

# 3. Certificate expiry check
CERT_EXPIRY=$(openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
  echo "⚠️ SSL certificate expires in $DAYS_UNTIL_EXPIRY days" | \
    mail -s "Canvas SSL Certificate Expiring" ops@company.com
fi

# 4. Clean up old logs
find /var/log/canvas -name "*.log" -mtime +30 -delete

# 5. Update monitoring dashboards
./scripts/update-dashboards.sh

echo "✅ Automated daily tasks completed"
```

### Scheduled Maintenance Windows
```bash
#!/bin/bash
# maintenance-window.sh

MAINTENANCE_TYPE=$1
case $MAINTENANCE_TYPE in
  "weekly")
    echo "🛠️ Weekly Maintenance Window"
    # Run weekly tasks
    ./scripts/weekly-infrastructure-review.sh
    ./scripts/security-scan.sh
    ./scripts/performance-optimization.sh
    ;;
  "monthly")
    echo "🛠️ Monthly Maintenance Window"
    # Run monthly tasks
    ./scripts/full-backup.sh
    ./scripts/capacity-planning.sh
    ./scripts/security-audit.sh
    ./scripts/dependency-updates.sh
    ;;
  *)
    echo "Usage: $0 [weekly|monthly]"
    exit 1
    ;;
esac
```

## 📞 Operations Contact Information

### Escalation Matrix

| Issue Type | Primary Contact | Secondary Contact | Emergency |
|------------|----------------|-------------------|-----------|
| Application Issues | Development Team | Platform Team | On-call Engineer |
| Infrastructure Issues | Platform Team | DevOps Team | Infrastructure On-call |
| Security Incidents | Security Team | CISO | Security Hotline |
| Database Issues | DBA Team | Platform Team | Database On-call |

### Communication Channels

- **Slack**: #canvas-operations
- **Email**: canvas-ops@company.com
- **PagerDuty**: Canvas Operations Team
- **Incident Management**: JIRA Service Desk

This daily operations manual provides comprehensive guidance for maintaining the Canvas AI Orchestration Platform with automated monitoring, maintenance procedures, and clear escalation paths.