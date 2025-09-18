/**
 * Model routing and cost optimization types
 */

export type TaskType =
  | 'text-generation'
  | 'image-generation'
  | 'embedding'
  | 'code-generation'
  | 'content-creation'
  | 'analysis'
  | 'conversation'
  | 'summarization'
  | 'sketch-to-image'
  | 'text-to-image'
  | 'semantic-search'
  | 'simple-analysis'
  | 'complex-analysis'
  | 'reasoning'
  | 'image-variation'
  | 'inpainting'
  | 'outpainting'
  | 'text-embedding'
  | 'image-embedding'
  | 'multimodal-search'
  | 'image-similarity'
  | 'similarity-comparison';

export type QualityRequirement = 'basic' | 'standard' | 'premium';
export type LatencyRequirement = 'low' | 'medium' | 'high';
export type CostStrategy = 'cost-first' | 'quality-first' | 'balanced';

/**
 * Model selection request
 */
export interface ModelRequest {
  taskType: TaskType;
  qualityRequirement?: QualityRequirement;
  latencyRequirement?: LatencyRequirement;
  budgetConstraint?: number;
  userId?: string;
  estimatedTokens?: number;
  estimatedImages?: number;
  context?: any;
}

/**
 * Model routing result
 */
export interface ModelRoute {
  modelId: string;
  endpoint: string;
  adapter: string;
  estimatedCost: number;
  fallbackModels: string[];
  reasoning: string;
}

/**
 * Model selection criteria
 */
export interface ModelSelectionCriteria {
  taskType: TaskType;
  qualityRequirement: QualityRequirement;
  latencyRequirement: LatencyRequirement;
  maxCost?: number;
  preferredTier?: string;
}

/**
 * Cost strategy configuration
 */
export interface CostStrategyConfig {
  priority: 'cost' | 'quality' | 'latency' | 'balanced';
  maxCostPerRequest?: number;
  preferredTier: 'basic' | 'standard' | 'premium';
  budgetConstraints?: BudgetConstraints;
}

/**
 * Budget constraints
 */
export interface BudgetConstraints {
  daily?: number;
  monthly?: number;
  perRequest?: number;
}

/**
 * Usage tracking record
 */
export interface UsageRecord {
  userId: string;
  modelId: string;
  taskType: TaskType;
  tokens?: number;
  images?: number;
  cost: number;
  timestamp: Date;
  requestId: string;
}

/**
 * Cost record for tracking
 */
export interface CostRecord {
  timestamp: Date;
  modelId: string;
  tokensUsed?: number;
  imagesUsed?: number;
  cost: number;
  taskType: TaskType;
}

/**
 * Budget limit configuration
 */
export interface BudgetLimit {
  daily: number;
  monthly: number;
  perRequest: number;
  currency: string;
}

/**
 * Current usage statistics
 */
export interface CurrentUsage {
  daily: number;
  monthly: number;
  currency: string;
  lastReset: Date;
}

/**
 * Model selection result
 */
export interface ModelSelection {
  modelId: string;
  estimatedCost: number;
  reasoning: string;
  fallbacks: any[];
}

/**
 * Model health status
 */
export interface ModelHealth {
  modelId: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  latency: number;
  errorRate: number;
  lastChecked: Date;
  availability: number; // 0-1
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  modelId: string;
  requestCount: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  period: 'hour' | 'day' | 'week' | 'month';
  timestamp: Date;
}

/**
 * Model adapter interface
 */
export interface ModelAdapter {
  modelId: string;
  adaptRequest(request: any): any;
  adaptResponse(response: any): any;
  validateInput(input: any): boolean;
  estimateCost(input: any): number;
}

/**
 * Route optimization settings
 */
export interface RouteOptimization {
  enableCaching: boolean;
  cacheTimeout: number;
  enableFallback: boolean;
  retryAttempts: number;
  healthCheckInterval: number;
}

/**
 * Model routing configuration
 */
export interface ModelRoutingConfig {
  region: string;
  defaultStrategy: CostStrategy;
  budgetLimits: BudgetLimit;
  optimization: RouteOptimization;
  fallbackChains: Record<TaskType, string[]>;
  costThresholds: Record<QualityRequirement, number>;
}

/**
 * Cost estimation request
 */
export interface CostEstimationRequest {
  taskType: TaskType;
  inputSize: number;
  outputSize?: number;
  modelPreference?: string;
}

/**
 * Cost estimation result
 */
export interface CostEstimationResult {
  estimatedCost: number;
  breakdown: CostBreakdown;
  recommendations: CostRecommendation[];
}

/**
 * Cost breakdown details
 */
export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  processingCost: number;
  totalCost: number;
  currency: string;
}

/**
 * Cost optimization recommendation
 */
export interface CostRecommendation {
  type: 'model-switch' | 'input-optimization' | 'batch-processing';
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
}