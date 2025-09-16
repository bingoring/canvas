import { Injectable, Logger } from '@nestjs/common';

export interface StateSnapshot {
  executionId: string;
  timestamp: Date;
  state: Record<string, any>;
  checkpointId: string;
  metadata: {
    nodeId: string;
    version: number;
    size: number;
  };
}

export interface StateTransition {
  from: string;
  to: string;
  timestamp: Date;
  data: any;
  trigger: string;
}

/**
 * State manager service for workflow execution state
 * Provides LangGraph-inspired state management with checkpointing and rollback
 */
@Injectable()
export class StateManager {
  private readonly logger = new Logger(StateManager.name);
  private readonly states = new Map<string, Record<string, any>>();
  private readonly snapshots = new Map<string, StateSnapshot[]>();
  private readonly transitions = new Map<string, StateTransition[]>();

  constructor() {
    this.logger.log('State manager initialized');
  }

  /**
   * Initialize state for a new execution
   */
  async initializeState(executionId: string, initialState: Record<string, any>): Promise<void> {
    this.states.set(executionId, { ...initialState });
    this.snapshots.set(executionId, []);
    this.transitions.set(executionId, []);

    await this.createCheckpoint(executionId, 'initialization', {
      nodeId: 'start',
      trigger: 'initialization',
    });

    this.logger.debug(`State initialized for execution: ${executionId}`);
  }

  /**
   * Update state with new data
   */
  async updateState(
    executionId: string,
    updates: Record<string, any>,
    nodeId?: string,
  ): Promise<Record<string, any>> {
    const currentState = this.states.get(executionId);
    if (!currentState) {
      throw new Error(`State not found for execution: ${executionId}`);
    }

    const previousState = { ...currentState };
    const newState = this.mergeState(currentState, updates);

    this.states.set(executionId, newState);

    // Record state transition
    if (nodeId) {
      await this.recordTransition(executionId, previousState, newState, nodeId);
    }

    this.logger.debug(`State updated for execution: ${executionId}`, {
      nodeId,
      updateKeys: Object.keys(updates),
    });

    return newState;
  }

  /**
   * Get current state
   */
  getState(executionId: string): Record<string, any> | undefined {
    return this.states.get(executionId);
  }

  /**
   * Get specific state value
   */
  getStateValue(executionId: string, key: string): any {
    const state = this.states.get(executionId);
    return state ? this.getNestedValue(state, key) : undefined;
  }

  /**
   * Set specific state value
   */
  async setStateValue(
    executionId: string,
    key: string,
    value: any,
    nodeId?: string,
  ): Promise<void> {
    const currentState = this.states.get(executionId);
    if (!currentState) {
      throw new Error(`State not found for execution: ${executionId}`);
    }

    const updates = this.setNestedValue({}, key, value);
    await this.updateState(executionId, updates, nodeId);
  }

  /**
   * Create a state checkpoint
   */
  async createCheckpoint(
    executionId: string,
    checkpointId: string,
    metadata: { nodeId: string; trigger: string },
  ): Promise<StateSnapshot> {
    const state = this.states.get(executionId);
    if (!state) {
      throw new Error(`State not found for execution: ${executionId}`);
    }

    const snapshot: StateSnapshot = {
      executionId,
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      checkpointId,
      metadata: {
        nodeId: metadata.nodeId,
        version: this.getNextVersion(executionId),
        size: JSON.stringify(state).length,
      },
    };

    const executionSnapshots = this.snapshots.get(executionId) || [];
    executionSnapshots.push(snapshot);
    this.snapshots.set(executionId, executionSnapshots);

    this.logger.debug(`Checkpoint created: ${checkpointId} for execution: ${executionId}`);

    return snapshot;
  }

  /**
   * Restore state from checkpoint
   */
  async restoreFromCheckpoint(executionId: string, checkpointId: string): Promise<boolean> {
    const executionSnapshots = this.snapshots.get(executionId) || [];
    const snapshot = executionSnapshots.find(s => s.checkpointId === checkpointId);

    if (!snapshot) {
      this.logger.warn(`Checkpoint not found: ${checkpointId} for execution: ${executionId}`);
      return false;
    }

    this.states.set(executionId, JSON.parse(JSON.stringify(snapshot.state)));

    this.logger.log(`State restored from checkpoint: ${checkpointId} for execution: ${executionId}`);

    return true;
  }

  /**
   * Get all checkpoints for an execution
   */
  getCheckpoints(executionId: string): StateSnapshot[] {
    return this.snapshots.get(executionId) || [];
  }

  /**
   * Get state transitions history
   */
  getTransitions(executionId: string): StateTransition[] {
    return this.transitions.get(executionId) || [];
  }

  /**
   * Compare two states and get differences
   */
  getStateDiff(
    state1: Record<string, any>,
    state2: Record<string, any>,
  ): { added: string[]; modified: string[]; removed: string[] } {
    const diff = {
      added: [],
      modified: [],
      removed: [],
    };

    const keys1 = this.getAllKeys(state1);
    const keys2 = this.getAllKeys(state2);

    // Find added keys
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        diff.added.push(key);
      }
    }

    // Find removed keys
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        diff.removed.push(key);
      }
    }

    // Find modified keys
    for (const key of keys1) {
      if (keys2.includes(key)) {
        const value1 = this.getNestedValue(state1, key);
        const value2 = this.getNestedValue(state2, key);

        if (JSON.stringify(value1) !== JSON.stringify(value2)) {
          diff.modified.push(key);
        }
      }
    }

    return diff;
  }

  /**
   * Cleanup state data for completed executions
   */
  async cleanupExecution(executionId: string): Promise<void> {
    this.states.delete(executionId);
    this.snapshots.delete(executionId);
    this.transitions.delete(executionId);

    this.logger.debug(`State cleaned up for execution: ${executionId}`);
  }

  /**
   * Get state size and statistics
   */
  getStateStatistics(executionId: string): {
    stateSize: number;
    checkpointCount: number;
    transitionCount: number;
    memoryUsage: number;
  } {
    const state = this.states.get(executionId);
    const snapshots = this.snapshots.get(executionId) || [];
    const transitions = this.transitions.get(executionId) || [];

    const stateSize = state ? JSON.stringify(state).length : 0;
    const snapshotSize = snapshots.reduce((sum, s) => sum + s.metadata.size, 0);
    const transitionSize = transitions.length * 100; // Rough estimate

    return {
      stateSize,
      checkpointCount: snapshots.length,
      transitionCount: transitions.length,
      memoryUsage: stateSize + snapshotSize + transitionSize,
    };
  }

  /**
   * Merge state updates with current state
   */
  private mergeState(
    currentState: Record<string, any>,
    updates: Record<string, any>,
  ): Record<string, any> {
    const merged = { ...currentState };

    for (const [key, value] of Object.entries(updates)) {
      if (key.includes('.')) {
        // Handle nested keys like 'user.profile.name'
        this.setNestedValue(merged, key, value);
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
    return obj;
  }

  /**
   * Get all keys from nested object
   */
  private getAllKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      }
    }

    return keys;
  }

  /**
   * Record state transition
   */
  private async recordTransition(
    executionId: string,
    fromState: Record<string, any>,
    toState: Record<string, any>,
    nodeId: string,
  ): Promise<void> {
    const transitions = this.transitions.get(executionId) || [];
    const diff = this.getStateDiff(fromState, toState);

    const transition: StateTransition = {
      from: JSON.stringify(fromState),
      to: JSON.stringify(toState),
      timestamp: new Date(),
      data: diff,
      trigger: nodeId,
    };

    transitions.push(transition);
    this.transitions.set(executionId, transitions);
  }

  /**
   * Get next version number for checkpoints
   */
  private getNextVersion(executionId: string): number {
    const snapshots = this.snapshots.get(executionId) || [];
    return snapshots.length + 1;
  }
}