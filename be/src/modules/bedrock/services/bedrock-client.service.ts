import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, GetFoundationModelCommand, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

export interface BedrockRequest {
  modelId: string;
  body: any;
  contentType?: string;
  accept?: string;
  streaming?: boolean;
}

export interface BedrockResponse {
  body: any;
  contentType: string;
  metadata: {
    modelId: string;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    duration: number;
    requestId: string;
  };
}

/**
 * Core Bedrock client service for Korea region
 * Handles authentication, request routing, and response processing
 */
@Injectable()
export class BedrockClientService {
  private readonly logger = new Logger(BedrockClientService.name);
  private readonly runtimeClient: BedrockRuntimeClient;
  private readonly bedrockClient: BedrockClient;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('BEDROCK_REGION', 'ap-northeast-2');

    const clientConfig = {
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
        sessionToken: this.configService.get<string>('AWS_SESSION_TOKEN'),
      },
      maxAttempts: 3,
      retryMode: 'adaptive',
    };

    this.runtimeClient = new BedrockRuntimeClient(clientConfig);
    this.bedrockClient = new BedrockClient(clientConfig);

    this.logger.log(`Bedrock client initialized for region: ${this.region}`);
  }

  /**
   * Invoke a Bedrock model with synchronous response
   */
  async invokeModel(request: BedrockRequest): Promise<BedrockResponse> {
    const startTime = Date.now();

    try {
      const command = new InvokeModelCommand({
        modelId: request.modelId,
        body: JSON.stringify(request.body),
        contentType: request.contentType || 'application/json',
        accept: request.accept || 'application/json',
      });

      const response = await this.runtimeClient.send(command);
      const duration = Date.now() - startTime;

      const bodyText = new TextDecoder().decode(response.body);
      const parsedBody = JSON.parse(bodyText);

      this.logger.debug(`Model invocation completed: ${request.modelId} (${duration}ms)`);

      return {
        body: parsedBody,
        contentType: response.contentType,
        metadata: {
          modelId: request.modelId,
          duration,
          requestId: response.$metadata.requestId,
          inputTokens: this.extractTokenCount(parsedBody, 'input'),
          outputTokens: this.extractTokenCount(parsedBody, 'output'),
        },
      };
    } catch (error) {
      this.logger.error(`Model invocation failed: ${request.modelId}`, error);
      throw error;
    }
  }

  /**
   * Invoke a Bedrock model with streaming response
   */
  async invokeModelWithStreaming(request: BedrockRequest): Promise<AsyncIterable<BedrockResponse>> {
    const startTime = Date.now();

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: request.modelId,
        body: JSON.stringify(request.body),
        contentType: request.contentType || 'application/json',
        accept: request.accept || 'application/json',
      });

      const response = await this.runtimeClient.send(command);

      return this.processStreamingResponse(response.body, request.modelId, startTime);
    } catch (error) {
      this.logger.error(`Streaming invocation failed: ${request.modelId}`, error);
      throw error;
    }
  }

  /**
   * Get available foundation models
   */
  async getAvailableModels(): Promise<any[]> {
    try {
      const command = new ListFoundationModelsCommand({});
      const response = await this.bedrockClient.send(command);

      return response.modelSummaries || [];
    } catch (error) {
      this.logger.error('Failed to fetch available models', error);
      throw error;
    }
  }

  /**
   * Get detailed model information
   */
  async getModelDetails(modelId: string): Promise<any> {
    try {
      const command = new GetFoundationModelCommand({ modelIdentifier: modelId });
      const response = await this.bedrockClient.send(command);

      return response.modelDetails;
    } catch (error) {
      this.logger.error(`Failed to fetch model details: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * Process streaming response from Bedrock
   */
  private async *processStreamingResponse(
    stream: any,
    modelId: string,
    startTime: number
  ): AsyncIterable<BedrockResponse> {
    try {
      for await (const chunk of stream) {
        if (chunk.chunk?.bytes) {
          const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
          const parsedChunk = JSON.parse(chunkText);

          yield {
            body: parsedChunk,
            contentType: 'application/json',
            metadata: {
              modelId,
              duration: Date.now() - startTime,
              requestId: 'streaming',
            },
          };
        }
      }
    } catch (error) {
      this.logger.error(`Streaming processing failed: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * Extract token count from model response
   */
  private extractTokenCount(response: any, type: 'input' | 'output'): number | undefined {
    // Different models have different response formats
    const usage = response.usage || response.amazon_bedrock_invocationMetrics;

    if (usage) {
      switch (type) {
        case 'input':
          return usage.inputTokens || usage.inputTokenCount;
        case 'output':
          return usage.outputTokens || usage.outputTokenCount;
      }
    }

    return undefined;
  }

  /**
   * Health check for Bedrock connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch (error) {
      this.logger.error('Bedrock health check failed', error);
      return false;
    }
  }
}