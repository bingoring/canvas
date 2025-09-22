# Health Check Endpoint Implementation

For the Docker health checks to work properly, ensure your NestJS application implements a `/health` endpoint.

## Required Implementation

### 1. Install Health Check Dependencies

```bash
npm install @nestjs/terminus
```

### 2. Create Health Module

```typescript
// src/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

### 3. Create Health Controller

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // MongoDB check
      () => this.mongoose.pingCheck('mongodb'),

      // Memory check (500MB limit)
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),

      // Disk check (90% threshold)
      () => this.disk.checkStorage('storage', {
        path: '/',
        thresholdPercent: 0.9
      }),
    ]);
  }
}
```

### 4. Register in App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ... other imports
    HealthModule,
  ],
  // ... rest of module config
})
export class AppModule {}
```

### 5. Custom Health Indicators (Optional)

```typescript
// src/health/redis.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
    }
  }
}
```

## Expected Response Format

The health endpoint should return:

```json
{
  "status": "ok",
  "info": {
    "mongodb": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "mongodb": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  }
}
```

## Status Codes

- `200`: All health checks pass
- `503`: One or more health checks fail

This implementation ensures Docker health checks work correctly and provides comprehensive application monitoring.