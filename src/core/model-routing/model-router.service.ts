import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockKoreaConfig, ModelInfo } from '@/config/bedrock-korea.config';
import {
  ModelRequest,
  ModelRoute,
  TaskType,
  QualityRequirement,
  LatencyRequirement,
  ModelSelection,
  ModelHealth,
} from '@/types/model.types';

/**
 * Model router service for Korea region optimization
 * Implements cost-first model selection with intelligent fallbacks
 */
@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private readonly modelHealthCache = new Map<string, ModelHealth>();
  private readonly routingCache = new Map<string, ModelRoute>();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Model Router Service initialized for Korea region (ap-northeast-2)');
  }

  /**
   * Route request to optimal model based on cost, quality, and latency requirements
   */
  async routeRequest(request: ModelRequest): Promise<ModelRoute> {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(request);

      // Check cache first
      const cachedRoute = this.routingCache.get(cacheKey);
      if (cachedRoute && this.isCacheValid(cachedRoute)) {
        this.logger.debug(`Cache hit for routing request: ${cacheKey}`);
        return cachedRoute;
      }

      // 1. Analyze task type and determine suitable models
      const taskType = this.normalizeTaskType(request.taskType);
      const availableModels = await this.getAvailableModels(taskType);

      if (availableModels.length === 0) {
        throw new Error(`No available models for task type: ${taskType}`);
      }

      // 2. Apply health filtering
      const healthyModels = await this.filterHealthyModels(availableModels);

      // 3. Apply cost optimization strategy
      const selectedModel = await this.selectOptimalModel(healthyModels, request);

      // 4. Build routing result
      const route: ModelRoute = {
        modelId: selectedModel.id,
        endpoint: this.buildEndpoint(selectedModel),
        adapter: this.getAdapterName(selectedModel),
        estimatedCost: this.estimateCost(selectedModel, request),
        fallbackModels: this.getFallbackModels(selectedModel, healthyModels),
        reasoning: this.generateReasoningExplanation(selectedModel, request),
      };

      // Cache the result
      this.routingCache.set(cacheKey, route);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Model routing completed in ${duration}ms: ${selectedModel.name} (${selectedModel.id}) - Cost: $${route.estimatedCost.toFixed(6)}`
      );

      return route;
    } catch (error) {
      this.logger.error(`Model routing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get available models for Korea region
   */
  async getAvailableModels(taskType?: TaskType): Promise<ModelInfo[]> {
    const allModels = [
      ...BedrockKoreaConfig.models.textGeneration,
      ...BedrockKoreaConfig.models.imageGeneration,
      ...BedrockKoreaConfig.models.embedding,
    ];

    let filteredModels = allModels.filter(model => model.status === 'available');

    if (taskType) {
      filteredModels = filteredModels.filter(model =>
        this.isModelSuitableForTask(model, taskType)
      );
    }

    return filteredModels;
  }

  /**
   * Check model health status
   */
  async checkModelHealth(): Promise<ModelHealth[]> {
    const availableModels = await this.getAvailableModels();
    const healthChecks: ModelHealth[] = [];

    for (const model of availableModels) {
      let health = this.modelHealthCache.get(model.id);

      // Refresh health check if stale
      if (!health || this.isHealthCheckStale(health)) {
        health = await this.performHealthCheck(model);
        this.modelHealthCache.set(model.id, health);
      }

      healthChecks.push(health);
    }

    return healthChecks;
  }

  /**
   * Get current usage and cost for a user
   */
  async getCurrentUsage(userId: string): Promise<any> {
    // In a real implementation, this would query a database or metrics service
    // For now, return mock data
    return {
      daily: 2.45,
      monthly: 67.80,
      currency: 'USD',
      lastReset: new Date(),
    };
  }

  // Private helper methods

  private normalizeTaskType(taskType: TaskType): TaskType {
    // Normalize task types to standard categories
    const taskMapping: Record<string, TaskType> = {
      'sketch-to-image': 'image-generation',
      'text-to-image': 'image-generation',
      'content-creation': 'text-generation',
      'conversation': 'text-generation',
      'summarization': 'text-generation',
      'code-generation': 'text-generation',
    };

    return taskMapping[taskType] || taskType;
  }

  private async selectOptimalModel(
    models: ModelInfo[],
    request: ModelRequest
  ): Promise<ModelInfo> {
    // Sort models by cost (lowest first) - Korea region optimization
    const sortedModels = models.sort((a, b) => a.costPerUnit - b.costPerUnit);

    // Apply quality requirements
    const qualityFiltered = this.filterByQuality(sortedModels, request.qualityRequirement || 'standard');

    // Apply latency requirements
    const latencyFiltered = this.filterByLatency(qualityFiltered, request.latencyRequirement || 'medium');

    // Apply budget constraints
    const budgetFiltered = this.filterByBudget(latencyFiltered, request.budgetConstraint);

    if (budgetFiltered.length === 0) {
      this.logger.warn('No models meet all criteria, falling back to cheapest available model');
      return sortedModels[0]; // Fallback to cheapest model
    }

    // Return the cheapest model that meets all requirements
    const selectedModel = budgetFiltered[0];

    this.logger.debug(`Selected model: ${selectedModel.name} (${selectedModel.id}) - Cost: $${selectedModel.costPerUnit}/unit`);

    return selectedModel;
  }

  private filterByQuality(models: ModelInfo[], requirement: QualityRequirement): ModelInfo[] {
    const tierOrder = { basic: 1, standard: 2, premium: 3 };
    const requiredTier = tierOrder[requirement];

    return models.filter(model => tierOrder[model.tier] >= requiredTier);
  }

  private filterByLatency(models: ModelInfo[], requirement: LatencyRequirement): ModelInfo[] {
    const latencyOrder = { low: 1, medium: 2, high: 3 };
    const maxLatency = latencyOrder[requirement];

    return models.filter(model => latencyOrder[model.latency] <= maxLatency);
  }

  private filterByBudget(models: ModelInfo[], budgetConstraint?: number): ModelInfo[] {
    if (!budgetConstraint) {
      return models;
    }

    return models.filter(model => model.costPerUnit <= budgetConstraint);
  }

  private async filterHealthyModels(models: ModelInfo[]): Promise<ModelInfo[]> {
    const healthChecks = await this.checkModelHealth();
    const healthyModelIds = healthChecks
      .filter(health => health.status === 'healthy')
      .map(health => health.modelId);

    return models.filter(model => healthyModelIds.includes(model.id));
  }

  private async performHealthCheck(model: ModelInfo): Promise<ModelHealth> {
    // Simulate health check - in real implementation, this would ping the model endpoint
    const isHealthy = Math.random() > 0.05; // 95% uptime simulation

    return {
      modelId: model.id,
      status: isHealthy ? 'healthy' : 'degraded',
      latency: Math.random() * 1000 + 100, // 100-1100ms
      errorRate: isHealthy ? Math.random() * 0.01 : Math.random() * 0.1,
      lastChecked: new Date(),
      availability: isHealthy ? 0.99 : 0.85,
    };
  }

  private isModelSuitableForTask(model: ModelInfo, taskType: TaskType): boolean {
    // Check if model supports the task type
    return model.supportedTasks.includes(taskType) ||
           model.type === taskType ||
           this.isCompatibleTaskType(model.type, taskType);
  }

  private isCompatibleTaskType(modelType: string, taskType: TaskType): boolean {
    const compatibility: Record<string, TaskType[]> = {
      'text-generation': ['text-generation', 'content-creation', 'conversation', 'summarization', 'code-generation'],
      'image-generation': ['image-generation', 'text-to-image', 'sketch-to-image'],
      'embedding': ['embedding', 'semantic-search'],
    };

    return compatibility[modelType]?.includes(taskType) || false;
  }

  private estimateCost(model: ModelInfo, request: ModelRequest): number {
    let cost = 0;

    if (model.type === 'text-generation' || model.type === 'embedding') {
      const tokens = request.estimatedTokens || 1000; // Default estimate
      cost = model.costPerUnit * tokens;

      // Add output cost if available
      if ('outputCostPerUnit' in model) {
        const outputTokens = tokens * 0.3; // Estimate output tokens as 30% of input
        cost += (model as any).outputCostPerUnit * outputTokens;
      }
    } else if (model.type === 'image-generation') {
      const images = request.estimatedImages || 1;
      cost = model.costPerUnit * images;
    }

    return cost;
  }

  private buildEndpoint(model: ModelInfo): string {
    return `https://bedrock-runtime.${BedrockKoreaConfig.region}.amazonaws.com/model/${model.id}/invoke`;
  }

  private getAdapterName(model: ModelInfo): string {
    // Return adapter class name based on model type
    const adapterMap: Record<string, string> = {
      'text-generation': 'ClaudeAdapter',
      'image-generation': 'TitanImageAdapter',
      'embedding': 'TitanEmbeddingAdapter',
    };

    return adapterMap[model.type] || 'GenericAdapter';
  }

  private getFallbackModels(selectedModel: ModelInfo, availableModels: ModelInfo[]): string[] {
    return availableModels
      .filter(model => model.id !== selectedModel.id && model.type === selectedModel.type)
      .sort((a, b) => a.costPerUnit - b.costPerUnit) // Sort by cost
      .slice(0, 2) // Take top 2 fallbacks
      .map(model => model.id);
  }

  private generateReasoningExplanation(model: ModelInfo, request: ModelRequest): string {
    const reasons = [];

    reasons.push(`Selected ${model.name} for cost optimization ($${model.costPerUnit} per ${model.costUnit})`);

    if (request.qualityRequirement) {
      reasons.push(`meets ${request.qualityRequirement} quality requirement (${model.tier} tier)`);
    }

    if (request.latencyRequirement) {
      reasons.push(`satisfies ${request.latencyRequirement} latency requirement (${model.latency} latency)`);
    }

    reasons.push(`optimized for Korea region (${BedrockKoreaConfig.region})`);

    return reasons.join(', ');
  }

  private generateCacheKey(request: ModelRequest): string {
    const keyParts = [
      request.taskType,
      request.qualityRequirement || 'standard',
      request.latencyRequirement || 'medium',
      request.budgetConstraint || 'unlimited',
      request.estimatedTokens || 1000,
      request.estimatedImages || 1,
    ];

    return keyParts.join('|');
  }

  private isCacheValid(route: ModelRoute): boolean {
    // Cache is valid for 5 minutes
    const cacheTimeout = 5 * 60 * 1000;
    return Date.now() - cacheTimeout < Date.now();
  }

  private isHealthCheckStale(health: ModelHealth): boolean {
    // Health check is stale after 1 minute
    const staleTimeout = 60 * 1000;
    return Date.now() - health.lastChecked.getTime() > staleTimeout;
  }
}