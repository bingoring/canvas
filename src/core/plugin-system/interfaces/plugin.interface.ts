/**
 * Base plugin interface that all plugins must implement
 * Provides core plugin lifecycle and capability management
 */
export interface IPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly dependencies?: string[];

  /**
   * Initialize the plugin - called when plugin is registered
   */
  initialize(): Promise<void>;

  /**
   * Cleanup plugin resources - called when plugin is unregistered
   */
  destroy(): Promise<void>;

  /**
   * Get plugin capabilities for discovery
   */
  getCapabilities(): PluginCapability[];
}

/**
 * Plugin capability definition
 */
export interface PluginCapability {
  name: string;
  description: string;
  category: 'design' | 'content' | 'development' | 'testing' | 'analysis';
  version?: string;
}

// Forward declaration for BaseAgent (simplified)
export interface BaseAgent {
  readonly id: string;
  readonly type: string;
  readonly capabilities: any[];
  execute(input: any): Promise<any>;
  getSchema(): any;
  validateInput(input: any): Promise<any>;
  getConfig(): any;
}

/**
 * Agent-based plugin interface
 * Extends base plugin to provide AI agents
 */
export interface IAgentPlugin extends IPlugin {
  /**
   * Get available agent definitions
   */
  getAgents(): AgentDefinition[];

  /**
   * Create an agent instance
   */
  createAgent(type: string, config?: any): Promise<BaseAgent>;
}

// Forward declaration for BaseWorkflow (simplified)
export interface BaseWorkflow {
  readonly type: string;
  readonly name: string;
  readonly version: string;
  execute(input: any, context: any): Promise<any>;
  getDefinition(): any;
  validateInput(input: any): Promise<any>;
  getStatus(executionId: string): Promise<any>;
  cancel(executionId: string): Promise<void>;
}

/**
 * Workflow-based plugin interface
 * Extends base plugin to provide workflows
 */
export interface IWorkflowPlugin extends IPlugin {
  /**
   * Get available workflow definitions
   */
  getWorkflows(): WorkflowDefinition[];

  /**
   * Create a workflow instance
   */
  createWorkflow(type: string): Promise<BaseWorkflow>;
}

/**
 * Plugin metadata for registration
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Agent definition for plugin discovery
 */
export interface AgentDefinition {
  type: string;
  name: string;
  description: string;
  capabilities: string[];
  inputSchema?: any;
  outputSchema?: any;
  configSchema?: any;
}

/**
 * Workflow definition for plugin discovery
 */
export interface WorkflowDefinition {
  type: string;
  name: string;
  description: string;
  requiredAgents: string[];
  inputSchema?: any;
  outputSchema?: any;
  configSchema?: any;
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  resources?: {
    maxMemory?: number;
    maxConcurrency?: number;
    timeout?: number;
  };
}

/**
 * Plugin installation result
 */
export interface PluginInstallationResult {
  success: boolean;
  pluginName: string;
  version: string;
  message: string;
  errors?: string[];
}

/**
 * Plugin status enumeration
 */
export enum PluginStatus {
  INSTALLED = 'installed',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  LOADING = 'loading',
}

/**
 * Plugin information for management
 */
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  status: PluginStatus;
  capabilities: PluginCapability[];
  agents: AgentDefinition[];
  workflows: WorkflowDefinition[];
  dependencies: string[];
  config: PluginConfig;
  installDate: Date;
  lastModified: Date;
}