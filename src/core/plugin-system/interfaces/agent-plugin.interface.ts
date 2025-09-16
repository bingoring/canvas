/**
 * Base agent interface that all AI agents must implement
 * Provides standardized execution and capability management
 */
export interface BaseAgent {
  readonly id: string;
  readonly type: string;
  readonly capabilities: AgentCapability[];

  /**
   * Execute agent capability with given input
   */
  execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Get agent schema for validation and documentation
   */
  getSchema(): AgentSchema;

  /**
   * Validate input against agent's schema
   */
  validateInput(input: any): Promise<ValidationResult>;

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig;
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
  outputSchema: any; // JSON Schema
  examples?: AgentExample[];
  tags?: string[];
}

/**
 * Agent input structure
 */
export interface AgentInput {
  capability: string;
  data: any;
  context?: AgentContext;
  options?: AgentOptions;
}

/**
 * Agent output structure
 */
export interface AgentOutput {
  success: boolean;
  data: any;
  metadata: AgentMetadata;
  errors?: string[];
  warnings?: string[];
}

/**
 * Agent execution context
 */
export interface AgentContext {
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  requestId?: string;
  timestamp: Date;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Agent execution options
 */
export interface AgentOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  async?: boolean;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

/**
 * Agent metadata included in output
 */
export interface AgentMetadata {
  agentId: string;
  agentType: string;
  capability: string;
  executionTime: number;
  modelUsed?: string;
  cost?: number;
  tokensUsed?: number;
  timestamp: Date;
  version: string;
}

/**
 * Agent schema for validation and documentation
 */
export interface AgentSchema {
  inputSchema: any;
  outputSchema: any;
  capabilities: AgentCapability[];
  configSchema?: any;
  examples?: AgentExample[];
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  type: string;
  version: string;
  settings: Record<string, any>;
  resources?: {
    maxMemory?: number;
    timeout?: number;
    retries?: number;
  };
}

/**
 * Agent example for documentation
 */
export interface AgentExample {
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  tags?: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Agent factory interface for creating agents
 */
export interface AgentFactory {
  createAgent(type: string, config?: AgentConfig): Promise<BaseAgent>;
  getAgentTypes(): string[];
  validateAgentType(type: string): boolean;
}

/**
 * Agent metrics for monitoring
 */
export interface AgentMetrics {
  agentId: string;
  agentType: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  successRate: number;
  totalCost: number;
  lastExecution: Date;
  errorCount: number;
  warningCount: number;
}