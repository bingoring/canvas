import { BaseAgent } from '@core/plugin-system/interfaces/agent-plugin.interface';
import { BaseWorkflow } from '@core/plugin-system/interfaces/workflow-plugin.interface';

/**
 * Plugin constructor type for dynamic instantiation
 */
export type PluginConstructor = new (...args: any[]) => any;

/**
 * Agent constructor type for factory pattern
 */
export type AgentConstructor = new (...args: any[]) => BaseAgent;

/**
 * Workflow constructor type for factory pattern
 */
export type WorkflowConstructor = new (...args: any[]) => BaseWorkflow;

/**
 * Plugin dependency resolution status
 */
export enum DependencyStatus {
  RESOLVED = 'resolved',
  MISSING = 'missing',
  VERSION_CONFLICT = 'version_conflict',
  CIRCULAR = 'circular',
}

/**
 * Plugin dependency information
 */
export interface PluginDependency {
  name: string;
  version: string;
  status: DependencyStatus;
  resolvedVersion?: string;
  error?: string;
}

/**
 * Plugin loading context
 */
export interface PluginLoadingContext {
  pluginName: string;
  pluginPath: string;
  dependencies: PluginDependency[];
  environment: 'development' | 'staging' | 'production';
  loadingStartTime: Date;
}

/**
 * Plugin execution context
 */
export interface PluginExecutionContext {
  pluginName: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Plugin error types
 */
export enum PluginErrorType {
  LOADING_ERROR = 'loading_error',
  DEPENDENCY_ERROR = 'dependency_error',
  EXECUTION_ERROR = 'execution_error',
  VALIDATION_ERROR = 'validation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  TIMEOUT_ERROR = 'timeout_error',
}

/**
 * Plugin error information
 */
export interface PluginError {
  type: PluginErrorType;
  pluginName: string;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: any;
}

/**
 * Plugin event types for the event system
 */
export enum PluginEventType {
  PLUGIN_REGISTERED = 'plugin.registered',
  PLUGIN_UNREGISTERED = 'plugin.unregistered',
  PLUGIN_ENABLED = 'plugin.enabled',
  PLUGIN_DISABLED = 'plugin.disabled',
  PLUGIN_ERROR = 'plugin.error',
  AGENT_CREATED = 'agent.created',
  AGENT_DESTROYED = 'agent.destroyed',
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
}

/**
 * Plugin event data
 */
export interface PluginEvent {
  type: PluginEventType;
  pluginName: string;
  timestamp: Date;
  data: any;
  source: string;
}

/**
 * Plugin resource limits
 */
export interface PluginResourceLimits {
  maxMemoryMB: number;
  maxConcurrentExecutions: number;
  maxExecutionTimeMs: number;
  maxFileSize: number;
  allowedNetworkHosts?: string[];
}

/**
 * Plugin security policy
 */
export interface PluginSecurityPolicy {
  allowNetworkAccess: boolean;
  allowFileSystemAccess: boolean;
  allowedFileExtensions?: string[];
  blockedModules?: string[];
  sandboxed: boolean;
  trustedPlugin: boolean;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  name: string;
  version: string;
  instance: any;
  metadata: any;
  status: string;
  dependencies: PluginDependency[];
  resourceLimits: PluginResourceLimits;
  securityPolicy: PluginSecurityPolicy;
  registrationTime: Date;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Plugin marketplace information
 */
export interface PluginMarketplaceInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  downloads: number;
  rating: number;
  verified: boolean;
  publishDate: Date;
  lastUpdate: Date;
}

/**
 * Plugin installation options
 */
export interface PluginInstallationOptions {
  version?: string;
  force?: boolean;
  skipDependencies?: boolean;
  sandbox?: boolean;
  resourceLimits?: Partial<PluginResourceLimits>;
  securityPolicy?: Partial<PluginSecurityPolicy>;
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