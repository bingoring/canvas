import { Injectable, Logger } from '@nestjs/common';
import { CanvasPlugin } from './canvas.plugin';
import { DatabaseService } from '../../modules/database/database.service';
import { TextGenerationAdapter, TextGenerationRequest, TextGenerationResponse } from '../../modules/bedrock/adapters/text-generation.adapter';
import {
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageVariationRequest,
  ImageVariationResult,
  SimilaritySearchRequest,
  SimilaritySearchResult,
  AnalyticsRequest,
  AnalyticsResult,
} from './canvas.plugin';

export interface CanvasContentResponse {
  contentId: string;
  prompt: string;
  style: string;
  imageUrl: string;
  thumbnailUrl?: string;
  metadata: {
    width: number;
    height: number;
    cost: number;
    modelUsed: string;
    createdAt: Date;
    likes: number;
    views: number;
    downloads: number;
    isPublic: boolean;
    isFeatured: boolean;
  };
  variations?: Array<{
    variationId: string;
    url: string;
    style: string;
  }>;
}

export interface ContentListResponse {
  content: CanvasContentResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TextGenerationServiceRequest {
  prompt: string;
  userId?: string;
  sessionId?: string;
  maxLength?: number;
  temperature?: number;
}

export interface TextGenerationServiceResult {
  text: string;
  metadata: {
    cost: number;
    modelUsed: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    createdAt: Date;
  };
}

/**
 * Canvas Service - Business logic layer for Canvas functionality
 * Provides high-level operations for image generation and content management
 */
@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    private canvasPlugin: CanvasPlugin,
    private databaseService: DatabaseService,
    private textGenerationAdapter: TextGenerationAdapter,
  ) {
    this.logger.log('Canvas service initialized');
  }

  /**
   * Generate image with automatic content management
   */
  async createImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    this.logger.log(`Creating image: ${request.prompt.substring(0, 50)}...`);

    try {
      // Validate request
      this.validateImageRequest(request);

      // Generate image using plugin
      const result = await this.canvasPlugin.generateImage(request);

      // Log generation for analytics
      await this.logImageGeneration(request, result);

      return result;
    } catch (error) {
      this.logger.error('Image creation failed', error);
      throw error;
    }
  }

  /**
   * Generate text response with automatic content management
   */
  async createText(request: TextGenerationServiceRequest): Promise<TextGenerationServiceResult> {
    this.logger.log(`Creating text response: ${request.prompt.substring(0, 50)}...`);

    try {
      // Generate text using text generation adapter
      const result = await this.textGenerationAdapter.generateText({
        prompt: request.prompt,
        maxTokens: request.maxLength,
        temperature: request.temperature || 0.7,
        costPriority: 'cost',
      });

      // Format response
      const textResult: TextGenerationServiceResult = {
        text: result.text,
        metadata: {
          cost: result.cost,
          modelUsed: result.modelUsed,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          duration: result.duration,
          createdAt: new Date(),
        },
      };

      // Log generation for analytics
      await this.logTextGeneration(request, textResult);

      return textResult;
    } catch (error) {
      this.logger.error('Text creation failed', error);
      throw error;
    }
  }

  /**
   * Create image variations
   */
  async createVariations(request: ImageVariationRequest): Promise<ImageVariationResult> {
    this.logger.log(`Creating variations for: ${request.baseContentId}`);

    try {
      // Check if base content exists and user has access
      await this.validateContentAccess(request.baseContentId);

      // Generate variations using plugin
      const result = await this.canvasPlugin.generateVariations(request);

      return result;
    } catch (error) {
      this.logger.error('Variation creation failed', error);
      throw error;
    }
  }

  /**
   * Search for similar content
   */
  async searchSimilar(request: SimilaritySearchRequest): Promise<SimilaritySearchResult> {
    this.logger.log(`Searching similar content: ${request.query.substring(0, 50)}...`);

    try {
      const result = await this.canvasPlugin.searchSimilarContent(request);
      return result;
    } catch (error) {
      this.logger.error('Similarity search failed', error);
      throw error;
    }
  }

  /**
   * Get user's canvas content with pagination
   */
  async getUserContent(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ContentListResponse> {
    this.logger.log(`Getting user content: ${userId}, page: ${page}`);

    try {
      const offset = (page - 1) * limit;
      const content = await this.databaseService.findUserCanvasContent(userId, limit + 1);

      const hasMore = content.length > limit;
      const results = hasMore ? content.slice(0, limit) : content;

      return {
        content: results.map(item => this.formatContentResponse(item)),
        total: results.length, // This would need a separate count query in production
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Failed to get user content', error);
      throw error;
    }
  }

  /**
   * Get public canvas content with pagination
   */
  async getPublicContent(
    page: number = 1,
    limit: number = 20,
  ): Promise<ContentListResponse> {
    this.logger.log(`Getting public content: page: ${page}`);

    try {
      const content = await this.databaseService.findPublicCanvasContent(limit + 1);

      const hasMore = content.length > limit;
      const results = hasMore ? content.slice(0, limit) : content;

      return {
        content: results.map(item => this.formatContentResponse(item)),
        total: results.length,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Failed to get public content', error);
      throw error;
    }
  }

  /**
   * Get popular content
   */
  async getPopularContent(
    limit: number = 10,
    days: number = 30,
  ): Promise<CanvasContentResponse[]> {
    this.logger.log(`Getting popular content: limit: ${limit}, days: ${days}`);

    try {
      const content = await this.databaseService.getPopularCanvasContent(limit, days);
      return content.map(item => this.formatContentResponse(item));
    } catch (error) {
      this.logger.error('Failed to get popular content', error);
      throw error;
    }
  }

  /**
   * Search content by text
   */
  async searchContent(
    query: string,
    limit: number = 20,
  ): Promise<CanvasContentResponse[]> {
    this.logger.log(`Searching content: ${query.substring(0, 50)}...`);

    try {
      const content = await this.databaseService.searchCanvasContent(query, limit);
      return content.map(item => this.formatContentResponse(item));
    } catch (error) {
      this.logger.error('Content search failed', error);
      throw error;
    }
  }

  /**
   * Get content details by ID
   */
  async getContentById(contentId: string): Promise<CanvasContentResponse | null> {
    this.logger.log(`Getting content: ${contentId}`);

    try {
      const content = await this.databaseService.findCanvasContent(contentId);
      if (!content) {
        return null;
      }

      // Increment view count
      await content.addView();

      return this.formatContentResponse(content);
    } catch (error) {
      this.logger.error('Failed to get content', error);
      throw error;
    }
  }

  /**
   * Like content
   */
  async likeContent(contentId: string, userId: string): Promise<boolean> {
    this.logger.log(`Liking content: ${contentId} by user: ${userId}`);

    try {
      const content = await this.databaseService.findCanvasContent(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      await content.addLike();
      return true;
    } catch (error) {
      this.logger.error('Failed to like content', error);
      throw error;
    }
  }

  /**
   * Download content (increment download count)
   */
  async downloadContent(contentId: string, userId: string): Promise<boolean> {
    this.logger.log(`Downloading content: ${contentId} by user: ${userId}`);

    try {
      const content = await this.databaseService.findCanvasContent(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      await content.addDownload();
      return true;
    } catch (error) {
      this.logger.error('Failed to download content', error);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(request: AnalyticsRequest): Promise<AnalyticsResult> {
    this.logger.log(`Getting analytics: ${JSON.stringify(request)}`);

    try {
      return await this.canvasPlugin.getContentAnalytics(request);
    } catch (error) {
      this.logger.error('Analytics retrieval failed', error);
      throw error;
    }
  }

  /**
   * Get trending styles
   */
  async getTrendingStyles(days: number = 7): Promise<any[]> {
    this.logger.log(`Getting trending styles: ${days} days`);

    try {
      return await this.databaseService.getTrendingStyles(days);
    } catch (error) {
      this.logger.error('Failed to get trending styles', error);
      throw error;
    }
  }

  /**
   * Delete content (soft delete)
   */
  async deleteContent(contentId: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting content: ${contentId} by user: ${userId}`);

    try {
      const content = await this.databaseService.findCanvasContent(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      // Check if user owns the content
      if (content.userId !== userId) {
        throw new Error('Unauthorized to delete this content');
      }

      await content.softDelete();
      return true;
    } catch (error) {
      this.logger.error('Failed to delete content', error);
      throw error;
    }
  }

  /**
   * Validate image generation request
   */
  private validateImageRequest(request: ImageGenerationRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    if (request.prompt.length > 1000) {
      throw new Error('Prompt too long (max 1000 characters)');
    }

    if (request.width && (request.width < 256 || request.width > 2048)) {
      throw new Error('Width must be between 256 and 2048 pixels');
    }

    if (request.height && (request.height < 256 || request.height > 2048)) {
      throw new Error('Height must be between 256 and 2048 pixels');
    }

    const allowedStyles = ['cartoon', 'realistic', 'anime', 'meme', 'illustration'];
    if (request.style && !allowedStyles.includes(request.style)) {
      throw new Error(`Style must be one of: ${allowedStyles.join(', ')}`);
    }
  }

  /**
   * Validate content access
   */
  private async validateContentAccess(contentId: string): Promise<void> {
    const content = await this.databaseService.findCanvasContent(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    if (content.status === 'deleted') {
      throw new Error('Content has been deleted');
    }

    if (content.status !== 'completed') {
      throw new Error('Content is not ready for variations');
    }
  }

  /**
   * Format content for API response
   */
  private formatContentResponse(content: any): CanvasContentResponse {
    return {
      contentId: content.contentId,
      prompt: content.prompt,
      style: content.style,
      imageUrl: content.originalImage.url,
      thumbnailUrl: content.thumbnailImage?.url,
      metadata: {
        width: content.originalImage.dimensions.width,
        height: content.originalImage.dimensions.height,
        cost: content.cost,
        modelUsed: content.modelUsed,
        createdAt: content.createdAt,
        likes: content.likes,
        views: content.views,
        downloads: content.downloads,
        isPublic: content.isPublic,
        isFeatured: content.isFeatured,
      },
      variations: content.variations?.map(v => ({
        variationId: v.variationId,
        url: v.url,
        style: v.style,
      })),
    };
  }

  /**
   * Log image generation for analytics
   */
  private async logImageGeneration(
    request: ImageGenerationRequest,
    result: ImageGenerationResult,
  ): Promise<void> {
    // This would typically log to analytics service
    this.logger.debug('Image generation logged', {
      userId: request.userId,
      style: request.style,
      cost: result.metadata.cost,
      modelUsed: result.metadata.modelUsed,
    });
  }

  /**
   * Log text generation for analytics
   */
  private async logTextGeneration(
    request: TextGenerationServiceRequest,
    result: TextGenerationServiceResult,
  ): Promise<void> {
    // This would typically log to analytics service
    this.logger.debug('Text generation logged', {
      userId: request.userId,
      sessionId: request.sessionId,
      promptLength: request.prompt.length,
      responseLength: result.text.length,
      cost: result.metadata.cost,
      modelUsed: result.metadata.modelUsed,
      inputTokens: result.metadata.inputTokens,
      outputTokens: result.metadata.outputTokens,
    });
  }
}