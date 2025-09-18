import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Workflow execution tracking document
 * Stores complete execution history, state, and results
 */
@Schema({ timestamps: true, collection: 'workflow_executions' })
export class WorkflowExecution extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, unique: true, index: true })
  executionId: string;

  @Prop({ required: true, index: true })
  workflowId: string;

  @Prop({ required: true, index: true })
  workflowType: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  sessionId?: string;

  @Prop({
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending',
    index: true
  })
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 0 })
  duration: number; // in milliseconds

  @Prop({ type: Object, required: true })
  input: any;

  @Prop({ type: Object })
  output?: any;

  @Prop({ type: Object, default: {} })
  state: Record<string, any>;

  @Prop()
  currentNode?: string;

  @Prop({ type: [String], default: [] })
  executedNodes: string[];

  @Prop({ type: [Object], default: [] })
  steps: {
    stepName: string;
    agentType: string;
    agentId: string;
    startTime: Date;
    endTime?: Date;
    duration: number;
    success: boolean;
    input: any;
    output?: any;
    cost?: number;
    errors?: string[];
    metadata?: any;
  }[];

  @Prop({ type: [Object], default: [] })
  agentsUsed: {
    agentId: string;
    agentType: string;
    pluginName: string;
    createdAt: Date;
    destroyedAt?: Date;
    totalCost?: number;
    executionCount?: number;
  }[];

  @Prop({ default: 0 })
  totalCost: number;

  @Prop({ type: [Object], default: [] })
  executionErrors: {
    nodeId: string;
    message: string;
    code: string;
    timestamp: Date;
    recoverable: boolean;
    attempts: number;
    stack?: string;
  }[];

  @Prop({ type: Object, default: {} })
  metrics: {
    totalCost: number;
    nodeMetrics: Record<string, {
      duration: number;
      cost: number;
      success: boolean;
      attempts: number;
      inputSize: number;
      outputSize: number;
    }>;
    performance: {
      totalDuration: number;
      avgNodeDuration: number;
      slowestNode: string;
      fastestNode: string;
    };
    resources: {
      tokensUsed: number;
      imagesGenerated: number;
      embeddingsCreated: number;
    };
  };

  @Prop({ type: [Object], default: [] })
  warnings: {
    step?: string;
    agentId?: string;
    message: string;
    code: string;
    timestamp: Date;
  }[];

  @Prop({ type: Object, default: {} })
  metadata: {
    name?: string;
    description?: string;
    version?: string;
    author?: string;
    tags?: string[];
    complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
    estimatedDuration?: number;
    estimatedCost?: number;
  };

  @Prop({ type: Object, default: {} })
  options: {
    timeout?: number;
    retries?: number;
    parallel?: boolean;
    failFast?: boolean;
    saveIntermediateResults?: boolean;
    enableCaching?: boolean;
    priority?: 'low' | 'normal' | 'high';
  };

  @Prop({ type: Object, default: {} })
  progress: {
    totalSteps: number;
    completedSteps: number;
    currentStep: number;
    percentage: number;
    elapsedTime: number;
    estimatedRemainingTime?: number;
  };

  // Computed properties
  get isRunning(): boolean {
    return this.status === 'running';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get hasFailed(): boolean {
    return this.status === 'failed';
  }

  get successRate(): number {
    const successfulSteps = this.steps.filter(step => step.success).length;
    return this.steps.length > 0 ? successfulSteps / this.steps.length : 0;
  }
}

export const WorkflowExecutionSchema = SchemaFactory.createForClass(WorkflowExecution);

// Add indexes for performance
WorkflowExecutionSchema.index({ executionId: 1 });
WorkflowExecutionSchema.index({ workflowType: 1, status: 1 });
WorkflowExecutionSchema.index({ userId: 1, startTime: -1 });
WorkflowExecutionSchema.index({ sessionId: 1 });
WorkflowExecutionSchema.index({ startTime: -1 });
WorkflowExecutionSchema.index({ totalCost: -1 });

// Add virtuals
WorkflowExecutionSchema.virtual('isRunning').get(function() {
  return this.status === 'running';
});

WorkflowExecutionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

WorkflowExecutionSchema.virtual('hasFailed').get(function() {
  return this.status === 'failed';
});

WorkflowExecutionSchema.virtual('successRate').get(function() {
  const successfulSteps = this.steps.filter(step => step.success).length;
  return this.steps.length > 0 ? successfulSteps / this.steps.length : 0;
});

// Add instance methods
WorkflowExecutionSchema.methods.updateProgress = function(progress: any) {
  this.progress = { ...this.progress, ...progress };
  return this.save();
};

WorkflowExecutionSchema.methods.addStep = function(step: any) {
  this.steps.push(step);
  this.progress.completedSteps = this.steps.filter(s => s.success).length;
  this.progress.percentage = (this.progress.completedSteps / this.progress.totalSteps) * 100;
  return this.save();
};

WorkflowExecutionSchema.methods.complete = function(output: any) {
  this.status = 'completed';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.output = output;
  return this.save();
};

WorkflowExecutionSchema.methods.fail = function(error: any) {
  this.status = 'failed';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.errors.push({
    message: error.message,
    code: error.code || 'WORKFLOW_FAILED',
    timestamp: new Date(),
    recoverable: false,
    stack: error.stack
  });
  return this.save();
};