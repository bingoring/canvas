# Monitoring & Alerting Guide

This comprehensive guide covers monitoring, alerting, and observability for the Canvas AI Orchestration Platform, ensuring you can detect, diagnose, and resolve issues quickly.

## 🎯 Monitoring Overview

### Monitoring Philosophy
- **Proactive**: Detect issues before they impact users
- **Comprehensive**: Monitor all layers from infrastructure to business metrics
- **Actionable**: Every alert should be actionable with clear remediation steps
- **Context-Aware**: Provide sufficient context for effective troubleshooting

### Key Monitoring Areas
1. **Application Performance**: Response times, throughput, error rates
2. **Infrastructure Health**: Resource utilization, availability
3. **Business Metrics**: User engagement, AI model usage, costs
4. **Security Events**: Authentication, authorization, threat detection
5. **Data Quality**: Database performance, data integrity

## 📊 Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Alerting Layer                          │
├─────────────────────────────────────────────────────────────┤
│  PagerDuty  │    Slack    │    Email    │   SMS/Voice     │
└─────────────┬───────────────┬─────────────┬─────────────────┘
              │               │             │
┌─────────────▼───────────────▼─────────────▼─────────────────┐
│                 Alert Manager                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Visualization                            │
├─────────────────────────────────────────────────────────────┤
│     Grafana      │    Canvas       │     OpenSearch        │
│   Dashboards     │   Admin UI      │     Dashboards        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Metrics Storage                           │
├─────────────────────────────────────────────────────────────┤
│   Prometheus    │   InfluxDB      │   OpenSearch           │
│   (Metrics)     │   (Time Series) │   (Logs/Analytics)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Data Collection                           │
├─────────────────────────────────────────────────────────────┤
│  Node Exporter  │ MongoDB Exporter │  Redis Exporter      │
│  App Metrics    │ Custom Metrics   │  Log Aggregation     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Monitoring Stack Setup

### Prometheus Setup

#### Kubernetes Deployment
```bash
# Install Prometheus using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus/values.yaml
```

#### Prometheus Configuration
```yaml
# k8s/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'canvas-production'

rule_files:
  - "rules/*.yml"

scrape_configs:
  # Application metrics
  - job_name: 'canvas-app'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

  # Infrastructure metrics
  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Kubernetes metrics
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
```

### Grafana Configuration

#### Dashboard Setup
```bash
# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values k8s/monitoring/grafana/values.yaml

# Get admin password
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Access Grafana
kubectl port-forward --namespace monitoring svc/grafana 3000:80
```

#### Key Dashboards

##### 1. Application Overview Dashboard
```json
{
  "dashboard": {
    "title": "Canvas Application Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"canvas-app\"}[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"canvas-app\"}[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"canvas-app\",status=~\"5..\"}[5m]) / rate(http_requests_total{job=\"canvas-app\"}[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

##### 2. Infrastructure Dashboard
```json
{
  "dashboard": {
    "title": "Canvas Infrastructure",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes)))",
            "legendFormat": "Memory Usage %"
          }
        ]
      },
      {
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - ((node_filesystem_avail_bytes{mountpoint=\"/\"} * 100) / node_filesystem_size_bytes{mountpoint=\"/\"})",
            "legendFormat": "Disk Usage %"
          }
        ]
      }
    ]
  }
}
```

##### 3. Database Performance Dashboard
```json
{
  "dashboard": {
    "title": "Database Performance",
    "panels": [
      {
        "title": "MongoDB Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mongodb_op_counters_total[5m])",
            "legendFormat": "{{type}} operations/sec"
          }
        ]
      },
      {
        "title": "Redis Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(redis_commands_total[5m])",
            "legendFormat": "{{cmd}} commands/sec"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Alerting Configuration

### Alert Rules

#### Critical Application Alerts
```yaml
# k8s/monitoring/prometheus/rules/application.yml
groups:
  - name: canvas-application
    rules:
      - alert: ApplicationDown
        expr: up{job="canvas-app"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Canvas application is down"
          description: "Canvas application has been down for more than 1 minute"
          runbook_url: "https://docs.canvas.com/runbooks/application-down"

      - alert: HighErrorRate
        expr: |
          (
            rate(http_requests_total{job="canvas-app",status=~"5.."}[5m]) /
            rate(http_requests_total{job="canvas-app"}[5m])
          ) > 0.05
        for: 2m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for more than 2 minutes"

      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket{job="canvas-app"}[5m])
          ) > 2
        for: 3m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: LowDiskSpace
        expr: |
          (
            node_filesystem_avail_bytes{mountpoint="/"} /
            node_filesystem_size_bytes{mountpoint="/"}
          ) < 0.1
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Low disk space"
          description: "Disk space is {{ $value | humanizePercentage }} available"
```

#### Database Alerts
```yaml
# k8s/monitoring/prometheus/rules/database.yml
groups:
  - name: canvas-database
    rules:
      - alert: MongoDBDown
        expr: up{job="mongodb-exporter"} == 0
        for: 1m
        labels:
          severity: critical
          team: data
        annotations:
          summary: "MongoDB is down"
          description: "MongoDB has been unreachable for more than 1 minute"

      - alert: MongoDBHighConnections
        expr: |
          mongodb_connections{state="current"} /
          mongodb_connections{state="available"} > 0.8
        for: 2m
        labels:
          severity: warning
          team: data
        annotations:
          summary: "MongoDB high connection usage"
          description: "MongoDB is using {{ $value | humanizePercentage }} of available connections"

      - alert: RedisDown
        expr: up{job="redis-exporter"} == 0
        for: 1m
        labels:
          severity: critical
          team: data
        annotations:
          summary: "Redis is down"
          description: "Redis has been unreachable for more than 1 minute"

      - alert: RedisHighMemoryUsage
        expr: |
          redis_memory_used_bytes /
          redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
          team: data
        annotations:
          summary: "Redis high memory usage"
          description: "Redis is using {{ $value | humanizePercentage }} of available memory"
```

#### Business Metrics Alerts
```yaml
# k8s/monitoring/prometheus/rules/business.yml
groups:
  - name: canvas-business
    rules:
      - alert: HighAICosts
        expr: |
          increase(ai_model_cost_total[1h]) > 10
        for: 0m
        labels:
          severity: warning
          team: product
        annotations:
          summary: "High AI model costs"
          description: "AI model costs have increased by ${{ $value }} in the last hour"

      - alert: LowImageGenerationSuccess
        expr: |
          (
            rate(image_generation_total{status="success"}[5m]) /
            rate(image_generation_total[5m])
          ) < 0.9
        for: 5m
        labels:
          severity: warning
          team: product
        annotations:
          summary: "Low image generation success rate"
          description: "Image generation success rate is {{ $value | humanizePercentage }}"
```

### AlertManager Configuration

#### AlertManager Setup
```yaml
# k8s/monitoring/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@canvas.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true
    - match:
        team: data
      receiver: 'data-team'
    - match:
        team: platform
      receiver: 'platform-team'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#canvas-alerts'
        title: 'Canvas Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'

  - name: 'critical-alerts'
    pagerduty_configs:
      - integration_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#canvas-critical'
        title: '🚨 CRITICAL: Canvas Alert'

  - name: 'data-team'
    email_configs:
      - to: 'data-team@canvas.com'
        subject: 'Canvas Data Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'platform-team'
    email_configs:
      - to: 'platform-team@canvas.com'
        subject: 'Canvas Platform Alert: {{ .GroupLabels.alertname }}'
```

## 📈 Custom Metrics Implementation

### Application Metrics

#### NestJS Metrics Setup
```typescript
// src/common/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly imageGenerationTotal: Counter<string>;
  private readonly aiModelCostTotal: Counter<string>;

  constructor() {
    // HTTP request metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // Application-specific metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
    });

    this.imageGenerationTotal = new Counter({
      name: 'image_generation_total',
      help: 'Total number of image generation requests',
      labelNames: ['status', 'model'],
    });

    this.aiModelCostTotal = new Counter({
      name: 'ai_model_cost_total',
      help: 'Total cost of AI model usage',
      labelNames: ['model', 'type'],
    });

    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.imageGenerationTotal);
    register.registerMetric(this.aiModelCostTotal);
  }

  incrementHttpRequests(method: string, route: string, status: number): void {
    this.httpRequestsTotal.inc({ method, route, status: status.toString() });
  }

  observeHttpDuration(method: string, route: string, duration: number): void {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  incrementImageGeneration(status: string, model: string): void {
    this.imageGenerationTotal.inc({ status, model });
  }

  addAIModelCost(model: string, type: string, cost: number): void {
    this.aiModelCostTotal.inc({ model, type }, cost);
  }

  getMetrics(): string {
    return register.metrics();
  }
}
```

#### Metrics Middleware
```typescript
// src/common/middleware/metrics.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      this.metricsService.incrementHttpRequests(
        req.method,
        req.route?.path || 'unknown',
        res.statusCode,
      );
      this.metricsService.observeHttpDuration(
        req.method,
        req.route?.path || 'unknown',
        duration,
      );
    });

    next();
  }
}
```

#### Metrics Controller
```typescript
// src/metrics/metrics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { MetricsService } from '../common/metrics/metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics(): string {
    return this.metricsService.getMetrics();
  }
}
```

### Database Exporters

#### MongoDB Exporter Setup
```yaml
# k8s/monitoring/mongodb-exporter/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb-exporter
  template:
    metadata:
      labels:
        app: mongodb-exporter
    spec:
      containers:
        - name: mongodb-exporter
          image: percona/mongodb_exporter:0.40
          args:
            - --mongodb.uri=mongodb://admin:password@canvas-mongodb.canvas-orchestration:27017
            - --collect-all
            - --compatible-mode
          ports:
            - containerPort: 9216
              name: metrics
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

#### Redis Exporter Setup
```yaml
# k8s/monitoring/redis-exporter/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-exporter
  template:
    metadata:
      labels:
        app: redis-exporter
    spec:
      containers:
        - name: redis-exporter
          image: oliver006/redis_exporter:v1.55.0
          env:
            - name: REDIS_ADDR
              value: "redis://canvas-redis.canvas-orchestration:6379"
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: canvas-secrets
                  key: REDIS_PASSWORD
          ports:
            - containerPort: 9121
              name: metrics
          resources:
            requests:
              memory: "32Mi"
              cpu: "25m"
            limits:
              memory: "64Mi"
              cpu: "50m"
```

## 🔍 Log Management

### Centralized Logging Setup

#### ELK Stack Configuration
```yaml
# k8s/monitoring/elasticsearch/elasticsearch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: monitoring
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          env:
            - name: cluster.name
              value: "canvas-logs"
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: discovery.seed_hosts
              value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
            - name: cluster.initial_master_nodes
              value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
            - name: ES_JAVA_OPTS
              value: "-Xms1g -Xmx1g"
```

#### Logstash Configuration
```yaml
# k8s/monitoring/logstash/logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [kubernetes][container][name] == "canvas-app" {
    json {
      source => "message"
    }

    date {
      match => [ "timestamp", "ISO8601" ]
    }

    mutate {
      add_field => { "service" => "canvas-app" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "canvas-logs-%{+YYYY.MM.dd}"
  }
}
```

#### Filebeat Configuration
```yaml
# k8s/monitoring/filebeat/filebeat.yml
filebeat.inputs:
  - type: kubernetes
    node: ${NODE_NAME}
    hints.enabled: true
    hints.default_config:
      type: container
      paths:
        - /var/log/containers/*${data.kubernetes.container.id}.log

output.logstash:
  hosts: ["logstash:5044"]

processors:
  - add_kubernetes_metadata:
      host: ${NODE_NAME}
      matchers:
        - logs_path:
            logs_path: "/var/log/containers/"
```

### Application Logging

#### Structured Logging Setup
```typescript
// src/common/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'canvas-app',
        version: process.env.npm_package_version,
      },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: '/app/logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: '/app/logs/combined.log',
        }),
      ],
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }
}
```

## 📱 Health Check Implementation

### Comprehensive Health Checks

#### Health Check Service
```typescript
// src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@Injectable()
export class CustomHealthIndicator extends HealthIndicator {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redis: Redis,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      const mongoHealth = await this.checkMongoDB();
      const redisHealth = await this.checkRedis();
      const opensearchHealth = await this.checkOpenSearch();
      const aiServicesHealth = await this.checkAIServices();

      const isHealthy = mongoHealth && redisHealth && opensearchHealth && aiServicesHealth;

      return this.getStatus('canvas-app', isHealthy, {
        mongodb: mongoHealth,
        redis: redisHealth,
        opensearch: opensearchHealth,
        aiServices: aiServicesHealth,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return this.getStatus('canvas-app', false, {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async checkMongoDB(): Promise<boolean> {
    try {
      await this.mongoConnection.db.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  private async checkOpenSearch(): Promise<boolean> {
    try {
      // Implement OpenSearch health check
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkAIServices(): Promise<boolean> {
    try {
      // Implement AI services health check
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

#### Health Check Controller
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { CustomHealthIndicator } from './custom-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly customHealthIndicator: CustomHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      () => this.customHealthIndicator.isHealthy(),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.healthCheckService.check([
      () => this.customHealthIndicator.isHealthy(),
    ]);
  }

  @Get('live')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

## 🎛️ Monitoring Operations

### Daily Monitoring Tasks

#### Monitoring Checklist
```bash
#!/bin/bash
# daily-monitoring-check.sh

echo "🔍 Daily Canvas Platform Monitoring Check"
echo "=========================================="

# Check application health
echo "1. Checking application health..."
curl -s http://canvas-app/health | jq '.'

# Check Prometheus targets
echo "2. Checking Prometheus targets..."
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Check recent alerts
echo "3. Checking recent alerts..."
curl -s http://alertmanager:9093/api/v1/alerts | jq '.data[] | select(.status.state == "firing")'

# Check resource usage
echo "4. Checking resource usage..."
kubectl top nodes
kubectl top pods -n canvas-orchestration

# Check error rates
echo "5. Checking error rates..."
curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])' | jq '.data.result'

echo "✅ Daily monitoring check completed"
```

### Troubleshooting Monitoring Issues

#### Common Monitoring Problems

1. **Metrics Not Appearing**
```bash
# Check if metrics endpoint is accessible
kubectl exec -it deployment/canvas-app -n canvas-orchestration -- curl localhost:3000/metrics

# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check Prometheus configuration
kubectl get configmap prometheus-config -n monitoring -o yaml
```

2. **Alerts Not Firing**
```bash
# Check AlertManager configuration
kubectl get configmap alertmanager-config -n monitoring -o yaml

# Test alert rules
kubectl exec -it prometheus-0 -n monitoring -- promtool query instant 'up{job="canvas-app"} == 0'

# Check AlertManager logs
kubectl logs deployment/alertmanager -n monitoring
```

3. **Dashboard Issues**
```bash
# Check Grafana data sources
kubectl port-forward -n monitoring svc/grafana 3000:80

# Check Grafana logs
kubectl logs deployment/grafana -n monitoring

# Verify dashboard JSON
kubectl get configmap grafana-dashboards -n monitoring -o yaml
```

This monitoring guide provides comprehensive coverage for observing, alerting on, and maintaining the Canvas AI Orchestration Platform's health and performance.