/**
 * Korea region optimized Bedrock configuration
 * Focused on cost optimization and lowest-price model selection
 */

export interface ModelInfo {
  readonly id: string;
  readonly name: string;
  readonly type: 'text-generation' | 'image-generation' | 'embedding';
  readonly costPerUnit: number;
  readonly costUnit: 'token' | 'image' | 'request';
  readonly maxTokens?: number;
  readonly supportedTasks: readonly string[];
  readonly tier: 'basic' | 'standard' | 'premium';
  readonly latency: 'low' | 'medium' | 'high';
  readonly status: 'available' | 'limited' | 'unavailable';
  readonly quotas: ModelQuota;
}

export interface ModelQuota {
  requestsPerMinute: number;
  tokensPerMinute?: number;
  imagesPerMinute?: number;
}

/**
 * Korea region (ap-northeast-2) Bedrock model configuration
 * Optimized for cost efficiency
 */
export const BedrockKoreaConfig = {
  region: 'ap-northeast-2',

  models: {
    textGeneration: [
      {
        id: 'anthropic.claude-3-haiku-20240307-v1:0',
        name: 'Claude 3 Haiku',
        type: 'text-generation' as const,
        costPerUnit: 0.00000025, // $0.25 per 1M input tokens (LOWEST COST)
        costUnit: 'token' as const,
        outputCostPerUnit: 0.00000125, // $1.25 per 1M output tokens
        maxTokens: 200000,
        supportedTasks: [
          'text-generation',
          'content-creation',
          'simple-analysis',
          'conversation',
          'summarization'
        ],
        tier: 'basic' as const,
        latency: 'low' as const,
        status: 'available' as const,
        quotas: {
          requestsPerMinute: 100,
          tokensPerMinute: 100000,
        }
      },
      {
        id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        name: 'Claude 3.5 Sonnet',
        type: 'text-generation' as const,
        costPerUnit: 0.000003, // $3 per 1M input tokens
        costUnit: 'token' as const,
        outputCostPerUnit: 0.000015, // $15 per 1M output tokens
        maxTokens: 200000,
        supportedTasks: [
          'text-generation',
          'code-generation',
          'complex-analysis',
          'reasoning',
          'content-creation'
        ],
        tier: 'premium' as const,
        latency: 'medium' as const,
        status: 'available' as const,
        quotas: {
          requestsPerMinute: 50,
          tokensPerMinute: 40000,
        }
      },
    ],

    imageGeneration: [
      {
        id: 'amazon.titan-image-generator-v1',
        name: 'Titan Image Generator G1',
        type: 'image-generation' as const,
        costPerUnit: 0.008, // $0.008 per 512x512 image (LOWEST COST)
        costUnit: 'image' as const,
        supportedSizes: ['512x512', '1024x1024'],
        supportedTasks: [
          'text-to-image',
          'image-variation',
          'sketch-to-image'
        ],
        tier: 'standard' as const,
        latency: 'medium' as const,
        status: 'available' as const,
        quotas: {
          requestsPerMinute: 10,
          imagesPerMinute: 10,
        }
      },
      {
        id: 'stability.stable-diffusion-xl-v1',
        name: 'Stable Diffusion XL',
        type: 'image-generation' as const,
        costPerUnit: 0.036, // $0.036 per 512x512 image
        costUnit: 'image' as const,
        supportedSizes: ['512x512', '1024x1024'],
        supportedTasks: [
          'text-to-image',
          'image-variation',
          'inpainting',
          'outpainting'
        ],
        tier: 'premium' as const,
        latency: 'high' as const,
        status: 'available' as const,
        quotas: {
          requestsPerMinute: 5,
          imagesPerMinute: 5,
        }
      },
    ],

    embedding: [
      {
        id: 'amazon.titan-embed-text-v1',
        name: 'Titan Embeddings G1 - Text',
        type: 'embedding' as const,
        costPerUnit: 0.0000001, // $0.1 per 1M tokens (LOWEST COST)
        costUnit: 'token' as const,
        dimensions: 1536,
        supportedTasks: [
          'text-embedding',
          'semantic-search',
          'similarity-comparison'
        ],
        tier: 'basic' as const,
        latency: 'low' as const,
        status: 'available' as const,
        quotas: {
          requestsPerMinute: 200,
          tokensPerMinute: 500000,
        }
      },
      {
        id: 'amazon.titan-embed-image-v1',
        name: 'Titan Embeddings G1 - Multimodal',
        type: 'embedding' as const,
        costPerUnit: 0.0001, // $0.1 per 1K images
        costUnit: 'image' as const,
        dimensions: 1024,
        supportedTasks: [
          'image-embedding',
          'multimodal-search',
          'image-similarity'
        ],
        tier: 'standard' as const,
        latency: 'medium' as const,
        status: 'available' as const,
        quotas: {
          requestsPerMinute: 50,
          imagesPerMinute: 50,
        }
      },
    ],
  },

  /**
   * Cost optimization strategies
   */
  costOptimization: {
    // Default strategy: always use lowest cost model that meets requirements
    defaultStrategy: 'cost-first',

    // Fallback chain for model selection
    fallbackChains: {
      'text-generation': [
        'anthropic.claude-3-haiku-20240307-v1:0', // Cheapest first
        'anthropic.claude-3-5-sonnet-20241022-v2:0'
      ],
      'image-generation': [
        'amazon.titan-image-generator-v1', // Cheapest first
        'stability.stable-diffusion-xl-v1'
      ],
      'embedding': [
        'amazon.titan-embed-text-v1', // Cheapest first
        'amazon.titan-embed-image-v1'
      ]
    },

    // Budget limits for cost control
    budgetLimits: {
      daily: 10.0,   // $10 per day
      monthly: 100.0, // $100 per month
      perRequest: 0.50 // $0.50 per request
    },

    // Quality vs cost trade-off thresholds
    qualityThresholds: {
      basic: {
        maxCostPerToken: 0.000001,
        preferredModels: ['haiku', 'titan']
      },
      standard: {
        maxCostPerToken: 0.000005,
        preferredModels: ['sonnet', 'titan', 'stable-diffusion']
      },
      premium: {
        maxCostPerToken: 0.00002,
        preferredModels: ['sonnet', 'stable-diffusion']
      }
    }
  },

  /**
   * Regional optimizations for Korea
   */
  regionalOptimizations: {
    // Latency optimizations
    preferLocalModels: true,

    // Cost optimizations for Korean market
    currency: 'USD', // All costs in USD
    timezone: 'Asia/Seoul',

    // Peak usage patterns (Korean business hours)
    peakHours: {
      start: 9, // 9 AM KST
      end: 18,  // 6 PM KST
      timezone: 'Asia/Seoul'
    },

    // Off-peak cost optimization
    offPeakDiscount: 0.1, // 10% cost reduction during off-peak hours
  },

  /**
   * Model routing rules
   */
  routingRules: {
    // Simple tasks -> cheapest models
    simple: {
      taskTypes: ['simple-text', 'basic-image', 'simple-embedding'],
      maxCostPerUnit: 0.000001,
      preferredTier: 'basic'
    },

    // Standard tasks -> balanced cost/quality
    standard: {
      taskTypes: ['content-creation', 'image-generation', 'analysis'],
      maxCostPerUnit: 0.000010,
      preferredTier: 'standard'
    },

    // Complex tasks -> higher quality models when needed
    complex: {
      taskTypes: ['code-generation', 'complex-analysis', 'reasoning'],
      maxCostPerUnit: 0.000020,
      preferredTier: 'premium'
    }
  }
} as const;

export type BedrockKoreaConfigType = typeof BedrockKoreaConfig;