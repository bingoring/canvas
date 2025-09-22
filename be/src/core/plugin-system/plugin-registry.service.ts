import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  IPlugin,
  IAgentPlugin,
  IWorkflowPlugin,
  PluginInfo,
  PluginStatus,
  PluginConfig,
  AgentDefinition,
  WorkflowDefinition,
} from './interfaces/plugin.interface';
import { BaseAgent } from './interfaces/agent-plugin.interface';
import { BaseWorkflow } from './interfaces/workflow-plugin.interface';
import {
  PluginRegistryEntry,
  PluginError,
  PluginErrorType,
  PluginEvent,
  PluginEventType,
  PluginDependency,
  DependencyStatus,
} from '@/types/plugin.types';

/**
 * Central plugin registry service
 * Manages plugin lifecycle, dependencies, and discovery
 */
@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PluginRegistryService.name);
  private readonly plugins = new Map<string, PluginRegistryEntry>();
  private readonly agentFactories = new Map<string, () => Promise<BaseAgent>>();
  private readonly workflowFactories = new Map<string, () => Promise<BaseWorkflow>>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Plugin Registry Service');

    // Load auto-load plugins if enabled
    const autoLoad = this.configService.get('PLUGIN_AUTO_LOAD', false);
    if (autoLoad) {
      await this.loadAutoPlugins();
    }
  }

  /**
   * Register a plugin instance
   */
  async registerPlugin(plugin: IPlugin, config?: PluginConfig): Promise<void> {
    const pluginName = plugin.name;

    try {
      this.logger.log(`Registering plugin: ${pluginName}`);

      // Check if plugin already exists
      if (this.plugins.has(pluginName)) {
        throw new Error(`Plugin '${pluginName}' is already registered`);
      }

      // Validate plugin dependencies
      await this.validateDependencies(plugin);

      // Initialize the plugin
      await plugin.initialize();

      // Create registry entry
      const entry: PluginRegistryEntry = {
        name: pluginName,
        version: plugin.version,
        instance: plugin,
        metadata: this.extractPluginMetadata(plugin),
        status: PluginStatus.ENABLED,
        dependencies: await this.resolveDependencies(plugin),
        resourceLimits: this.getDefaultResourceLimits(),
        securityPolicy: this.getDefaultSecurityPolicy(),
        registrationTime: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
      };

      // Register agents and workflows
      if (this.isAgentPlugin(plugin)) {
        await this.registerAgentFactories(plugin as IAgentPlugin);
      }

      if (this.isWorkflowPlugin(plugin)) {
        await this.registerWorkflowFactories(plugin as IWorkflowPlugin);
      }

      // Store in registry
      this.plugins.set(pluginName, entry);

      // Emit registration event
      this.emitPluginEvent(PluginEventType.PLUGIN_REGISTERED, pluginName, {
        version: plugin.version,
        capabilities: plugin.getCapabilities(),
      });

      this.logger.log(`Plugin '${pluginName}' registered successfully`);
    } catch (error) {
      this.handlePluginError(pluginName, PluginErrorType.LOADING_ERROR, error);
      throw error;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);

    if (!entry) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    try {
      this.logger.log(`Unregistering plugin: ${pluginName}`);

      // Disable the plugin first
      await this.disablePlugin(pluginName);

      // Cleanup plugin resources
      await entry.instance.destroy();

      // Remove agent and workflow factories
      this.removeFactories(pluginName);

      // Remove from registry
      this.plugins.delete(pluginName);

      // Emit unregistration event
      this.emitPluginEvent(PluginEventType.PLUGIN_UNREGISTERED, pluginName, {
        version: entry.version,
      });

      this.logger.log(`Plugin '${pluginName}' unregistered successfully`);
    } catch (error) {
      this.handlePluginError(pluginName, PluginErrorType.LOADING_ERROR, error);
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);

    if (!entry) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    if (entry.status === PluginStatus.ENABLED) {
      return; // Already enabled
    }

    entry.status = PluginStatus.ENABLED;
    this.emitPluginEvent(PluginEventType.PLUGIN_ENABLED, pluginName, {});
    this.logger.log(`Plugin '${pluginName}' enabled`);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginName: string): Promise<void> {
    const entry = this.plugins.get(pluginName);

    if (!entry) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    if (entry.status === PluginStatus.DISABLED) {
      return; // Already disabled
    }

    entry.status = PluginStatus.DISABLED;
    this.emitPluginEvent(PluginEventType.PLUGIN_DISABLED, pluginName, {});
    this.logger.log(`Plugin '${pluginName}' disabled`);
  }

  /**
   * Get all installed plugins
   */
  getInstalledPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(entry => this.entryToPluginInfo(entry));
  }

  /**
   * Get enabled plugins only
   */
  getEnabledPlugins(): PluginInfo[] {
    return this.getInstalledPlugins().filter(plugin => plugin.status === PluginStatus.ENABLED);
  }

  /**
   * Get plugin by name
   */
  getPlugin(pluginName: string): IPlugin | undefined {
    const entry = this.plugins.get(pluginName);
    return entry?.instance;
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginName: string): PluginConfig {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    return {
      enabled: entry.status === PluginStatus.ENABLED,
      settings: entry.metadata?.settings || {},
      resources: {
        maxMemory: entry.resourceLimits.maxMemoryMB,
        maxConcurrency: entry.resourceLimits.maxConcurrentExecutions,
        timeout: entry.resourceLimits.maxExecutionTimeMs,
      },
    };
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginName: string, config: PluginConfig): Promise<void> {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      throw new Error(`Plugin '${pluginName}' is not registered`);
    }

    // Update entry
    entry.metadata.settings = config.settings;
    entry.resourceLimits.maxMemoryMB = config.resources?.maxMemory || entry.resourceLimits.maxMemoryMB;
    entry.resourceLimits.maxConcurrentExecutions = config.resources?.maxConcurrency || entry.resourceLimits.maxConcurrentExecutions;
    entry.resourceLimits.maxExecutionTimeMs = config.resources?.timeout || entry.resourceLimits.maxExecutionTimeMs;

    // Enable/disable plugin based on config
    if (config.enabled && entry.status === PluginStatus.DISABLED) {
      await this.enablePlugin(pluginName);
    } else if (!config.enabled && entry.status === PluginStatus.ENABLED) {
      await this.disablePlugin(pluginName);
    }

    this.logger.log(`Plugin '${pluginName}' configuration updated`);
  }

  /**
   * Get available agents from all enabled plugins
   */
  getAvailableAgents(): AgentDefinition[] {
    const agents: AgentDefinition[] = [];

    for (const entry of this.plugins.values()) {
      if (entry.status === PluginStatus.ENABLED && this.isAgentPlugin(entry.instance)) {
        const agentPlugin = entry.instance as IAgentPlugin;
        agents.push(...agentPlugin.getAgents());
      }
    }

    return agents;
  }

  /**
   * Get available workflows from all enabled plugins
   */
  getAvailableWorkflows(): WorkflowDefinition[] {
    const workflows: WorkflowDefinition[] = [];

    for (const entry of this.plugins.values()) {
      if (entry.status === PluginStatus.ENABLED && this.isWorkflowPlugin(entry.instance)) {
        const workflowPlugin = entry.instance as IWorkflowPlugin;
        workflows.push(...workflowPlugin.getWorkflows());
      }
    }

    return workflows;
  }

  /**
   * Create an agent instance
   */
  async createAgent(type: string, config?: any): Promise<BaseAgent> {
    const factory = this.agentFactories.get(type);
    if (!factory) {
      throw new Error(`Agent type '${type}' not found. Available types: ${Array.from(this.agentFactories.keys()).join(', ')}`);
    }

    try {
      const agent = await factory();
      this.emitPluginEvent(PluginEventType.AGENT_CREATED, this.getPluginNameForAgent(type), {
        agentType: type,
        agentId: agent.id,
      });
      return agent;
    } catch (error) {
      this.handlePluginError(this.getPluginNameForAgent(type), PluginErrorType.EXECUTION_ERROR, error);
      throw error;
    }
  }

  /**
   * Create a workflow instance
   */
  async createWorkflow(type: string): Promise<BaseWorkflow> {
    const factory = this.workflowFactories.get(type);
    if (!factory) {
      throw new Error(`Workflow type '${type}' not found. Available types: ${Array.from(this.workflowFactories.keys()).join(', ')}`);
    }

    try {
      return await factory();
    } catch (error) {
      this.handlePluginError(this.getPluginNameForWorkflow(type), PluginErrorType.EXECUTION_ERROR, error);
      throw error;
    }
  }

  // Private helper methods

  private async validateDependencies(plugin: IPlugin): Promise<void> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }

    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(`Missing dependency: ${dependency} required by ${plugin.name}`);
      }
    }
  }

  private async resolveDependencies(plugin: IPlugin): Promise<PluginDependency[]> {
    const dependencies: PluginDependency[] = [];

    if (plugin.dependencies) {
      for (const depName of plugin.dependencies) {
        const depEntry = this.plugins.get(depName);
        dependencies.push({
          name: depName,
          version: depEntry?.version || 'unknown',
          status: depEntry ? DependencyStatus.RESOLVED : DependencyStatus.MISSING,
          resolvedVersion: depEntry?.version,
        });
      }
    }

    return dependencies;
  }

  private async registerAgentFactories(plugin: IAgentPlugin): Promise<void> {
    const agents = plugin.getAgents();
    for (const agentDef of agents) {
      this.agentFactories.set(agentDef.type, () => plugin.createAgent(agentDef.type));
    }
  }

  private async registerWorkflowFactories(plugin: IWorkflowPlugin): Promise<void> {
    const workflows = plugin.getWorkflows();
    for (const workflowDef of workflows) {
      this.workflowFactories.set(workflowDef.type, () => plugin.createWorkflow(workflowDef.type));
    }
  }

  private removeFactories(pluginName: string): void {
    // Remove agent factories
    for (const [type, factory] of this.agentFactories.entries()) {
      if (this.getPluginNameForAgent(type) === pluginName) {
        this.agentFactories.delete(type);
      }
    }

    // Remove workflow factories
    for (const [type, factory] of this.workflowFactories.entries()) {
      if (this.getPluginNameForWorkflow(type) === pluginName) {
        this.workflowFactories.delete(type);
      }
    }
  }

  private isAgentPlugin(plugin: IPlugin): boolean {
    return 'getAgents' in plugin && 'createAgent' in plugin;
  }

  private isWorkflowPlugin(plugin: IPlugin): boolean {
    return 'getWorkflows' in plugin && 'createWorkflow' in plugin;
  }

  private extractPluginMetadata(plugin: IPlugin): any {
    return {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      dependencies: plugin.dependencies || [],
      capabilities: plugin.getCapabilities(),
    };
  }

  private entryToPluginInfo(entry: PluginRegistryEntry): PluginInfo {
    const agentDefs = this.isAgentPlugin(entry.instance) ?
      (entry.instance as IAgentPlugin).getAgents() : [];
    const workflowDefs = this.isWorkflowPlugin(entry.instance) ?
      (entry.instance as IWorkflowPlugin).getWorkflows() : [];

    return {
      name: entry.name,
      version: entry.version,
      description: entry.metadata.description,
      status: entry.status as PluginStatus,
      capabilities: entry.instance.getCapabilities(),
      agents: agentDefs,
      workflows: workflowDefs,
      dependencies: entry.metadata.dependencies,
      config: this.getPluginConfig(entry.name),
      installDate: entry.registrationTime,
      lastModified: entry.lastAccessed,
    };
  }

  private getPluginNameForAgent(agentType: string): string {
    // Find plugin that provides this agent type
    for (const entry of this.plugins.values()) {
      if (this.isAgentPlugin(entry.instance)) {
        const agents = (entry.instance as IAgentPlugin).getAgents();
        if (agents.some(agent => agent.type === agentType)) {
          return entry.name;
        }
      }
    }
    return 'unknown';
  }

  private getPluginNameForWorkflow(workflowType: string): string {
    // Find plugin that provides this workflow type
    for (const entry of this.plugins.values()) {
      if (this.isWorkflowPlugin(entry.instance)) {
        const workflows = (entry.instance as IWorkflowPlugin).getWorkflows();
        if (workflows.some(workflow => workflow.type === workflowType)) {
          return entry.name;
        }
      }
    }
    return 'unknown';
  }

  private getDefaultResourceLimits() {
    return {
      maxMemoryMB: 512,
      maxConcurrentExecutions: 10,
      maxExecutionTimeMs: 300000, // 5 minutes
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };
  }

  private getDefaultSecurityPolicy() {
    return {
      allowNetworkAccess: true,
      allowFileSystemAccess: false,
      sandboxed: false,
      trustedPlugin: false,
    };
  }

  private emitPluginEvent(type: PluginEventType, pluginName: string, data: any): void {
    const event: PluginEvent = {
      type,
      pluginName,
      timestamp: new Date(),
      data,
      source: 'PluginRegistryService',
    };

    this.eventEmitter.emit(type, event);
  }

  private handlePluginError(pluginName: string, type: PluginErrorType, error: any): void {
    const pluginError: PluginError = {
      type,
      pluginName,
      message: error.message || String(error),
      stack: error.stack,
      timestamp: new Date(),
      context: { error },
    };

    this.logger.error(`Plugin error [${pluginName}]: ${pluginError.message}`, pluginError.stack);
    this.emitPluginEvent(PluginEventType.PLUGIN_ERROR, pluginName, pluginError);

    // Update plugin status to error
    const entry = this.plugins.get(pluginName);
    if (entry) {
      entry.status = PluginStatus.ERROR;
    }
  }

  private async loadAutoPlugins(): Promise<void> {
    this.logger.log('Auto-loading plugins is enabled, but no plugins configured for auto-load');
    // Implementation for auto-loading plugins from configured paths
    // This would be implemented when we have the plugin loader service
  }
}