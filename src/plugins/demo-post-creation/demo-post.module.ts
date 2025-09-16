import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../modules/database/database.module';
import { BedrockModule } from '../../modules/bedrock/bedrock.module';
import { CanvasModule } from '../canvas/canvas.module';
import { DemoPostCreationPlugin } from './demo-post.plugin';
import { DemoPostController } from './demo-post.controller';

/**
 * Demo Post Creation Module - EASILY REMOVABLE DEMO FEATURE
 *
 * This entire module is a demo feature that showcases Canvas integration
 * for creating social media posts. It can be completely removed after
 * the demo without affecting core Canvas functionality.
 *
 * REMOVAL INSTRUCTIONS:
 * 1. Call the cleanup endpoint: DELETE /api/demo/posts/admin/cleanup-all
 * 2. Remove this module from app.module.ts imports
 * 3. Delete the entire /src/plugins/demo-post-creation directory
 * 4. Canvas core functionality will remain fully intact
 */
@Module({
  imports: [
    DatabaseModule,
    BedrockModule,
    CanvasModule, // Depends on Canvas for image generation
  ],
  providers: [
    DemoPostCreationPlugin,
  ],
  controllers: [
    DemoPostController,
  ],
  exports: [
    DemoPostCreationPlugin,
  ],
})
export class DemoPostCreationModule {
  constructor() {
    console.log('🚨 DEMO FEATURE LOADED: Post Creation Plugin');
    console.log('   This is a demonstration feature that can be easily removed');
    console.log('   after the demo without affecting Canvas core functionality.');
    console.log('   Endpoints available at: /api/demo/posts/*');
  }
}