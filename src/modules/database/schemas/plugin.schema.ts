import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Plugin registry document for MongoDB
 * Stores plugin metadata, configuration, and runtime information
 */
@Schema({ timestamps: true, collection: 'plugins' })
export class Plugin extends Document {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  dependencies: string[];

  @Prop({
    type: String,
    enum: ['installed', 'enabled', 'disabled', 'error', 'loading'],
    default: 'installed',
    index: true
  })
  status: string;

  @Prop({ type: Object, default: {} })
  metadata: {
    author?: string;
    homepage?: string;
    repository?: string;
    license?: string;
    keywords?: string[];
    capabilities?: any[];
    agents?: any[];
    workflows?: any[];
  };

  @Prop({ type: Object, default: {} })
  config: {
    enabled: boolean;
    settings: Record<string, any>;
    resources?: {
      maxMemory?: number;
      maxConcurrency?: number;
      timeout?: number;
    };
  };

  @Prop({ type: Object, default: {} })
  resourceLimits: {
    maxMemoryMB: number;
    maxConcurrentExecutions: number;
    maxExecutionTimeMs: number;
    maxFileSize: number;
    allowedNetworkHosts?: string[];
  };

  @Prop({ type: Object, default: {} })
  securityPolicy: {
    allowNetworkAccess: boolean;
    allowFileSystemAccess: boolean;
    allowedFileExtensions?: string[];
    blockedModules?: string[];
    sandboxed: boolean;
    trustedPlugin: boolean;
  };

  @Prop({ default: Date.now })
  registrationTime: Date;

  @Prop({ default: Date.now })
  lastAccessed: Date;

  @Prop({ default: 0 })
  accessCount: number;

  @Prop({ type: [Object], default: [] })
  dependencyResolution: {
    name: string;
    version: string;
    status: 'resolved' | 'missing' | 'version_conflict' | 'circular';
    resolvedVersion?: string;
    error?: string;
  }[];

  @Prop({ type: [Object], default: [] })
  errors: {
    type: string;
    message: string;
    timestamp: Date;
    stack?: string;
    context?: any;
  }[];

  // Virtual for computed properties
  get isEnabled(): boolean {
    return this.status === 'enabled';
  }

  get hasErrors(): boolean {
    return this.errors && this.errors.length > 0;
  }
}

export const PluginSchema = SchemaFactory.createForClass(Plugin);

// Add indexes for performance
PluginSchema.index({ name: 1, version: 1 });
PluginSchema.index({ status: 1 });
PluginSchema.index({ 'metadata.capabilities.name': 1 });
PluginSchema.index({ lastAccessed: -1 });

// Add virtuals
PluginSchema.virtual('isEnabled').get(function() {
  return this.status === 'enabled';
});

PluginSchema.virtual('hasErrors').get(function() {
  return this.errors && this.errors.length > 0;
});

// Add instance methods
PluginSchema.methods.updateAccess = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

PluginSchema.methods.addError = function(error: any) {
  this.errors.push({
    type: error.type || 'unknown',
    message: error.message,
    timestamp: new Date(),
    stack: error.stack,
    context: error.context
  });
  return this.save();
};

PluginSchema.methods.clearErrors = function() {
  this.errors = [];
  return this.save();
};