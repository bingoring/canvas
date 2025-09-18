import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';

/**
 * Model usage tracking for cost optimization and analytics
 */
@Schema({ timestamps: true, collection: 'model_usage' })
export class ModelUsage extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  modelId: string;

  @Prop({ required: true })
  modelName: string;

  @Prop({
    type: String,
    enum: ['text-generation', 'image-generation', 'embedding'],
    required: true,
    index: true
  })
  modelType: string;

  @Prop({
    type: String,
    enum: ['text-generation', 'image-generation', 'embedding', 'code-generation', 'content-creation', 'analysis'],
    required: true,
    index: true
  })
  taskType: string;

  @Prop({ required: true })
  requestId: string;

  @Prop({ index: true })
  workflowId?: string;

  @Prop({ index: true })
  pluginName?: string;

  @Prop({ index: true })
  agentId?: string;

  @Prop({ default: 0 })
  inputTokens: number;

  @Prop({ default: 0 })
  outputTokens: number;

  @Prop({ default: 0 })
  totalTokens: number;

  @Prop({ default: 0 })
  imageCount: number;

  @Prop({ required: true, index: true })
  cost: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 0 })
  duration: number; // in milliseconds

  @Prop({ default: true })
  success: boolean;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object, default: {} })
  metadata: {
    region?: string;
    qualityRequirement?: string;
    latencyRequirement?: string;
    cacheHit?: boolean;
    retryCount?: number;
    costOptimizationStrategy?: string;
  };

  @Prop({ type: Object, default: {} })
  requestData: {
    prompt?: string;
    promptLength?: number;
    responseLength?: number;
    temperature?: number;
    maxTokens?: number;
    imageSize?: string;
    stylePreset?: string;
  };

  // Computed properties for analytics
  get costPer1KTokens(): number {
    return this.totalTokens > 0 ? (this.cost / this.totalTokens) * 1000 : 0;
  }

  get costPerImage(): number {
    return this.imageCount > 0 ? this.cost / this.imageCount : 0;
  }

  get tokensPerSecond(): number {
    return this.duration > 0 ? (this.totalTokens / this.duration) * 1000 : 0;
  }
}

export const ModelUsageSchema = SchemaFactory.createForClass(ModelUsage);

// Add compound indexes for analytics queries
ModelUsageSchema.index({ userId: 1, createdAt: -1 });
ModelUsageSchema.index({ modelId: 1, createdAt: -1 });
ModelUsageSchema.index({ taskType: 1, createdAt: -1 });
ModelUsageSchema.index({ userId: 1, modelType: 1, createdAt: -1 });
ModelUsageSchema.index({ cost: -1, createdAt: -1 });
ModelUsageSchema.index({ success: 1, createdAt: -1 });

// Add time-based indexes for cost tracking
ModelUsageSchema.index({
  userId: 1,
  createdAt: -1
}, {
  expireAfterSeconds: 7776000 // 90 days retention
});

// Add static methods for analytics
ModelUsageSchema.statics.getDailyCostByUser = function(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        success: true
      }
    },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        totalTokens: { $sum: '$totalTokens' },
        totalImages: { $sum: '$imageCount' },
        requestCount: { $sum: 1 }
      }
    }
  ]);
};

ModelUsageSchema.statics.getMonthlyCostByUser = function(userId: string, year: number, month: number) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        success: true
      }
    },
    {
      $group: {
        _id: { $dayOfMonth: '$createdAt' },
        dailyCost: { $sum: '$cost' },
        dailyTokens: { $sum: '$totalTokens' },
        dailyImages: { $sum: '$imageCount' },
        requestCount: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

ModelUsageSchema.statics.getModelPopularity = function(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        success: true
      }
    },
    {
      $group: {
        _id: '$modelId',
        modelName: { $first: '$modelName' },
        totalUsage: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        avgCost: { $avg: '$cost' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { totalUsage: -1 }
    }
  ]);
};

// Define interface for static methods
export interface ModelUsageModel extends Model<ModelUsage> {
  getDailyCostByUser(userId: string, date: Date): Promise<any>;
  getMonthlyCostByUser(userId: string, year: number, month: number): Promise<any>;
  getModelPopularity(days?: number): Promise<any>;
}