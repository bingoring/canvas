import { Injectable, Logger } from '@nestjs/common';
import { TextGenerationAdapter } from '../../bedrock/adapters/text-generation.adapter';
import { ImageGenerationAdapter } from '../../bedrock/adapters/image-generation.adapter';
import { EmbeddingAdapter } from '../../bedrock/adapters/embedding.adapter';
import { WorkflowNode, WorkflowExecution, AgentResult, AgentContext } from '../interfaces/workflow.interface';
import { AgentFactory } from '../factories/agent-factory.service';

export interface BaseAgent {
  type: string;
  execute(context: AgentContext): Promise<AgentResult>;
}

/**
 * Agent orchestrator for managing and executing different types of AI agents
 * Coordinates between text, image, and embedding agents within workflows
 */
@Injectable()
export class AgentOrchestrator {
  private readonly logger = new Logger(AgentOrchestrator.name);

  constructor(
    private textAdapter: TextGenerationAdapter,
    private imageAdapter: ImageGenerationAdapter,
    private embeddingAdapter: EmbeddingAdapter,
    private agentFactory: AgentFactory,
  ) {
    this.logger.log('Agent orchestrator initialized');
  }

  /**
   * Execute an agent node within a workflow
   */
  async executeAgent(node: WorkflowNode, execution: WorkflowExecution): Promise<AgentResult> {
    const context: AgentContext = {
      executionId: execution.id,
      nodeId: node.id,
      workflowState: execution.state,
      nodeConfig: node.config,
      previousOutputs: this.getPreviousOutputs(execution),
      metadata: {
        userId: execution.userId,
        sessionId: execution.sessionId,
        executionStartTime: execution.startTime,
      },
    };

    this.logger.debug(`Executing agent: ${node.agentType} in node: ${node.id}`);

    try {
      const agent = await this.agentFactory.createAgent(node.agentType, node.config);
      const result = await agent.execute(context);

      this.logger.debug(`Agent execution completed: ${node.id}`, {
        success: result.success,
        cost: result.metadata.cost,
        duration: result.metadata.duration,
      });

      return result;
    } catch (error) {
      this.logger.error(`Agent execution failed: ${node.id}`, error);

      return {
        success: false,
        output: null,
        metadata: {
          cost: 0,
          duration: 0,
        },
        error: {
          message: error.message,
          code: error.code || 'AGENT_EXECUTION_FAILED',
          recoverable: this.isRecoverableError(error),
        },
      };
    }
  }

  /**
   * Execute text generation using the appropriate adapter
   */
  async executeTextGeneration(
    prompt: string,
    config: any,
    context: AgentContext,
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const request = {
        prompt,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        systemPrompt: config.systemPrompt,
        costPriority: config.costPriority || 'cost',
      };

      const response = await this.textAdapter.generateText(request);

      return {
        success: true,
        output: {
          text: response.text,
          metadata: {
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens,
            modelUsed: response.modelUsed,
          },
        },
        metadata: {
          cost: response.cost,
          duration: Date.now() - startTime,
          tokensUsed: response.inputTokens + response.outputTokens,
          modelUsed: response.modelUsed,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        metadata: {
          cost: 0,
          duration: Date.now() - startTime,
        },
        error: {
          message: error.message,
          code: 'TEXT_GENERATION_FAILED',
          recoverable: true,
        },
      };
    }
  }

  /**
   * Execute image generation using the appropriate adapter
   */
  async executeImageGeneration(
    prompt: string,
    config: any,
    context: AgentContext,
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const request = {
        prompt,
        negativePrompt: config.negativePrompt,
        width: config.width || 1024,
        height: config.height || 1024,
        style: config.style || 'cartoon',
        quality: config.quality || 'standard',
        costPriority: config.costPriority || 'quality',
      };

      const response = await this.imageAdapter.generateImage(request);

      return {
        success: true,
        output: {
          images: response.images,
          metadata: response.metadata,
        },
        metadata: {
          cost: response.cost,
          duration: Date.now() - startTime,
          modelUsed: response.modelUsed,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        metadata: {
          cost: 0,
          duration: Date.now() - startTime,
        },
        error: {
          message: error.message,
          code: 'IMAGE_GENERATION_FAILED',
          recoverable: true,
        },
      };
    }
  }

  /**
   * Execute embedding generation using the appropriate adapter
   */
  async executeEmbeddingGeneration(
    text: string,
    config: any,
    context: AgentContext,
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const request = {
        text,
        inputType: config.inputType || 'search_document',
        normalize: config.normalize !== false,
      };

      const response = await this.embeddingAdapter.generateEmbedding(request);

      return {
        success: true,
        output: {
          embedding: response.embedding,
          dimensions: response.dimensions,
        },
        metadata: {
          cost: response.cost,
          duration: Date.now() - startTime,
          modelUsed: response.modelUsed,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        metadata: {
          cost: 0,
          duration: Date.now() - startTime,
        },
        error: {
          message: error.message,
          code: 'EMBEDDING_GENERATION_FAILED',
          recoverable: true,
        },
      };
    }
  }

  /**
   * Execute parallel agents with concurrency control
   */
  async executeParallelAgents(
    nodes: WorkflowNode[],
    execution: WorkflowExecution,
    maxConcurrency: number = 3,
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const promises: Promise<AgentResult>[] = [];

    for (let i = 0; i < nodes.length; i += maxConcurrency) {
      const batch = nodes.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(node => this.executeAgent(node, execution));

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            output: null,
            metadata: { cost: 0, duration: 0 },
            error: {
              message: result.reason.message,
              code: 'PARALLEL_EXECUTION_FAILED',
              recoverable: false,
            },
          });
        }
      }
    }

    return results;
  }

  /**
   * Check agent health and availability
   */
  async checkAgentHealth(agentType: string): Promise<boolean> {
    try {
      const agent = await this.agentFactory.createAgent(agentType, {});
      // Perform a lightweight health check
      return true;
    } catch (error) {
      this.logger.warn(`Agent health check failed: ${agentType}`, error);
      return false;
    }
  }

  /**
   * Get available agent types
   */
  getAvailableAgentTypes(): string[] {
    return this.agentFactory.getAvailableTypes();
  }

  /**
   * Get agent configuration schema
   */
  getAgentConfigSchema(agentType: string): any {
    return this.agentFactory.getConfigSchema(agentType);
  }

  /**
   * Get previous outputs from executed nodes
   */
  private getPreviousOutputs(execution: WorkflowExecution): Record<string, any> {
    const outputs: Record<string, any> = {};

    // This would typically reconstruct outputs from execution history
    // For now, return empty object
    return outputs;
  }

  /**
   * Determine if an error is recoverable
   */
  private isRecoverableError(error: any): boolean {
    const recoverableErrors = [
      'RATE_LIMITED',
      'TIMEOUT',
      'TEMPORARY_UNAVAILABLE',
      'NETWORK_ERROR',
    ];

    return recoverableErrors.some(code =>
      error.code === code || error.message.includes(code)
    );
  }
}