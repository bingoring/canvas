import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Plugin, PluginSchema } from './schemas/plugin.schema';
import { WorkflowExecution, WorkflowExecutionSchema } from './schemas/workflow-execution.schema';
import { ModelUsage, ModelUsageSchema } from './schemas/model-usage.schema';
import { CanvasContent, CanvasContentSchema } from './schemas/canvas-content.schema';
import { DatabaseService } from './database.service';

/**
 * Database module with MongoDB integration
 * Provides schemas and services for data persistence
 */
@Module({
  imports: [
    // MongoDB connection with configuration
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI') ||
                   configService.get<string>('MONGODB_ATLAS_URI') ||
                   'mongodb://mongo:27017/canvas_ai';

        return {
          uri,
          // Connection pool optimization
          maxPoolSize: 10,
          minPoolSize: 2,
          maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          // Additional options for production
          retryWrites: true,
          retryReads: true,
          readPreference: 'primary',
        };
      },
      inject: [ConfigService],
    }),

    // Register all schemas
    MongooseModule.forFeature([
      { name: Plugin.name, schema: PluginSchema },
      { name: WorkflowExecution.name, schema: WorkflowExecutionSchema },
      { name: ModelUsage.name, schema: ModelUsageSchema },
      { name: CanvasContent.name, schema: CanvasContentSchema },
    ]),
  ],
  providers: [DatabaseService],
  exports: [
    MongooseModule,
    DatabaseService,
  ],
})
export class DatabaseModule {}