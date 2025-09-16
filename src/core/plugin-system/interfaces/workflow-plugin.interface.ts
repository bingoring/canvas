/**
 * Base workflow interface for orchestrating multiple agents
 * Implements complex AI workflows with state management
 */
export interface BaseWorkflow {
  readonly type: string;
  readonly name: string;
  readonly version: string;

  /**
   * Execute the workflow with given input and context
   */
  execute(input: any, context: WorkflowExecutionContext): Promise<WorkflowOutput>;

  /**
   * Get workflow definition and schema
   */
  getDefinition(): WorkflowDefinition;

  /**
   * Validate workflow input
   */
  validateInput(input: any): Promise<ValidationResult>;

  /**
   * Get workflow status during execution
   */
  getStatus(executionId: string): Promise<WorkflowStatus>;

  /**
   * Cancel running workflow
   */
  cancel(executionId: string): Promise<void>;
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  id: string;
  type: string;
  userId?: string;
  sessionId?: string;
  startTime: Date;
  status: WorkflowExecutionStatus;
  agents: Map<string, BaseAgent>;
  state: Map<string, any>;
  metadata: WorkflowMetadata;
  options?: WorkflowOptions;
}

/**
 * Workflow execution status
 */
export enum WorkflowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

/**
 * Workflow output structure
 */
export interface WorkflowOutput {
  success: boolean;
  data: any;
  metadata: WorkflowOutputMetadata;
  errors?: WorkflowError[];
  warnings?: WorkflowWarning[];
}

/**
 * Workflow output metadata
 */
export interface WorkflowOutputMetadata {
  workflowId: string;
  workflowType: string;
  executionTime: number;
  agentsUsed: string[];
  totalCost: number;
  timestamp: Date;
  version: string;
  steps: WorkflowStepResult[];
}

/**
 * Workflow step result
 */
export interface WorkflowStepResult {
  stepName: string;
  agentType: string;
  agentId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  input: any;
  output: any;
  cost?: number;
  errors?: string[];
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimatedDuration?: number;
  estimatedCost?: number;
}

/**
 * Workflow options
 */
export interface WorkflowOptions {
  timeout?: number;
  retries?: number;
  parallel?: boolean;
  failFast?: boolean;
  saveIntermediateResults?: boolean;
  enableCaching?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Workflow error
 */
export interface WorkflowError {
  step: string;
  agentId?: string;
  message: string;
  code: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * Workflow warning
 */
export interface WorkflowWarning {
  step: string;
  agentId?: string;
  message: string;
  code: string;
  timestamp: Date;
}

/**
 * Workflow status for monitoring
 */
export interface WorkflowStatus {
  executionId: string;
  status: WorkflowExecutionStatus;
  progress: WorkflowProgress;
  currentStep?: string;
  startTime: Date;
  estimatedCompletion?: Date;
  errors?: WorkflowError[];
  warnings?: WorkflowWarning[];
}

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  percentage: number;
  elapsedTime: number;
  estimatedRemainingTime?: number;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  name: string;
  agentType: string;
  capability: string;
  dependencies?: string[];
  conditions?: WorkflowCondition[];
  retries?: number;
  timeout?: number;
  parallel?: boolean;
}

/**
 * Workflow condition for branching logic
 */
export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
  nextStep?: string;
}

/**
 * Workflow factory interface
 */
export interface WorkflowFactory {
  createWorkflow(type: string, config?: any): Promise<BaseWorkflow>;
  getWorkflowTypes(): string[];
  validateWorkflowType(type: string): boolean;
}

/**
 * Workflow builder for dynamic workflow creation
 */
export interface WorkflowBuilder {
  addStep(step: WorkflowStep): WorkflowBuilder;
  addCondition(condition: WorkflowCondition): WorkflowBuilder;
  setParallel(parallel: boolean): WorkflowBuilder;
  setTimeout(timeout: number): WorkflowBuilder;
  build(): WorkflowDefinition;
}

/**
 * Workflow metrics for performance monitoring
 */
export interface WorkflowMetrics {
  workflowType: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  successRate: number;
  totalCost: number;
  averageCost: number;
  lastExecution: Date;
  errorCount: number;
  warningCount: number;
  popularSteps: string[];
}