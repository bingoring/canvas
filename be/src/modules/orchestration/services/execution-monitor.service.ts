import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowExecution, ExecutionMetrics } from '../interfaces/workflow.interface';

export interface MonitoringConfig {
  metricsInterval: number;
  alertThresholds: {
    maxDuration: number;
    maxCost: number;
    maxMemoryUsage: number;
    errorRate: number;
  };
  enableProfiling: boolean;
}

export interface ExecutionAlert {
  executionId: string;
  type: 'duration' | 'cost' | 'memory' | 'error_rate' | 'performance';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Execution monitor for tracking workflow performance and health
 * Provides real-time monitoring, alerting, and performance analytics
 */
@Injectable()
export class ExecutionMonitor {
  private readonly logger = new Logger(ExecutionMonitor.name);
  private readonly monitoringData = new Map<string, MonitoringData>();
  private readonly config: MonitoringConfig;

  constructor(private eventEmitter: EventEmitter2) {
    this.config = {
      metricsInterval: 5000, // 5 seconds
      alertThresholds: {
        maxDuration: 300000, // 5 minutes
        maxCost: 5.0, // $5
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        errorRate: 0.1, // 10%
      },
      enableProfiling: true,
    };

    this.logger.log('Execution monitor initialized');
  }

  /**
   * Start monitoring a workflow execution
   */
  async startMonitoring(execution: WorkflowExecution): Promise<void> {
    const monitoringData: MonitoringData = {
      executionId: execution.id,
      startTime: new Date(),
      metrics: {
        duration: 0,
        cost: 0,
        memoryUsage: 0,
        nodeCount: 0,
        successfulNodes: 0,
        failedNodes: 0,
        errorRate: 0,
      },
      samples: [],
      alerts: [],
      isActive: true,
    };

    this.monitoringData.set(execution.id, monitoringData);

    // Start periodic monitoring
    this.startPeriodicMonitoring(execution.id);

    this.logger.debug(`Started monitoring execution: ${execution.id}`);
  }

  /**
   * Stop monitoring a workflow execution
   */
  async stopMonitoring(executionId: string): Promise<void> {
    const data = this.monitoringData.get(executionId);
    if (!data) {
      return;
    }

    data.isActive = false;
    data.endTime = new Date();

    // Generate final report
    const report = this.generateExecutionReport(executionId);
    this.eventEmitter.emit('monitoring.report', { executionId, report });

    this.logger.debug(`Stopped monitoring execution: ${executionId}`);
  }

  /**
   * Update execution metrics
   */
  async updateMetrics(executionId: string, updates: Partial<ExecutionMetrics>): Promise<void> {
    const data = this.monitoringData.get(executionId);
    if (!data) {
      return;
    }

    // Update metrics
    if (updates.totalCost !== undefined) {
      data.metrics.cost = updates.totalCost;
    }

    if (updates.nodeMetrics) {
      data.metrics.nodeCount = Object.keys(updates.nodeMetrics).length;
      data.metrics.successfulNodes = Object.values(updates.nodeMetrics).filter(m => m.success).length;
      data.metrics.failedNodes = Object.values(updates.nodeMetrics).filter(m => !m.success).length;
      data.metrics.errorRate = data.metrics.nodeCount > 0
        ? data.metrics.failedNodes / data.metrics.nodeCount
        : 0;
    }

    // Check for alerts
    await this.checkAlerts(executionId);
  }

  /**
   * Record performance sample
   */
  async recordSample(executionId: string, sample: PerformanceSample): Promise<void> {
    const data = this.monitoringData.get(executionId);
    if (!data) {
      return;
    }

    data.samples.push(sample);

    // Keep only last 100 samples to prevent memory bloat
    if (data.samples.length > 100) {
      data.samples = data.samples.slice(-100);
    }

    // Update current metrics
    data.metrics.duration = Date.now() - data.startTime.getTime();
    data.metrics.memoryUsage = sample.memoryUsage;
  }

  /**
   * Get current monitoring data
   */
  getMonitoringData(executionId: string): MonitoringData | undefined {
    return this.monitoringData.get(executionId);
  }

  /**
   * Get execution alerts
   */
  getAlerts(executionId: string): ExecutionAlert[] {
    const data = this.monitoringData.get(executionId);
    return data ? data.alerts : [];
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(executionId: string): PerformanceStats | undefined {
    const data = this.monitoringData.get(executionId);
    if (!data || data.samples.length === 0) {
      return undefined;
    }

    const samples = data.samples;
    const cpuUsages = samples.map(s => s.cpuUsage).filter(c => c !== undefined);
    const memoryUsages = samples.map(s => s.memoryUsage);
    const latencies = samples.map(s => s.latency).filter(l => l !== undefined);

    return {
      avgCpuUsage: cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0,
      maxCpuUsage: cpuUsages.length > 0 ? Math.max(...cpuUsages) : 0,
      avgMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages),
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      sampleCount: samples.length,
    };
  }

  /**
   * Generate execution report
   */
  generateExecutionReport(executionId: string): ExecutionReport {
    const data = this.monitoringData.get(executionId);
    if (!data) {
      throw new Error(`Monitoring data not found for execution: ${executionId}`);
    }

    const performanceStats = this.getPerformanceStats(executionId);
    const duration = data.endTime
      ? data.endTime.getTime() - data.startTime.getTime()
      : Date.now() - data.startTime.getTime();

    return {
      executionId,
      startTime: data.startTime,
      endTime: data.endTime,
      duration,
      metrics: data.metrics,
      performance: performanceStats,
      alerts: data.alerts,
      summary: {
        status: data.isActive ? 'running' : 'completed',
        efficiency: this.calculateEfficiency(data),
        resourceUtilization: this.calculateResourceUtilization(data),
        costEffectiveness: this.calculateCostEffectiveness(data),
      },
    };
  }

  /**
   * Clean up monitoring data
   */
  async cleanup(executionId: string): Promise<void> {
    this.monitoringData.delete(executionId);
    this.logger.debug(`Cleaned up monitoring data for execution: ${executionId}`);
  }

  /**
   * Start periodic monitoring for an execution
   */
  private startPeriodicMonitoring(executionId: string): void {
    const interval = setInterval(async () => {
      const data = this.monitoringData.get(executionId);
      if (!data || !data.isActive) {
        clearInterval(interval);
        return;
      }

      // Collect performance sample
      const sample: PerformanceSample = {
        timestamp: new Date(),
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: this.getCurrentCpuUsage(),
        latency: this.measureLatency(),
      };

      await this.recordSample(executionId, sample);
    }, this.config.metricsInterval);
  }

  /**
   * Check for alerts based on thresholds
   */
  private async checkAlerts(executionId: string): Promise<void> {
    const data = this.monitoringData.get(executionId);
    if (!data) {
      return;
    }

    const alerts: ExecutionAlert[] = [];

    // Duration alert
    if (data.metrics.duration > this.config.alertThresholds.maxDuration) {
      alerts.push({
        executionId,
        type: 'duration',
        severity: 'warning',
        message: `Execution duration exceeded ${this.config.alertThresholds.maxDuration}ms`,
        timestamp: new Date(),
        metadata: { duration: data.metrics.duration },
      });
    }

    // Cost alert
    if (data.metrics.cost > this.config.alertThresholds.maxCost) {
      alerts.push({
        executionId,
        type: 'cost',
        severity: 'critical',
        message: `Execution cost exceeded $${this.config.alertThresholds.maxCost}`,
        timestamp: new Date(),
        metadata: { cost: data.metrics.cost },
      });
    }

    // Memory alert
    if (data.metrics.memoryUsage > this.config.alertThresholds.maxMemoryUsage) {
      alerts.push({
        executionId,
        type: 'memory',
        severity: 'warning',
        message: `Memory usage exceeded ${this.config.alertThresholds.maxMemoryUsage} bytes`,
        timestamp: new Date(),
        metadata: { memoryUsage: data.metrics.memoryUsage },
      });
    }

    // Error rate alert
    if (data.metrics.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        executionId,
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate exceeded ${this.config.alertThresholds.errorRate * 100}%`,
        timestamp: new Date(),
        metadata: { errorRate: data.metrics.errorRate },
      });
    }

    // Add new alerts
    for (const alert of alerts) {
      data.alerts.push(alert);
      this.eventEmitter.emit('monitoring.alert', alert);
      this.logger.warn(`Execution alert: ${alert.type} - ${alert.message}`, { executionId });
    }
  }

  /**
   * Calculate execution efficiency
   */
  private calculateEfficiency(data: MonitoringData): number {
    if (data.metrics.nodeCount === 0) {
      return 0;
    }

    const successRate = data.metrics.successfulNodes / data.metrics.nodeCount;
    const avgNodeDuration = data.metrics.duration / data.metrics.nodeCount;
    const normalizedDuration = Math.min(avgNodeDuration / 1000, 1); // Normalize to 0-1

    return successRate * (1 - normalizedDuration);
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(data: MonitoringData): number {
    if (data.samples.length === 0) {
      return 0;
    }

    const avgMemory = data.samples.reduce((sum, s) => sum + s.memoryUsage, 0) / data.samples.length;
    const maxMemory = this.config.alertThresholds.maxMemoryUsage;

    return Math.min(avgMemory / maxMemory, 1);
  }

  /**
   * Calculate cost effectiveness
   */
  private calculateCostEffectiveness(data: MonitoringData): number {
    if (data.metrics.cost === 0 || data.metrics.successfulNodes === 0) {
      return 0;
    }

    const costPerSuccess = data.metrics.cost / data.metrics.successfulNodes;
    const normalizedCost = Math.min(costPerSuccess / 1.0, 1); // Normalize to $1 per success

    return 1 - normalizedCost;
  }

  /**
   * Get current CPU usage (simplified)
   */
  private getCurrentCpuUsage(): number {
    // This is a simplified implementation
    // In production, you might use more sophisticated CPU monitoring
    return Math.random() * 100; // Mock value
  }

  /**
   * Measure current latency
   */
  private measureLatency(): number {
    // This would typically measure actual operation latency
    // For now, return a mock value
    return Math.random() * 100; // Mock value
  }
}

interface MonitoringData {
  executionId: string;
  startTime: Date;
  endTime?: Date;
  metrics: {
    duration: number;
    cost: number;
    memoryUsage: number;
    nodeCount: number;
    successfulNodes: number;
    failedNodes: number;
    errorRate: number;
  };
  samples: PerformanceSample[];
  alerts: ExecutionAlert[];
  isActive: boolean;
}

interface PerformanceSample {
  timestamp: Date;
  memoryUsage: number;
  cpuUsage?: number;
  latency?: number;
}

interface PerformanceStats {
  avgCpuUsage: number;
  maxCpuUsage: number;
  avgMemoryUsage: number;
  maxMemoryUsage: number;
  avgLatency: number;
  maxLatency: number;
  sampleCount: number;
}

interface ExecutionReport {
  executionId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  metrics: {
    duration: number;
    cost: number;
    memoryUsage: number;
    nodeCount: number;
    successfulNodes: number;
    failedNodes: number;
    errorRate: number;
  };
  performance?: PerformanceStats;
  alerts: ExecutionAlert[];
  summary: {
    status: string;
    efficiency: number;
    resourceUtilization: number;
    costEffectiveness: number;
  };
}