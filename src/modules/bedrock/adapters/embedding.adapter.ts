import { Injectable, Logger } from '@nestjs/common';
import { BedrockClientService, BedrockRequest, BedrockResponse } from '../services/bedrock-client.service';
import { ModelRouterService } from '../services/model-router.service';

export interface EmbeddingRequest {
  text: string;
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
  truncate?: 'none' | 'start' | 'end';
  normalize?: boolean;
}

export interface EmbeddingResponse {
  embedding: number[];
  text: string;
  dimensions: number;
  modelUsed: string;
  cost: number;
  duration: number;
  inputTokens: number;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
  batchSize?: number;
  normalize?: boolean;
}

export interface BatchEmbeddingResponse {
  embeddings: {
    text: string;
    embedding: number[];
    index: number;
  }[];
  totalCost: number;
  totalDuration: number;
  modelUsed: string;
  dimensions: number;
}

/**
 * Embedding adapter for text vectorization using Titan and Cohere models
 * Optimized for Canvas content similarity and search functionality
 */
@Injectable()
export class EmbeddingAdapter {
  private readonly logger = new Logger(EmbeddingAdapter.name);

  constructor(
    private bedrockClient: BedrockClientService,
    private modelRouter: ModelRouterService,
  ) {}

  /**
   * Generate embedding for single text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelId = await this.modelRouter.selectEmbeddingModel();

    const bedrockRequest: BedrockRequest = {
      modelId,
      body: this.formatRequestBody(request, modelId),
    };

    const response = await this.bedrockClient.invokeModel(bedrockRequest);
    return this.formatResponse(response, request);
  }

  /**
   * Generate embeddings for multiple texts with batching
   */
  async generateBatchEmbeddings(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    const modelId = await this.modelRouter.selectEmbeddingModel();
    const batchSize = request.batchSize || 25; // Optimize for Bedrock limits

    const batches = this.chunkArray(request.texts, batchSize);
    const results: { text: string; embedding: number[]; index: number }[] = [];
    let totalCost = 0;
    let totalDuration = 0;
    let dimensions = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        const batchResults = await Promise.all(
          batch.map(async (text, indexInBatch) => {
            const embeddingRequest: EmbeddingRequest = {
              text,
              inputType: request.inputType,
              normalize: request.normalize,
            };

            const response = await this.generateEmbedding(embeddingRequest);
            totalCost += response.cost;
            totalDuration += response.duration;
            dimensions = response.dimensions;

            return {
              text,
              embedding: response.embedding,
              index: batchIndex * batchSize + indexInBatch,
            };
          })
        );

        results.push(...batchResults);
        this.logger.debug(`Completed batch ${batchIndex + 1}/${batches.length}`);
      } catch (error) {
        this.logger.error(`Batch ${batchIndex + 1} failed`, error);
        throw error;
      }
    }

    return {
      embeddings: results.sort((a, b) => a.index - b.index),
      totalCost,
      totalDuration,
      modelUsed: modelId,
      dimensions,
    };
  }

  /**
   * Generate embeddings optimized for similarity search
   */
  async generateSearchEmbedding(query: string): Promise<EmbeddingResponse> {
    return this.generateEmbedding({
      text: query,
      inputType: 'search_query',
      normalize: true,
    });
  }

  /**
   * Generate embeddings optimized for document indexing
   */
  async generateDocumentEmbedding(text: string): Promise<EmbeddingResponse> {
    return this.generateEmbedding({
      text,
      inputType: 'search_document',
      normalize: true,
    });
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude1 = Math.sqrt(norm1);
    const magnitude2 = Math.sqrt(norm2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find most similar embeddings from a collection
   */
  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: { id: string; embedding: number[]; metadata?: any }[],
    topK: number = 10,
  ): { id: string; similarity: number; metadata?: any }[] {
    const similarities = candidateEmbeddings.map(candidate => ({
      id: candidate.id,
      similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
      metadata: candidate.metadata,
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Format request body based on model type
   */
  private formatRequestBody(request: EmbeddingRequest, modelId: string): any {
    if (modelId.includes('titan')) {
      return this.formatTitanEmbeddingRequest(request);
    } else if (modelId.includes('cohere')) {
      return this.formatCohereEmbeddingRequest(request);
    }

    // Default to Titan format
    return this.formatTitanEmbeddingRequest(request);
  }

  /**
   * Format request for Titan Embedding models
   */
  private formatTitanEmbeddingRequest(request: EmbeddingRequest): any {
    return {
      inputText: request.text,
      dimensions: 1536, // Titan Embedding v1 default
      normalize: request.normalize !== false,
    };
  }

  /**
   * Format request for Cohere Embedding models
   */
  private formatCohereEmbeddingRequest(request: EmbeddingRequest): any {
    return {
      texts: [request.text],
      input_type: request.inputType || 'search_document',
      embedding_types: ['float'],
      truncate: request.truncate || 'end',
    };
  }

  /**
   * Format response to standardized format
   */
  private async formatResponse(
    response: BedrockResponse,
    originalRequest: EmbeddingRequest,
  ): Promise<EmbeddingResponse> {
    const body = response.body;
    let embedding: number[] = [];
    let dimensions = 0;

    // Titan format
    if (body.embedding) {
      embedding = body.embedding;
      dimensions = embedding.length;
    }

    // Cohere format
    if (body.embeddings && body.embeddings.length > 0) {
      embedding = body.embeddings[0].values || body.embeddings[0];
      dimensions = embedding.length;
    }

    const inputTokens = response.metadata.inputTokens || this.estimateTokenCount(originalRequest.text);
    const cost = await this.modelRouter.calculateEmbeddingCost(
      response.metadata.modelId,
      inputTokens,
    );

    return {
      embedding,
      text: originalRequest.text,
      dimensions,
      modelUsed: response.metadata.modelId,
      cost,
      duration: response.metadata.duration,
      inputTokens,
    };
  }

  /**
   * Estimate token count for cost calculation
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}