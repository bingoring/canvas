import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', '*'),
    credentials: true,
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger documentation configuration
  const config = new DocumentBuilder()
    .setTitle('Canvas AI Orchestration Platform')
    .setDescription(`
# Canvas AI Orchestration Platform API

A comprehensive AI-powered image generation and content management platform optimized for Korea region.

## Core Features

### 🎨 Canvas Image Generation
- **AI-Powered Image Creation**: Generate images from text prompts using state-of-the-art models
- **Style Control**: Support for cartoon, realistic, anime, meme, and illustration styles
- **Image Variations**: Create variations of existing images with style modifications
- **Similarity Search**: Find similar content using semantic embeddings

### 🔧 Plugin Architecture
- **Extensible System**: Modular plugin-based architecture for easy expansion
- **Dynamic Loading**: Plugins can be loaded and unloaded at runtime
- **Dependency Management**: Automatic resolution of plugin dependencies

### 🚀 AI Model Optimization
- **Korea Region Focus**: Optimized for ap-northeast-2 with cost-first routing
- **Multi-Model Support**: Claude 3 (Haiku/Sonnet/Opus), Stable Diffusion, Titan
- **Cost Optimization**: Intelligent model selection based on cost, quality, and speed
- **Budget Controls**: Daily and monthly spending limits with real-time monitoring

### 📊 Analytics & Insights
- **Usage Analytics**: Comprehensive tracking of model usage and costs
- **Content Analytics**: Trending styles, popular content, user statistics
- **Performance Monitoring**: Real-time monitoring of workflow execution

### 🔄 Workflow Orchestration
- **LangGraph Integration**: Complex AI workflows with state management
- **Error Handling**: Robust error recovery and retry mechanisms
- **Monitoring**: Real-time execution monitoring with alerts

## Demo Features (Removable)

### 📱 Social Media Post Creation
- **Multi-Platform Support**: Everytime, Instagram, Twitter
- **AI Content Generation**: Combined image and text generation
- **Trending Topics**: Auto-generation based on platform trends
- **Easy Removal**: Complete separation from core functionality

## Architecture Highlights

- **Korea Region Optimized**: All AI models routed through ap-northeast-2
- **Cost-First Approach**: Claude 3 Haiku as primary choice ($0.00025/1K tokens)
- **MongoDB Integration**: Comprehensive data persistence with vector search
- **Enterprise Patterns**: SOLID principles, factory patterns, dependency injection
- **Performance Monitoring**: Real-time metrics and alerting

## Getting Started

1. **Generate an Image**:
   \`\`\`bash
   POST /api/canvas/generate
   {
     "prompt": "A beautiful sunset over mountains",
     "style": "cartoon"
   }
   \`\`\`

2. **Search Similar Content**:
   \`\`\`bash
   POST /api/canvas/search/similar
   {
     "query": "sunset landscape",
     "limit": 10
   }
   \`\`\`

3. **View Public Gallery**:
   \`\`\`bash
   GET /api/canvas/public?page=1&limit=20
   \`\`\`

## Demo Features

- **Create Social Post**: \`POST /api/demo/posts/create\`
- **Trending Posts**: \`POST /api/demo/posts/trending\`
- **Remove Demo Data**: \`DELETE /api/demo/posts/admin/cleanup-all\`

For detailed removal instructions, see the DEMO_REMOVAL_GUIDE.md file.
    `)
    .setVersion('1.0.0')
    .setContact(
      'Canvas Team',
      'https://github.com/canvas-team/canvas-orchestration',
      'support@canvas-platform.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('Canvas', 'Core image generation and content management')
    .addTag('Demo - Post Creation', 'Demo features for social media post creation (removable)')
    .addTag('Analytics', 'Usage analytics and insights')
    .addTag('Admin', 'Administrative endpoints')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.canvas-platform.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Custom CSS for Swagger UI
  const customSwaggerCss = `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #2563eb; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .swagger-ui .info .description p { font-size: 14px; line-height: 1.6; }
    .swagger-ui .info .description h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
    .swagger-ui .info .description h2 { color: #1d4ed8; margin-top: 24px; }
    .swagger-ui .info .description h3 { color: #2563eb; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
    .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
  `;

  SwaggerModule.setup('api/docs', app, document, {
    customCss: customSwaggerCss,
    customSiteTitle: 'Canvas API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      docExpansion: 'list',
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
    },
  });

  // Health check endpoint
  app.use('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: configService.get('NODE_ENV', 'development'),
      features: {
        canvas: true,
        demo: true,
        analytics: true,
        orchestration: true,
      },
    });
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Canvas AI Orchestration Platform started`);
  logger.log(`📝 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health Check: http://localhost:${port}/health`);
  logger.log(`🎨 Canvas Endpoints: http://localhost:${port}/api/canvas/*`);
  logger.log(`🧪 Demo Endpoints: http://localhost:${port}/api/demo/*`);
  logger.log(`💡 Demo Removal Guide: See DEMO_REMOVAL_GUIDE.md`);

  // Log feature status
  logger.log(`✅ Core Canvas Features: Enabled`);
  logger.log(`🧪 Demo Features: Enabled (Removable)`);
  logger.log(`🌏 Region: Korea (ap-northeast-2)`);
  logger.log(`💰 Cost Optimization: Active`);
  logger.log(`📊 Analytics: Active`);
  logger.log(`🔄 Orchestration: Active`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});