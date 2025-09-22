import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CanvasService } from './canvas.service';
import {
  ImageGenerationRequest,
  ImageVariationRequest,
  SimilaritySearchRequest,
} from './canvas.plugin';

/**
 * Canvas Controller - REST API endpoints for Canvas functionality
 * Provides comprehensive image generation and content management APIs
 */
@ApiTags('Canvas')
@Controller('api/canvas')
export class CanvasController {
  private readonly logger = new Logger(CanvasController.name);

  constructor(private canvasService: CanvasService) {}

  /**
   * Generate image from text prompt
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generate image from text prompt',
    description: 'Creates a new image using AI based on the provided text prompt and style preferences',
  })
  @ApiResponse({
    status: 201,
    description: 'Image generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        contentId: { type: 'string' },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              base64: { type: 'string' },
              seed: { type: 'number' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
            cost: { type: 'number' },
            modelUsed: { type: 'string' },
            embeddings: { type: 'boolean' },
            stored: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Image generation failed' })
  async generateImage(@Body() request: CreateImageDto) {
    this.logger.log(`Generate image request: ${request.prompt.substring(0, 50)}...`);

    try {
      const result = await this.canvasService.createImage({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        style: request.style,
        width: request.width,
        height: request.height,
        quality: request.quality,
        userId: request.userId,
        sessionId: request.sessionId,
        isPublic: request.isPublic,
        generateEmbeddings: request.generateEmbeddings,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Image generation failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'IMAGE_GENERATION_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate image variations
   */
  @Post(':contentId/variations')
  @ApiOperation({
    summary: 'Generate image variations',
    description: 'Creates variations of an existing image with optional style and prompt modifications',
  })
  @ApiParam({ name: 'contentId', description: 'ID of the base content to create variations from' })
  @ApiResponse({ status: 201, description: 'Variations generated successfully' })
  @ApiResponse({ status: 404, description: 'Base content not found' })
  async generateVariations(
    @Param('contentId') contentId: string,
    @Body() request: CreateVariationsDto,
  ) {
    this.logger.log(`Generate variations for: ${contentId}`);

    try {
      const result = await this.canvasService.createVariations({
        baseContentId: contentId,
        prompt: request.prompt,
        style: request.style,
        width: request.width,
        height: request.height,
        variationCount: request.variationCount,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Variation generation failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'VARIATION_GENERATION_FAILED',
        },
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search for similar content
   */
  @Post('search/similar')
  @ApiOperation({
    summary: 'Search for similar content',
    description: 'Finds similar images based on text query using semantic search',
  })
  @ApiResponse({ status: 200, description: 'Similar content found' })
  async searchSimilar(@Body() request: SimilaritySearchDto) {
    this.logger.log(`Search similar content: ${request.query.substring(0, 50)}...`);

    try {
      const result = await this.canvasService.searchSimilar({
        query: request.query,
        limit: request.limit,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Similarity search failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'SIMILARITY_SEARCH_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's canvas content
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user content',
    description: 'Retrieves paginated list of content created by a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID to get content for' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'User content retrieved successfully' })
  async getUserContent(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.logger.log(`Get user content: ${userId}, page: ${page}`);

    try {
      const result = await this.canvasService.getUserContent(
        userId,
        parseInt(page, 10),
        parseInt(limit, 10),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to get user content', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'USER_CONTENT_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get public content
   */
  @Get('public')
  @ApiOperation({
    summary: 'Get public content',
    description: 'Retrieves paginated list of public content',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Public content retrieved successfully' })
  async getPublicContent(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.logger.log(`Get public content: page: ${page}`);

    try {
      const result = await this.canvasService.getPublicContent(
        parseInt(page, 10),
        parseInt(limit, 10),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to get public content', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'PUBLIC_CONTENT_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get popular content
   */
  @Get('popular')
  @ApiOperation({
    summary: 'Get popular content',
    description: 'Retrieves most popular content based on likes and views',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items to return (default: 10)' })
  @ApiQuery({ name: 'days', required: false, description: 'Time period in days (default: 30)' })
  @ApiResponse({ status: 200, description: 'Popular content retrieved successfully' })
  async getPopularContent(
    @Query('limit') limit: string = '10',
    @Query('days') days: string = '30',
  ) {
    this.logger.log(`Get popular content: limit: ${limit}, days: ${days}`);

    try {
      const result = await this.canvasService.getPopularContent(
        parseInt(limit, 10),
        parseInt(days, 10),
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to get popular content', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'POPULAR_CONTENT_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search content by text
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search content',
    description: 'Searches content using text-based queries',
  })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (default: 20)' })
  @ApiResponse({ status: 200, description: 'Search completed successfully' })
  async searchContent(
    @Query('q') query: string,
    @Query('limit') limit: string = '20',
  ) {
    this.logger.log(`Search content: ${query.substring(0, 50)}...`);

    if (!query || query.trim().length === 0) {
      throw new HttpException(
        {
          success: false,
          message: 'Search query is required',
          error: 'MISSING_QUERY',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.canvasService.searchContent(query, parseInt(limit, 10));

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Content search failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'CONTENT_SEARCH_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get content details
   */
  @Get(':contentId')
  @ApiOperation({
    summary: 'Get content details',
    description: 'Retrieves detailed information about a specific content item',
  })
  @ApiParam({ name: 'contentId', description: 'Content ID to retrieve' })
  @ApiResponse({ status: 200, description: 'Content details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getContentDetails(@Param('contentId') contentId: string) {
    this.logger.log(`Get content details: ${contentId}`);

    try {
      const result = await this.canvasService.getContentById(contentId);

      if (!result) {
        throw new HttpException(
          {
            success: false,
            message: 'Content not found',
            error: 'CONTENT_NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Failed to get content details', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'CONTENT_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Like content
   */
  @Put(':contentId/like')
  @ApiOperation({
    summary: 'Like content',
    description: 'Adds a like to the specified content',
  })
  @ApiParam({ name: 'contentId', description: 'Content ID to like' })
  @ApiResponse({ status: 200, description: 'Content liked successfully' })
  async likeContent(
    @Param('contentId') contentId: string,
    @Body() request: { userId: string },
  ) {
    this.logger.log(`Like content: ${contentId} by user: ${request.userId}`);

    try {
      await this.canvasService.likeContent(contentId, request.userId);

      return {
        success: true,
        message: 'Content liked successfully',
      };
    } catch (error) {
      this.logger.error('Failed to like content', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'LIKE_FAILED',
        },
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Download content
   */
  @Put(':contentId/download')
  @ApiOperation({
    summary: 'Download content',
    description: 'Records a download event for the specified content',
  })
  @ApiParam({ name: 'contentId', description: 'Content ID to download' })
  @ApiResponse({ status: 200, description: 'Download recorded successfully' })
  async downloadContent(
    @Param('contentId') contentId: string,
    @Body() request: { userId: string },
  ) {
    this.logger.log(`Download content: ${contentId} by user: ${request.userId}`);

    try {
      await this.canvasService.downloadContent(contentId, request.userId);

      return {
        success: true,
        message: 'Download recorded successfully',
      };
    } catch (error) {
      this.logger.error('Failed to record download', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DOWNLOAD_FAILED',
        },
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete content
   */
  @Delete(':contentId')
  @ApiOperation({
    summary: 'Delete content',
    description: 'Soft deletes the specified content (user must be owner)',
  })
  @ApiParam({ name: 'contentId', description: 'Content ID to delete' })
  @ApiResponse({ status: 200, description: 'Content deleted successfully' })
  @ApiResponse({ status: 403, description: 'Unauthorized to delete content' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async deleteContent(
    @Param('contentId') contentId: string,
    @Body() request: { userId: string },
  ) {
    this.logger.log(`Delete content: ${contentId} by user: ${request.userId}`);

    try {
      await this.canvasService.deleteContent(contentId, request.userId);

      return {
        success: true,
        message: 'Content deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete content', error);

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (error.message.includes('not found')) {
        status = HttpStatus.NOT_FOUND;
      } else if (error.message.includes('Unauthorized')) {
        status = HttpStatus.FORBIDDEN;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DELETE_FAILED',
        },
        status,
      );
    }
  }

  /**
   * Get analytics
   */
  @Get('analytics/overview')
  @ApiOperation({
    summary: 'Get analytics overview',
    description: 'Retrieves analytics data for content and usage metrics',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter analytics by user ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Time period in days (default: 30)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Query('userId') userId?: string,
    @Query('days') days: string = '30',
  ) {
    this.logger.log(`Get analytics: userId: ${userId}, days: ${days}`);

    try {
      const result = await this.canvasService.getAnalytics({
        userId,
        days: parseInt(days, 10),
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to get analytics', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'ANALYTICS_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get trending styles
   */
  @Get('analytics/trending-styles')
  @ApiOperation({
    summary: 'Get trending styles',
    description: 'Retrieves trending artistic styles based on recent usage',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Time period in days (default: 7)' })
  @ApiResponse({ status: 200, description: 'Trending styles retrieved successfully' })
  async getTrendingStyles(@Query('days') days: string = '7') {
    this.logger.log(`Get trending styles: days: ${days}`);

    try {
      const result = await this.canvasService.getTrendingStyles(parseInt(days, 10));

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to get trending styles', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'TRENDING_STYLES_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

// DTOs for request validation
export class CreateImageDto {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'premium';
  userId?: string;
  sessionId?: string;
  isPublic?: boolean;
  generateEmbeddings?: boolean;
}

export class CreateVariationsDto {
  prompt?: string;
  style?: string;
  width?: number;
  height?: number;
  variationCount?: number;
}

export class SimilaritySearchDto {
  query: string;
  limit?: number;
}