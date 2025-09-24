import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ModelConfig {
  id: string;
  name: string;
  type: 'text' | 'image' | 'embedding';
  costPer1KTokens?: number;
  costPerImage?: number;
  costPer1KEmbeddings?: number;
  maxTokens?: number;
  capabilities: string[];
  availability: 'high' | 'medium' | 'low';
  latency: 'low' | 'medium' | 'high';
  quality: 'basic' | 'standard' | 'premium';
}

/**
 * Model router service for intelligent model selection
 * Optimized for Korea region with cost-first approach
 */
@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger(ModelRouterService.name);
  private readonly models: ModelConfig[] = [];

  constructor(private configService: ConfigService) {
    this.initializeModels();
  }

  /**
   * Select optimal text generation model
   */
  async selectTextModel(priority: 'cost' | 'quality' | 'speed' = 'cost'): Promise<string> {
    const textModels = this.models.filter(m => m.type === 'text');

    switch (priority) {
      case 'cost':
        return this.selectByCost(textModels);
      case 'quality':
        return this.selectByQuality(textModels);
      case 'speed':
        return this.selectBySpeed(textModels);
      default:
        return this.selectByCost(textModels);
    }
  }

  /**
   * Select optimal image generation model
   */
  async selectImageModel(priority: 'cost' | 'quality' | 'speed' = 'quality'): Promise<string> {
    const imageModels = this.models.filter(m => m.type === 'image');

    switch (priority) {
      case 'cost':
        return this.selectByCost(imageModels);
      case 'quality':
        return this.selectByQuality(imageModels);
      case 'speed':
        return this.selectBySpeed(imageModels);
      default:
        return this.selectByQuality(imageModels);
    }
  }

  /**
   * Select optimal embedding model
   */
  async selectEmbeddingModel(): Promise<string> {
    const embeddingModels = this.models.filter(m => m.type === 'embedding');
    return this.selectByCost(embeddingModels);
  }

  /**
   * Get fallback chain for text models
   */
  async getTextModelChain(priority: 'cost' | 'quality' | 'speed' = 'cost'): Promise<string[]> {
    const textModels = this.models.filter(m => m.type === 'text');

    switch (priority) {
      case 'cost':
        return textModels
          .sort((a, b) => (a.costPer1KTokens || 0) - (b.costPer1KTokens || 0))
          .map(m => m.id);
      case 'quality':
        return textModels
          .sort((a, b) => this.getQualityScore(b) - this.getQualityScore(a))
          .map(m => m.id);
      case 'speed':
        return textModels
          .sort((a, b) => this.getSpeedScore(b) - this.getSpeedScore(a))
          .map(m => m.id);
      default:
        return textModels.map(m => m.id);
    }
  }

  /**
   * Get fallback chain for image models
   */
  async getImageModelChain(priority: 'cost' | 'quality' | 'speed' = 'quality'): Promise<string[]> {
    const imageModels = this.models.filter(m => m.type === 'image');

    switch (priority) {
      case 'cost':
        return imageModels
          .sort((a, b) => (a.costPerImage || 0) - (b.costPerImage || 0))
          .map(m => m.id);
      case 'quality':
        return imageModels
          .sort((a, b) => this.getQualityScore(b) - this.getQualityScore(a))
          .map(m => m.id);
      case 'speed':
        return imageModels
          .sort((a, b) => this.getSpeedScore(b) - this.getSpeedScore(a))
          .map(m => m.id);
      default:
        return imageModels.map(m => m.id);
    }
  }

  /**
   * Calculate cost for text generation
   */
  async calculateCost(modelId: string, inputTokens: number, outputTokens: number): Promise<number> {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.costPer1KTokens) {
      return 0;
    }

    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * model.costPer1KTokens;
  }

  /**
   * Calculate cost for image generation
   */
  async calculateImageCost(
    modelId: string,
    width: number,
    height: number,
    imageCount: number,
  ): Promise<number> {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.costPerImage) {
      return 0;
    }

    // Adjust cost based on image size
    const baseSize = 1024 * 1024; // 1024x1024 baseline
    const actualSize = width * height;
    const sizeMultiplier = actualSize / baseSize;

    return model.costPerImage * sizeMultiplier * imageCount;
  }

  /**
   * Calculate cost for embeddings
   */
  async calculateEmbeddingCost(modelId: string, inputTokens: number): Promise<number> {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.costPer1KEmbeddings) {
      return 0;
    }

    return (inputTokens / 1000) * model.costPer1KEmbeddings;
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelId: string): ModelConfig | undefined {
    return this.models.find(m => m.id === modelId);
  }

  /**
   * Check model availability
   */
  async checkModelAvailability(modelId: string): Promise<boolean> {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.availability !== 'low' : false;
  }

  /**
   * Initialize model configurations for Korea region
   */
  private initializeModels(): void {
    // Text Generation Models (Cost-optimized for Korea)
    this.models.push(
      {
        id: 'anthropic.claude-3-haiku-20240307-v1:0',
        name: 'Claude 3 Haiku',
        type: 'text',
        costPer1KTokens: 0.00025, // $0.25 per 1M tokens
        maxTokens: 200000,
        capabilities: ['text-generation', 'analysis', 'code'],
        availability: 'high',
        latency: 'low',
        quality: 'standard',
      },
      {
        id: 'anthropic.claude-3-sonnet-20240229-v1:0',
        name: 'Claude 3 Sonnet',
        type: 'text',
        costPer1KTokens: 0.003, // $3 per 1M tokens
        maxTokens: 200000,
        capabilities: ['text-generation', 'analysis', 'code', 'reasoning'],
        availability: 'high',
        latency: 'medium',
        quality: 'premium',
      },
      {
        id: 'anthropic.claude-3-opus-20240229-v1:0',
        name: 'Claude 3 Opus',
        type: 'text',
        costPer1KTokens: 0.015, // $15 per 1M tokens
        maxTokens: 200000,
        capabilities: ['text-generation', 'analysis', 'code', 'reasoning', 'creative'],
        availability: 'medium',
        latency: 'high',
        quality: 'premium',
      },
      {
        id: 'meta.llama3-70b-instruct-v1:0',
        name: 'Llama 3 70B Instruct',
        type: 'text',
        costPer1KTokens: 0.00265, // $2.65 per 1M tokens
        maxTokens: 8192,
        capabilities: ['text-generation', 'instruction-following'],
        availability: 'high',
        latency: 'medium',
        quality: 'standard',
      },
    );

    // Image Generation Models
    this.models.push(
      {
        id: 'stability.stable-diffusion-xl-v1',
        name: 'Stable Diffusion XL',
        type: 'image',
        costPerImage: 0.04, // $0.04 per image (1024x1024)
        capabilities: ['text-to-image', 'image-variation'],
        availability: 'high',
        latency: 'medium',
        quality: 'premium',
      },
      {
        id: 'amazon.titan-image-generator-v1',
        name: 'Titan Image Generator',
        type: 'image',
        costPerImage: 0.05, // $0.05 per image (1024x1024)
        capabilities: ['text-to-image', 'image-variation', 'inpainting'],
        availability: 'high',
        latency: 'low',
        quality: 'standard',
      },
      {
        id: 'amazon.nova-canvas-v1:0',
        name: 'Nova Canvas',
        type: 'image',
        costPerImage: 0.008, // Estimated cost - verify with AWS pricing
        capabilities: ['text-to-image'], // Primary capability confirmed
        availability: 'high',
        latency: 'medium', // Estimated - verify with actual performance
        quality: 'premium',
      },
    );

    // Embedding Models
    this.models.push(
      {
        id: 'amazon.titan-embed-text-v1',
        name: 'Titan Embeddings Text',
        type: 'embedding',
        costPer1KEmbeddings: 0.0001, // $0.1 per 1M tokens
        capabilities: ['text-embedding', 'similarity-search'],
        availability: 'high',
        latency: 'low',
        quality: 'standard',
      },
      {
        id: 'cohere.embed-multilingual-v3',
        name: 'Cohere Multilingual Embeddings',
        type: 'embedding',
        costPer1KEmbeddings: 0.0001, // $0.1 per 1M tokens
        capabilities: ['text-embedding', 'multilingual', 'similarity-search'],
        availability: 'high',
        latency: 'low',
        quality: 'premium',
      },
    );

    this.logger.log(`Initialized ${this.models.length} model configurations for Korea region`);
  }

  /**
   * Select model by cost (lowest first)
   */
  private selectByCost(models: ModelConfig[]): string {
    const sorted = models
      .filter(m => m.availability !== 'low')
      .sort((a, b) => {
        const costA = a.costPer1KTokens || a.costPerImage || a.costPer1KEmbeddings || 0;
        const costB = b.costPer1KTokens || b.costPerImage || b.costPer1KEmbeddings || 0;
        return costA - costB;
      });

    return sorted[0]?.id || models[0]?.id;
  }

  /**
   * Select model by quality (highest first)
   */
  private selectByQuality(models: ModelConfig[]): string {
    const sorted = models
      .filter(m => m.availability !== 'low')
      .sort((a, b) => this.getQualityScore(b) - this.getQualityScore(a));

    return sorted[0]?.id || models[0]?.id;
  }

  /**
   * Select model by speed (fastest first)
   */
  private selectBySpeed(models: ModelConfig[]): string {
    const sorted = models
      .filter(m => m.availability !== 'low')
      .sort((a, b) => this.getSpeedScore(b) - this.getSpeedScore(a));

    return sorted[0]?.id || models[0]?.id;
  }

  /**
   * Get quality score for ranking
   */
  private getQualityScore(model: ModelConfig): number {
    const qualityScores = { basic: 1, standard: 2, premium: 3 };
    const availabilityScores = { low: 0, medium: 1, high: 2 };

    return qualityScores[model.quality] + availabilityScores[model.availability];
  }

  /**
   * Get speed score for ranking
   */
  private getSpeedScore(model: ModelConfig): number {
    const latencyScores = { high: 1, medium: 2, low: 3 };
    const availabilityScores = { low: 0, medium: 1, high: 2 };

    return latencyScores[model.latency] + availabilityScores[model.availability];
  }
}
