import { Injectable, Logger } from '@nestjs/common';
import { BedrockClientService, BedrockRequest, BedrockResponse } from '../services/bedrock-client.service';
import { ModelRouterService } from '../services/model-router.service';

export interface TextGenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  streaming?: boolean;
  costPriority?: 'cost' | 'quality' | 'speed';
}

export interface TextGenerationResponse {
  text: string;
  finishReason?: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  modelUsed: string;
  duration: number;
}

/**
 * Text generation adapter for Claude and other text models
 * Optimized for Korea region with cost-first routing
 */
@Injectable()
export class TextGenerationAdapter {
  private readonly logger = new Logger(TextGenerationAdapter.name);

  constructor(
    private bedrockClient: BedrockClientService,
    private modelRouter: ModelRouterService,
  ) {}

  /**
   * Generate text using the most cost-effective model
   */
  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    const modelId = await this.modelRouter.selectTextModel(request.costPriority || 'cost');

    const bedrockRequest: BedrockRequest = {
      modelId,
      body: this.formatRequestBody(request, modelId),
      streaming: request.streaming || false,
    };

    if (request.streaming) {
      return this.handleStreamingGeneration(bedrockRequest, request);
    } else {
      return this.handleSyncGeneration(bedrockRequest, request);
    }
  }

  /**
   * Generate text with multiple model fallback
   */
  async generateTextWithFallback(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    const modelChain = await this.modelRouter.getTextModelChain(request.costPriority || 'cost');

    for (const modelId of modelChain) {
      try {
        const bedrockRequest: BedrockRequest = {
          modelId,
          body: this.formatRequestBody(request, modelId),
          streaming: false,
        };

        const response = await this.handleSyncGeneration(bedrockRequest, request);
        this.logger.log(`Text generation successful with model: ${modelId}`);
        return response;
      } catch (error) {
        this.logger.warn(`Text generation failed with ${modelId}, trying next model`, error);
        continue;
      }
    }

    throw new Error('All text generation models failed');
  }

  /**
   * Handle synchronous text generation
   */
  private async handleSyncGeneration(
    bedrockRequest: BedrockRequest,
    originalRequest: TextGenerationRequest,
  ): Promise<TextGenerationResponse> {
    const response = await this.bedrockClient.invokeModel(bedrockRequest);

    return this.formatResponse(response, originalRequest);
  }

  /**
   * Handle streaming text generation
   */
  private async handleStreamingGeneration(
    bedrockRequest: BedrockRequest,
    originalRequest: TextGenerationRequest,
  ): Promise<TextGenerationResponse> {
    const chunks: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalDuration = 0;

    const stream = await this.bedrockClient.invokeModelWithStreaming(bedrockRequest);

    for await (const chunk of stream) {
      const text = this.extractTextFromChunk(chunk, bedrockRequest.modelId);
      if (text) {
        chunks.push(text);
      }

      totalInputTokens += chunk.metadata.inputTokens || 0;
      totalOutputTokens += chunk.metadata.outputTokens || 0;
      totalDuration = chunk.metadata.duration;
    }

    const cost = await this.modelRouter.calculateCost(
      bedrockRequest.modelId,
      totalInputTokens,
      totalOutputTokens,
    );

    return {
      text: chunks.join(''),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cost,
      modelUsed: bedrockRequest.modelId,
      duration: totalDuration,
    };
  }

  /**
   * Format request body based on model type
   */
  private formatRequestBody(request: TextGenerationRequest, modelId: string): any {
    if (modelId.includes('claude')) {
      return this.formatClaudeRequest(request);
    } else if (modelId.includes('llama')) {
      return this.formatLlamaRequest(request);
    } else if (modelId.includes('titan')) {
      return this.formatTitanRequest(request);
    }

    // Default Claude format
    return this.formatClaudeRequest(request);
  }

  /**
   * Format request for Claude models
   */
  private formatClaudeRequest(request: TextGenerationRequest): any {
    const messages = [];

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt,
    });

    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      top_p: request.topP || 1.0,
      top_k: request.topK || 250,
      stop_sequences: request.stopSequences || [],
      messages,
    };
  }

  /**
   * Format request for Llama models
   */
  private formatLlamaRequest(request: TextGenerationRequest): any {
    let prompt = request.prompt;
    if (request.systemPrompt) {
      prompt = `<s>[INST] <<SYS>>\n${request.systemPrompt}\n<</SYS>>\n\n${request.prompt} [/INST]`;
    }

    return {
      prompt,
      max_gen_len: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      top_p: request.topP || 1.0,
    };
  }

  /**
   * Format request for Titan models
   */
  private formatTitanRequest(request: TextGenerationRequest): any {
    return {
      inputText: request.prompt,
      textGenerationConfig: {
        maxTokenCount: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        topP: request.topP || 1.0,
        stopSequences: request.stopSequences || [],
      },
    };
  }

  /**
   * Format response to standardized format
   */
  private async formatResponse(
    response: BedrockResponse,
    originalRequest: TextGenerationRequest,
  ): Promise<TextGenerationResponse> {
    const text = this.extractTextFromResponse(response);
    const inputTokens = response.metadata.inputTokens || 0;
    const outputTokens = response.metadata.outputTokens || 0;

    const cost = await this.modelRouter.calculateCost(
      response.metadata.modelId,
      inputTokens,
      outputTokens,
    );

    return {
      text,
      inputTokens,
      outputTokens,
      cost,
      modelUsed: response.metadata.modelId,
      duration: response.metadata.duration,
    };
  }

  /**
   * Extract text from model response
   */
  private extractTextFromResponse(response: BedrockResponse): string {
    const body = response.body;

    // Claude format
    if (body.content && Array.isArray(body.content)) {
      return body.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('');
    }

    // Llama format
    if (body.generation) {
      return body.generation;
    }

    // Titan format
    if (body.results && Array.isArray(body.results)) {
      return body.results.map((result: any) => result.outputText).join('');
    }

    // Fallback
    return body.text || body.generated_text || JSON.stringify(body);
  }

  /**
   * Extract text from streaming chunk
   */
  private extractTextFromChunk(chunk: BedrockResponse, modelId: string): string {
    const body = chunk.body;

    if (modelId.includes('claude')) {
      if (body.type === 'content_block_delta' && body.delta?.text) {
        return body.delta.text;
      }
    }

    return '';
  }
}