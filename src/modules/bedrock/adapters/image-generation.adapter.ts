import { Injectable, Logger } from '@nestjs/common';
import { BedrockClientService, BedrockRequest, BedrockResponse } from '../services/bedrock-client.service';
import { ModelRouterService } from '../services/model-router.service';

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  quality?: 'standard' | 'premium';
  style?: 'cartoon' | 'realistic' | 'anime' | 'meme' | 'illustration';
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  costPriority?: 'cost' | 'quality' | 'speed';
}

export interface ImageGenerationResponse {
  images: {
    base64: string;
    seed: number;
    finishReason?: string;
  }[];
  prompt: string;
  negativePrompt?: string;
  cost: number;
  modelUsed: string;
  duration: number;
  metadata: {
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed: number;
  };
}

/**
 * Image generation adapter for Stable Diffusion and other image models
 * Optimized for Canvas application with Korea region routing
 */
@Injectable()
export class ImageGenerationAdapter {
  private readonly logger = new Logger(ImageGenerationAdapter.name);

  constructor(
    private bedrockClient: BedrockClientService,
    private modelRouter: ModelRouterService,
  ) {}

  /**
   * Generate image using the most appropriate model
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const modelId = await this.modelRouter.selectImageModel(request.costPriority || 'quality');

    const bedrockRequest: BedrockRequest = {
      modelId,
      body: this.formatRequestBody(request, modelId),
    };

    const response = await this.bedrockClient.invokeModel(bedrockRequest);
    return this.formatResponse(response, request);
  }

  /**
   * Generate image with multiple model fallback
   */
  async generateImageWithFallback(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const modelChain = await this.modelRouter.getImageModelChain(request.costPriority || 'quality');

    for (const modelId of modelChain) {
      try {
        const bedrockRequest: BedrockRequest = {
          modelId,
          body: this.formatRequestBody(request, modelId),
        };

        const response = await this.bedrockClient.invokeModel(bedrockRequest);
        const result = this.formatResponse(response, request);

        this.logger.log(`Image generation successful with model: ${modelId}`);
        return result;
      } catch (error) {
        this.logger.warn(`Image generation failed with ${modelId}, trying next model`, error);
        continue;
      }
    }

    throw new Error('All image generation models failed');
  }

  /**
   * Generate image variations from existing image
   */
  async generateVariations(
    baseImage: string,
    request: Partial<ImageGenerationRequest>,
  ): Promise<ImageGenerationResponse> {
    const modelId = await this.modelRouter.selectImageModel(request.costPriority || 'quality');

    const variationRequest: BedrockRequest = {
      modelId,
      body: this.formatVariationRequest(baseImage, request, modelId),
    };

    const response = await this.bedrockClient.invokeModel(variationRequest);
    return this.formatResponse(response, request as ImageGenerationRequest);
  }

  /**
   * Enhance image quality using upscaling models
   */
  async enhanceImage(
    baseImage: string,
    request: Partial<ImageGenerationRequest>,
  ): Promise<ImageGenerationResponse> {
    const modelId = await this.modelRouter.selectImageModel('quality');

    const enhancementRequest: BedrockRequest = {
      modelId,
      body: this.formatEnhancementRequest(baseImage, request, modelId),
    };

    const response = await this.bedrockClient.invokeModel(enhancementRequest);
    return this.formatResponse(response, request as ImageGenerationRequest);
  }

  /**
   * Format request body based on model type
   */
  private formatRequestBody(request: ImageGenerationRequest, modelId: string): any {
    if (modelId.includes('stable-diffusion')) {
      return this.formatStableDiffusionRequest(request);
    } else if (modelId.includes('titan')) {
      return this.formatTitanImageRequest(request);
    }

    // Default to Stable Diffusion format
    return this.formatStableDiffusionRequest(request);
  }

  /**
   * Format request for Stable Diffusion models
   */
  private formatStableDiffusionRequest(request: ImageGenerationRequest): any {
    const width = request.width || 1024;
    const height = request.height || 1024;

    return {
      text_prompts: [
        {
          text: this.enhancePromptForStyle(request.prompt, request.style),
          weight: 1.0,
        },
        ...(request.negativePrompt
          ? [
              {
                text: request.negativePrompt,
                weight: -1.0,
              },
            ]
          : []),
      ],
      cfg_scale: request.cfgScale || 7,
      height,
      width,
      samples: 1,
      steps: request.steps || 30,
      seed: request.seed || Math.floor(Math.random() * 4294967295),
      sampler: request.sampler || 'K_DPM_2_ANCESTRAL',
      style_preset: this.mapStyleToPreset(request.style),
    };
  }

  /**
   * Format request for Titan Image models
   */
  private formatTitanImageRequest(request: ImageGenerationRequest): any {
    return {
      taskType: 'TEXT_IMAGE',
      textToImageParams: {
        text: this.enhancePromptForStyle(request.prompt, request.style),
        negativeText: request.negativePrompt,
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: request.height || 1024,
        width: request.width || 1024,
        cfgScale: request.cfgScale || 8.0,
        seed: request.seed || Math.floor(Math.random() * 214783647),
        quality: request.quality || 'standard',
      },
    };
  }

  /**
   * Format variation request
   */
  private formatVariationRequest(
    baseImage: string,
    request: Partial<ImageGenerationRequest>,
    modelId: string,
  ): any {
    if (modelId.includes('stable-diffusion')) {
      return {
        ...this.formatStableDiffusionRequest(request as ImageGenerationRequest),
        init_image: baseImage,
        image_strength: 0.5,
        init_image_mode: 'IMAGE_STRENGTH',
      };
    }

    // Titan variation format
    return {
      taskType: 'IMAGE_VARIATION',
      imageVariationParams: {
        text: request.prompt || '',
        negativeText: request.negativePrompt,
        images: [baseImage],
        similarityStrength: 0.7,
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: request.height || 1024,
        width: request.width || 1024,
        cfgScale: request.cfgScale || 8.0,
        quality: request.quality || 'standard',
      },
    };
  }

  /**
   * Format enhancement request
   */
  private formatEnhancementRequest(
    baseImage: string,
    request: Partial<ImageGenerationRequest>,
    modelId: string,
  ): any {
    return {
      taskType: 'INPAINTING',
      inPaintingParams: {
        text: request.prompt || 'enhance image quality, increase resolution',
        negativeText: request.negativePrompt || 'blurry, low quality, artifacts',
        image: baseImage,
        maskPrompt: 'enhance overall quality',
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: (request.height || 1024) * 2, // Upscale 2x
        width: (request.width || 1024) * 2,
        cfgScale: request.cfgScale || 8.0,
        quality: 'premium',
      },
    };
  }

  /**
   * Enhance prompt based on style
   */
  private enhancePromptForStyle(prompt: string, style?: string): string {
    const styleEnhancements = {
      cartoon: ', cartoon style, vibrant colors, clean lines, animated',
      realistic: ', photorealistic, high detail, professional photography',
      anime: ', anime style, manga art, cel shading, Japanese animation',
      meme: ', meme style, internet humor, recognizable format',
      illustration: ', digital illustration, artistic, detailed artwork',
    };

    if (style && styleEnhancements[style]) {
      return prompt + styleEnhancements[style];
    }

    return prompt;
  }

  /**
   * Map style to Stable Diffusion style preset
   */
  private mapStyleToPreset(style?: string): string | undefined {
    const presetMap = {
      cartoon: 'comic-book',
      realistic: 'photographic',
      anime: 'anime',
      illustration: 'digital-art',
    };

    return style ? presetMap[style] : undefined;
  }

  /**
   * Format response to standardized format
   */
  private async formatResponse(
    response: BedrockResponse,
    originalRequest: ImageGenerationRequest,
  ): Promise<ImageGenerationResponse> {
    const body = response.body;
    let images: { base64: string; seed: number; finishReason?: string }[] = [];

    // Stable Diffusion format
    if (body.artifacts) {
      images = body.artifacts.map((artifact: any) => ({
        base64: artifact.base64,
        seed: artifact.seed,
        finishReason: artifact.finishReason,
      }));
    }

    // Titan format
    if (body.images) {
      images = body.images.map((image: any, index: number) => ({
        base64: image,
        seed: originalRequest.seed || 0,
      }));
    }

    const cost = await this.modelRouter.calculateImageCost(
      response.metadata.modelId,
      originalRequest.width || 1024,
      originalRequest.height || 1024,
      images.length,
    );

    return {
      images,
      prompt: originalRequest.prompt,
      negativePrompt: originalRequest.negativePrompt,
      cost,
      modelUsed: response.metadata.modelId,
      duration: response.metadata.duration,
      metadata: {
        width: originalRequest.width || 1024,
        height: originalRequest.height || 1024,
        steps: originalRequest.steps || 30,
        cfgScale: originalRequest.cfgScale || 7,
        seed: originalRequest.seed || 0,
      },
    };
  }
}