import { Injectable, Logger } from '@nestjs/common';
import { Plugin, Agent, Workflow } from '../../core/plugin-system/decorators/plugin.decorator';
import { BasePlugin, PluginCapability } from '../../core/plugin-system/interfaces/plugin.interface';
import { DatabaseService } from '../../modules/database/database.service';
import { TextGenerationAdapter } from '../../modules/bedrock/adapters/text-generation.adapter';
import { ImageGenerationAdapter } from '../../modules/bedrock/adapters/image-generation.adapter';
import { CanvasService } from '../canvas/canvas.service';

/**
 * Demo Post Creation Plugin - Easily removable demo feature
 * Creates social media posts combining Canvas images with AI-generated text
 *
 * NOTE: This is a DEMO FEATURE that can be completely removed after demo
 * without affecting core Canvas functionality
 */
@Plugin({
  name: 'demo-post-creation',
  version: '1.0.0',
  description: 'Demo plugin for creating social media posts with Canvas integration',
  author: 'Demo Team',
  category: 'content',
  tags: ['demo', 'post', 'social-media', 'everytime'],
  dependencies: ['canvas', 'bedrock', 'database'],
  capabilities: [
    'post-generation',
    'content-combination',
    'social-media-formatting',
  ],
  config: {
    isDemo: true,
    removable: true,
    platforms: ['everytime', 'instagram', 'twitter'],
    maxPostLength: 500,
  },
})
@Injectable()
export class DemoPostCreationPlugin extends BasePlugin {
  readonly name = 'demo-post-creation';
  readonly version = '1.0.0';
  readonly description = 'Demo plugin for creating social media posts with Canvas integration';
  readonly dependencies = ['canvas', 'bedrock', 'database'];
  private readonly logger = new Logger(DemoPostCreationPlugin.name);

  constructor(
    private databaseService: DatabaseService,
    private textAdapter: TextGenerationAdapter,
    private imageAdapter: ImageGenerationAdapter,
    private canvasService: CanvasService,
  ) {
    super();
    this.logger.log('Demo Post Creation plugin initialized (DEMO FEATURE)');
  }

  async onLoad(): Promise<void> {
    this.logger.log('Demo Post Creation plugin loaded (REMOVABLE)');
  }

  async onUnload(): Promise<void> {
    this.logger.log('Demo Post Creation plugin unloaded');
  }

  /**
   * Create a complete social media post with image and text
   */
  @Workflow('create-social-post')
  async createSocialPost(request: SocialPostRequest): Promise<SocialPostResult> {
    this.logger.log(`Creating social post: ${request.topic.substring(0, 50)}...`);

    try {
      // Step 1: Generate image using Canvas
      const imageResult = await this.canvasService.createImage({
        prompt: this.enhancePromptForSocialMedia(request.topic, request.platform),
        style: request.imageStyle || 'meme',
        width: this.getOptimalImageSize(request.platform).width,
        height: this.getOptimalImageSize(request.platform).height,
        quality: 'standard',
        userId: request.userId,
        sessionId: request.sessionId,
        isPublic: request.isPublic,
        generateEmbeddings: false, // Not needed for demo posts
      });

      // Step 2: Generate text content
      const textResult = await this.generatePostText(request);

      // Step 3: Combine into formatted post
      const formattedPost = this.formatPostForPlatform(
        textResult.text,
        imageResult.contentId,
        request.platform,
      );

      // Step 4: Store demo post (separate from Canvas content)
      const postId = await this.storeDemoPost({
        ...request,
        imageContentId: imageResult.contentId,
        generatedText: textResult.text,
        formattedPost,
        totalCost: imageResult.metadata.cost + textResult.cost,
      });

      return {
        success: true,
        postId,
        imageContentId: imageResult.contentId,
        imageUrl: imageResult.images[0] ? `data:image/png;base64,${imageResult.images[0].base64}` : '',
        text: textResult.text,
        formattedPost,
        platform: request.platform,
        metadata: {
          totalCost: imageResult.metadata.cost + textResult.cost,
          imageModel: imageResult.metadata.modelUsed,
          textModel: textResult.modelUsed,
          createdAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Social post creation failed', error);
      throw new Error(`Social post creation failed: ${error.message}`);
    }
  }

  /**
   * Generate trending post suggestions
   */
  @Agent('trending-post-generator')
  async generateTrendingPosts(request: TrendingPostsRequest): Promise<TrendingPostsResult> {
    this.logger.log(`Generating trending posts for platform: ${request.platform}`);

    try {
      // Get trending topics (mock data for demo)
      const trendingTopics = await this.getTrendingTopics(request.platform);

      // Generate posts for trending topics
      const posts = [];
      for (const topic of trendingTopics.slice(0, request.count || 5)) {
        try {
          const post = await this.createSocialPost({
            topic: topic.name,
            platform: request.platform,
            userId: request.userId,
            sessionId: request.sessionId,
            imageStyle: 'meme',
            isPublic: false,
            includeHashtags: true,
          });
          posts.push(post);
        } catch (error) {
          this.logger.warn(`Failed to generate post for topic: ${topic.name}`, error);
        }
      }

      return {
        success: true,
        posts,
        trendingTopics,
        metadata: {
          platform: request.platform,
          generatedCount: posts.length,
          requestedCount: request.count || 5,
        },
      };
    } catch (error) {
      this.logger.error('Trending posts generation failed', error);
      throw new Error(`Trending posts generation failed: ${error.message}`);
    }
  }

  /**
   * Get user's demo posts
   */
  async getUserDemoPosts(userId: string, limit: number = 20): Promise<DemoPost[]> {
    this.logger.log(`Getting demo posts for user: ${userId}`);

    try {
      // Query demo posts from database
      // Note: This would use a separate collection/table for demo posts
      const posts = await this.queryDemoPostsFromDB(userId, limit);
      return posts;
    } catch (error) {
      this.logger.error('Failed to get user demo posts', error);
      throw error;
    }
  }

  /**
   * Delete demo post
   */
  async deleteDemoPost(postId: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting demo post: ${postId} by user: ${userId}`);

    try {
      // Delete from demo posts collection (does not affect Canvas content)
      const success = await this.deleteDemoPostFromDB(postId, userId);
      return success;
    } catch (error) {
      this.logger.error('Failed to delete demo post', error);
      throw error;
    }
  }

  /**
   * DEMO CLEANUP: Remove all demo data
   * This method makes it easy to clean up all demo-related data
   */
  async cleanupAllDemoData(): Promise<{
    postsDeleted: number;
    collectionsRemoved: string[];
    success: boolean;
  }> {
    this.logger.log('CLEANING UP ALL DEMO DATA (Demo plugin removal)');

    try {
      // Count demo posts before deletion
      const postCount = await this.countDemoPostsInDB();

      // Delete all demo posts
      await this.deleteAllDemoPostsFromDB();

      // Remove demo-specific database collections/indexes
      const collectionsRemoved = await this.removeDemoCollections();

      this.logger.log(`Demo cleanup completed: ${postCount} posts deleted, ${collectionsRemoved.length} collections removed`);

      return {
        postsDeleted: postCount,
        collectionsRemoved,
        success: true,
      };
    } catch (error) {
      this.logger.error('Demo cleanup failed', error);
      throw error;
    }
  }

  /**
   * Generate text content for social media post
   */
  private async generatePostText(request: SocialPostRequest): Promise<{ text: string; cost: number; modelUsed: string }> {
    const platform = request.platform;
    const maxLength = this.getMaxTextLength(platform);

    let prompt = `Create a ${platform} post about "${request.topic}".`;

    // Platform-specific prompting
    switch (platform) {
      case 'everytime':
        prompt += ' Write in Korean university student style, casual and relatable. Include relevant topics for college students.';
        break;
      case 'instagram':
        prompt += ' Write engaging, visual-focused content with emojis.';
        break;
      case 'twitter':
        prompt += ' Write concise, engaging content that encourages retweets.';
        break;
    }

    if (request.includeHashtags) {
      prompt += ' Include 3-5 relevant hashtags.';
    }

    prompt += ` Keep it under ${maxLength} characters.`;

    const response = await this.textAdapter.generateText({
      prompt,
      maxTokens: 200,
      temperature: 0.8,
      costPriority: 'cost',
    });

    return {
      text: response.text.trim(),
      cost: response.cost,
      modelUsed: response.modelUsed,
    };
  }

  /**
   * Enhance image prompt for social media
   */
  private enhancePromptForSocialMedia(topic: string, platform: string): string {
    let enhancedPrompt = topic;

    switch (platform) {
      case 'everytime':
        enhancedPrompt += ', Korean university campus style, student life, casual and friendly';
        break;
      case 'instagram':
        enhancedPrompt += ', Instagram aesthetic, bright colors, trendy and visually appealing';
        break;
      case 'twitter':
        enhancedPrompt += ', Twitter meme style, viral content, shareable and engaging';
        break;
    }

    return enhancedPrompt;
  }

  /**
   * Get optimal image dimensions for platform
   */
  private getOptimalImageSize(platform: string): { width: number; height: number } {
    const sizes = {
      everytime: { width: 1024, height: 1024 }, // Square format
      instagram: { width: 1080, height: 1080 }, // Instagram square
      twitter: { width: 1200, height: 675 },    // Twitter landscape
    };

    return sizes[platform] || { width: 1024, height: 1024 };
  }

  /**
   * Get maximum text length for platform
   */
  private getMaxTextLength(platform: string): number {
    const lengths = {
      everytime: 500,
      instagram: 300,
      twitter: 280,
    };

    return lengths[platform] || 500;
  }

  /**
   * Format post for specific platform
   */
  private formatPostForPlatform(text: string, imageContentId: string, platform: string): string {
    let formatted = text;

    switch (platform) {
      case 'everytime':
        formatted += `\n\n[이미지: ${imageContentId}]`;
        break;
      case 'instagram':
        formatted += `\n\n📸 Generated with AI`;
        break;
      case 'twitter':
        formatted += `\n\n🎨 #AIGenerated`;
        break;
    }

    return formatted;
  }

  /**
   * Get trending topics (mock data for demo)
   */
  private async getTrendingTopics(platform: string): Promise<Array<{ name: string; popularity: number }>> {
    // Mock trending topics - in production this would come from real APIs
    const topics = {
      everytime: [
        { name: '중간고사 준비', popularity: 95 },
        { name: '학식 메뉴', popularity: 88 },
        { name: '동아리 활동', popularity: 82 },
        { name: '과제 마감', popularity: 76 },
        { name: '취업 준비', popularity: 71 },
      ],
      instagram: [
        { name: 'Daily outfit', popularity: 92 },
        { name: 'Coffee moments', popularity: 87 },
        { name: 'Study aesthetic', popularity: 81 },
        { name: 'Weekend vibes', popularity: 75 },
        { name: 'Self care', popularity: 69 },
      ],
      twitter: [
        { name: 'Current events', popularity: 94 },
        { name: 'Tech trends', popularity: 89 },
        { name: 'Funny observations', popularity: 83 },
        { name: 'Daily thoughts', popularity: 77 },
        { name: 'Hot takes', popularity: 72 },
      ],
    };

    return topics[platform] || topics.everytime;
  }

  /**
   * Store demo post in database
   */
  private async storeDemoPost(data: any): Promise<string> {
    const postId = `demo_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would store in a separate demo_posts collection
    // For now, simulate the storage
    this.logger.debug(`Storing demo post: ${postId}`, {
      userId: data.userId,
      platform: data.platform,
      cost: data.totalCost,
    });

    return postId;
  }

  /**
   * Mock database operations for demo posts
   * Note: These would be implemented with actual database operations
   */
  private async queryDemoPostsFromDB(userId: string, limit: number): Promise<DemoPost[]> {
    // Mock implementation - returns empty array
    return [];
  }

  private async deleteDemoPostFromDB(postId: string, userId: string): Promise<boolean> {
    // Mock implementation
    return true;
  }

  private async countDemoPostsInDB(): Promise<number> {
    // Mock implementation
    return 0;
  }

  private async deleteAllDemoPostsFromDB(): Promise<void> {
    // Mock implementation - would delete all demo posts
    this.logger.log('All demo posts deleted from database');
  }

  private async removeDemoCollections(): Promise<string[]> {
    // Mock implementation - would remove demo-specific collections
    const removedCollections = ['demo_posts', 'demo_analytics', 'demo_trends'];
    this.logger.log(`Removed demo collections: ${removedCollections.join(', ')}`);
    return removedCollections;
  }

  // BasePlugin implementation
  async initialize(): Promise<void> {
    this.logger.log('Demo post creation plugin initialized');
  }

  async destroy(): Promise<void> {
    this.logger.log('Demo post creation plugin destroyed');
  }

  getCapabilities(): PluginCapability[] {
    return [
      { name: 'social-post-generation', description: 'Generate social media posts', category: 'content' },
      { name: 'trending-analysis', description: 'Analyze trending topics', category: 'analysis' }
    ];
  }
}

// Request/Response Types for Demo Plugin
export interface SocialPostRequest {
  topic: string;
  platform: 'everytime' | 'instagram' | 'twitter';
  imageStyle?: string;
  userId?: string;
  sessionId?: string;
  isPublic?: boolean;
  includeHashtags?: boolean;
}

export interface SocialPostResult {
  success: boolean;
  postId: string;
  imageContentId: string;
  imageUrl: string;
  text: string;
  formattedPost: string;
  platform: string;
  metadata: {
    totalCost: number;
    imageModel: string;
    textModel: string;
    createdAt: Date;
  };
}

export interface TrendingPostsRequest {
  platform: 'everytime' | 'instagram' | 'twitter';
  count?: number;
  userId?: string;
  sessionId?: string;
}

export interface TrendingPostsResult {
  success: boolean;
  posts: SocialPostResult[];
  trendingTopics: Array<{ name: string; popularity: number }>;
  metadata: {
    platform: string;
    generatedCount: number;
    requestedCount: number;
  };
}

export interface DemoPost {
  postId: string;
  topic: string;
  platform: string;
  imageContentId: string;
  text: string;
  formattedPost: string;
  userId: string;
  createdAt: Date;
  cost: number;
  isPublic: boolean;
}