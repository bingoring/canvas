export interface WorkflowNode {
  id: string;
  type: 'agent' | 'condition' | 'parallel' | 'human' | 'tool';
  name: string;
  agentType?: string;
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  conditions?: WorkflowCondition[];
  retry?: RetryConfig;
  timeout?: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: any;
  logic?: 'and' | 'or';
}

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryConditions: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryPoint: string;
  exitPoints: string[];
  metadata: {
    author: string;
    tags: string[];
    category: string;
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    estimatedDuration: number;
    estimatedCost: number;
  };
  variables: WorkflowVariable[];
  errorHandling: ErrorHandlingConfig;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: any[];
  };
}

export interface ErrorHandlingConfig {
  strategy: 'fail_fast' | 'continue' | 'retry' | 'fallback';
  fallbackNode?: string;
  maxErrors: number;
  errorActions: ErrorAction[];
}

export interface ErrorAction {
  condition: string;
  action: 'retry' | 'skip' | 'fallback' | 'abort';
  parameters?: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId?: string;
  sessionId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  state: Record<string, any>;
  currentNode?: string;
  executedNodes: string[];
  executionErrors: ExecutionError[];
  metrics: ExecutionMetrics;
  options?: {
    timeout?: number;
    retries?: number;
    parallel?: boolean;
    failFast?: boolean;
    saveIntermediateResults?: boolean;
    enableCaching?: boolean;
    priority?: 'low' | 'normal' | 'high';
  };
}

export interface ExecutionError {
  nodeId: string;
  message: string;
  code: string;
  timestamp: Date;
  recoverable: boolean;
  attempts: number;
  stack?: string;
}

export interface ExecutionMetrics {
  totalCost: number;
  nodeMetrics: Record<string, NodeMetrics>;
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
}

export interface NodeMetrics {
  duration: number;
  cost: number;
  success: boolean;
  attempts: number;
  inputSize: number;
  outputSize: number;
}

export interface AgentContext {
  executionId: string;
  nodeId: string;
  workflowState: Record<string, any>;
  nodeConfig: Record<string, any>;
  previousOutputs: Record<string, any>;
  metadata: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  output: any;
  metadata: {
    cost: number;
    duration: number;
    tokensUsed?: number;
    modelUsed?: string;
    confidence?: number;
  };
  nextNode?: string;
  error?: {
    message: string;
    code: string;
    recoverable: boolean;
  };
}