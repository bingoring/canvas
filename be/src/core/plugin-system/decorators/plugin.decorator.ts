import 'reflect-metadata';
import { PluginMetadata, AgentDefinition } from '../interfaces/plugin.interface';
import { AgentCapability } from '../interfaces/agent-plugin.interface';
import { WorkflowDefinition } from '../interfaces/workflow-plugin.interface';

// Metadata keys for reflection
export const PLUGIN_METADATA_KEY = Symbol('plugin:metadata');
export const AGENT_METADATA_KEY = Symbol('agent:metadata');
export const WORKFLOW_METADATA_KEY = Symbol('workflow:metadata');
export const CAPABILITY_METADATA_KEY = Symbol('capability:metadata');

/**
 * Plugin decorator for marking plugin classes
 * Stores plugin metadata for runtime discovery
 */
export function Plugin(metadata: PluginMetadata) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Validate plugin metadata
    validatePluginMetadata(metadata);

    // Store metadata for runtime access
    Reflect.defineMetadata(PLUGIN_METADATA_KEY, metadata, constructor);

    // Add plugin marker
    Reflect.defineMetadata('isPlugin', true, constructor);

    return constructor;
  };
}

/**
 * Agent decorator for marking agent methods
 * Stores agent definition and capabilities
 */
export function Agent(definition: string | Partial<AgentDefinition>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Convert string to partial definition
    const agentDef = typeof definition === 'string' 
      ? { type: definition, name: definition, description: `${definition} capability` }
      : definition;

    // Validate agent definition
    validateAgentDefinition(agentDef);

    // Get existing agents or create new array
    const existingAgents = Reflect.getMetadata(AGENT_METADATA_KEY, target.constructor) || [];
    existingAgents.push({
      ...agentDef,
      methodName: propertyKey,
    });

    // Store agent metadata
    Reflect.defineMetadata(AGENT_METADATA_KEY, existingAgents, target.constructor);

    // Add agent marker
    Reflect.defineMetadata('isAgent', true, target.constructor);

    return descriptor;
  };
}

/**
 * Workflow decorator for marking workflow methods
 * Stores workflow definition and requirements
 */
export function Workflow(definition: string | Partial<WorkflowDefinition>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Convert string to partial definition
    const workflowDef = typeof definition === 'string' 
      ? { type: definition, name: definition, description: `${definition} workflow` }
      : definition;

    // Validate workflow definition
    validateWorkflowDefinition(workflowDef);

    // Get existing workflows or create new array
    const existingWorkflows = Reflect.getMetadata(WORKFLOW_METADATA_KEY, target.constructor) || [];
    existingWorkflows.push({
      ...workflowDef,
      methodName: propertyKey,
    });

    // Store workflow metadata
    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, existingWorkflows, target.constructor);

    // Add workflow marker
    Reflect.defineMetadata('isWorkflow', true, target.constructor);

    return descriptor;
  };
}

/**
 * Capability decorator for marking agent capabilities
 * Can be used on methods to define specific capabilities
 */
export function Capability(capability: AgentCapability) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Validate capability
    validateCapability(capability);

    // Get existing capabilities or create new array
    const existingCapabilities = Reflect.getMetadata(CAPABILITY_METADATA_KEY, target) || [];
    existingCapabilities.push({
      ...capability,
      methodName: propertyKey,
    });

    // Store updated capabilities
    Reflect.defineMetadata(CAPABILITY_METADATA_KEY, existingCapabilities, target);

    return descriptor;
  };
}

/**
 * Injectable decorator variant for plugins
 * Combines NestJS Injectable with plugin metadata
 */
export function PluginService(metadata: PluginMetadata) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // Apply plugin decorator
    Plugin(metadata)(constructor);

    // Mark as injectable service
    Reflect.defineMetadata('design:paramtypes', Reflect.getMetadata('design:paramtypes', constructor) || [], constructor);

    return constructor;
  };
}

/**
 * Configuration decorator for plugin settings
 * Marks properties that should be configurable
 */
export function ConfigProperty(options: {
  key: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  default?: any;
  required?: boolean;
  validation?: (value: any) => boolean;
}) {
  return function (target: any, propertyKey: string) {
    const configMetadata = Reflect.getMetadata('config:properties', target) || {};
    configMetadata[propertyKey] = {
      ...options,
      propertyKey,
    };
    Reflect.defineMetadata('config:properties', configMetadata, target);
  };
}

// Utility functions for metadata retrieval

/**
 * Get plugin metadata from class
 */
export function getPluginMetadata(target: any): PluginMetadata | undefined {
  return Reflect.getMetadata(PLUGIN_METADATA_KEY, target);
}

/**
 * Get agent metadata from class
 */
export function getAgentMetadata(target: any): Partial<AgentDefinition> | undefined {
  return Reflect.getMetadata(AGENT_METADATA_KEY, target);
}

/**
 * Get workflow metadata from class
 */
export function getWorkflowMetadata(target: any): Partial<WorkflowDefinition> | undefined {
  return Reflect.getMetadata(WORKFLOW_METADATA_KEY, target);
}

/**
 * Get capabilities metadata from class
 */
export function getCapabilitiesMetadata(target: any): AgentCapability[] {
  return Reflect.getMetadata(CAPABILITY_METADATA_KEY, target) || [];
}

/**
 * Check if class is marked as plugin
 */
export function isPlugin(target: any): boolean {
  return Reflect.getMetadata('isPlugin', target) === true;
}

/**
 * Check if class is marked as agent
 */
export function isAgent(target: any): boolean {
  return Reflect.getMetadata('isAgent', target) === true;
}

/**
 * Check if class is marked as workflow
 */
export function isWorkflow(target: any): boolean {
  return Reflect.getMetadata('isWorkflow', target) === true;
}

// Validation functions

function validatePluginMetadata(metadata: PluginMetadata): void {
  if (!metadata.name || typeof metadata.name !== 'string') {
    throw new Error('Plugin name is required and must be a string');
  }

  if (!metadata.version || typeof metadata.version !== 'string') {
    throw new Error('Plugin version is required and must be a string');
  }

  if (!metadata.description || typeof metadata.description !== 'string') {
    throw new Error('Plugin description is required and must be a string');
  }

  // Validate version format (semver-like)
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(metadata.version)) {
    throw new Error('Plugin version must follow semantic versioning (x.y.z)');
  }
}

function validateAgentDefinition(definition: Partial<AgentDefinition>): void {
  if (!definition.type || typeof definition.type !== 'string') {
    throw new Error('Agent type is required and must be a string');
  }

  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error('Agent name is required and must be a string');
  }

  if (!definition.description || typeof definition.description !== 'string') {
    throw new Error('Agent description is required and must be a string');
  }
}

function validateWorkflowDefinition(definition: Partial<WorkflowDefinition>): void {
  if (!definition.type || typeof definition.type !== 'string') {
    throw new Error('Workflow type is required and must be a string');
  }

  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error('Workflow name is required and must be a string');
  }

  if (!definition.description || typeof definition.description !== 'string') {
    throw new Error('Workflow description is required and must be a string');
  }
}

function validateCapability(capability: AgentCapability): void {
  if (!capability.name || typeof capability.name !== 'string') {
    throw new Error('Capability name is required and must be a string');
  }

  if (!capability.description || typeof capability.description !== 'string') {
    throw new Error('Capability description is required and must be a string');
  }

  if (!capability.inputSchema || typeof capability.inputSchema !== 'object') {
    throw new Error('Capability inputSchema is required and must be an object');
  }

  if (!capability.outputSchema || typeof capability.outputSchema !== 'object') {
    throw new Error('Capability outputSchema is required and must be an object');
  }
}