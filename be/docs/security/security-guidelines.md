# Security Guidelines & Best Practices

This comprehensive security guide covers all aspects of securing the Canvas AI Orchestration Platform, from infrastructure hardening to application security best practices.

## 🔒 Security Framework Overview

### Security Philosophy
- **Defense in Depth**: Multiple layers of security controls
- **Zero Trust**: Never trust, always verify
- **Principle of Least Privilege**: Minimal access rights
- **Security by Design**: Built-in security from the ground up
- **Continuous Monitoring**: Real-time threat detection and response

### Security Layers
```
┌─────────────────────────────────────────────────────────────┐
│                     Perimeter Security                     │
├─────────────────────────────────────────────────────────────┤
│  WAF  │  DDoS Protection  │  SSL/TLS  │  Rate Limiting    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Network Security                        │
├─────────────────────────────────────────────────────────────┤
│   VPC   │  Security Groups  │  Network Policies  │  IDS    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 Application Security                       │
├─────────────────────────────────────────────────────────────┤
│ Authentication │ Authorization │ Input Validation │ HTTPS  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Data Security                           │
├─────────────────────────────────────────────────────────────┤
│  Encryption at Rest  │  Encryption in Transit  │  Backup  │
└─────────────────────────────────────────────────────────────┘
```

## 🛡️ Infrastructure Security

### Container Security

#### Secure Container Images
```dockerfile
# Dockerfile security best practices
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set security headers
LABEL security.scan="enabled"
LABEL security.vulnerability-check="enabled"

# Remove unnecessary packages
RUN apk del --no-cache \
    curl \
    wget \
    git

# Use non-root user
USER nextjs

# Set read-only filesystem
VOLUME ["/tmp"]
VOLUME ["/var/log"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

#### Container Security Scanning
```bash
# Scan images for vulnerabilities
trivy image canvas-orchestration:latest

# Scan Kubernetes configurations
kube-score score k8s/overlays/production/

# Scan for secrets in images
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  secretscanner/secretscanner canvas-orchestration:latest
```

#### Pod Security Standards
```yaml
# k8s/base/app/pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: canvas-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

### Kubernetes Security

#### Network Policies
```yaml
# k8s/base/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: canvas-network-policy
  namespace: canvas-orchestration
spec:
  podSelector:
    matchLabels:
      app: canvas-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: canvas-mongodb
    ports:
    - protocol: TCP
      port: 27017
  - to:
    - podSelector:
        matchLabels:
          app: canvas-redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS
    - protocol: TCP
      port: 53   # DNS
    - protocol: UDP
      port: 53   # DNS
```

#### RBAC Configuration
```yaml
# k8s/base/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: canvas-orchestration
  name: canvas-app-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: canvas-app-rolebinding
  namespace: canvas-orchestration
subjects:
- kind: ServiceAccount
  name: canvas-app
  namespace: canvas-orchestration
roleRef:
  kind: Role
  name: canvas-app-role
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: canvas-app
  namespace: canvas-orchestration
automountServiceAccountToken: false
```

#### Security Contexts
```yaml
# k8s/base/app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canvas-app
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: canvas-app
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1001
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
        - name: logs-volume
          mountPath: /app/logs
      volumes:
      - name: tmp-volume
        emptyDir: {}
      - name: logs-volume
        emptyDir: {}
```

## 🔐 Application Security

### Authentication & Authorization

#### JWT Security Configuration
```typescript
// src/auth/auth.module.ts
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
          issuer: 'canvas-orchestration',
          audience: 'canvas-app',
          algorithm: 'HS256',
        },
        verifyOptions: {
          issuer: 'canvas-orchestration',
          audience: 'canvas-app',
          algorithms: ['HS256'],
        },
      }),
    }),
  ],
})
export class AuthModule {}
```

#### Authentication Guard
```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    // Additional security checks
    const request = context.switchToHttp().getRequest();
    const userAgent = request.headers['user-agent'];
    const clientIp = request.ip;

    // Log authentication attempt
    this.logAuthAttempt(user, userAgent, clientIp, true);

    return user;
  }

  private logAuthAttempt(user: any, userAgent: string, clientIp: string, success: boolean) {
    // Implement authentication logging
    console.log({
      event: 'authentication_attempt',
      user: user?.id || 'unknown',
      userAgent,
      clientIp,
      success,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### Role-Based Access Control
```typescript
// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      // Log authorization failure
      console.log({
        event: 'authorization_failure',
        user: user.id,
        requiredRoles,
        userRoles: user.roles,
        timestamp: new Date().toISOString(),
      });
    }

    return hasRole;
  }
}
```

### Input Validation & Sanitization

#### Request Validation
```typescript
// src/common/pipes/validation.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { sanitize } from 'class-sanitizer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize input
    const object = plainToClass(metatype, value);
    sanitize(object);

    // Validate input
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors.map(error =>
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');

      throw new BadRequestException(`Validation failed: ${errorMessages}`);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

#### DTO Security
```typescript
// src/canvas/dto/create-image.dto.ts
import { IsString, IsEnum, IsOptional, Length, Matches, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { Sanitize } from 'class-sanitizer';

export class CreateImageDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  @Sanitize()
  @Transform(({ value }) => value.trim())
  @Matches(/^[a-zA-Z0-9\s\-_.,!?]+$/, {
    message: 'Prompt contains invalid characters'
  })
  prompt: string;

  @IsEnum(['cartoon', 'realistic', 'anime', 'meme', 'illustration'])
  @IsOptional()
  style?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(10)
  quantity?: number = 1;
}
```

### API Security

#### Rate Limiting
```typescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('THROTTLE_TTL', 60),
        limit: configService.get<number>('THROTTLE_LIMIT', 100),
        storage: new ThrottlerStorageRedisService(redisClient),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

#### CORS Configuration
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  await app.listen(3000);
}
bootstrap();
```

## 🔒 Data Security

### Encryption

#### Database Encryption
```typescript
// src/common/encryption/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { createCipher, createDecipher, randomBytes, pbkdf2Sync } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;

  encrypt(text: string, password: string): string {
    const salt = randomBytes(16);
    const key = pbkdf2Sync(password, salt, 10000, this.keyLength, 'sha256');
    const iv = randomBytes(this.ivLength);

    const cipher = createCipher(this.algorithm, key);
    cipher.setAAD(salt);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string, password: string): string {
    const [saltHex, ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = pbkdf2Sync(password, salt, 10000, this.keyLength, 'sha256');

    const decipher = createDecipher(this.algorithm, key);
    decipher.setAAD(salt);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

#### Secrets Management
```yaml
# k8s/base/app/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: canvas-secrets
  namespace: canvas-orchestration
type: Opaque
data:
  # Secrets are base64 encoded
  JWT_SECRET: <base64-encoded-secret>
  MONGODB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  AWS_ACCESS_KEY_ID: <base64-encoded-key>
  AWS_SECRET_ACCESS_KEY: <base64-encoded-secret>
stringData:
  # Alternative: plain text that gets encoded automatically
  OPENSEARCH_PASSWORD: "secure-password"
```

#### External Secrets Operator
```yaml
# k8s/base/external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: canvas-orchestration
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-northeast-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: canvas-app-secrets
  namespace: canvas-orchestration
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: canvas-secrets
    creationPolicy: Owner
  data:
  - secretKey: JWT_SECRET
    remoteRef:
      key: canvas/production
      property: jwt_secret
  - secretKey: MONGODB_PASSWORD
    remoteRef:
      key: canvas/production
      property: mongodb_password
```

### Database Security

#### MongoDB Security Configuration
```javascript
// docker/mongodb/init-scripts/security-init.js
db = db.getSiblingDB('admin');

// Create admin user
db.createUser({
  user: 'admin',
  pwd: process.env.MONGODB_ROOT_PASSWORD,
  roles: [
    { role: 'userAdminAnyDatabase', db: 'admin' },
    { role: 'readWriteAnyDatabase', db: 'admin' },
    { role: 'dbAdminAnyDatabase', db: 'admin' }
  ]
});

// Create application user with limited privileges
db = db.getSiblingDB('canvas_orchestration');
db.createUser({
  user: 'canvas_app',
  pwd: process.env.MONGODB_APP_PASSWORD,
  roles: [
    { role: 'readWrite', db: 'canvas_orchestration' }
  ]
});

// Enable authentication
db.adminCommand({ setParameter: 1, authenticationMechanisms: ['SCRAM-SHA-256'] });
```

#### Redis Security Configuration
```conf
# docker/redis/redis.conf

# Authentication
requirepass "${REDIS_PASSWORD}"
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_b31e8d7c"

# Network security
bind 127.0.0.1
protected-mode yes
port 0
unixsocket /var/run/redis/redis.sock
unixsocketperm 700

# Disable dangerous commands
rename-command EVAL ""
rename-command SHUTDOWN SHUTDOWN_b31e8d7c

# TLS configuration (if using TLS)
tls-port 6379
tls-cert-file /etc/ssl/certs/redis.crt
tls-key-file /etc/ssl/private/redis.key
tls-ca-cert-file /etc/ssl/certs/ca.crt
```

## 🚨 Security Monitoring

### Security Event Logging

#### Security Logger Service
```typescript
// src/common/security/security-logger.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityLoggerService {
  constructor(private configService: ConfigService) {}

  logAuthenticationAttempt(
    userId: string,
    success: boolean,
    clientIp: string,
    userAgent: string,
  ): void {
    const logEntry = {
      event: 'authentication_attempt',
      userId,
      success,
      clientIp,
      userAgent,
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV'),
    };

    console.log(JSON.stringify(logEntry));

    // Send to security monitoring system
    this.sendToSecurityMonitoring(logEntry);
  }

  logAuthorizationFailure(
    userId: string,
    resource: string,
    action: string,
    clientIp: string,
  ): void {
    const logEntry = {
      event: 'authorization_failure',
      userId,
      resource,
      action,
      clientIp,
      timestamp: new Date().toISOString(),
      severity: 'warning',
    };

    console.log(JSON.stringify(logEntry));
    this.sendToSecurityMonitoring(logEntry);
  }

  logSuspiciousActivity(
    event: string,
    details: any,
    clientIp: string,
  ): void {
    const logEntry = {
      event: 'suspicious_activity',
      type: event,
      details,
      clientIp,
      timestamp: new Date().toISOString(),
      severity: 'high',
    };

    console.log(JSON.stringify(logEntry));
    this.sendToSecurityMonitoring(logEntry);
  }

  private sendToSecurityMonitoring(logEntry: any): void {
    // Implementation for sending to SIEM/security monitoring system
    // e.g., Splunk, Elasticsearch, or cloud security services
  }
}
```

#### Intrusion Detection
```typescript
// src/common/security/intrusion-detection.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class IntrusionDetectionService {
  constructor(private readonly redis: Redis) {}

  async checkRateLimit(clientIp: string, endpoint: string): Promise<boolean> {
    const key = `rate_limit:${clientIp}:${endpoint}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    return current <= 100; // 100 requests per minute
  }

  async detectBruteForce(userId: string): Promise<boolean> {
    const key = `brute_force:${userId}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 900); // 15 minute window
    }

    if (attempts >= 5) {
      // Lock account for 30 minutes
      await this.redis.setex(`account_lock:${userId}`, 1800, 'locked');
      return true;
    }

    return false;
  }

  async detectAnomalousPatterns(clientIp: string, userAgent: string): Promise<boolean> {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /bot|crawler|spider/i,
      /script|automated/i,
      /sqlmap|nikto|burp/i,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      return true;
    }

    // Check IP reputation
    const isBlacklisted = await this.checkIPBlacklist(clientIp);
    if (isBlacklisted) {
      return true;
    }

    return false;
  }

  private async checkIPBlacklist(ip: string): Promise<boolean> {
    // Implementation for checking IP against threat intelligence feeds
    return false;
  }
}
```

### Security Metrics

#### Security Metrics Collection
```typescript
// src/common/security/security-metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class SecurityMetricsService {
  private readonly authAttempts: Counter<string>;
  private readonly authorizationFailures: Counter<string>;
  private readonly securityEvents: Counter<string>;
  private readonly bruteForceAttempts: Counter<string>;

  constructor() {
    this.authAttempts = new Counter({
      name: 'auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['success', 'method'],
    });

    this.authorizationFailures = new Counter({
      name: 'authorization_failures_total',
      help: 'Total authorization failures',
      labelNames: ['resource', 'action'],
    });

    this.securityEvents = new Counter({
      name: 'security_events_total',
      help: 'Total security events',
      labelNames: ['type', 'severity'],
    });

    this.bruteForceAttempts = new Counter({
      name: 'brute_force_attempts_total',
      help: 'Total brute force attempts',
      labelNames: ['target_type'],
    });
  }

  recordAuthAttempt(success: boolean, method: string): void {
    this.authAttempts.inc({ success: success.toString(), method });
  }

  recordAuthorizationFailure(resource: string, action: string): void {
    this.authorizationFailures.inc({ resource, action });
  }

  recordSecurityEvent(type: string, severity: string): void {
    this.securityEvents.inc({ type, severity });
  }

  recordBruteForceAttempt(targetType: string): void {
    this.bruteForceAttempts.inc({ target_type: targetType });
  }
}
```

## 🔍 Security Auditing

### Security Audit Checklist

#### Infrastructure Audit
```bash
#!/bin/bash
# security-audit.sh

echo "🔒 Canvas Platform Security Audit"
echo "=================================="

# 1. Check for exposed secrets
echo "1. Checking for exposed secrets..."
git secrets --scan
grep -r "password\|secret\|key" . --exclude-dir=.git --exclude-dir=node_modules

# 2. Scan container images
echo "2. Scanning container images..."
trivy image canvas-orchestration:latest

# 3. Check Kubernetes security
echo "3. Checking Kubernetes security..."
kube-score score k8s/overlays/production/
kube-bench run --targets node,policies,managedservices

# 4. Check network policies
echo "4. Checking network policies..."
kubectl get networkpolicy -A

# 5. Check RBAC
echo "5. Checking RBAC configuration..."
kubectl get clusterroles,clusterrolebindings,roles,rolebindings -A

# 6. Check for privileged containers
echo "6. Checking for privileged containers..."
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}' | grep -E "(^|\s)0(\s|$)"

# 7. SSL/TLS certificate check
echo "7. Checking SSL certificates..."
openssl s_client -connect your-domain.com:443 -servername your-domain.com </dev/null 2>/dev/null | openssl x509 -noout -dates

echo "✅ Security audit completed"
```

#### Compliance Verification
```bash
#!/bin/bash
# compliance-check.sh

# GDPR Compliance Check
echo "📋 GDPR Compliance Check"
echo "========================"

# Check for data processing logging
grep -r "personal_data_access" logs/ || echo "❌ Missing personal data access logs"

# Check for data retention policies
kubectl get configmap data-retention-policy -o yaml || echo "❌ Missing data retention policy"

# Check for encryption at rest
kubectl get pv -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.storageClassName}{"\n"}{end}' | grep -E "(encrypted|secure)" || echo "❌ Storage encryption not verified"

# SOC 2 Compliance Check
echo "📋 SOC 2 Compliance Check"
echo "========================="

# Check access controls
kubectl auth can-i --list --as=system:serviceaccount:canvas-orchestration:canvas-app

# Check audit logging
kubectl get events --sort-by='.lastTimestamp' | head -10

# Check backup procedures
kubectl get cronjob -A | grep backup || echo "❌ Missing backup cronjobs"
```

## 🚀 Security Automation

### Automated Security Testing

#### Security Test Pipeline
```yaml
# .github/workflows/security.yml
name: Security Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

      - name: Build Docker image
        run: docker build -t canvas-orchestration:test .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'canvas-orchestration:test'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run SAST scan
        uses: github/codeql-action/init@v2
        with:
          languages: typescript, javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  kubernetes-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run kube-score
        run: |
          wget https://github.com/zegl/kube-score/releases/download/v1.16.1/kube-score_1.16.1_linux_amd64.tar.gz
          tar xzf kube-score_1.16.1_linux_amd64.tar.gz
          ./kube-score score k8s/overlays/production/

      - name: Run Polaris
        run: |
          kubectl apply -f https://github.com/FairwindsOps/polaris/releases/latest/download/dashboard.yaml
          kubectl port-forward --namespace polaris svc/polaris-dashboard 8080:80 &
          sleep 10
          curl -sSL http://localhost:8080/api/validate -X POST --data-binary @k8s/overlays/production/
```

### Security Monitoring Automation

#### Automated Threat Response
```typescript
// src/common/security/threat-response.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ThreatResponseService {
  constructor(private eventEmitter: EventEmitter2) {}

  async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    switch (event.severity) {
      case 'critical':
        await this.handleCriticalThreat(event);
        break;
      case 'high':
        await this.handleHighThreat(event);
        break;
      case 'medium':
        await this.handleMediumThreat(event);
        break;
      default:
        await this.logSecurityEvent(event);
    }
  }

  private async handleCriticalThreat(event: SecurityEvent): Promise<void> {
    // Immediately block the threat
    await this.blockIpAddress(event.sourceIp);

    // Notify security team
    await this.notifySecurityTeam(event, 'IMMEDIATE');

    // Create incident ticket
    await this.createIncidentTicket(event);

    // Log detailed forensics
    await this.captureForensics(event);
  }

  private async handleHighThreat(event: SecurityEvent): Promise<void> {
    // Temporarily rate limit
    await this.applyRateLimit(event.sourceIp, 300); // 5 minutes

    // Alert security team
    await this.notifySecurityTeam(event, 'HIGH');

    // Enhanced monitoring
    await this.enableEnhancedMonitoring(event.sourceIp);
  }

  private async blockIpAddress(ip: string): Promise<void> {
    // Implementation to block IP at firewall/WAF level
    this.eventEmitter.emit('security.ip.blocked', { ip, timestamp: Date.now() });
  }

  private async notifySecurityTeam(event: SecurityEvent, priority: string): Promise<void> {
    // Send to PagerDuty, Slack, etc.
    this.eventEmitter.emit('security.alert', { event, priority });
  }
}
```

This comprehensive security guide provides the foundation for securing the Canvas AI Orchestration Platform across all layers, from infrastructure to application security, with automated monitoring and response capabilities.