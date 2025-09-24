import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PluginSystemModule } from './core/plugin-system/plugin-system.module';
import { DatabaseModule } from './modules/database/database.module';
import { BedrockModule } from './modules/bedrock/bedrock.module';
import { OrchestrationModule } from './modules/orchestration/orchestration.module';
import { CanvasModule } from './plugins/canvas/canvas.module';
import { DemoPostCreationModule } from './plugins/demo-post-creation/demo-post.module';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Event emitter for plugin lifecycle events
    EventEmitterModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // MongoDB database integration
    DatabaseModule,

    // Bedrock AI models integration
    BedrockModule,

    // AI workflow orchestration engine
    OrchestrationModule,

    // Canvas image generation plugin
    CanvasModule,

    // Demo post creation plugin (REMOVABLE AFTER DEMO)
    DemoPostCreationModule,


    // Core plugin system
    PluginSystemModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}