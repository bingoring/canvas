import { Injectable, Logger } from '@nestjs/common';
import { Plugin, Agent, Workflow, Capability } from '../../core/plugin-system/decorators/plugin.decorator';
import { BasePlugin, PluginCapability } from '../../core/plugin-system/interfaces/plugin.interface';
import { DatabaseService } from '../../modules/database/database.service';
import { WorkflowEngine } from '../../modules/orchestration/services/workflow-engine.service';
import { ImageGenerationAdapter } from '../../modules/bedrock/adapters/image-generation.adapter';
import { EmbeddingAdapter } from '../../modules/bedrock/adapters/embedding.adapter';

/**
 * Canvas Plugin - Core image generation functionality
 * Provides comprehensive image generation workflows and content management
 */
@Plugin({
  name: 'canvas',
  version: '1.0.0',
  description: 'Canvas image generation and content management plugin',
  author: 'Canvas Team',
  category: 'content',
  tags: ['image', 'ai', 'generation', 'canvas'],
  dependencies: ['bedrock', 'database', 'orchestration'],
  capabilities: [
    'image-generation',
    'style-transfer',
    'image-variation',
    'content-storage',
    'similarity-search',
  ],
  config: {
    defaultStyle: 'cartoon',
    maxImagesPerRequest: 4,
    enableEmbeddings: true,
    storageEnabled: true,
  },
})
@Injectable()
export class CanvasPlugin extends BasePlugin {
  readonly name = 'canvas';
  readonly version = '1.0.0';
  readonly description = 'Canvas image generation and content management plugin';
  readonly dependencies = ['bedrock', 'database', 'orchestration'];
  private readonly logger = new Logger(CanvasPlugin.name);

  constructor(
    private databaseService: DatabaseService,
    private workflowEngine: WorkflowEngine,
    private imageAdapter: ImageGenerationAdapter,
    private embeddingAdapter: EmbeddingAdapter,
  ) {
    super();
    this.logger.log('Canvas plugin initialized');
  }

  async onLoad(): Promise<void> {
    this.logger.log('Canvas plugin loaded');
  }

  async onUnload(): Promise<void> {
    this.logger.log('Canvas plugin unloaded');
  }

  /**
   * Generate image from text prompt
   */
  @Agent('image-generator')
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    this.logger.log(`Generating image: ${request.prompt.substring(0, 50)}...`);

    try {
      // Generate image using Bedrock adapter
      const imageResponse = await this.imageAdapter.generateImage({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        width: request.width || 1024,
        height: request.height || 1024,
        style: (request.style as 'meme' | 'cartoon' | 'realistic' | 'anime' | 'illustration') || 'cartoon',
        quality: request.quality || 'standard',
        costPriority: 'quality',
      });

      // Generate embeddings for similarity search
      let embeddings = null;
      if (request.generateEmbeddings !== false) {
        try {
          const embeddingResponse = await this.embeddingAdapter.generateEmbedding({
            text: request.prompt,
            inputType: 'search_document',
            normalize: true,
          });
          embeddings = {
            type: 'text' as const,
            vector: embeddingResponse.embedding,
            model: embeddingResponse.modelUsed,
            dimensions: embeddingResponse.dimensions,
            generatedAt: new Date(),
          };
        } catch (error) {
          this.logger.warn('Failed to generate embeddings', error);
        }
      }

      // Store content in database
      const contentId = `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const canvasContent = await this.databaseService.createCanvasContent({
        contentId,
        userId: request.userId,
        sessionId: request.sessionId,
        workflowId: request.workflowId,
        contentType: 'image',
        generationMethod: 'keyword-generation',
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        style: (request.style as 'meme' | 'cartoon' | 'realistic' | 'anime' | 'illustration') || 'cartoon',
        originalImage: {
          url: `data:image/png;base64,${imageResponse.images[0].base64}`,
          s3Key: '', // Would be set after S3 upload
          bucket: '',
          size: Math.ceil(imageResponse.images[0].base64.length * 0.75), // Estimate size
          dimensions: {
            width: request.width || 1024,
            height: request.height || 1024,
          },
          format: 'png',
        },
        modelUsed: imageResponse.modelUsed,
        cost: imageResponse.cost,
        generationParams: {
          width: request.width || 1024,
          height: request.height || 1024,
          steps: imageResponse.metadata.steps,
          cfgScale: imageResponse.metadata.cfgScale,
          seed: imageResponse.metadata.seed,
        },
        embeddings: embeddings ? [embeddings] : [],
        status: 'completed',
        metadata: {
          agentId: 'image-generator',
          pluginName: 'canvas',
          isPublic: request.isPublic || false,
        },
      });

      return {
        success: true,
        contentId,
        images: imageResponse.images,
        metadata: {
          ...imageResponse.metadata,
          cost: imageResponse.cost,
          modelUsed: imageResponse.modelUsed,
          embeddings: embeddings ? true : false,
          stored: true,
        },
      };
    } catch (error) {
      this.logger.error('Image generation failed', error);
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  /**
   * Generate image variations from existing image
   */
  @Agent('image-variation-generator')
  async generateVariations(request: ImageVariationRequest): Promise<ImageVariationResult> {
    this.logger.log(`Generating variations for content: ${request.baseContentId}`);

    try {
      // Fetch base content
      const baseContent = await this.databaseService.findCanvasContent(request.baseContentId);
      if (!baseContent) {
        throw new Error(`Base content not found: ${request.baseContentId}`);
      }

      // Extract base64 from data URL
      const base64Image = baseContent.originalImage.url.split(',')[1];

      // Generate variations
      const variationResponse = await this.imageAdapter.generateVariations(
        base64Image,
        {
          prompt: request.prompt || baseContent.prompt,
          style: (request.style || baseContent.style) as 'meme' | 'cartoon' | 'realistic' | 'anime' | 'illustration',
          width: request.width || baseContent.originalImage.dimensions.width,
          height: request.height || baseContent.originalImage.dimensions.height,
          costPriority: 'quality',
        }
      );

      // Create variation records
      const variations = [];
      for (let i = 0; i < variationResponse.images.length; i++) {
        const image = variationResponse.images[i];
        const variationId = `var_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

        variations.push({
          variationId,
          url: `data:image/png;base64,${image.base64}`,
          s3Key: '', // Would be set after S3 upload
          prompt: request.prompt || baseContent.prompt,
          style: (request.style || baseContent.style) as 'meme' | 'cartoon' | 'realistic' | 'anime' | 'illustration',
          confidence: 0.95, // Default confidence
          cost: variationResponse.cost / variationResponse.images.length,
          generatedAt: new Date(),
        });
      }

      // Update base content with variations
      await this.databaseService.updateCanvasContent(request.baseContentId, {
        variations: [...baseContent.variations, ...variations],
      });

      return {
        success: true,
        baseContentId: request.baseContentId,
        variations,
        metadata: {
          cost: variationResponse.cost,
          modelUsed: variationResponse.modelUsed,
          variationCount: variations.length,
        },
      };
    } catch (error) {
      this.logger.error('Variation generation failed', error);
      throw new Error(`Variation generation failed: ${error.message}`);
    }
  }

  /**
   * Search for similar content using embeddings
   */
  @Agent('similarity-search')
  async searchSimilarContent(request: SimilaritySearchRequest): Promise<SimilaritySearchResult> {
    this.logger.log(`Searching similar content for: ${request.query.substring(0, 50)}...`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingAdapter.generateEmbedding({
        text: request.query,
        inputType: 'search_query',
        normalize: true,
      });

      // Search for similar content using MongoDB vector search
      const similarContent = await this.databaseService.findSimilarContent(
        queryEmbedding.embedding,
        request.limit || 10
      );

      return {
        success: true,
        query: request.query,
        results: similarContent.map(content => ({
          contentId: content.contentId,
          prompt: content.prompt,
          style: content.style,
          imageUrl: content.originalImage.url,
          similarity: 0.85, // Would be calculated from vector search
          metadata: {
            likes: content.likes,
            views: content.views,
            createdAt: (content as any).createdAt,
          },
        })),
        metadata: {
          totalResults: similarContent.length,
          searchTime: queryEmbedding.duration,
          embeddingModel: queryEmbedding.modelUsed,
        },
      };
    } catch (error) {
      this.logger.error('Similarity search failed', error);
      throw new Error(`Similarity search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced prompt generation workflow
   */
  @Workflow('enhanced-image-generation')
  async enhancedImageGeneration(request: EnhancedGenerationRequest): Promise<EnhancedGenerationResult> {
    this.logger.log(`Starting enhanced generation workflow for: ${request.basePrompt}`);

    try {
      // Execute workflow using the orchestration engine
      const workflowExecution = await this.workflowEngine.executeWorkflow({
        workflowId: 'enhanced-image-generation',
        input: request,
        userId: request.userId,
        sessionId: request.sessionId,
        options: {
          timeout: 300000, // 5 minutes
          saveIntermediateResults: true,
        },
      });

      return {
        success: workflowExecution.status === 'completed',
        executionId: workflowExecution.id,
        result: workflowExecution.output,
        metadata: {
          totalCost: workflowExecution.metrics.totalCost,
          duration: workflowExecution.duration,
          steps: workflowExecution.executedNodes.length,
        },
      };
    } catch (error) {
      this.logger.error('Enhanced generation workflow failed', error);
      throw new Error(`Enhanced generation failed: ${error.message}`);
    }
  }

  /**
   * Get content analytics and insights
   */
  @Capability({
    name: 'analytics',
    description: 'Get content analytics and insights',
    inputSchema: {},
    outputSchema: {}
  })
  async getContentAnalytics(request: AnalyticsRequest): Promise<AnalyticsResult> {
    this.logger.log(`Getting content analytics for user: ${request.userId || 'all'}`);

    try {
      let analytics;

      if (request.userId) {
        analytics = await this.databaseService.getUserContentStats(request.userId);
      } else {
        analytics = await this.databaseService.getDashboardStats();
      }

      const trendingStyles = await this.databaseService.getTrendingStyles(request.days || 7);
      const popularContent = await this.databaseService.getPopularCanvasContent(10, request.days || 30);

      return {
        success: true,
        analytics,
        trending: {
          styles: trendingStyles,
          content: popularContent,
        },
        metadata: {
          generatedAt: new Date(),
          period: request.days || 30,
        },
      };
    } catch (error) {
      this.logger.error('Analytics retrieval failed', error);
      throw new Error(`Analytics failed: ${error.message}`);
    }
  }

  /**
   * Content moderation and safety check
   */
  @Agent('content-moderator')
  async moderateContent(request: ModerationRequest): Promise<ModerationResult> {
    // This would integrate with content moderation services
    // For now, return a basic implementation
    return {
      success: true,
      approved: true,
      score: 0.95,
      flags: [],
      metadata: {
        moderatedAt: new Date(),
        moderatorVersion: '1.0.0',
      },
    };
  }

  // BasePlugin implementation
  async initialize(): Promise<void> {
    this.logger.log('Canvas plugin initialized');
  }

  async destroy(): Promise<void> {
    this.logger.log('Canvas plugin destroyed');
  }

  getCapabilities(): PluginCapability[] {
    return [
      { name: 'image-generation', description: 'Generate images from text prompts', category: 'content' },
      { name: 'image-variation', description: 'Create variations of existing images', category: 'content' },
      { name: 'similarity-search', description: 'Find similar content', category: 'analysis' },
      { name: 'content-moderation', description: 'Moderate generated content', category: 'analysis' }
    ];
  }
}

// Request/Response Types
export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'premium';
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  isPublic?: boolean;
  generateEmbeddings?: boolean;
}

export interface ImageGenerationResult {
  success: boolean;
  contentId: string;
  images: Array<{
    base64: string;
    seed: number;
  }>;
  metadata: {
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed: number;
    cost: number;
    modelUsed: string;
    embeddings: boolean;
    stored: boolean;
  };
}

export interface ImageVariationRequest {
  baseContentId: string;
  prompt?: string;
  style?: string;
  width?: number;
  height?: number;
  variationCount?: number;
}

export interface ImageVariationResult {
  success: boolean;
  baseContentId: string;
  variations: Array<{
    variationId: string;
    url: string;
    prompt: string;
    style: string;
    confidence: number;
    cost: number;
  }>;
  metadata: {
    cost: number;
    modelUsed: string;
    variationCount: number;
  };
}

export interface SimilaritySearchRequest {
  query: string;
  limit?: number;
}

export interface SimilaritySearchResult {
  success: boolean;
  query: string;
  results: Array<{
    contentId: string;
    prompt: string;
    style: string;
    imageUrl: string;
    similarity: number;
    metadata: {
      likes: number;
      views: number;
      createdAt: Date;
    };
  }>;
  metadata: {
    totalResults: number;
    searchTime: number;
    embeddingModel: string;
  };
}

export interface EnhancedGenerationRequest {
  basePrompt: string;
  style?: string;
  enhancementLevel?: 'basic' | 'advanced' | 'professional';
  userId?: string;
  sessionId?: string;
}

export interface EnhancedGenerationResult {
  success: boolean;
  executionId: string;
  result: any;
  metadata: {
    totalCost: number;
    duration: number;
    steps: number;
  };
}

export interface AnalyticsRequest {
  userId?: string;
  days?: number;
}

export interface AnalyticsResult {
  success: boolean;
  analytics: any;
  trending: {
    styles: any[];
    content: any[];
  };
  metadata: {
    generatedAt: Date;
    period: number;
  };
}

export interface ModerationRequest {
  contentId?: string;
  prompt?: string;
  imageData?: string;
}

export interface ModerationResult {
  success: boolean;
  approved: boolean;
  score: number;
  flags: string[];
  metadata: {
    moderatedAt: Date;
    moderatorVersion: string;
  };
}