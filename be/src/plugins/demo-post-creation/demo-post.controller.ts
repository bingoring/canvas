import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DemoPostCreationPlugin, SocialPostRequest, TrendingPostsRequest } from './demo-post.plugin';
import { CreateSocialPostDto, GenerateTrendingPostsDto } from './dto/demo-post.dto';

/**
 * Demo Post Creation Controller - DEMO FEATURE (EASILY REMOVABLE)
 *
 * NOTE: This entire controller and its endpoints are demo features
 * that can be completely removed after demo without affecting
 * core Canvas functionality.
 */
@ApiTags('Demo - Post Creation')
@Controller('api/demo/posts')
export class DemoPostController {
  private readonly logger = new Logger(DemoPostController.name);

  constructor(private demoPostPlugin: DemoPostCreationPlugin) {}

  /**
   * Create social media post with AI-generated image and text
   * DEMO FEATURE - Can be removed after demo
   */
  @Post('create')
  @ApiOperation({
    summary: '[DEMO] Create social media post',
    description: 'DEMO FEATURE: Creates a complete social media post with AI-generated image and text. This is a demo feature that showcases Canvas integration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Social post created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            postId: { type: 'string' },
            imageContentId: { type: 'string' },
            imageUrl: { type: 'string' },
            text: { type: 'string' },
            formattedPost: { type: 'string' },
            platform: { type: 'string' },
            metadata: {
              type: 'object',
              properties: {
                totalCost: { type: 'number' },
                imageModel: { type: 'string' },
                textModel: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Post creation failed' })
  async createSocialPost(@Body() request: CreateSocialPostDto) {
    this.logger.log(`[DEMO] Creating social post: ${request.topic.substring(0, 50)}...`);

    try {
      const result = await this.demoPostPlugin.createSocialPost({
        topic: request.topic,
        platform: request.platform,
        imageStyle: request.imageStyle,
        userId: request.userId,
        sessionId: request.sessionId,
        isPublic: request.isPublic,
        includeHashtags: request.includeHashtags,
      });

      return {
        success: true,
        data: result,
        meta: {
          feature: 'DEMO',
          removable: true,
          description: 'This is a demo feature showcasing Canvas integration',
        },
      };
    } catch (error) {
      this.logger.error('[DEMO] Social post creation failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEMO_POST_CREATION_FAILED',
          meta: {
            feature: 'DEMO',
            removable: true,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate trending posts for platform
   * DEMO FEATURE - Can be removed after demo
   */
  @Post('trending')
  @ApiOperation({
    summary: '[DEMO] Generate trending posts',
    description: 'DEMO FEATURE: Generates multiple posts based on trending topics for the specified platform.',
  })
  @ApiResponse({ status: 201, description: 'Trending posts generated successfully' })
  @ApiResponse({ status: 500, description: 'Trending posts generation failed' })
  async generateTrendingPosts(@Body() request: GenerateTrendingPostsDto) {
    this.logger.log(`[DEMO] Generating trending posts for platform: ${request.platform}`);

    try {
      const result = await this.demoPostPlugin.generateTrendingPosts({
        platform: request.platform,
        count: request.count,
        userId: request.userId,
        sessionId: request.sessionId,
      });

      return {
        success: true,
        data: result,
        meta: {
          feature: 'DEMO',
          removable: true,
          description: 'Trending posts generated using demo feature',
        },
      };
    } catch (error) {
      this.logger.error('[DEMO] Trending posts generation failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEMO_TRENDING_POSTS_FAILED',
          meta: {
            feature: 'DEMO',
            removable: true,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's demo posts
   * DEMO FEATURE - Can be removed after demo
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: '[DEMO] Get user demo posts',
    description: 'DEMO FEATURE: Retrieves demo posts created by a specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User ID to get demo posts for' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of posts to return (default: 20)' })
  @ApiResponse({ status: 200, description: 'User demo posts retrieved successfully' })
  async getUserDemoPosts(
    @Param('userId') userId: string,
    @Query('limit') limit: string = '20',
  ) {
    this.logger.log(`[DEMO] Getting demo posts for user: ${userId}`);

    try {
      const posts = await this.demoPostPlugin.getUserDemoPosts(userId, parseInt(limit, 10));

      return {
        success: true,
        data: posts,
        meta: {
          feature: 'DEMO',
          removable: true,
          description: 'Demo posts data (separate from Canvas content)',
          count: posts.length,
        },
      };
    } catch (error) {
      this.logger.error('[DEMO] Failed to get user demo posts', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEMO_USER_POSTS_FAILED',
          meta: {
            feature: 'DEMO',
            removable: true,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete demo post
   * DEMO FEATURE - Can be removed after demo
   */
  @Delete(':postId')
  @ApiOperation({
    summary: '[DEMO] Delete demo post',
    description: 'DEMO FEATURE: Deletes a demo post (does not affect Canvas content).',
  })
  @ApiParam({ name: 'postId', description: 'Demo post ID to delete' })
  @ApiResponse({ status: 200, description: 'Demo post deleted successfully' })
  @ApiResponse({ status: 404, description: 'Demo post not found' })
  async deleteDemoPost(
    @Param('postId') postId: string,
    @Body() request: { userId: string },
  ) {
    this.logger.log(`[DEMO] Deleting demo post: ${postId} by user: ${request.userId}`);

    try {
      const success = await this.demoPostPlugin.deleteDemoPost(postId, request.userId);

      if (!success) {
        throw new HttpException(
          {
            success: false,
            message: 'Demo post not found or unauthorized',
            error: 'DEMO_POST_NOT_FOUND',
            meta: {
              feature: 'DEMO',
              removable: true,
            },
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'Demo post deleted successfully',
        meta: {
          feature: 'DEMO',
          removable: true,
          description: 'Demo post deleted (Canvas content unaffected)',
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('[DEMO] Failed to delete demo post', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEMO_POST_DELETE_FAILED',
          meta: {
            feature: 'DEMO',
            removable: true,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DEMO CLEANUP ENDPOINT - Remove all demo data
   * This endpoint makes it easy to clean up all demo-related data
   */
  @Delete('admin/cleanup-all')
  @ApiOperation({
    summary: '[ADMIN] Cleanup all demo data',
    description: 'ADMIN ENDPOINT: Removes all demo post data and collections. Use this when removing the demo feature.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo data cleanup completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            postsDeleted: { type: 'number' },
            collectionsRemoved: { type: 'array', items: { type: 'string' } },
          },
        },
        meta: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Cleanup failed' })
  async cleanupAllDemoData() {
    this.logger.warn('[ADMIN] CLEANING UP ALL DEMO DATA - This will remove all demo posts and collections');

    try {
      const result = await this.demoPostPlugin.cleanupAllDemoData();

      return {
        success: true,
        data: result,
        meta: {
          operation: 'DEMO_CLEANUP',
          description: 'All demo data has been removed. The demo feature can now be safely uninstalled.',
          warning: 'This operation cannot be undone',
        },
      };
    } catch (error) {
      this.logger.error('[ADMIN] Demo cleanup failed', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEMO_CLEANUP_FAILED',
          meta: {
            operation: 'DEMO_CLEANUP',
            description: 'Failed to clean up demo data',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get demo feature status and stats
   * DEMO FEATURE - Can be removed after demo
   */
  @Get('demo/status')
  @ApiOperation({
    summary: '[DEMO] Get demo feature status',
    description: 'DEMO FEATURE: Shows the current status and statistics of the demo feature.',
  })
  @ApiResponse({ status: 200, description: 'Demo status retrieved successfully' })
  async getDemoStatus() {
    this.logger.log('[DEMO] Getting demo feature status');

    try {
      // Mock demo statistics
      const demoStats = {
        isActive: true,
        version: '1.0.0',
        featuresEnabled: [
          'social-post-creation',
          'trending-post-generation',
          'multi-platform-support',
          'canvas-integration',
        ],
        platforms: ['everytime', 'instagram', 'twitter'],
        totalDemoPosts: 0, // Would be actual count in production
        lastActivity: new Date(),
        removalInstructions: {
          step1: 'Call DELETE /api/demo/posts/admin/cleanup-all to remove all demo data',
          step2: 'Remove DemoPostCreationPlugin from plugin registry',
          step3: 'Remove demo-post-creation module from imports',
          step4: 'Delete /src/plugins/demo-post-creation directory',
          note: 'Canvas core functionality will remain completely intact',
        },
      };

      return {
        success: true,
        data: demoStats,
        meta: {
          feature: 'DEMO',
          removable: true,
          description: 'Demo feature is active and ready for demonstration',
        },
      };
    } catch (error) {
      this.logger.error('[DEMO] Failed to get demo status', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEMO_STATUS_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}