import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../modules/database/database.module';
import { BedrockModule } from '../../modules/bedrock/bedrock.module';
import { OrchestrationModule } from '../../modules/orchestration/orchestration.module';
import { CanvasPlugin } from './canvas.plugin';
import { CanvasController } from './canvas.controller';
import { CanvasService } from './canvas.service';
// import { CanvasWorkflows } from './workflows/canvas.workflows'; // TODO: Create this service

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
    // CanvasWorkflows, // TODO: Create this service
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