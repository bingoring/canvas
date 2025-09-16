import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BedrockClientService } from './services/bedrock-client.service';
import { TextGenerationAdapter } from './adapters/text-generation.adapter';
import { ImageGenerationAdapter } from './adapters/image-generation.adapter';
import { EmbeddingAdapter } from './adapters/embedding.adapter';
import { ModelRouterService } from './services/model-router.service';
import { CostOptimizationService } from './services/cost-optimization.service';

/**
 * Bedrock integration module for AI model orchestration
 * Provides adapters for different model types with Korea region optimization
 */
@Module({
  imports: [ConfigModule],
  providers: [
    BedrockClientService,
    TextGenerationAdapter,
    ImageGenerationAdapter,
    EmbeddingAdapter,
    ModelRouterService,
    CostOptimizationService,
  ],
  exports: [
    BedrockClientService,
    TextGenerationAdapter,
    ImageGenerationAdapter,
    EmbeddingAdapter,
    ModelRouterService,
    CostOptimizationService,
  ],
})
export class BedrockModule {}