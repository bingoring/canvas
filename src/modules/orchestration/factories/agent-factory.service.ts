import { Injectable, Logger } from '@nestjs/common';
import { AgentContext, AgentResult } from '../interfaces/workflow.interface';
import { TextGenerationAdapter } from '../../bedrock/adapters/text-generation.adapter';
import { ImageGenerationAdapter } from '../../bedrock/adapters/image-generation.adapter';
import { EmbeddingAdapter } from '../../bedrock/adapters/embedding.adapter';

export abstract class BaseAgent {
  abstract type: string;
  abstract execute(context: AgentContext): Promise<AgentResult>;
}

export interface AgentConfigSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  description: string;
}

/**
 * Factory service for creating and managing different types of AI agents
 * Supports extensible agent registration and configuration validation
 */
@Injectable()
export class AgentFactory {
  private readonly logger = new Logger(AgentFactory.name);
  private readonly agentTypes = new Map<string, any>();
  private readonly configSchemas = new Map<string, AgentConfigSchema>();

  constructor(
    private textAdapter: TextGenerationAdapter,
    private imageAdapter: ImageGenerationAdapter,
    private embeddingAdapter: EmbeddingAdapter,
  ) {
    this.registerBuiltinAgents();
    this.logger.log('Agent factory initialized with builtin agents');
  }

  /**
   * Create an agent instance
   */
  async createAgent(type: string, config: Record<string, any>): Promise<BaseAgent> {
    const AgentClass = this.agentTypes.get(type);
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    // Validate configuration
    await this.validateConfig(type, config);

    // Create agent instance
    const agent = new AgentClass(config, {
      textAdapter: this.textAdapter,
      imageAdapter: this.imageAdapter,
      embeddingAdapter: this.embeddingAdapter,
    });

    this.logger.debug(`Created agent: ${type}`);
    return agent;
  }

  /**
   * Register a new agent type
   */
  registerAgent(type: string, agentClass: any, schema: AgentConfigSchema): void {
    this.agentTypes.set(type, agentClass);
    this.configSchemas.set(type, schema);
    this.logger.debug(`Registered agent type: ${type}`);
  }

  /**
   * Get available agent types
   */
  getAvailableTypes(): string[] {
    return Array.from(this.agentTypes.keys());
  }

  /**
   * Get configuration schema for an agent type
   */
  getConfigSchema(type: string): AgentConfigSchema | undefined {
    return this.configSchemas.get(type);
  }

  /**
   * Validate agent configuration
   */
  private async validateConfig(type: string, config: Record<string, any>): Promise<void> {
    const schema = this.configSchemas.get(type);
    if (!schema) {
      return; // No schema defined, skip validation
    }

    // Check required fields
    for (const field of schema.required) {
      if (!(field in config)) {
        throw new Error(`Missing required field '${field}' for agent type '${type}'`);
      }
    }

    // Validate field types (simplified validation)
    for (const [field, value] of Object.entries(config)) {
      const fieldSchema = schema.properties[field];
      if (fieldSchema && !this.isValidType(value, fieldSchema.type)) {
        throw new Error(`Invalid type for field '${field}' in agent type '${type}'`);
      }
    }
  }

  /**
   * Check if value matches expected type
   */
  private isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown type, allow it
    }
  }

  /**
   * Register builtin agent types
   */
  private registerBuiltinAgents(): void {
    // Text Generation Agent
    this.registerAgent('text-generator', TextGeneratorAgent, {
      type: 'text-generator',
      properties: {
        prompt: { type: 'string' },
        maxTokens: { type: 'number' },
        temperature: { type: 'number' },
        systemPrompt: { type: 'string' },
        costPriority: { type: 'string' },
      },
      required: ['prompt'],
      description: 'Generates text using language models',
    });

    // Image Generation Agent
    this.registerAgent('image-generator', ImageGeneratorAgent, {
      type: 'image-generator',
      properties: {
        prompt: { type: 'string' },
        negativePrompt: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        style: { type: 'string' },
        quality: { type: 'string' },
      },
      required: ['prompt'],
      description: 'Generates images from text prompts',
    });

    // Embedding Agent
    this.registerAgent('embedding-generator', EmbeddingGeneratorAgent, {
      type: 'embedding-generator',
      properties: {
        text: { type: 'string' },
        inputType: { type: 'string' },
        normalize: { type: 'boolean' },
      },
      required: ['text'],
      description: 'Generates embeddings from text',
    });

    // Content Analyzer Agent
    this.registerAgent('content-analyzer', ContentAnalyzerAgent, {
      type: 'content-analyzer',
      properties: {
        content: { type: 'string' },
        analysisType: { type: 'string' },
        extractKeywords: { type: 'boolean' },
        generateSummary: { type: 'boolean' },
      },
      required: ['content'],
      description: 'Analyzes content for insights and metadata',
    });

    // Prompt Enhancer Agent
    this.registerAgent('prompt-enhancer', PromptEnhancerAgent, {
      type: 'prompt-enhancer',
      properties: {
        basePrompt: { type: 'string' },
        style: { type: 'string' },
        enhancementType: { type: 'string' },
        targetAudience: { type: 'string' },
      },
      required: ['basePrompt'],
      description: 'Enhances prompts for better AI model performance',
    });
  }
}

/**
 * Text Generator Agent
 */
class TextGeneratorAgent extends BaseAgent {
  type = 'text-generator';

  constructor(
    private config: any,
    private adapters: any,
  ) {
    super();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const prompt = this.interpolateTemplate(this.config.prompt, context);

      const request = {
        prompt,
        maxTokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7,
        systemPrompt: this.config.systemPrompt,
        costPriority: this.config.costPriority || 'cost',
      };

      const response = await this.adapters.textAdapter.generateText(request);

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

  private interpolateTemplate(template: string, context: AgentContext): string {
    return template.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.workflowState, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Image Generator Agent
 */
class ImageGeneratorAgent extends BaseAgent {
  type = 'image-generator';

  constructor(
    private config: any,
    private adapters: any,
  ) {
    super();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const prompt = this.interpolateTemplate(this.config.prompt, context);

      const request = {
        prompt,
        negativePrompt: this.config.negativePrompt,
        width: this.config.width || 1024,
        height: this.config.height || 1024,
        style: this.config.style || 'cartoon',
        quality: this.config.quality || 'standard',
      };

      const response = await this.adapters.imageAdapter.generateImage(request);

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

  private interpolateTemplate(template: string, context: AgentContext): string {
    return template.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.workflowState, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Embedding Generator Agent
 */
class EmbeddingGeneratorAgent extends BaseAgent {
  type = 'embedding-generator';

  constructor(
    private config: any,
    private adapters: any,
  ) {
    super();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const text = this.interpolateTemplate(this.config.text, context);

      const request = {
        text,
        inputType: this.config.inputType || 'search_document',
        normalize: this.config.normalize !== false,
      };

      const response = await this.adapters.embeddingAdapter.generateEmbedding(request);

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

  private interpolateTemplate(template: string, context: AgentContext): string {
    return template.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.workflowState, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Content Analyzer Agent
 */
class ContentAnalyzerAgent extends BaseAgent {
  type = 'content-analyzer';

  constructor(
    private config: any,
    private adapters: any,
  ) {
    super();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const content = this.interpolateTemplate(this.config.content, context);
      const analysisType = this.config.analysisType || 'general';

      // Build analysis prompt based on type
      let prompt = this.buildAnalysisPrompt(content, analysisType);

      const response = await this.adapters.textAdapter.generateText({
        prompt,
        maxTokens: 1000,
        temperature: 0.3,
        costPriority: 'cost',
      });

      const analysis = this.parseAnalysisResult(response.text);

      return {
        success: true,
        output: {
          analysis,
          originalContent: content,
          analysisType,
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
          code: 'CONTENT_ANALYSIS_FAILED',
          recoverable: true,
        },
      };
    }
  }

  private buildAnalysisPrompt(content: string, analysisType: string): string {
    const basePrompt = `Analyze the following content: "${content}"`;

    switch (analysisType) {
      case 'sentiment':
        return `${basePrompt}\n\nProvide sentiment analysis (positive/negative/neutral) and confidence score.`;
      case 'keywords':
        return `${basePrompt}\n\nExtract the top 10 keywords and key phrases.`;
      case 'summary':
        return `${basePrompt}\n\nProvide a concise summary in 2-3 sentences.`;
      default:
        return `${basePrompt}\n\nProvide general analysis including sentiment, key topics, and summary.`;
    }
  }

  private parseAnalysisResult(text: string): any {
    // Simple parsing logic - in production, this would be more sophisticated
    return {
      summary: text.substring(0, 200),
      fullAnalysis: text,
      timestamp: new Date(),
    };
  }

  private interpolateTemplate(template: string, context: AgentContext): string {
    return template.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.workflowState, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Prompt Enhancer Agent
 */
class PromptEnhancerAgent extends BaseAgent {
  type = 'prompt-enhancer';

  constructor(
    private config: any,
    private adapters: any,
  ) {
    super();
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const basePrompt = this.interpolateTemplate(this.config.basePrompt, context);
      const style = this.config.style || 'general';
      const enhancementType = this.config.enhancementType || 'clarity';

      const enhancementPrompt = this.buildEnhancementPrompt(basePrompt, style, enhancementType);

      const response = await this.adapters.textAdapter.generateText({
        prompt: enhancementPrompt,
        maxTokens: 500,
        temperature: 0.7,
        costPriority: 'cost',
      });

      return {
        success: true,
        output: {
          originalPrompt: basePrompt,
          enhancedPrompt: response.text.trim(),
          style,
          enhancementType,
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
          code: 'PROMPT_ENHANCEMENT_FAILED',
          recoverable: true,
        },
      };
    }
  }

  private buildEnhancementPrompt(basePrompt: string, style: string, enhancementType: string): string {
    return `Enhance the following prompt for better AI model performance:

Original prompt: "${basePrompt}"

Enhancement requirements:
- Style: ${style}
- Focus: ${enhancementType}
- Make it more specific and actionable
- Add relevant context and constraints

Enhanced prompt:`;
  }

  private interpolateTemplate(template: string, context: AgentContext): string {
    return template.replace(/\{\{(\w+(\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context.workflowState, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}