import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plugin } from './schemas/plugin.schema';
import { WorkflowExecution } from './schemas/workflow-execution.schema';
import { ModelUsage } from './schemas/model-usage.schema';
import { CanvasContent } from './schemas/canvas-content.schema';

/**
 * Database service providing MongoDB operations
 * Centralized data access layer with optimized queries
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectModel(Plugin.name) private pluginModel: Model<Plugin>,
    @InjectModel(WorkflowExecution.name) private workflowExecutionModel: Model<WorkflowExecution>,
    @InjectModel(ModelUsage.name) private modelUsageModel: Model<ModelUsage>,
    @InjectModel(CanvasContent.name) private canvasContentModel: Model<CanvasContent>,
  ) {
    this.logger.log('Database Service initialized with MongoDB');
  }

  // Plugin Management
  async createPlugin(pluginData: any): Promise<Plugin> {
    const plugin = new this.pluginModel(pluginData);
    return plugin.save();
  }

  async findPluginByName(name: string): Promise<Plugin | null> {
    return this.pluginModel.findOne({ name }).exec();
  }

  async findAllPlugins(): Promise<Plugin[]> {
    return this.pluginModel.find().sort({ name: 1 }).exec();
  }

  async findEnabledPlugins(): Promise<Plugin[]> {
    return this.pluginModel.find({ status: 'enabled' }).sort({ name: 1 }).exec();
  }

  async updatePlugin(name: string, updateData: any): Promise<Plugin | null> {
    return this.pluginModel.findOneAndUpdate(
      { name },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async deletePlugin(name: string): Promise<boolean> {
    const result = await this.pluginModel.deleteOne({ name }).exec();
    return result.deletedCount > 0;
  }

  async getPluginsByDependency(dependency: string): Promise<Plugin[]> {
    return this.pluginModel.find({ dependencies: dependency }).exec();
  }

  // Workflow Execution Management
  async createWorkflowExecution(executionData: any): Promise<WorkflowExecution> {
    const execution = new this.workflowExecutionModel(executionData);
    return execution.save();
  }

  async findWorkflowExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.workflowExecutionModel.findOne({ executionId }).exec();
  }

  async findWorkflowExecutionsByUser(userId: string, limit: number = 20): Promise<WorkflowExecution[]> {
    return this.workflowExecutionModel
      .find({ userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .exec();
  }

  async findRunningWorkflows(): Promise<WorkflowExecution[]> {
    return this.workflowExecutionModel.find({ status: 'running' }).exec();
  }

  async updateWorkflowExecution(executionId: string, updateData: any): Promise<WorkflowExecution | null> {
    return this.workflowExecutionModel.findOneAndUpdate(
      { executionId },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async getWorkflowStats(workflowType: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.workflowExecutionModel.aggregate([
      {
        $match: {
          workflowType,
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: 1 },
          successfulExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedExecutions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalCost: { $sum: '$totalCost' },
          avgDuration: { $avg: '$duration' },
          avgCost: { $avg: '$totalCost' }
        }
      }
    ]);
  }

  // Model Usage Tracking
  async createModelUsage(usageData: any): Promise<ModelUsage> {
    const usage = new this.modelUsageModel(usageData);
    return usage.save();
  }

  async getUserDailyCost(userId: string, date: Date = new Date()): Promise<any> {
    return this.modelUsageModel.getDailyCostByUser(userId, date);
  }

  async getUserMonthlyCost(userId: string, year?: number, month?: number): Promise<any> {
    const now = new Date();
    return this.modelUsageModel.getMonthlyCostByUser(
      userId,
      year || now.getFullYear(),
      month || now.getMonth() + 1
    );
  }

  async getModelPopularity(days: number = 30): Promise<any> {
    return this.modelUsageModel.getModelPopularity(days);
  }

  async getUserUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.modelUsageModel.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
          success: true
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          totalTokens: { $sum: '$totalTokens' },
          totalImages: { $sum: '$imageCount' },
          avgCost: { $avg: '$cost' },
          avgDuration: { $avg: '$duration' },
          modelBreakdown: {
            $push: {
              modelId: '$modelId',
              cost: '$cost',
              tokens: '$totalTokens'
            }
          }
        }
      }
    ]);
  }

  // Canvas Content Management
  async createCanvasContent(contentData: any): Promise<CanvasContent> {
    const content = new this.canvasContentModel(contentData);
    return content.save();
  }

  async findCanvasContent(contentId: string): Promise<CanvasContent | null> {
    return this.canvasContentModel.findOne({ contentId }).exec();
  }

  async findUserCanvasContent(userId: string, limit: number = 20): Promise<CanvasContent[]> {
    return this.canvasContentModel
      .find({ userId, status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findPublicCanvasContent(limit: number = 20): Promise<CanvasContent[]> {
    return this.canvasContentModel
      .find({ isPublic: true, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async searchCanvasContent(query: string, limit: number = 20): Promise<CanvasContent[]> {
    return this.canvasContentModel
      .find({
        $text: { $search: query },
        isPublic: true,
        status: 'completed'
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();
  }

  async updateCanvasContent(contentId: string, updateData: any): Promise<CanvasContent | null> {
    return this.canvasContentModel.findOneAndUpdate(
      { contentId },
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async deleteCanvasContent(contentId: string): Promise<boolean> {
    const result = await this.canvasContentModel.deleteOne({ contentId }).exec();
    return result.deletedCount > 0;
  }

  async getPopularCanvasContent(limit: number = 10, days: number = 30): Promise<CanvasContent[]> {
    return this.canvasContentModel.getPopularContent(limit, days);
  }

  async getTrendingStyles(days: number = 7): Promise<any> {
    return this.canvasContentModel.getTrendingStyles(days);
  }

  async getUserContentStats(userId: string): Promise<any> {
    return this.canvasContentModel.getUserContentStats(userId);
  }

  // Vector Search for Canvas Content (using embeddings)
  async findSimilarContent(embedding: number[], limit: number = 10): Promise<CanvasContent[]> {
    // MongoDB vector search using $vectorSearch (Atlas Search)
    // Note: This requires MongoDB Atlas with Vector Search enabled
    return this.canvasContentModel.aggregate([
      {
        $vectorSearch: {
          index: 'content_vector_index',
          path: 'embeddings.vector',
          queryVector: embedding,
          numCandidates: limit * 10,
          limit: limit
        }
      },
      {
        $match: {
          isPublic: true,
          status: 'completed'
        }
      }
    ]);
  }

  // Analytics and Reporting
  async getDashboardStats() {
    const [
      totalPlugins,
      activePlugins,
      totalWorkflows,
      completedWorkflows,
      totalContent,
      publicContent
    ] = await Promise.all([
      this.pluginModel.countDocuments(),
      this.pluginModel.countDocuments({ status: 'enabled' }),
      this.workflowExecutionModel.countDocuments(),
      this.workflowExecutionModel.countDocuments({ status: 'completed' }),
      this.canvasContentModel.countDocuments({ status: { $ne: 'deleted' } }),
      this.canvasContentModel.countDocuments({ isPublic: true, status: 'completed' })
    ]);

    return {
      plugins: {
        total: totalPlugins,
        active: activePlugins
      },
      workflows: {
        total: totalWorkflows,
        completed: completedWorkflows,
        successRate: totalWorkflows > 0 ? (completedWorkflows / totalWorkflows) * 100 : 0
      },
      content: {
        total: totalContent,
        public: publicContent
      }
    };
  }

  async getCostAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.modelUsageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          success: true
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            modelType: '$modelType'
          },
          dailyCost: { $sum: '$cost' },
          requestCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
  }

  // Database Health and Maintenance
  async getCollectionStats() {
    const stats = await Promise.all([
      this.pluginModel.collection.stats(),
      this.workflowExecutionModel.collection.stats(),
      this.modelUsageModel.collection.stats(),
      this.canvasContentModel.collection.stats()
    ]);

    return {
      plugins: stats[0],
      workflowExecutions: stats[1],
      modelUsage: stats[2],
      canvasContent: stats[3]
    };
  }

  async createIndexes() {
    try {
      await Promise.all([
        this.pluginModel.createIndexes(),
        this.workflowExecutionModel.createIndexes(),
        this.modelUsageModel.createIndexes(),
        this.canvasContentModel.createIndexes()
      ]);
      this.logger.log('All database indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  async cleanup() {
    // Clean up old data based on retention policies
    const retentionDays = 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const cleanupResults = await Promise.all([
        // Clean up old workflow executions
        this.workflowExecutionModel.deleteMany({
          createdAt: { $lt: cutoffDate },
          status: { $in: ['completed', 'failed'] }
        }),
        // Clean up old model usage data (except for billing purposes)
        this.modelUsageModel.deleteMany({
          createdAt: { $lt: cutoffDate },
          success: false
        }),
        // Clean up deleted canvas content
        this.canvasContentModel.deleteMany({
          status: 'deleted',
          deletedAt: { $lt: cutoffDate }
        })
      ]);

      this.logger.log(`Database cleanup completed:`, {
        workflowExecutions: cleanupResults[0].deletedCount,
        modelUsage: cleanupResults[1].deletedCount,
        canvasContent: cleanupResults[2].deletedCount
      });

      return cleanupResults;
    } catch (error) {
      this.logger.error('Database cleanup failed:', error);
      throw error;
    }
  }
}