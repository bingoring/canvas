import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelRouterService } from './model-router.service';

export interface CostBudget {
  dailyLimit: number;
  monthlyLimit: number;
  perRequestLimit: number;
  alertThresholds: {
    daily: number; // percentage
    monthly: number; // percentage
  };
}

export interface CostUsage {
  daily: number;
  monthly: number;
  currentRequest: number;
  breakdown: {
    textGeneration: number;
    imageGeneration: number;
    embeddings: number;
  };
}

export interface OptimizationRecommendation {
  modelId: string;
  reason: string;
  estimatedSavings: number;
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

/**
 * Cost optimization service for Bedrock models
 * Monitors usage, enforces budgets, and provides cost-saving recommendations
 */
@Injectable()
export class CostOptimizationService {
  private readonly logger = new Logger(CostOptimizationService.name);
  private readonly budget: CostBudget;
  private currentUsage: CostUsage = {
    daily: 0,
    monthly: 0,
    currentRequest: 0,
    breakdown: {
      textGeneration: 0,
      imageGeneration: 0,
      embeddings: 0,
    },
  };

  constructor(
    private configService: ConfigService,
    private modelRouter: ModelRouterService,
  ) {
    this.budget = this.initializeBudget();
    this.logger.log('Cost optimization service initialized with budget limits');
  }

  /**
   * Check if request is within budget constraints
   */
  async checkBudgetConstraints(
    estimatedCost: number,
    modelType: 'text' | 'image' | 'embedding',
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check per-request limit
    if (estimatedCost > this.budget.perRequestLimit) {
      return {
        allowed: false,
        reason: `Request cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit ($${this.budget.perRequestLimit})`,
      };
    }

    // Check daily limit
    if (this.currentUsage.daily + estimatedCost > this.budget.dailyLimit) {
      return {
        allowed: false,
        reason: `Request would exceed daily budget limit ($${this.budget.dailyLimit})`,
      };
    }

    // Check monthly limit
    if (this.currentUsage.monthly + estimatedCost > this.budget.monthlyLimit) {
      return {
        allowed: false,
        reason: `Request would exceed monthly budget limit ($${this.budget.monthlyLimit})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record actual cost after request completion
   */
  async recordCost(cost: number, modelType: 'text' | 'image' | 'embedding'): Promise<void> {
    this.currentUsage.daily += cost;
    this.currentUsage.monthly += cost;
    this.currentUsage.breakdown[modelType] += cost;

    // Check alert thresholds
    await this.checkAlertThresholds();

    this.logger.debug(`Recorded cost: $${cost.toFixed(4)} for ${modelType}`);
  }

  /**
   * Get cost-optimized model recommendation
   */
  async getOptimizedModelRecommendation(
    modelType: 'text' | 'image' | 'embedding',
    quality: 'basic' | 'standard' | 'premium',
  ): Promise<OptimizationRecommendation> {
    const availableModels = await this.getAvailableModels(modelType);
    const currentModel = await this.getCurrentModel(modelType, quality);

    // Find the most cost-effective model that meets quality requirements
    const optimizedModel = availableModels
      .filter(model => this.meetsQualityRequirement(model, quality))
      .sort((a, b) => this.getCostScore(a) - this.getCostScore(b))[0];

    if (!optimizedModel || optimizedModel.id === currentModel.id) {
      return {
        modelId: currentModel.id,
        reason: 'Current model is already optimal',
        estimatedSavings: 0,
        qualityImpact: 'none',
      };
    }

    const currentCost = this.getCostScore(currentModel);
    const optimizedCost = this.getCostScore(optimizedModel);
    const savings = ((currentCost - optimizedCost) / currentCost) * 100;

    return {
      modelId: optimizedModel.id,
      reason: `Switching to ${optimizedModel.name} can reduce costs by ${savings.toFixed(1)}%`,
      estimatedSavings: savings,
      qualityImpact: this.assessQualityImpact(currentModel, optimizedModel),
    };
  }

  /**
   * Estimate cost for a request before execution
   */
  async estimateRequestCost(
    modelType: 'text' | 'image' | 'embedding',
    params: {
      inputTokens?: number;
      outputTokens?: number;
      imageCount?: number;
      width?: number;
      height?: number;
    },
  ): Promise<number> {
    let modelId: string;

    switch (modelType) {
      case 'text':
        modelId = await this.modelRouter.selectTextModel('cost');
        return this.modelRouter.calculateCost(modelId, params.inputTokens || 0, params.outputTokens || 0);
      case 'image':
        modelId = await this.modelRouter.selectImageModel('cost');
        return this.modelRouter.calculateImageCost(
          modelId,
          params.width || 1024,
          params.height || 1024,
          params.imageCount || 1,
        );
      case 'embedding':
        modelId = await this.modelRouter.selectEmbeddingModel();
        return this.modelRouter.calculateEmbeddingCost(modelId, params.inputTokens || 0);
      default:
        return 0;
    }
  }

  /**
   * Get current usage statistics
   */
  getCurrentUsage(): CostUsage {
    return { ...this.currentUsage };
  }

  /**
   * Get budget utilization percentages
   */
  getBudgetUtilization(): {
    daily: number;
    monthly: number;
    breakdown: { [key: string]: number };
  } {
    return {
      daily: (this.currentUsage.daily / this.budget.dailyLimit) * 100,
      monthly: (this.currentUsage.monthly / this.budget.monthlyLimit) * 100,
      breakdown: {
        textGeneration: (this.currentUsage.breakdown.textGeneration / this.currentUsage.monthly) * 100,
        imageGeneration: (this.currentUsage.breakdown.imageGeneration / this.currentUsage.monthly) * 100,
        embeddings: (this.currentUsage.breakdown.embeddings / this.currentUsage.monthly) * 100,
      },
    };
  }

  /**
   * Reset daily usage (should be called daily via cron)
   */
  resetDailyUsage(): void {
    this.currentUsage.daily = 0;
    this.logger.log('Daily usage reset');
  }

  /**
   * Reset monthly usage (should be called monthly via cron)
   */
  resetMonthlyUsage(): void {
    this.currentUsage.monthly = 0;
    this.currentUsage.breakdown = {
      textGeneration: 0,
      imageGeneration: 0,
      embeddings: 0,
    };
    this.logger.log('Monthly usage reset');
  }

  /**
   * Initialize budget configuration
   */
  private initializeBudget(): CostBudget {
    return {
      dailyLimit: this.configService.get<number>('DAILY_COST_LIMIT', 10.0), // $10/day default
      monthlyLimit: this.configService.get<number>('MONTHLY_COST_LIMIT', 200.0), // $200/month default
      perRequestLimit: this.configService.get<number>('PER_REQUEST_COST_LIMIT', 1.0), // $1/request default
      alertThresholds: {
        daily: this.configService.get<number>('DAILY_ALERT_THRESHOLD', 80), // 80% of daily limit
        monthly: this.configService.get<number>('MONTHLY_ALERT_THRESHOLD', 80), // 80% of monthly limit
      },
    };
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private async checkAlertThresholds(): Promise<void> {
    const utilization = this.getBudgetUtilization();

    if (utilization.daily >= this.budget.alertThresholds.daily) {
      this.logger.warn(
        `Daily cost alert: ${utilization.daily.toFixed(1)}% of budget used ($${this.currentUsage.daily.toFixed(2)}/$${this.budget.dailyLimit})`,
      );
    }

    if (utilization.monthly >= this.budget.alertThresholds.monthly) {
      this.logger.warn(
        `Monthly cost alert: ${utilization.monthly.toFixed(1)}% of budget used ($${this.currentUsage.monthly.toFixed(2)}/$${this.budget.monthlyLimit})`,
      );
    }
  }

  /**
   * Get available models for a specific type
   */
  private async getAvailableModels(modelType: 'text' | 'image' | 'embedding'): Promise<any[]> {
    // This would typically fetch from modelRouter, simplified for example
    const allModels = [
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', type: 'text', quality: 'standard', cost: 0.00025 },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', type: 'text', quality: 'premium', cost: 0.003 },
      { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', type: 'image', quality: 'premium', cost: 0.04 },
      { id: 'titan-embeddings', name: 'Titan Embeddings', type: 'embedding', quality: 'standard', cost: 0.0001 },
    ];

    return allModels.filter(model => model.type === modelType);
  }

  /**
   * Get current model for specific type and quality
   */
  private async getCurrentModel(modelType: 'text' | 'image' | 'embedding', quality: string): Promise<any> {
    const models = await this.getAvailableModels(modelType);
    return models.find(model => model.quality === quality) || models[0];
  }

  /**
   * Check if model meets quality requirement
   */
  private meetsQualityRequirement(model: any, requiredQuality: string): boolean {
    const qualityOrder = ['basic', 'standard', 'premium'];
    const modelQualityIndex = qualityOrder.indexOf(model.quality);
    const requiredQualityIndex = qualityOrder.indexOf(requiredQuality);

    return modelQualityIndex >= requiredQualityIndex;
  }

  /**
   * Get cost score for model comparison
   */
  private getCostScore(model: any): number {
    return model.cost || 0;
  }

  /**
   * Assess quality impact of switching models
   */
  private assessQualityImpact(currentModel: any, newModel: any): 'none' | 'minimal' | 'moderate' | 'significant' {
    const qualityOrder = ['basic', 'standard', 'premium'];
    const currentIndex = qualityOrder.indexOf(currentModel.quality);
    const newIndex = qualityOrder.indexOf(newModel.quality);

    const difference = currentIndex - newIndex;

    if (difference <= 0) return 'none';
    if (difference === 1) return 'minimal';
    if (difference === 2) return 'moderate';
    return 'significant';
  }
}