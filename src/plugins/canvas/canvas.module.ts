import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../modules/database/database.module';
import { BedrockModule } from '../../modules/bedrock/bedrock.module';
import { OrchestrationModule } from '../../modules/orchestration/orchestration.module';
import { CanvasPlugin } from './canvas.plugin';
import { CanvasController } from './canvas.controller';
import { CanvasService } from './canvas.service';
import { CanvasWorkflows } from './workflows/canvas.workflows';

/**
 * Canvas Plugin Module
 * Provides image generation and content management capabilities
 */
@Module({
  imports: [
    DatabaseModule,
    BedrockModule,
    OrchestrationModule,
  ],
  providers: [
    CanvasPlugin,
    CanvasService,
    CanvasWorkflows,
  ],
  controllers: [
    CanvasController,
  ],
  exports: [
    CanvasPlugin,
    CanvasService,
  ],
})
export class CanvasModule {}