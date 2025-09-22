import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Model } from 'mongoose';

export interface CanvasContentDocument extends Document {
  createdAt: Date;
  updatedAt: Date;
  addView(): Promise<this>;
  addLike(): Promise<this>;
  addDownload(): Promise<this>;
  softDelete(): Promise<this>;
}

/**
 * Canvas content storage for image generation results and metadata
 */
@Schema({ timestamps: true, collection: 'canvas_content' })
export class CanvasContent extends Document implements CanvasContentDocument {
  // Timestamps managed by Mongoose
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, unique: true, index: true })
  contentId: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  sessionId?: string;

  @Prop({ index: true })
  workflowId?: string;

  @Prop({
    type: String,
    enum: ['image', 'sketch', 'variation', 'enhancement'],
    required: true,
    index: true
  })
  contentType: string;

  @Prop({
    type: String,
    enum: ['keyword-generation', 'sketch-to-image', 'image-variation', 'image-enhancement'],
    required: true,
    index: true
  })
  generationMethod: string;

  @Prop({ required: true })
  prompt: string;

  @Prop()
  negativePrompt?: string;

  @Prop({
    type: String,
    enum: ['cartoon', 'realistic', 'anime', 'meme', 'illustration'],
    default: 'cartoon'
  })
  style: string;

  @Prop({ type: Object, required: true })
  originalImage: {
    url: string;
    s3Key: string;
    bucket: string;
    size: number; // file size in bytes
    dimensions: {
      width: number;
      height: number;
    };
    format: string; // 'png', 'jpg', etc.
  };

  @Prop({ type: Object })
  thumbnailImage?: {
    url: string;
    s3Key: string;
    bucket: string;
    size: number;
    dimensions: {
      width: number;
      height: number;
    };
  };

  @Prop({ type: Object })
  sketchInput?: {
    url: string;
    s3Key: string;
    bucket: string;
    size: number;
    dimensions: {
      width: number;
      height: number;
    };
  };

  @Prop({ type: [Object], default: [] })
  variations: {
    variationId: string;
    url: string;
    s3Key: string;
    prompt: string;
    style: string;
    confidence: number;
    cost: number;
    generatedAt: Date;
  }[];

  @Prop({ required: true })
  modelUsed: string;

  @Prop({ required: true })
  cost: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 0.95 })
  confidence: number;

  @Prop({ type: Object, default: {} })
  generationParams: {
    seed?: number;
    steps?: number;
    cfgScale?: number;
    temperature?: number;
    width?: number;
    height?: number;
    quality?: string;
    sampler?: string;
  };

  @Prop({ type: Object, default: {} })
  metadata: {
    agentId?: string;
    pluginName?: string;
    tags?: string[];
    description?: string;
    isPublic?: boolean;
    likes?: number;
    views?: number;
    downloads?: number;
  };

  @Prop({ type: [Object], default: [] })
  embeddings: {
    type: 'image' | 'text';
    vector: number[];
    model: string;
    dimensions: number;
    generatedAt: Date;
  }[];

  @Prop({
    type: String,
    enum: ['draft', 'generating', 'completed', 'failed', 'deleted'],
    default: 'generating',
    index: true
  })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  downloads: number;

  @Prop({ type: Date })
  publishedAt?: Date;

  @Prop({ type: Date })
  deletedAt?: Date;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get totalCost(): number {
    return this.cost + this.variations.reduce((sum, variation) => sum + variation.cost, 0);
  }

  get variationCount(): number {
    return this.variations.length;
  }

  // Method implementations for interface compliance
  addView(): Promise<this> {
    this.views += 1;
    return this.save();
  }

  addLike(): Promise<this> {
    this.likes += 1;
    return this.save();
  }

  addDownload(): Promise<this> {
    this.downloads += 1;
    return this.save();
  }

  softDelete(): Promise<this> {
    this.status = 'deleted';
    this.deletedAt = new Date();
    return this.save();
  }
}

export const CanvasContentSchema = SchemaFactory.createForClass(CanvasContent);

// Define interface for static methods extending Model
export interface CanvasContentModel extends Model<CanvasContent> {
  getPopularContent(limit?: number, days?: number): Promise<any>;
  getTrendingStyles(days?: number): Promise<any>;
  getUserContentStats(userId: string): Promise<any>;
}

// Add indexes for performance
CanvasContentSchema.index({ contentId: 1 });
CanvasContentSchema.index({ userId: 1, createdAt: -1 });
CanvasContentSchema.index({ sessionId: 1 });
CanvasContentSchema.index({ workflowId: 1 });
CanvasContentSchema.index({ contentType: 1, status: 1 });
CanvasContentSchema.index({ generationMethod: 1 });
CanvasContentSchema.index({ style: 1, status: 1 });
CanvasContentSchema.index({ tags: 1 });
CanvasContentSchema.index({ isPublic: 1, isFeatured: 1, createdAt: -1 });
CanvasContentSchema.index({ likes: -1, views: -1 });

// Text search index for prompts and descriptions
CanvasContentSchema.index({
  prompt: 'text',
  'metadata.description': 'text',
  tags: 'text'
});

// Geospatial index if we add location data
// CanvasContentSchema.index({ location: '2dsphere' });

// Add virtuals
CanvasContentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

CanvasContentSchema.virtual('totalCost').get(function() {
  return this.cost + this.variations.reduce((sum, variation) => sum + variation.cost, 0);
});

CanvasContentSchema.virtual('variationCount').get(function() {
  return this.variations.length;
});

// Add instance methods
CanvasContentSchema.methods.addVariation = function(variation: any) {
  this.variations.push({
    ...variation,
    variationId: new Types.ObjectId().toString(),
    generatedAt: new Date()
  });
  return this.save();
};

CanvasContentSchema.methods.addView = function() {
  this.views += 1;
  return this.save();
};

CanvasContentSchema.methods.addLike = function() {
  this.likes += 1;
  return this.save();
};

CanvasContentSchema.methods.addDownload = function() {
  this.downloads += 1;
  return this.save();
};

CanvasContentSchema.methods.publish = function() {
  this.isPublic = true;
  this.publishedAt = new Date();
  return this.save();
};

CanvasContentSchema.methods.feature = function() {
  this.isFeatured = true;
  return this.save();
};

CanvasContentSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  return this.save();
};

// Add static methods for analytics
CanvasContentSchema.statics.getPopularContent = function(limit: number = 10, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    isPublic: true,
    status: 'completed',
    createdAt: { $gte: startDate }
  })
  .sort({ likes: -1, views: -1 })
  .limit(limit);
};

CanvasContentSchema.statics.getTrendingStyles = function(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$style',
        count: { $sum: 1 },
        avgCost: { $avg: '$cost' },
        avgConfidence: { $avg: '$confidence' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

CanvasContentSchema.statics.getUserContentStats = function(userId: string) {
  return this.aggregate([
    {
      $match: { userId, status: { $ne: 'deleted' } }
    },
    {
      $group: {
        _id: null,
        totalContent: { $sum: 1 },
        completedContent: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalCost: { $sum: '$cost' },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        totalDownloads: { $sum: '$downloads' },
        avgConfidence: { $avg: '$confidence' }
      }
    }
  ]);
};